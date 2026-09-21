import { db } from "../../db/connection.js";

interface RefreshTokenInsert {
  id: string;
  user_id: string;
  token_hash: string;
  session_jti: string;
  expires_at: string;
  created_at: string;
  revoked_at?: string | null;
}

export interface RefreshTokenRecord extends RefreshTokenInsert {
  revoked_at: string | null;
}

export async function insertRefreshToken(row: RefreshTokenInsert): Promise<RefreshTokenRecord[]> {
  // Retry logic to handle transaction visibility issues in test environments
  // When a user is created in one transaction and login happens immediately after,
  // the FK constraint might fail if the user isn't visible to the connection pool yet
  let retries = 0;
  const maxRetries = 10;
  const baseDelay = 100; // ms

  while (retries < maxRetries) {
    try {
      return await db<RefreshTokenRecord>("refresh_tokens").insert(row).returning("*");
    } catch (error: unknown) {
      const err = error as { code?: string; detail?: string; message?: string };
      // Check if it's a FK constraint violation for user_id
      // The detail includes "is not present in table \"users\"" and message includes "refresh_tokens"
      const isFKViolation =
        err.code === "23503" &&
        err.detail?.includes('is not present in table "users"') &&
        (err.message?.includes("refresh_tokens") ||
          err.detail?.includes("refresh_tokens_user_id_foreign"));

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
  throw new Error("Failed to insert refresh token after retries");
}

export async function revokeRefreshByHash(token_hash: string) {
  return db("refresh_tokens")
    .where({ token_hash })
    .update({ revoked_at: new Date().toISOString() });
}

export async function getRefreshByHash(
  token_hash: string,
): Promise<RefreshTokenRecord | undefined> {
  return db<RefreshTokenRecord>("refresh_tokens")
    .where({ token_hash })
    .whereNull("revoked_at")
    .first();
}

export async function revokeRefreshByUserId(user_id: string) {
  return db("refresh_tokens").where({ user_id }).update({ revoked_at: new Date().toISOString() });
}

export async function revokeRefreshBySession(session_jti: string) {
  return db("refresh_tokens")
    .where({ session_jti })
    .update({ revoked_at: new Date().toISOString() });
}

export async function revokeRefreshByUserExceptSession(user_id: string, session_jti: string) {
  return db("refresh_tokens")
    .where({ user_id })
    .whereNot({ session_jti })
    .update({ revoked_at: new Date().toISOString() });
}

export async function findRefreshTokenRaw(
  token_hash: string,
): Promise<RefreshTokenRecord | undefined> {
  return db<RefreshTokenRecord>("refresh_tokens").where({ token_hash }).first();
}
