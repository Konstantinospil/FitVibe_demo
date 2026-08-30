import type { Knex } from "knex";

async function createTableIfMissing(
  knex: Knex,
  tableName: string,
  builder: (table: Knex.CreateTableBuilder) => void,
): Promise<void> {
  const hasTable = await knex.schema.hasTable(tableName);
  if (!hasTable) {
    await knex.schema.createTable(tableName, builder);
  }
}

export async function up(knex: Knex): Promise<void> {
  await createTableIfMissing(knex, "exercise_categories", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("slug").notNullable().unique();
    table.string("title").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  const hasExerciseCategory = await knex.schema.hasColumn("exercises", "category_id");
  if (!hasExerciseCategory) {
    await knex.schema.alterTable("exercises", (table) => {
      table
        .uuid("category_id")
        .nullable()
        .references("id")
        .inTable("exercise_categories")
        .onUpdate("CASCADE")
        .onDelete("SET NULL");
    });
  }

  await createTableIfMissing(knex, "tags", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("slug").notNullable().unique();
    table.string("label").notNullable();
  });

  await createTableIfMissing(knex, "exercise_tags", (table) => {
    table
      .uuid("exercise_id")
      .notNullable()
      .references("id")
      .inTable("exercises")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .uuid("tag_id")
      .notNullable()
      .references("id")
      .inTable("tags")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.primary(["exercise_id", "tag_id"]);
  });

  await createTableIfMissing(knex, "translation_fields", (table) => {
    table.string("entity_type").notNullable();
    table.string("field_key").notNullable();
    table.primary(["entity_type", "field_key"]);
  });

  await createTableIfMissing(knex, "verification_tokens", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.string("token").notNullable().unique();
    table.string("purpose").notNullable();
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.timestamp("consumed_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await createTableIfMissing(knex, "reset_tokens", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.string("token").notNullable().unique();
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.timestamp("consumed_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await createTableIfMissing(knex, "workout_templates", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("name").notNullable();
    table.text("description").nullable();
    table.smallint("estimated_duration_min").nullable();
    table.string("difficulty").nullable();
    table.boolean("is_public").notNullable().defaultTo(false);
    table.string("visibility").nullable();
    table.smallint("times_used").notNullable().defaultTo(0);
    table.decimal("avg_rating", 3, 2).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("archived_at", { useTz: true }).nullable();
  });

  await createTableIfMissing(knex, "template_muscle_groups", (table) => {
    table
      .uuid("template_id")
      .notNullable()
      .references("id")
      .inTable("workout_templates")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("muscle_group").notNullable();
    table.primary(["template_id", "muscle_group"]);
  });

  await createTableIfMissing(knex, "template_exercises", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("template_id")
      .notNullable()
      .references("id")
      .inTable("workout_templates")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .uuid("exercise_id")
      .nullable()
      .references("id")
      .inTable("exercises")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.integer("order_index").notNullable();
    table.integer("target_sets").nullable();
    table.string("target_reps").nullable();
    table.string("target_rest").nullable();
    table.text("notes").nullable();
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["template_id", "order_index"]);
  });

  await createTableIfMissing(knex, "template_ratings", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("template_id")
      .notNullable()
      .references("id")
      .inTable("workout_templates")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.smallint("rating").notNullable();
    table.text("review").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["template_id", "user_id"]);
  });

  await createTableIfMissing(knex, "body_measurements", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.date("measurement_date").notNullable();
    table.decimal("weight_kg", 6, 2).nullable();
    table.decimal("body_fat_pct", 4, 2).nullable();
    table.decimal("chest_cm", 6, 2).nullable();
    table.decimal("waist_cm", 6, 2).nullable();
    table.decimal("hips_cm", 6, 2).nullable();
    table.decimal("thigh_cm", 6, 2).nullable();
    table.decimal("bicep_cm", 6, 2).nullable();
    table.text("notes").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["user_id", "measurement_date"]);
  });

  await createTableIfMissing(knex, "recovery_logs", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.date("log_date").notNullable();
    table.smallint("sleep_hours").nullable();
    table.smallint("sleep_quality").nullable();
    table.smallint("soreness_level").nullable();
    table.smallint("stress_level").nullable();
    table.smallint("energy_level").nullable();
    table.text("notes").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["user_id", "log_date"]);
  });

  await createTableIfMissing(knex, "notifications", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("type").notNullable();
    table
      .uuid("actor_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.string("target_type").nullable();
    table.uuid("target_id").nullable();
    table.boolean("is_read").notNullable().defaultTo(false);
    table.string("priority").nullable();
    table.string("group_key").nullable();
    table.smallint("group_count").nullable();
    table.timestamp("expires_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("read_at", { useTz: true }).nullable();
  });

  await createTableIfMissing(knex, "share_links", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("session_id")
      .nullable()
      .comment("FK to sessions(id) - enforced at application level per ADR-005");
    table
      .uuid("feed_item_id")
      .nullable()
      .references("id")
      .inTable("feed_items")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.string("token").notNullable().unique();
    table.integer("view_count").notNullable().defaultTo(0);
    table.integer("max_views").nullable();
    table.timestamp("expires_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("revoked_at", { useTz: true }).nullable();
    table
      .uuid("created_by")
      .nullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
  });

  await createTableIfMissing(knex, "code_sets", (table) => {
    table.string("key").primary();
    table.text("description").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await createTableIfMissing(knex, "code_values", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .string("set_key")
      .notNullable()
      .references("key")
      .inTable("code_sets")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("code").notNullable();
    table.string("label").notNullable();
    table.integer("sort_order").notNullable().defaultTo(0);
    table.boolean("is_active").notNullable().defaultTo(true);
    table.unique(["set_key", "code"]);
  });

  await createTableIfMissing(knex, "attributes", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("key").notNullable().unique();
    table.string("label").notNullable();
    table.string("data_type").notNullable();
    table.string("unit_set_key").nullable();
    table.decimal("min_value", 10, 2).nullable();
    table.decimal("max_value", 10, 2).nullable();
    table.boolean("is_time_series").notNullable().defaultTo(false);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await createTableIfMissing(knex, "attribute_scopes", (table) => {
    table
      .uuid("attribute_id")
      .notNullable()
      .references("id")
      .inTable("attributes")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("entity_type").notNullable();
    table.primary(["attribute_id", "entity_type"]);
  });

  await createTableIfMissing(knex, "attribute_values", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("attribute_id")
      .notNullable()
      .references("id")
      .inTable("attributes")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("entity_type").notNullable();
    table.uuid("entity_id").notNullable();
    table.timestamp("measured_at", { useTz: true }).nullable();
    table
      .uuid("unit_value_id")
      .nullable()
      .references("id")
      .inTable("code_values")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.bigInteger("int_value").nullable();
    table.decimal("numeric_value", 18, 6).nullable();
    table.text("text_value").nullable();
    table.boolean("bool_value").nullable();
    table.date("date_value").nullable();
    table.timestamp("ts_value", { useTz: true }).nullable();
    table.jsonb("json_value").nullable();
    table
      .uuid("code_value_id")
      .nullable()
      .references("id")
      .inTable("code_values")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
  });
}

export async function down(knex: Knex): Promise<void> {
  const dropTableIfExists = async (tableName: string) => {
    const hasTable = await knex.schema.hasTable(tableName);
    if (hasTable) {
      await knex.schema.dropTable(tableName);
    }
  };

  await dropTableIfExists("attribute_values");
  await dropTableIfExists("attribute_scopes");
  await dropTableIfExists("attributes");
  await dropTableIfExists("code_values");
  await dropTableIfExists("code_sets");
  await dropTableIfExists("share_links");
  await dropTableIfExists("notifications");
  await dropTableIfExists("recovery_logs");
  await dropTableIfExists("body_measurements");
  await dropTableIfExists("template_ratings");
  await dropTableIfExists("template_exercises");
  await dropTableIfExists("template_muscle_groups");
  await dropTableIfExists("workout_templates");
  await dropTableIfExists("reset_tokens");
  await dropTableIfExists("verification_tokens");
  await dropTableIfExists("translation_fields");
  await dropTableIfExists("exercise_tags");
  await dropTableIfExists("tags");

  const hasCategoryId = await knex.schema.hasColumn("exercises", "category_id");
  if (hasCategoryId) {
    await knex.schema.alterTable("exercises", (table) => {
      table.dropColumn("category_id");
    });
  }

  await dropTableIfExists("exercise_categories");
}
