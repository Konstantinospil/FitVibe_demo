import type { Knex } from "knex";

// Lazy import to avoid database connection during module load
// This prevents issues when test-helpers.ts is parsed but not used (e.g., in unit tests)
let dbInstance: Knex | null = null;

async function getDb(): Promise<Knex> {
  if (!dbInstance) {
    const dbModule = await import("../../apps/backend/src/db/index.js");
    dbInstance = dbModule.default;
  }
  return dbInstance;
}

export function createTestId(prefix: string = "test"): string {
  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function within a database transaction that will be rolled back.
 * Useful for integration tests to ensure test data is cleaned up.
 */
export async function withTransaction<T>(
  callback: (trx: Knex.Transaction) => Promise<T>,
): Promise<T> {
  const db = await getDb();
  return await db.transaction(async (trx) => {
    try {
      const result = await callback(trx);
      // Rollback the transaction to clean up test data
      await trx.rollback();
      return result;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  });
}

/**
 * Ensure roles are seeded in the database.
 * This is needed for integration tests that create users with role_code.
 * Uses onConflict to safely handle cases where roles already exist.
 */
export async function ensureRolesSeeded(): Promise<void> {
  const db = await getDb();
  const ROLES = [
    { code: "admin", description: "Platform administrator" },
    { code: "coach", description: "Coach / trainer with team oversight" },
    { code: "athlete", description: "Individual athlete" },
    { code: "support", description: "Support staff (nutrition, physio, etc.)" },
  ];

  try {
    await db("roles").insert(ROLES).onConflict("code").ignore();
  } catch (error) {
    // Silently skip if roles table doesn't exist (migrations haven't run)
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("does not exist") || errorMessage.includes("relation")) {
      return;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Wraps an async function with better error handling for database connection issues.
 * Provides clearer error messages when database connection fails.
 */
export async function withDatabaseErrorHandling<T>(
  fn: () => Promise<T>,
  context: string = "operation",
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Re-throw with more context for debugging
    let errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Handle AggregateError - check for ECONNREFUSED which indicates database connection issue
    if (error instanceof AggregateError) {
      const errorCode = (error as { code?: string }).code;
      if (errorCode === "ECONNREFUSED") {
        errorMessage = `Database connection refused (ECONNREFUSED). Ensure PostgreSQL is running and accessible. Check PGHOST, PGPORT, PGUSER, PGPASSWORD, and PGDATABASE environment variables.`;
      } else {
        // Handle other AggregateError cases
        const errorDetails: string[] = [];
        errorDetails.push(`AggregateError: ${error.message || "no message"}`);
        if (errorCode) {
          errorDetails.push(`Error code: ${errorCode}`);
        }
        if (error.errors && error.errors.length > 0) {
          errorDetails.push(`Contains ${error.errors.length} error(s):`);
          error.errors.forEach((e, i) => {
            const msg = e instanceof Error ? e.message : String(e);
            const code = (e as { code?: string }).code;
            errorDetails.push(`  Error ${i + 1}: ${msg}${code ? ` (code: ${code})` : ""}`);
          });
        }
        errorMessage = errorDetails.join("\n");
      }
    } else if ((error as { code?: string }).code === "ECONNREFUSED") {
      errorMessage = `Database connection refused (ECONNREFUSED). Ensure PostgreSQL is running and accessible.`;
    }

    throw new Error(
      `${context} failed: ${errorMessage}${errorStack ? `\nStack: ${errorStack}` : ""}`,
    );
  }
}

/**
 * Check if the database is available for integration tests.
 * Returns true if database connection can be established, false otherwise.
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    const db = await getDb();
    await db.raw("SELECT 1");
    return true;
  } catch (error) {
    const errorCode = (error as { code?: string }).code;
    if (errorCode === "ECONNREFUSED" || error instanceof AggregateError) {
      return false;
    }
    // For other errors, assume database is available but there might be other issues
    // (e.g., migrations not run, permissions, etc.)
    return true;
  }
}

/**
 * Ensures the username column exists in the users table.
 * This is a safety check to ensure migrations have been applied.
 * Idempotent - safe to call multiple times.
 */
export async function ensureUsernameColumnExists(): Promise<void> {
  const db = await getDb();

  // First, ensure citext extension is enabled (required for username column)
  try {
    await db.raw('CREATE EXTENSION IF NOT EXISTS "citext";');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // If citext extension is not available, create a domain as fallback
    if (
      errorMessage.includes("could not open extension control file") ||
      (errorMessage.includes("extension") && errorMessage.includes("does not exist"))
    ) {
      await db.raw(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'citext') THEN
            CREATE DOMAIN citext AS text;
          END IF;
        END $$;
      `);
    } else if (
      errorMessage.includes("duplicate key value violates unique constraint") ||
      errorMessage.includes("pg_extension_name_index")
    ) {
      // Extension is being created concurrently, verify it exists now
      const checkExt = await db.raw(`SELECT 1 FROM pg_extension WHERE extname = 'citext'`);
      const checkExtRows = (checkExt as { rows: Array<Record<string, unknown>> }).rows;
      if (checkExtRows.length === 0) {
        // Extension doesn't exist yet, wait a bit and retry once
        await new Promise((resolve) => setTimeout(resolve, 100));
        try {
          await db.raw('CREATE EXTENSION IF NOT EXISTS "citext";');
        } catch (retryError: unknown) {
          // If it still fails, check if it exists now (might have been created by another process)
          const checkAgain = await db.raw(`SELECT 1 FROM pg_extension WHERE extname = 'citext'`);
          const checkAgainRows = (checkAgain as { rows: Array<Record<string, unknown>> }).rows;
          if (checkAgainRows.length === 0) {
            // Still doesn't exist and retry failed, create domain fallback
            await db.raw(`
              DO $$
              BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'citext') THEN
                  CREATE DOMAIN citext AS text;
                END IF;
              END $$;
            `);
          }
        }
      }
    }
    // For other errors, continue - the extension might already exist
  }

  // Check if users table exists
  const hasUsersTable = await db.schema.hasTable("users");
  if (!hasUsersTable) {
    return; // Table doesn't exist yet, migrations will create it
  }

  // Check if username column already exists
  const hasUsernameColumn = await db.schema.hasColumn("users", "username");
  if (hasUsernameColumn) {
    return; // Column already exists, nothing to do
  }

  // Column doesn't exist - add it using the same logic as the migration
  const rowCount = await db("users").count<{ count: string | number }>("* as count").first();
  const hasRows = rowCount !== undefined && Number(rowCount.count) > 0;

  if (hasRows) {
    // Table has existing rows: add nullable, populate, then make NOT NULL
    await db.schema.alterTable("users", (table) => {
      table.specificType("username", "citext").nullable();
    });

    // Populate username for existing rows
    await db.raw(`
      UPDATE users
      SET username = 'user_' || id::text
      WHERE username IS NULL
    `);

    // Make NOT NULL using raw SQL
    await db.raw(`
      ALTER TABLE users
      ALTER COLUMN username SET NOT NULL
    `);
  } else {
    // No existing rows: can add with all constraints at once
    await db.schema.alterTable("users", (table) => {
      table.specificType("username", "citext").notNullable();
    });
  }

  // Add UNIQUE constraint if it doesn't exist
  await db.raw(`
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

/**
 * Truncate all tables in the test database.
 * Use with caution - only in test environments.
 * Silently skips tables that don't exist (e.g., if migrations haven't run yet).
 * Note: Does NOT truncate roles table - roles are needed for foreign key constraints.
 * Ensures roles are seeded after truncation.
 */
export async function truncateAll(): Promise<void> {
  const db = await getDb();
  const tables = [
    "idempotency_keys",
    "audit_log",
    "feed_reports",
    "feed_comments",
    "feed_likes",
    "feed_items", // Changed from "feed_posts"
    "session_bookmarks",
    "user_blocks",
    "followers",
    "badges",
    "badge_catalog",
    "user_points",
    "exercise_sets",
    "session_exercises",
    "sessions",
    "plans",
    "exercises",
    "exercise_types",
    "user_metrics",
    "user_state_history",
    "auth_sessions",
    "pending_2fa_sessions",
    "user_contacts",
    "profiles",
    "users",
    // Brute force protection tables
    "failed_login_attempts",
    "failed_login_attempts_by_ip",
    // Removed "user_streaks" - doesn't exist
    // Removed "feed_posts" - use "feed_items" instead
    // Removed other legacy table names
    // Note: "roles" is NOT truncated - it's needed for foreign key constraints
  ];

  // Disable foreign key checks temporarily
  await db.raw("SET session_replication_role = 'replica'");
  for (const table of tables) {
    try {
      await db.raw(`TRUNCATE TABLE ${table} CASCADE`);
    } catch (error) {
      // Silently skip tables that don't exist (e.g., if migrations haven't run)
      // This allows tests to run even if some tables haven't been created yet
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("does not exist") || errorMessage.includes("relation")) {
        // Table doesn't exist, skip it
        continue;
      }
      // Re-throw other errors (permissions, etc.)
      throw error;
    }
  }
  await db.raw("SET session_replication_role = 'origin'");

  // Ensure roles are seeded after truncation (roles table is not truncated)
  await ensureRolesSeeded();
}
