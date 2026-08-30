import type { Knex } from "knex";

const TRANSLATIONS_TABLE = "translations";
const UNIQUE_TRANSLATION_KEY = "translations_namespace_key_lang_unique";
const PARTIAL_UNIQUE_INDEX = "idx_translations_namespace_key_lang_unique_active";

/**
 * Migration: Replace unique constraint with partial unique index
 *
 * The original unique constraint on (namespace, key_path, language) applies to ALL rows,
 * including deleted ones. This prevents creating new translations when deleted ones exist.
 *
 * This migration:
 * 1. Drops the existing unique constraint
 * 2. Creates a partial unique index that only applies to active (non-deleted) records
 *
 * This allows:
 * - Multiple deleted records with the same key (for audit trail)
 * - Only one active record per (namespace, key_path, language) combination
 * - Proper versioning and restoration of deleted translations
 */
export async function up(knex: Knex): Promise<void> {
  // Drop the existing unique constraint (if it exists)
  await knex.raw(`
    ALTER TABLE ${TRANSLATIONS_TABLE}
    DROP CONSTRAINT IF EXISTS ${UNIQUE_TRANSLATION_KEY}
  `);

  // Drop the partial unique index if it already exists (for idempotency)
  await knex.raw(`DROP INDEX IF EXISTS ${PARTIAL_UNIQUE_INDEX}`);

  // Create a partial unique index that only applies to active records
  // This allows multiple deleted records but only one active record per key combination
  // PostgreSQL's ON CONFLICT works with unique indexes, including partial ones
  await knex.raw(`
    CREATE UNIQUE INDEX ${PARTIAL_UNIQUE_INDEX}
    ON ${TRANSLATIONS_TABLE} (namespace, key_path, language)
    WHERE deleted_at IS NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop the partial unique index
  await knex.raw(`DROP INDEX IF EXISTS ${PARTIAL_UNIQUE_INDEX}`);

  // Restore the original unique constraint
  await knex.raw(`
    ALTER TABLE ${TRANSLATIONS_TABLE}
    ADD CONSTRAINT ${UNIQUE_TRANSLATION_KEY}
    UNIQUE (namespace, key_path, language)
  `);
}
