import type { Knex } from "knex";
import db from "../../apps/backend/src/db/index.js";

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
 */
export async function truncateAll(): Promise<void> {
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
    await db.raw(`TRUNCATE TABLE ${table} CASCADE`);
  }
  await db.raw("SET session_replication_role = 'origin'");
}
