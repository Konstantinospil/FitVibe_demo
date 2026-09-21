import { db } from "../../db/connection.js";

interface AuthSessionInsert {
  jti: string;
  user_id: string;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
  expires_at: string;
  revoked_at?: string | null;
  last_active_at?: string | null;
}

export interface AuthSessionRecord extends AuthSessionInsert {
  revoked_at: string | null;
  last_active_at: string | null;
}

export async function createAuthSession(row: AuthSessionInsert): Promise<AuthSessionRecord[]> {
  // Retry logic to handle transaction visibility issues in test environments
  // When a user is created in one transaction and login happens immediately after,
  // the FK constraint might fail if the user isn't visible to the connection pool yet
  let retries = 0;
  const maxRetries = 10;
  const baseDelay = 100; // ms

  while (retries < maxRetries) {
    try {
      return await db<AuthSessionRecord>("auth_sessions").insert(row).returning("*");
    } catch (error: unknown) {
      const err = error as { code?: string; detail?: string; message?: string };
      // Check if it's a FK constraint violation for user_id
      // The detail includes "is not present in table \"users\"" and message includes "auth_sessions"
      const isFKViolation =
        err.code === "23503" &&
        err.detail?.includes('is not present in table "users"') &&
        (err.message?.includes("auth_sessions") ||
          err.detail?.includes("auth_sessions_user_id_foreign"));

      if (isFKViolation && retries < maxRetries - 1) {
        // Wait with exponential backoff before retrying
        const delay = baseDelay * Math.pow(2, retries);
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries++;
        continue;
      }
      // Re-throw if not a retryable error or max retries reached
      throw error;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error("Failed to create auth session after retries");
}

export async function findSessionById(jti: string): Promise<AuthSessionRecord | undefined> {
  return db<AuthSessionRecord>("auth_sessions").where({ jti }).first();
}

export async function listSessionsByUserId(user_id: string): Promise<AuthSessionRecord[]> {
  return db<AuthSessionRecord>("auth_sessions").where({ user_id }).orderBy("created_at", "desc");
}

export async function updateSession(
  jti: string,
  patch: {
    expires_at?: string;
    user_agent?: string | null;
    ip?: string | null;
  },
) {
  return db("auth_sessions").where({ jti }).update(patch);
}

export async function revokeSessionById(jti: string) {
  return db("auth_sessions").where({ jti }).update({ revoked_at: new Date().toISOString() });
}

export async function revokeSessionsByUserId(user_id: string, excludeJti?: string) {
  const query = db("auth_sessions").where({ user_id }).whereNull("revoked_at");
  if (excludeJti) {
    query.andWhereNot({ jti: excludeJti });
  }
  return query.update({ revoked_at: new Date().toISOString() });
}

export async function purgeExpiredSessions(olderThan: Date) {
  return db("auth_sessions").where("expires_at", "<", olderThan.toISOString()).del();
}
