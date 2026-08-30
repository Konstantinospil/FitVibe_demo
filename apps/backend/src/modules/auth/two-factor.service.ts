import { authenticator } from "otplib";
import QRCode from "qrcode";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import type { Knex } from "knex";
import { db } from "../../db/connection.js";
import { logger } from "../../config/logger.js";
import { env } from "../../config/index.js";

/**
 * Two-Factor Authentication Service
 * Implements TOTP-based 2FA with backup codes
 */

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface BackupCode {
  id: string;
  code_hash: string;
  used: boolean;
  used_at: string | null;
  created_at: string;
}

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;

/**
 * Generate a new TOTP secret for a user
 * @returns Base32-encoded secret
 */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate QR code URL for TOTP setup
 * @param userEmail - User's email address
 * @param secret - TOTP secret
 * @returns Data URL for QR code image
 */
export async function generateQRCodeUrl(userEmail: string, secret: string): Promise<string> {
  const appName = env.appName ?? "FitVibe";
  const otpauthUrl = authenticator.keyuri(userEmail, appName, secret);

  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    logger.error({ error, userEmail }, "[2fa] Failed to generate QR code");
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Generate backup codes for account recovery
 * @returns Array of plain-text backup codes (show once to user)
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    // Generate cryptographically secure random code
    const code = randomBytes(BACKUP_CODE_LENGTH)
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, BACKUP_CODE_LENGTH)
      .toUpperCase();

    codes.push(code);
  }

  return codes;
}

/**
 * Hash backup codes before storing
 * @param codes - Plain-text backup codes
 * @returns Array of hashed codes
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  const saltRounds = 10;
  const hashedCodes = await Promise.all(codes.map((code) => bcrypt.hash(code, saltRounds)));
  return hashedCodes;
}

/**
 * Verify a TOTP token against a secret
 * @param token - 6-digit TOTP token from user
 * @param secret - User's TOTP secret
 * @returns True if token is valid
 */
export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    // Allow a window of ±1 step (30 seconds before/after) for clock drift
    authenticator.options = { window: 1 };
    return authenticator.verify({ token, secret });
  } catch (error) {
    logger.error({ error }, "[2fa] TOTP verification failed");
    return false;
  }
}

/**
 * Verify a backup code
 * @param code - Plain-text backup code from user
 * @param codeHash - Stored hash to compare against
 * @returns True if code matches
 */
export async function verifyBackupCode(code: string, codeHash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(code, codeHash);
  } catch (error) {
    logger.error({ error }, "[2fa] Backup code verification failed");
    return false;
  }
}

/**
 * Initialize 2FA setup for a user
 * Generates secret, QR code, and backup codes
 * @param userEmail - User's email
 * @returns Setup information (secret, QR code, backup codes)
 */
export async function initializeTwoFactorSetup(userEmail: string): Promise<TwoFactorSetup> {
  const secret = generateTotpSecret();
  const qrCodeUrl = await generateQRCodeUrl(userEmail, secret);
  const backupCodes = generateBackupCodes();

  logger.info({ userEmail }, "[2fa] Initialized 2FA setup");

  return {
    secret,
    qrCodeUrl,
    backupCodes,
  };
}

/**
 * Enable 2FA for a user after verification
 * Stores secret and backup codes
 * @param userId - User ID
 * @param secret - TOTP secret
 * @param backupCodes - Plain-text backup codes
 * @param ipAddress - Request IP address
 * @param userAgent - Request user agent
 * @param trx - Optional transaction
 */
export async function enableTwoFactor(
  userId: string,
  secret: string,
  backupCodes: string[],
  ipAddress: string | null,
  userAgent: string | null,
  trx?: Knex.Transaction,
): Promise<void> {
  const exec = trx ?? db;

  // Hash backup codes
  const hashedCodes = await hashBackupCodes(backupCodes);

  await exec("user_2fa_settings")
    .insert({
      user_id: userId,
      totp_secret: secret,
      is_enabled: true,
      is_verified: true,
      enabled_at: new Date(),
      updated_at: new Date(),
    })
    .onConflict("user_id")
    .merge({
      totp_secret: secret,
      is_enabled: true,
      is_verified: true,
      enabled_at: new Date(),
      updated_at: new Date(),
    });

  await exec("backup_codes").where({ user_id: userId }).del();
  const backupCodeRecords = hashedCodes.map((codeHash) => ({
    user_id: userId,
    code_hash: codeHash,
    is_used: false,
    created_at: new Date(),
  }));
  await exec("backup_codes").insert(backupCodeRecords);

  await exec("audit_log").insert({
    actor_user_id: userId,
    entity_type: "auth",
    action: "2fa_enabled",
    entity_id: userId,
    metadata: {
      backup_codes_count: backupCodes.length,
      ip_address: ipAddress,
      user_agent: userAgent,
    },
    created_at: new Date(),
  });

  logger.info({ userId }, "[2fa] Two-factor authentication enabled");
}

/**
 * Disable 2FA for a user
 * @param userId - User ID
 * @param ipAddress - Request IP address
 * @param userAgent - Request user agent
 * @param trx - Optional transaction
 */
