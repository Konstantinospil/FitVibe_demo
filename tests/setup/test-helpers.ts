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
 * Truncate all tables in the test database.
 * Use with caution - only in test environments.
 * Silently skips tables that don't exist (e.g., if migrations haven't run yet).
 */
export async function truncateAll(): Promise<void> {
  const db = await getDb();
  const tables = [
    "idempotency_keys",
    "audit_logs",
    "feed_reactions",
    "feed_bookmarks",
    "feed_posts",
    "session_exercises",
    "sessions",
    "exercises",
    "exercise_types",
    "training_plans",
    "points_history",
    "user_badges",
    "user_streaks",
    "refresh_tokens",
    "auth_sessions",
    "auth_tokens",
    "pending_2fa_sessions",
    "user_contacts",
    "users",
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
}
