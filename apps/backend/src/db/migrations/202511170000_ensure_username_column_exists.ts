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
    return;
  }

  // Check if username column exists using information_schema which works across schemas
  // We need to check all schemas in the search_path to find where the table actually is
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const columnCheck = await knex.raw(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema IN (
        SELECT unnest(current_schemas(false))
      )
        AND table_name = 'users'
        AND column_name = 'username'
    ) AS exists
  `);

  const columnCheckResult = (columnCheck as { rows: Array<{ exists: boolean }> }).rows[0];
  const columnExists = columnCheckResult?.exists === true;

  if (columnExists) {
    // Column already exists, nothing to do
    return;
  }

  // Column doesn't exist, add it with the exact specification from the original migration
  // This matches: table.specificType("username", "citext").notNullable().unique();
  // Use a DO block to make it truly idempotent
  await knex.raw(`
    DO $$
    BEGIN
      -- Check again right before adding to avoid race conditions
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema IN (
          SELECT unnest(current_schemas(false))
        )
          AND table_name = 'users'
          AND column_name = 'username'
      ) THEN
        -- First check if there are existing rows
        IF EXISTS (SELECT 1 FROM users LIMIT 1) THEN
          -- Add column as nullable first
          ALTER TABLE users ADD COLUMN username citext;
          
          -- Generate usernames for existing rows
          UPDATE users SET username = 'user_' || id::text WHERE username IS NULL;
          
          -- Make it NOT NULL
          ALTER TABLE users ALTER COLUMN username SET NOT NULL;
          
          -- Add UNIQUE constraint if it doesn't exist
          -- Check for any unique constraint on username column, not just by name
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
            WHERE c.conrelid = 'users'::regclass
              AND c.contype = 'u'
              AND a.attname = 'username'
          ) THEN
            ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
          END IF;
        ELSE
          -- No existing rows, add with all constraints at once
          ALTER TABLE users ADD COLUMN username citext NOT NULL;
          
          -- Add UNIQUE constraint if it doesn't exist
          -- Check for any unique constraint on username column, not just by name
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
            WHERE c.conrelid = 'users'::regclass
              AND c.contype = 'u'
              AND a.attname = 'username'
          ) THEN
            ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
          END IF;
        END IF;
      END IF;
    EXCEPTION
      WHEN duplicate_column THEN
        -- Column was added between check and add, that's fine
        NULL;
      WHEN duplicate_object THEN
        -- Constraint already exists, that's fine
        NULL;
    END $$;
  `);
}

export async function down(_knex: Knex): Promise<void> {
  // This migration is idempotent - it only adds the column if missing.
  // We don't drop the column in down() as it's a critical column required by the application.
  // If you need to remove it, create a separate migration with proper data migration logic.
}
