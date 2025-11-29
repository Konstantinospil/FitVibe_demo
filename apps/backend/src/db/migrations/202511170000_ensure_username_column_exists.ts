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
 */
export async function up(knex: Knex): Promise<void> {
  // Check if users table exists first
  const tableExists = await knex.schema.hasTable("users");
  if (!tableExists) {
    // Table doesn't exist, nothing to do - original migration will create it

    console.warn("[migration] Users table does not exist yet, skipping username column check");
    return;
  }

  // Check if username column exists using type-safe method
  const columnExists = await knex.schema.hasColumn("users", "username");

  if (!columnExists) {
    console.warn("[migration] Username column missing, adding it now...");
    // Column doesn't exist, add it with the exact specification from the original migration
    // This matches: table.specificType("username", "citext").notNullable().unique();

    // First, check if there are existing rows that would need usernames
    const rowCount = await knex("users").count<{ count: string | number }>("* as count").first();
    const hasRows = rowCount && Number(rowCount.count) > 0;

    if (hasRows) {
      // If there are existing rows, we need to add the column as nullable first,
      // populate it, then make it NOT NULL
      await knex.schema.alterTable("users", (table) => {
        table.specificType("username", "citext").nullable();
      });

      // Generate usernames for existing rows based on their ID

      await knex.raw(`
        UPDATE users
        SET username = 'user_' || id::text
        WHERE username IS NULL
      `);

      // Now add NOT NULL constraint

      await knex.raw(`
        ALTER TABLE users
        ALTER COLUMN username SET NOT NULL
      `);

      // Add UNIQUE constraint (check if it already exists first to avoid errors)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const uniqueExists = await knex.raw(`
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'users'::regclass
          AND conname = 'users_username_unique'
      `);

      const uniqueExistsRows = (uniqueExists as { rows: Array<Record<string, unknown>> }).rows;
      if (uniqueExistsRows.length === 0) {
        await knex.raw(`
          ALTER TABLE users
          ADD CONSTRAINT users_username_unique UNIQUE (username)
        `);
      }
    } else {
      // No existing rows, can add column directly with all constraints
      await knex.schema.alterTable("users", (table) => {
        table.specificType("username", "citext").notNullable().unique();
      });
    }

    console.warn("[migration] Username column added successfully");
  } else {
    console.warn("[migration] Username column already exists, skipping");
  }
  // If column exists, we assume it was created correctly by the original migration
  // No need to modify existing columns as that could cause data issues
}

export async function down(_knex: Knex): Promise<void> {
  // This migration is idempotent - it only adds the column if missing.
  // We don't drop the column in down() as it's a critical column required by the application.
  // If you need to remove it, create a separate migration with proper data migration logic.
}
