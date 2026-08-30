import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("exercises", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("owner_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("name").notNullable();
    table
      .string("type_code")
      .nullable()
      .references("code")
      .inTable("exercise_types")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.string("muscle_group").nullable();
    table.string("equipment").nullable();
    table.jsonb("tags").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    table.boolean("is_public").notNullable().defaultTo(false);
    table.text("description").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("archived_at", { useTz: true }).nullable();
  });
  await knex.raw(`CREATE INDEX exercises_tags_gin_idx ON exercises USING GIN (tags);`);
  await knex.raw(
    `CREATE INDEX exercises_owner_active_idx ON exercises (owner_id) WHERE archived_at IS NULL;`,
  );

  await knex.schema.createTable("plans", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("name").notNullable();
    table.string("status").notNullable().defaultTo("active");
    table.decimal("progress_percent", 5, 2).notNullable().defaultTo(0);
    table.integer("session_count").notNullable().defaultTo(0);
    table.integer("completed_count").notNullable().defaultTo(0);
    table.date("start_date").nullable();
    table.date("end_date").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("archived_at", { useTz: true }).nullable();
    table.index(["user_id"], "idx_plans_owner");
  });
  await knex.raw(
    `CREATE INDEX idx_plans_owner_active ON plans (user_id) WHERE archived_at IS NULL;`,
  );

  await knex.schema.createTable("sessions", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("owner_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .uuid("plan_id")
      .nullable()
      .references("id")
      .inTable("plans")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.text("title").nullable();
    table.timestamp("planned_at", { useTz: true }).notNullable();
    table.timestamp("started_at", { useTz: true }).nullable();
    table.timestamp("completed_at", { useTz: true }).nullable();
    table.string("status").notNullable().defaultTo("planned");
    table.string("visibility").notNullable().defaultTo("private");
    table.text("recurrence_rule").nullable();
    table.text("notes").nullable();
    table.integer("calories").nullable();
    table.integer("points").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("deleted_at", { useTz: true }).nullable();
    table.index(["owner_id"], "idx_sessions_owner");
    table.index(["status"], "idx_sessions_status");
    table.index(["planned_at"], "idx_sessions_planned_at");
  });
  await knex.raw(`
    ALTER TABLE sessions
    ADD CONSTRAINT sessions_status_check
    CHECK (status IN ('planned', 'in_progress', 'completed', 'canceled'))
  `);
  await knex.raw(`
    ALTER TABLE sessions
    ADD CONSTRAINT sessions_visibility_check
    CHECK (visibility IN ('private', 'followers', 'link', 'public'))
  `);
  await knex.raw(
    `CREATE INDEX idx_sessions_owner_active ON sessions (owner_id) WHERE deleted_at IS NULL;`,
  );

  await knex.schema.createTable("session_exercises", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("session_id")
      .notNullable()
      .references("id")
      .inTable("sessions")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .uuid("exercise_id")
      .nullable()
      .references("id")
      .inTable("exercises")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.string("exercise_name").nullable();
    table.integer("order_index").notNullable();
    table.text("notes").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["session_id", "order_index"]);
    table.index(["session_id"], "idx_session_exercises_session");
  });

  await knex.schema.createTable("exercise_sets", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("session_exercise_id")
      .notNullable()
      .references("id")
      .inTable("session_exercises")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.integer("order_index").notNullable();
    table.integer("reps").nullable();
    table.decimal("weight_kg", 8, 2).nullable();
    table.integer("distance_m").nullable();
    table.integer("duration_sec").nullable();
    table.integer("rpe").nullable();
    table.text("notes").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["session_exercise_id", "order_index"]);
    table.index(["session_exercise_id"], "idx_exercise_sets_session");
  });

  await knex.schema.createTable("planned_exercise_attributes", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("session_exercise_id")
      .notNullable()
      .unique()
      .references("id")
      .inTable("session_exercises")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.integer("sets").nullable();
    table.integer("reps").nullable();
    table.decimal("load", 8, 2).nullable();
    table.decimal("distance", 8, 2).nullable();
    table.specificType("duration", "interval").nullable();
    table.integer("rpe").nullable();
    table.specificType("rest", "interval").nullable();
    table.jsonb("extras").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("personal_records", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .uuid("exercise_id")
      .notNullable()
      .references("id")
      .inTable("exercises")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("metric").notNullable();
    table.decimal("value", 12, 4).notNullable();
    table.timestamp("achieved_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.boolean("is_current").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(["user_id", "exercise_id"], "personal_records_user_exercise_idx");
  });
  await knex.raw(`
    CREATE UNIQUE INDEX personal_records_current_unique
    ON personal_records (user_id, exercise_id, metric)
    WHERE is_current = true
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("personal_records");
  await knex.schema.dropTableIfExists("planned_exercise_attributes");
  await knex.schema.dropTableIfExists("exercise_sets");
  await knex.schema.dropTableIfExists("session_exercises");
  await knex.schema.dropTableIfExists("sessions");
  await knex.schema.dropTableIfExists("plans");
  await knex.schema.dropTableIfExists("exercises");
}
