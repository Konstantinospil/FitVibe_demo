import type { Knex } from "knex";

/**
 * Migration to add alias_changed_at column to profiles table
 * for alias change rate limiting (Epic 1: Profile & Settings security fix).
 *
 * This allows tracking when a user last changed their alias to enforce
 * rate limiting (maximum 1 change per 30 days).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("profiles", (table) => {
    table
      .timestamp("alias_changed_at")
      .nullable()
      .comment("Timestamp of last alias change for rate limiting (max 1 per 30 days)");
  });

  // Set alias_changed_at to updated_at for existing profiles with aliases
  // This provides a reasonable default for existing users
  await knex.raw(`
    UPDATE profiles
    SET alias_changed_at = updated_at
    WHERE alias IS NOT NULL
      AND alias_changed_at IS NULL;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("profiles", (table) => {
    table.dropColumn("alias_changed_at");
  });
}
