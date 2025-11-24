import type { Knex } from "knex";
import fs from "node:fs";
import path from "node:path";

function readSql(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");
}

const SESSION_VIEW = "session_summary";
const WEEKLY_VIEW = "weekly_aggregates";

const NEW_SESSION_VIEW_SQL = `
  CREATE MATERIALIZED VIEW ${SESSION_VIEW} AS
  SELECT
    s.id AS session_id,
    s.owner_id,
    COUNT(se.id)::int AS exercise_count,
    COALESCE(SUM(COALESCE(es.reps, 0)), 0)::numeric AS total_reps,
    COALESCE(SUM(COALESCE(es.reps, 0) * COALESCE(es.weight_kg, 0)), 0)::numeric AS total_volume,
    COALESCE(SUM(COALESCE(es.duration_sec, 0)), 0)::numeric AS total_duration_sec,
    s.status,
    s.planned_at,
    s.completed_at,
    NOW() AS refreshed_at
  FROM sessions s
  LEFT JOIN session_exercises se ON se.session_id = s.id
  LEFT JOIN exercise_sets es ON es.session_exercise_id = se.id
  GROUP BY s.id, s.owner_id, s.status, s.planned_at, s.completed_at
  WITH NO DATA;
`;

const WEEKLY_VIEW_SQL = `
  CREATE MATERIALIZED VIEW ${WEEKLY_VIEW} AS
  SELECT
    ss.owner_id,
    date_trunc('week', ss.completed_at) AS week_start,
    COUNT(*)::int AS sessions,
    COALESCE(SUM(ss.total_volume), 0)::numeric AS total_volume,
    COALESCE(SUM(ss.total_duration_sec), 0)::numeric AS total_duration_sec,
    NOW() AS refreshed_at
  FROM session_summary ss
  WHERE ss.completed_at IS NOT NULL
  GROUP BY ss.owner_id, date_trunc('week', ss.completed_at)
  WITH NO DATA;
`;

const LEGACY_SESSION_VIEW_SQL = `
  CREATE MATERIALIZED VIEW ${SESSION_VIEW} AS
  SELECT
    s.id AS session_id,
    s.owner_id,
    COUNT(se.id)::int AS exercise_count,
    COALESCE(SUM(
      COALESCE(es.reps, 0) * COALESCE(es.weight_kg, 0)
    ), 0)::numeric AS total_volume,
    s.status,
    s.planned_at,
    s.completed_at,
    NOW() AS refreshed_at
  FROM sessions s
  LEFT JOIN session_exercises se ON se.session_id = s.id
  LEFT JOIN exercise_sets es ON es.session_exercise_id = se.id
  GROUP BY s.id, s.owner_id, s.status, s.planned_at, s.completed_at
  WITH NO DATA;
`;

export async function up(knex: Knex): Promise<void> {
  // Drop all dependent objects in correct dependency order
  // Order matters: drop objects that depend on others BEFORE dropping their dependencies

  // 1. Drop trigger first (depends on function)
  await knex.raw(`DROP TRIGGER IF EXISTS trg_session_summary_refresh ON sessions;`);

  // 2. Drop functions (may reference views in their body, but don't create formal dependencies)
  await knex.raw(`DROP FUNCTION IF EXISTS session_summary_refresh_trigger() CASCADE;`);
  await knex.raw(`DROP FUNCTION IF EXISTS refresh_session_summary(boolean) CASCADE;`);

  // 3. Drop regular views that depend on session_summary
  await knex.raw(`DROP VIEW IF EXISTS v_session_summary CASCADE;`);

  // 4. Drop weekly_aggregates WITHOUT CASCADE first (it depends on session_summary)
  // This prevents CASCADE from trying to drop session_summary prematurely
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${WEEKLY_VIEW};`);

  // 5. Now drop session_summary - weekly_aggregates is gone, so this should work
  // Use CASCADE to handle any remaining dependencies (indexes, etc.)
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${SESSION_VIEW} CASCADE;`);

  // Recreate session_summary with new columns
  await knex.raw(NEW_SESSION_VIEW_SQL);
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_${SESSION_VIEW}_owner_completed ON ${SESSION_VIEW} (owner_id, completed_at DESC);`,
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_${SESSION_VIEW}_status ON ${SESSION_VIEW} (status);`,
  );
  await knex.raw(WEEKLY_VIEW_SQL);
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_${WEEKLY_VIEW}_owner_week ON ${WEEKLY_VIEW} (owner_id, week_start DESC);`,
  );

  // Recreate refresh_session_summary function (needed for trigger and post-deploy scripts)
  await knex.raw(readSql("../functions/refresh_session_summary.sql"));

  // Recreate v_session_summary view and trigger
  await knex.raw(readSql("../views/v_session_summary.sql"));
  await knex.raw(readSql("../triggers/t_session_summary_refresh.sql"));
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${WEEKLY_VIEW};`);
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${SESSION_VIEW};`);
  await knex.raw(LEGACY_SESSION_VIEW_SQL);
}
