import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create user_domain_vibe_levels table
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS user_domain_vibe_levels (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      domain_code text NOT NULL CHECK (domain_code IN (
        'strength', 'agility', 'endurance', 'explosivity', 'intelligence', 'regeneration'
      )),
      vibe_level numeric(7,2) NOT NULL DEFAULT 1000.0 
        CHECK (vibe_level >= 100 AND vibe_level <= 3000),
      rating_deviation numeric(5,2) NOT NULL DEFAULT 350.0 
        CHECK (rating_deviation >= 0 AND rating_deviation <= 350),
      volatility numeric(6,4) NOT NULL DEFAULT 0.06 
        CHECK (volatility >= 0.01 AND volatility <= 0.1),
      last_updated_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id, domain_code)
    );
  `);

  // Create vibe_level_changes table
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS vibe_level_changes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      domain_code text NOT NULL CHECK (domain_code IN (
        'strength', 'agility', 'endurance', 'explosivity', 'intelligence', 'regeneration'
      )),
      session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
      old_vibe_level numeric(7,2) NOT NULL,
      new_vibe_level numeric(7,2) NOT NULL,
      old_rd numeric(5,2) NOT NULL,
      new_rd numeric(5,2) NOT NULL,
      change_amount numeric(7,2) NOT NULL,
      performance_score numeric(5,2),
      domain_impact numeric(3,2),
      points_awarded integer,
      change_reason text NOT NULL CHECK (change_reason IN (
        'session_completed', 'decay', 'manual_adjustment'
      )),
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // Create indexes
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_domain_vibe_levels_user 
      ON user_domain_vibe_levels(user_id);
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_domain_vibe_levels_domain_rating 
      ON user_domain_vibe_levels(domain_code, vibe_level DESC);
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_domain_vibe_levels_last_updated 
      ON user_domain_vibe_levels(last_updated_at) 
      WHERE last_updated_at < now() - interval '1 day';
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_vibe_level_changes_user_domain 
      ON vibe_level_changes(user_id, domain_code, created_at DESC);
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_vibe_level_changes_session 
      ON vibe_level_changes(session_id) 
      WHERE session_id IS NOT NULL;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_vibe_level_changes_reason 
      ON vibe_level_changes(change_reason, created_at DESC);
  `);

  // Initialize vibe levels for existing users
  await knex.raw(`
    INSERT INTO user_domain_vibe_levels (user_id, domain_code, vibe_level, rating_deviation, volatility)
    SELECT 
      u.id,
      domain.domain_code,
      1000.0,
      350.0,
      0.06
    FROM users u
    CROSS JOIN (
      SELECT unnest(ARRAY[
        'strength', 'agility', 'endurance', 
        'explosivity', 'intelligence', 'regeneration'
      ]) AS domain_code
    ) domain
    WHERE u.deleted_at IS NULL
    ON CONFLICT (user_id, domain_code) DO NOTHING;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS idx_vibe_level_changes_reason;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_vibe_level_changes_session;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_vibe_level_changes_user_domain;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_domain_vibe_levels_last_updated;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_domain_vibe_levels_domain_rating;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_domain_vibe_levels_user;`);
  await knex.raw(`DROP TABLE IF EXISTS vibe_level_changes CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS user_domain_vibe_levels CASCADE;`);
}
