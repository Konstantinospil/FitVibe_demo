import { db } from "../../db/index.js";
import type { Knex } from "knex";

export interface Pending2FASession {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  ip: string | null;
  user_agent: string | null;
  verified: boolean;
}

interface CreatePending2FASessionInput {
  id: string;
  user_id: string;
  expires_at: string;
  ip: string | null;
  user_agent: string | null;
}

/**
 * Create a pending 2FA session for stage 1 of 2-stage login
 */
export async function createPending2FASession(
  input: CreatePending2FASessionInput,
  trx?: Knex.Transaction,
): Promise<Pending2FASession> {
  const conn = trx ?? db;
  const [session] = await conn<Pending2FASession>("pending_2fa_sessions")
    .insert({
      id: input.id,
      user_id: input.user_id,
      expires_at: input.expires_at,
      ip: input.ip,
      user_agent: input.user_agent,
      verified: false,
    })
    .returning("*");
  if (!session) {
    throw new Error("Failed to create pending 2FA session");
  }
  return session;
}

/**
 * Get a pending 2FA session by ID
 */
export async function getPending2FASession(
  sessionId: string,
  trx?: Knex.Transaction,
): Promise<Pending2FASession | null> {
  const conn = trx ?? db;
  const session = await conn<Pending2FASession>("pending_2fa_sessions")
    .where({ id: sessionId })
    .first();
  return session ?? null;
}

/**
 * Mark a pending 2FA session as verified (prevents reuse)
 */
export async function markPending2FASessionVerified(
  sessionId: string,
  trx?: Knex.Transaction,
): Promise<void> {
  const conn = trx ?? db;
  await conn("pending_2fa_sessions").where({ id: sessionId }).update({ verified: true });
}

/**
 * Delete expired pending 2FA sessions (called by retention job)
 */
export async function deletePending2FASession(
  sessionId: string,
  trx?: Knex.Transaction,
): Promise<void> {
  const conn = trx ?? db;
  await conn("pending_2fa_sessions").where({ id: sessionId }).del();
}

/**
 * Clean up expired pending 2FA sessions (for retention job)
 */
export async function deleteExpiredPending2FASessions(trx?: Knex.Transaction): Promise<number> {
  const conn = trx ?? db;
  const deleted = await conn("pending_2fa_sessions")
    .where("expires_at", "<", new Date().toISOString())
    .del();
  return deleted;
}
