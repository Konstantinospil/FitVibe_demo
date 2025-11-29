import type { Knex } from "knex";

/**
 * Idempotent migration to ensure username column exists in users table.
 *
 * This migration aligns with:
 * - ERD: citext username UNIQUE (docs/2.Technical_Design_Document/2.g.Diagramms/erd-full.mmd)
 * - Original migration: 202510140006_create_users_table.ts creates username as citext NOT NULL UNIQUE
 *
 * This is a safety migration to ensure the column exists even if the original
 * migration didn't run or was partially applied. It matches the exact specification
 * from the original migration.
 *
 * DESIGN: Uses the same pattern as other idempotent migrations in this codebase
 * (e.g., 202510260200_add_archived_at_columns.ts). Knex's hasColumn() and alterTable()
 * respect the search_path, making this work correctly in all environments including
 * test schemas (tmp_migration_test) and production (public schema).
 */
export async function up(knex: Knex): Promise<void> {
  // Early exit if table doesn't exist
  if (!(await knex.schema.hasTable("users"))) {
    return;
  }

  // Check if column already exists (idempotent check)
  // Knex's hasColumn() respects the search_path automatically
  const hasUsernameColumn = await knex.schema.hasColumn("users", "username");
  if (hasUsernameColumn) {
    return;
  }

  // Column doesn't exist - add it
  // For existing tables with rows, we need to handle NOT NULL constraint carefully
  const rowCount = await knex("users").count<{ count: string | number }>("* as count").first();
  const hasRows = rowCount !== undefined && Number(rowCount.count) > 0;

  if (hasRows) {
    // Table has existing rows: add nullable, populate, then make NOT NULL
    await knex.schema.alterTable("users", (table) => {
      table.specificType("username", "citext").nullable();
    });

    // Populate username for existing rows
    await knex.raw(`
      UPDATE users
      SET username = 'user_' || id::text
      WHERE username IS NULL
    `);

    // Make NOT NULL using raw SQL (Knex doesn't have direct support for this)
    await knex.raw(`
      ALTER TABLE users
      ALTER COLUMN username SET NOT NULL
    `);
  } else {
    // No existing rows: can add with all constraints at once
    await knex.schema.alterTable("users", (table) => {
      table.specificType("username", "citext").notNullable();
    });
  }

  // Add UNIQUE constraint if it doesn't exist
  // Using DO block pattern for idempotency (similar to codebase patterns)
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        JOIN pg_class cls ON cls.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = cls.relnamespace
        WHERE cls.relname = 'users'
          AND c.contype = 'u'
          AND a.attname = 'username'
          AND n.nspname IN (SELECT unnest(current_schemas(false)))
      ) THEN
        ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
      END IF;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END $$;
  `);
}

export async function down(_knex: Knex): Promise<void> {
  // This migration is idempotent - it only adds the column if missing.
  // We don't drop the column in down() as it's a critical column required by the application.
  // If you need to remove it, create a separate migration with proper data migration logic.
}
