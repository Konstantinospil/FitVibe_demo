import type { Knex } from "knex";

/**
 * Migration to enhance user_static table to align with TDD profiles design.
 * Adds missing fields: alias, bio, avatar_asset_id, visibility, timezone, unit_preferences.
 * Note: We keep the normalized structure (user_static + user_contacts + user_metrics)
 * but enhance user_static to match TDD profiles specification.
 */
export async function up(knex: Knex): Promise<void> {
  // Rename table from user_static to profiles for consistency with TDD
  await knex.raw(`ALTER TABLE user_static RENAME TO profiles;`);

  // Add new columns to profiles table
  await knex.schema.alterTable("profiles", (table) => {
    // Alias for public profile URL (citext for case-insensitive uniqueness)
    table
      .specificType("alias", "citext")
      .nullable()
      .unique()
      .comment("Public profile alias/username");

    // Bio/description
    table.text("bio").nullable().comment("User bio/description (0-500 chars)");

    // Avatar reference (will be FK to media once that table exists)
    table.uuid("avatar_asset_id").nullable().comment("FK to media.id");

    // Visibility preference for profile
    table
      .string("visibility")
      .notNullable()
      .defaultTo("private")
      .comment("Profile visibility: private, link, public");

    // Timezone preference
    table.string("timezone").nullable().comment("User timezone (e.g., Europe/Berlin)");

    // Unit preferences as JSONB
    table
      .jsonb("unit_preferences")
      .notNullable()
      .defaultTo(knex.raw("'{}'::jsonb"))
      .comment("User unit preferences: {weight: 'kg', distance: 'km', height: 'cm'}");
  });

  // Add check constraint for visibility
  await knex.raw(`
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_visibility_check
    CHECK (visibility IN ('private', 'link', 'public'))
  `);

  // Add check constraint for bio length
  await knex.raw(`
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_bio_length_check
    CHECK (char_length(bio) <= 500)
  `);

  // Create index on alias for fast lookups
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_profiles_alias ON profiles(alias) WHERE alias IS NOT NULL;`,
  );

  // Create index on visibility for public profile queries
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_profiles_visibility ON profiles(visibility) WHERE visibility = 'public';`,
  );
}

export async function down(knex: Knex): Promise<void> {
  // Drop indexes
  await knex.raw(`DROP INDEX IF EXISTS idx_profiles_visibility;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_profiles_alias;`);

  // Drop constraints
  await knex.raw(`ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_bio_length_check;`);
  await knex.raw(`ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_visibility_check;`);

  // Remove added columns
  await knex.schema.alterTable("profiles", (table) => {
    table.dropColumn("unit_preferences");
    table.dropColumn("timezone");
    table.dropColumn("visibility");
    table.dropColumn("avatar_asset_id");
    table.dropColumn("bio");
    table.dropColumn("alias");
  });

  // Rename back to user_static
  await knex.raw(`ALTER TABLE profiles RENAME TO user_static;`);
}
