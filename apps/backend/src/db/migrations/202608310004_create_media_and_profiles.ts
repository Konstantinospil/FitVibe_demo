import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("media", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("owner_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("target_type").notNullable();
    table.uuid("target_id").notNullable();
    table.string("storage_key").notNullable();
    table.string("file_url").notNullable();
    table.string("mime_type").nullable();
    table.string("media_type").nullable();
    table.integer("bytes").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(["target_type", "target_id"], "media_target_type_id_idx");
  });

  await knex.schema.createTable("profiles", (table) => {
    table
      .uuid("user_id")
      .primary()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.date("date_of_birth").nullable();
    table
      .string("gender_code")
      .nullable()
      .references("code")
      .inTable("genders")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.specificType("alias", "citext").notNullable().unique();
    table.timestamp("alias_changed_at", { useTz: true }).nullable();
    table.text("bio").nullable();
    table
      .uuid("avatar_asset_id")
      .nullable()
      .references("id")
      .inTable("media")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.string("visibility").notNullable().defaultTo("private");
    table
      .string("fitness_level_code")
      .nullable()
      .references("code")
      .inTable("fitness_levels")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.string("training_frequency").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_visibility_check
    CHECK (visibility IN ('private', 'link', 'public'))
  `);
  await knex.raw(`
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_bio_length_check
    CHECK (char_length(bio) <= 500)
  `);
  await knex.raw(`
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_training_frequency_check
    CHECK (
      training_frequency IS NULL
      OR training_frequency IN ('rarely', '1_2_per_week', '3_4_per_week', '5_plus_per_week')
    )
  `);
  await knex.raw(`CREATE INDEX idx_profiles_alias ON profiles (alias);`);
  await knex.raw(
    `CREATE INDEX idx_profiles_visibility ON profiles (visibility) WHERE visibility = 'public';`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("profiles");
  await knex.schema.dropTableIfExists("media");
}
