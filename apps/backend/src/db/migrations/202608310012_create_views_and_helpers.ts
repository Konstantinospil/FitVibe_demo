import type { Knex } from "knex";
import fs from "node:fs";
import path from "node:path";

function readSql(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");
}

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE MATERIALIZED VIEW session_summary AS
    SELECT
      s.id AS session_id,
      s.owner_id,
      COUNT(se.id)::int AS exercise_count,
      COALESCE(
        SUM(COALESCE(es.reps, 0) * COALESCE(es.weight_kg, 0)),
        0
      )::numeric AS total_volume,
      s.status,
      s.planned_at,
      s.completed_at,
      NOW() AS refreshed_at
    FROM sessions s
    LEFT JOIN session_exercises se ON se.session_id = s.id
    LEFT JOIN exercise_sets es ON es.session_exercise_id = se.id
    GROUP BY s.id, s.owner_id, s.status, s.planned_at, s.completed_at
    WITH NO DATA
  `);
  await knex.raw(
    `CREATE UNIQUE INDEX idx_session_summary_session_id ON session_summary (session_id)`,
  );

  await knex.raw(`
    CREATE MATERIALIZED VIEW weekly_aggregates AS
    SELECT
      ss.owner_id,
      date_trunc('week', ss.completed_at) AS week_start,
      COUNT(*)::int AS sessions,
      COALESCE(SUM(ss.total_volume), 0)::numeric AS total_volume,
      NOW() AS refreshed_at
    FROM session_summary ss
    WHERE ss.completed_at IS NOT NULL
    GROUP BY ss.owner_id, date_trunc('week', ss.completed_at)
    WITH NO DATA
  `);
  await knex.raw(
    `CREATE UNIQUE INDEX idx_weekly_aggregates_owner_week_unique ON weekly_aggregates (owner_id, week_start)`,
  );

  await knex.raw(`
    CREATE MATERIALIZED VIEW mv_leaderboard AS
    WITH badge_counts AS (
      SELECT user_id, COUNT(*)::int AS badges_count
      FROM badges
      GROUP BY user_id
    ),
    period_points AS (
      SELECT
        user_id,
        'week'::text AS period_type,
        date_trunc('week', awarded_at)::date AS period_start,
        points
      FROM user_points
      UNION ALL
      SELECT
        user_id,
        'month'::text AS period_type,
        date_trunc('month', awarded_at)::date AS period_start,
        points
      FROM user_points
    )
    SELECT
      pp.period_type,
      pp.period_start,
      u.id AS user_id,
      p.alias,
      u.display_name,
      SUM(pp.points)::int AS points,
      COALESCE(bc.badges_count, 0)::int AS badges_count
    FROM period_points pp
    JOIN users u ON u.id = pp.user_id
    JOIN profiles p ON p.user_id = u.id
    LEFT JOIN badge_counts bc ON bc.user_id = pp.user_id
    GROUP BY
      pp.period_type,
      pp.period_start,
      u.id,
      p.alias,
      u.display_name,
      bc.badges_count
    WITH NO DATA
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX idx_mv_leaderboard_period_user
    ON mv_leaderboard (period_type, period_start, user_id)
  `);

  await knex.raw(readSql("../functions/refresh_session_summary.sql"));
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP FUNCTION IF EXISTS refresh_session_summary(boolean)");
  await knex.raw("DROP MATERIALIZED VIEW IF EXISTS mv_leaderboard");
  await knex.raw("DROP MATERIALIZED VIEW IF EXISTS weekly_aggregates");
  await knex.raw("DROP MATERIALIZED VIEW IF EXISTS session_summary");
}
