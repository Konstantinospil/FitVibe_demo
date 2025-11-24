import type { Knex } from "knex";

/**
 * Migration to ensure exercises.owner_id column exists and index is correct.
 * Note: Column was already renamed in migration 202510180001, but this ensures
 * the index is properly named and exists.
 */
export async function up(knex: Knex): Promise<void> {
  // Check if column is already owner_id (from previous migration)
  const hasOwnerId = await knex.schema.hasColumn("exercises", "owner_id");
  const hasOwner = await knex.schema.hasColumn("exercises", "owner");

  // Only rename if owner exists and owner_id doesn't
  if (hasOwner && !hasOwnerId) {
    await knex.raw(`ALTER TABLE exercises RENAME COLUMN owner TO owner_id;`);
  }

  // Ensure index exists with correct column name
  await knex.raw(`DROP INDEX IF EXISTS exercises_owner_active_idx;`);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS exercises_owner_active_idx 
    ON exercises(owner_id) WHERE archived_at IS NULL;
  `);
}

export async function down(_knex: Knex): Promise<void> {
  // This migration is idempotent - no-op on rollback
  // The original migration 202510180001 handles the rollback
}
