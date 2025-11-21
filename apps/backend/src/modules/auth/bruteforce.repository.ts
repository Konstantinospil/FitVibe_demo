import crypto from "crypto";
import type { Knex } from "knex";
import { db } from "../../db/connection.js";

const TABLE = "failed_login_attempts";

export interface FailedLoginAttempt {
  id: string;
  identifier: string;
  ip_address: string;
  user_agent: string | null;
  attempt_count: number;
  locked_until: string | null;
  last_attempt_at: string;
  first_attempt_at: string;
  created_at: string;
  updated_at: string;
}

interface FailedLoginRow {
  id: string;
  identifier: string;
  ip_address: string;
  user_agent: string | null;
  attempt_count: number | string;
  locked_until: Date | string | null;
  last_attempt_at: Date | string;
  first_attempt_at: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
}

function withDb(trx?: Knex.Transaction) {
  return trx ?? db;
}

function toIsoString(value: unknown): string {
  if (!value) {
    return new Date().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return new Date(value as number).toISOString();
}

function toRecord(row: FailedLoginRow): FailedLoginAttempt {
  return {
    id: row.id,
    identifier: row.identifier,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    attempt_count: Number(row.attempt_count),
    locked_until: row.locked_until ? toIsoString(row.locked_until) : null,
    last_attempt_at: toIsoString(row.last_attempt_at),
    first_attempt_at: toIsoString(row.first_attempt_at),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

/**
 * Get failed login attempt record for identifier + IP combination
 */
export async function getFailedAttempt(
  identifier: string,
  ipAddress: string,
  trx?: Knex.Transaction,
): Promise<FailedLoginAttempt | null> {
  const exec = withDb(trx);
  const normalizedIdentifier = identifier.toLowerCase().trim();

  const row = await exec<FailedLoginRow>(TABLE)
    .where({ identifier: normalizedIdentifier, ip_address: ipAddress })
    .first();

  return row ? toRecord(row) : null;
}

/**
 * Record a failed login attempt
 * Returns the updated attempt record with new count and potential lockout
 */
export async function recordFailedAttempt(
  identifier: string,
  ipAddress: string,
  userAgent: string | null,
  trx?: Knex.Transaction,
): Promise<FailedLoginAttempt> {
  const exec = withDb(trx);
  const normalizedIdentifier = identifier.toLowerCase().trim();
  const now = new Date().toISOString();

  // Check if record exists
  const existing = await getFailedAttempt(normalizedIdentifier, ipAddress, trx);

  if (existing) {
    // Calculate lockout duration based on attempt count
    const newAttemptCount = existing.attempt_count + 1;
    const lockedUntil = calculateLockoutDuration(newAttemptCount);

    // Update existing record
    await exec(TABLE).where({ id: existing.id }).update({
      attempt_count: newAttemptCount,
      locked_until: lockedUntil,
      last_attempt_at: now,
      updated_at: now,
    });

    return {
      ...existing,
      attempt_count: newAttemptCount,
      locked_until: lockedUntil,
      last_attempt_at: now,
      updated_at: now,
    };
  }

  // Create new record
  const id = crypto.randomUUID();
  const lockedUntil = calculateLockoutDuration(1);

  await exec(TABLE).insert({
    id,
    identifier: normalizedIdentifier,
    ip_address: ipAddress,
    user_agent: userAgent,
    attempt_count: 1,
    locked_until: lockedUntil,
    last_attempt_at: now,
    first_attempt_at: now,
    created_at: now,
    updated_at: now,
  });

  return {
    id,
    identifier: normalizedIdentifier,
    ip_address: ipAddress,
    user_agent: userAgent,
    attempt_count: 1,
    locked_until: lockedUntil,
    last_attempt_at: now,
    first_attempt_at: now,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Reset failed attempts on successful login
 */
export async function resetFailedAttempts(
  identifier: string,
  ipAddress: string,
  trx?: Knex.Transaction,
): Promise<void> {
  const exec = withDb(trx);
  const normalizedIdentifier = identifier.toLowerCase().trim();

  await exec(TABLE).where({ identifier: normalizedIdentifier, ip_address: ipAddress }).del();
}

/**
 * Calculate lockout duration based on failed attempt count
 * Progressive lockout strategy:
 * - 1-4 attempts: No lockout
 * - 5-9 attempts: 15 minutes
 * - 10-19 attempts: 1 hour
 * - 20+ attempts: 24 hours
 */
function calculateLockoutDuration(attemptCount: number): string | null {
  if (attemptCount < 5) {
    return null; // No lockout yet
  }

  const now = new Date();

  if (attemptCount < 10) {
    // 15 minute lockout
    now.setMinutes(now.getMinutes() + 15);
  } else if (attemptCount < 20) {
    // 1 hour lockout
    now.setHours(now.getHours() + 1);
  } else {
    // 24 hour lockout
    now.setHours(now.getHours() + 24);
  }

  return now.toISOString();
}

/**
 * Check if account is currently locked
 * Returns true if locked, false if not locked or lockout expired
 */
export function isAccountLocked(attempt: FailedLoginAttempt | null): boolean {
  if (!attempt || !attempt.locked_until) {
    return false;
  }

  const now = new Date();
  const lockoutExpiry = new Date(attempt.locked_until);

  return now < lockoutExpiry;
}

/**
 * Get remaining lockout time in seconds
 */
export function getRemainingLockoutSeconds(attempt: FailedLoginAttempt | null): number {
  if (!attempt || !attempt.locked_until) {
    return 0;
  }

  const now = new Date();
  const lockoutExpiry = new Date(attempt.locked_until);

  if (now >= lockoutExpiry) {
    return 0;
  }

  return Math.ceil((lockoutExpiry.getTime() - now.getTime()) / 1000);
}

/**
 * Cleanup old failed attempt records (older than 30 days)
 * Should be run periodically via cron job
 */
export async function cleanupOldAttempts(trx?: Knex.Transaction): Promise<number> {
  const exec = withDb(trx);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const deleted = await exec(TABLE).where("last_attempt_at", "<", cutoff.toISOString()).del();

  return deleted;
}
