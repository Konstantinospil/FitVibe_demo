import type { Knex } from "knex";

/**
 * Creates the profiles table with all fields.
 * This replaces the previous approach of creating user_static and then renaming it.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("profiles", (table) => {
    // Primary key and foreign key to users
    table
      .uuid("user_id")
      .primary()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");

    // Original fields from user_static
    table.date("date_of_birth").nullable();
    table
      .string("gender_code")
      .nullable()
      .references("code")
      .inTable("genders")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Additional fields for enhanced profile functionality
    table
      .specificType("alias", "citext")
      .nullable()
      .unique()
      .comment("Public profile alias/username");
    table.text("bio").nullable().comment("User bio/description (0-500 chars)");
    table.uuid("avatar_asset_id").nullable().comment("FK to media.id");
    table
      .string("visibility")
      .notNullable()
      .defaultTo("private")
      .comment("Profile visibility: private, link, public");
    table.string("timezone").nullable().comment("User timezone (e.g., Europe/Berlin)");
    table
      .jsonb("unit_preferences")
      .notNullable()
      .defaultTo(knex.raw("'{}'::jsonb"))
      .comment("User unit preferences: {weight: 'kg', distance: 'km', height: 'cm'}");
  });

  // Add check constraints
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

  // Create indexes
  await knex.raw(`CREATE INDEX idx_profiles_alias ON profiles(alias) WHERE alias IS NOT NULL;`);

  await knex.raw(
    `CREATE INDEX idx_profiles_visibility ON profiles(visibility) WHERE visibility = 'public';`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("profiles");
}