export async function disableTwoFactor(
  userId: string,
  ipAddress: string | null,
  userAgent: string | null,
  trx?: Knex.Transaction,
): Promise<void> {
  const exec = trx ?? db;

  await exec("user_2fa_settings").where({ user_id: userId }).update({
    is_enabled: false,
    totp_secret: "",
    enabled_at: null,
    updated_at: new Date(),
  });

  await exec("backup_codes").where({ user_id: userId }).del();

  await exec("audit_log").insert({
    actor_user_id: userId,
    entity_type: "auth",
    action: "2fa_disabled",
    entity_id: userId,
    metadata: { ip_address: ipAddress, user_agent: userAgent },
    created_at: new Date(),
  });

  logger.info({ userId }, "[2fa] Two-factor authentication disabled");
}

/**
 * Verify 2FA token for login
 * Supports both TOTP and backup codes
 * @param userId - User ID
 * @param token - TOTP token or backup code
 * @param ipAddress - Request IP address
 * @param userAgent - Request user agent
 * @param trx - Optional transaction
 * @returns True if verification successful
 */
export async function verifyTwoFactorToken(
  userId: string,
  token: string,
  ipAddress: string | null,
  userAgent: string | null,
  trx?: Knex.Transaction,
): Promise<boolean> {
  const exec = trx ?? db;

  const settings = await exec("user_2fa_settings")
    .where({ user_id: userId })
    .first<{ totp_secret: string | null; is_enabled: boolean }>();

  if (!settings || !settings.is_enabled || !settings.totp_secret) {
    logger.warn({ userId }, "[2fa] User does not have 2FA enabled");
    return false;
  }

  if (verifyTotpToken(token, settings.totp_secret)) {
    await exec("audit_log").insert({
      actor_user_id: userId,
      entity_type: "auth",
      action: "2fa_verified",
      entity_id: userId,
      metadata: { method: "totp", ip_address: ipAddress, user_agent: userAgent },
      created_at: new Date(),
    });
    logger.info({ userId }, "[2fa] TOTP verification successful");
    return true;
  }

  const backupCodes = await exec("backup_codes")
    .where({ user_id: userId, is_used: false })
    .select<BackupCode[]>("*");

  for (const backupCodeRecord of backupCodes) {
    if (await verifyBackupCode(token, backupCodeRecord.code_hash)) {
      // Mark backup code as used
      await exec("backup_codes").where({ id: backupCodeRecord.id }).update({
        is_used: true,
        used_at: new Date(),
      });

      await exec("audit_log").insert({
        actor_user_id: userId,
        entity_type: "auth",
        action: "2fa_backup_code_used",
        entity_id: userId,
        metadata: {
          backup_code_id: backupCodeRecord.id,
          ip_address: ipAddress,
          user_agent: userAgent,
        },
        created_at: new Date(),
      });

      logger.info({ userId, backupCodeId: backupCodeRecord.id }, "[2fa] Backup code used");
      return true;
    }
  }

  // Failed verification
  await exec("audit_log").insert({
    actor_user_id: userId,
    entity_type: "auth",
    action: "2fa_failed_verification",
    entity_id: userId,
    metadata: { ip_address: ipAddress, user_agent: userAgent },
    created_at: new Date(),
  });

  logger.warn({ userId }, "[2fa] Verification failed");
  return false;
}

/**
 * Regenerate backup codes for a user
 * Invalidates all existing backup codes
 * @param userId - User ID
 * @param ipAddress - Request IP address
 * @param userAgent - Request user agent
 * @param trx - Optional transaction
 * @returns New plain-text backup codes
 */
export async function regenerateBackupCodes(
  userId: string,
  ipAddress: string | null,
  userAgent: string | null,
  trx?: Knex.Transaction,
): Promise<string[]> {
  const exec = trx ?? db;

  // Delete old backup codes
  await exec("backup_codes").where({ user_id: userId }).del();

  const backupCodes = generateBackupCodes();
  const hashedCodes = await hashBackupCodes(backupCodes);

  const backupCodeRecords = hashedCodes.map((codeHash) => ({
    user_id: userId,
    code_hash: codeHash,
    is_used: false,
    created_at: new Date(),
  }));

  await exec("backup_codes").insert(backupCodeRecords);

  await exec("audit_log").insert({
    actor_user_id: userId,
    entity_type: "auth",
    action: "2fa_backup_codes_generated",
    entity_id: userId,
    metadata: {
      backup_codes_count: backupCodes.length,
      ip_address: ipAddress,
      user_agent: userAgent,
    },
    created_at: new Date(),
  });

  logger.info({ userId }, "[2fa] Backup codes regenerated");

  return backupCodes;
}

/**
 * Get backup code statistics for a user
 * @param userId - User ID
 * @param trx - Optional transaction
 * @returns Backup code counts
 */
export async function getBackupCodeStats(
  userId: string,
  trx?: Knex.Transaction,
): Promise<{ total: number; used: number; remaining: number }> {
  const exec = trx ?? db;

  const result = await exec("backup_codes")
    .where({ user_id: userId })
    .select(exec.raw("COUNT(*) as total, SUM(CASE WHEN is_used THEN 1 ELSE 0 END) as used"))
    .first<{ total: string; used: string }>();

  const total = parseInt(result?.total ?? "0", 10);
  const used = parseInt(result?.used ?? "0", 10);

  return {
    total,
    used,
    remaining: total - used,
  };
}
