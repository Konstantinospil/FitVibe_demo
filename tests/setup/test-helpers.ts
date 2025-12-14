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
