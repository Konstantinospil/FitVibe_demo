import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("user_points", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("source_type").notNullable();
    table.uuid("source_id").nullable();
    table.string("algorithm_version").nullable();
    table.integer("points").notNullable();
    table.integer("calories").nullable();
    table.jsonb("metadata").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.timestamp("awarded_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(["user_id", "awarded_at"], "user_points_user_id_awarded_at_idx");
  });
  await knex.raw(`
    CREATE INDEX user_points_source_unique_idx
    ON user_points (user_id, source_type, source_id)
    WHERE source_id IS NOT NULL
  `);

  await knex.schema.createTable("badge_catalog", (table) => {
    table.string("code").primary();
    table.string("name").notNullable();
    table.text("description").notNullable();
    table.string("category").notNullable();
    table.string("icon").nullable();
    table.integer("priority").notNullable().defaultTo(0);
    table.jsonb("criteria").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("badges", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .string("badge_type")
      .notNullable()
      .references("code")
      .inTable("badge_catalog")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.jsonb("metadata").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.timestamp("awarded_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["user_id", "badge_type"], "badges_user_badge_unique_idx");
  });

  await knex.raw(`
    CREATE TABLE user_domain_vibe_levels (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
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
      UNIQUE (user_id, domain_code)
    )
  `);
  await knex.raw(`CREATE INDEX idx_domain_vibe_levels_user ON user_domain_vibe_levels (user_id)`);
  await knex.raw(
    `CREATE INDEX idx_domain_vibe_levels_domain_rating ON user_domain_vibe_levels (domain_code, vibe_level DESC)`,
  );
  await knex.raw(
    `CREATE INDEX idx_domain_vibe_levels_last_updated ON user_domain_vibe_levels (last_updated_at)`,
  );

  await knex.raw(`
    CREATE TABLE vibe_level_changes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
      domain_code text NOT NULL CHECK (domain_code IN (
        'strength', 'agility', 'endurance', 'explosivity', 'intelligence', 'regeneration'
      )),
      session_id uuid REFERENCES sessions(id) ON UPDATE CASCADE ON DELETE SET NULL,
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
    )
  `);
  await knex.raw(
    `CREATE INDEX idx_vibe_level_changes_user_domain ON vibe_level_changes (user_id, domain_code, created_at DESC)`,
  );
  await knex.raw(`
    CREATE INDEX idx_vibe_level_changes_session
    ON vibe_level_changes (session_id)
    WHERE session_id IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP TABLE IF EXISTS vibe_level_changes CASCADE");
  await knex.raw("DROP TABLE IF EXISTS user_domain_vibe_levels CASCADE");
  await knex.schema.dropTableIfExists("badges");
  await knex.schema.dropTableIfExists("badge_catalog");
  await knex.schema.dropTableIfExists("user_points");
}
