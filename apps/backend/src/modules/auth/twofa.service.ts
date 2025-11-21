import crypto from "crypto";
import { authenticator } from "@otplib/preset-default";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../db/connection.js";
import type { Knex } from "knex";
import { HttpError } from "../../utils/http.js";

const APP_NAME = "FitVibe";
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;

// Configure TOTP settings
authenticator.options = {
  window: 1, // Allow 1 step before/after for clock drift
  step: 30, // 30 second time step
};

interface User2FASettings {
  id: string;
  user_id: string;
  totp_secret: string;
  is_enabled: boolean;
  is_verified: boolean;
  recovery_email: string | null;
  recovery_phone: string | null;
  enabled_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BackupCode {
  id: string;
  user_id: string;
  code_hash: string;
  is_used: boolean;
  used_at: string | null;
  generation_batch: number;
  created_at: string;
}

/**
 * Generate a new TOTP secret for a user
 * Returns the secret and a QR code data URL for easy setup
 */
export async function setupTwoFactor(
  userId: string,
  userEmail: string,
  trx?: Knex.Transaction,
): Promise<{
  secret: string;
  qrCode: string;
  backupCodes: string[];
}> {
  const exec = trx ?? db;

  // Check if user already has 2FA settings
  const existing = await exec<User2FASettings>("user_2fa_settings")
    .where({ user_id: userId })
    .first();

  if (existing && existing.is_enabled) {
    throw new HttpError(400, "2FA_ALREADY_ENABLED", "Two-factor authentication is already enabled");
  }

  // Generate new TOTP secret
  const secret = authenticator.generateSecret();

  // Generate QR code
  const otpauthUrl = authenticator.keyuri(userEmail, APP_NAME, secret);

  const qrCode: string = await QRCode.toDataURL(otpauthUrl);

  // Generate backup codes
  const backupCodes = await generateBackupCodes(userId, 1, trx);

  const now = new Date().toISOString();

  if (existing) {
    // Update existing record
    await exec("user_2fa_settings").where({ id: existing.id }).update({
      totp_secret: secret,
      is_enabled: false,
      is_verified: false,
      updated_at: now,
    });
  } else {
    // Create new record
    await exec("user_2fa_settings").insert({
      id: uuidv4(),
      user_id: userId,
      totp_secret: secret,
      is_enabled: false,
      is_verified: false,
      recovery_email: null,
      recovery_phone: null,
      enabled_at: null,
      last_used_at: null,
      created_at: now,
      updated_at: now,
    });
  }

  return {
    secret,
    qrCode,
    backupCodes,
  };
}

/**
 * Verify TOTP code and enable 2FA for the user
 */
export async function verifyAndEnable2FA(
  userId: string,
  code: string,
  trx?: Knex.Transaction,
): Promise<boolean> {
  const exec = trx ?? db;

  const settings = await exec<User2FASettings>("user_2fa_settings")
    .where({ user_id: userId })
    .first();

  if (!settings) {
    throw new HttpError(404, "2FA_NOT_SETUP", "Two-factor authentication has not been set up");
  }

  if (settings.is_enabled && settings.is_verified) {
    throw new HttpError(400, "2FA_ALREADY_ENABLED", "Two-factor authentication is already enabled");
  }

  // Verify the TOTP code
  const isValid: boolean = authenticator.verify({
    token: code,
    secret: settings.totp_secret,
  });

  if (!isValid) {
    throw new HttpError(401, "INVALID_2FA_CODE", "Invalid verification code");
  }

  // Enable 2FA
  const now = new Date().toISOString();
  await exec("user_2fa_settings").where({ id: settings.id }).update({
    is_enabled: true,
    is_verified: true,
    enabled_at: now,
    last_used_at: now,
    updated_at: now,
  });

  // Audit log
  await exec("audit_log").insert({
    id: uuidv4(),
    actor_user_id: userId,
    action: "2fa_enabled",
    entity_type: "auth",
    metadata: {},
    created_at: now,
  });

  return true;
}

/**
 * Verify a TOTP code during login
 */
export async function verify2FACode(
  userId: string,
  code: string,
  trx?: Knex.Transaction,
): Promise<boolean> {
  const exec = trx ?? db;

  const settings = await exec<User2FASettings>("user_2fa_settings")
    .where({ user_id: userId, is_enabled: true })
    .first();

  if (!settings) {
    return false;
  }

  // Try TOTP code first
  const isValidTOTP = authenticator.verify({
    token: code,
    secret: settings.totp_secret,
  });

  if (isValidTOTP) {
    // Update last used timestamp
    await exec("user_2fa_settings").where({ id: settings.id }).update({
      last_used_at: new Date().toISOString(),
    });
    return true;
  }

  // Try backup codes
  const isValidBackup = await verifyBackupCode(userId, code, trx);
  if (isValidBackup) {
    return true;
  }

  return false;
}

/**
 * Disable 2FA for a user (requires password confirmation)
 */
export async function disable2FA(
  userId: string,
  password: string,
  userPasswordHash: string,
  trx?: Knex.Transaction,
): Promise<boolean> {
  // Verify password
  const passwordValid = await bcrypt.compare(password, userPasswordHash);
  if (!passwordValid) {
    throw new HttpError(401, "INVALID_PASSWORD", "Invalid password");
  }

  const exec = trx ?? db;

  const settings = await exec<User2FASettings>("user_2fa_settings")
    .where({ user_id: userId })
    .first();

  if (!settings || !settings.is_enabled) {
    throw new HttpError(404, "2FA_NOT_ENABLED", "Two-factor authentication is not enabled");
  }

  // Disable 2FA
  const now = new Date().toISOString();
  await exec("user_2fa_settings").where({ id: settings.id }).update({
    is_enabled: false,
    enabled_at: null,
    updated_at: now,
  });

  // Invalidate all backup codes
  await exec("backup_codes").where({ user_id: userId }).del();

  // Audit log
  await exec("audit_log").insert({
    id: uuidv4(),
    actor_user_id: userId,
    action: "2fa_disabled",
    entity_type: "auth",
    metadata: {},
    created_at: now,
  });

  return true;
}

/**
 * Check if user has 2FA enabled
 */
export async function is2FAEnabled(userId: string, trx?: Knex.Transaction): Promise<boolean> {
  const exec = trx ?? db;

  const settings = await exec<User2FASettings>("user_2fa_settings")
    .where({ user_id: userId, is_enabled: true })
    .first();

  return !!settings;
}

/**
 * Generate new backup codes (invalidates old ones from same batch)
 */
export async function generateBackupCodes(
  userId: string,
  batch: number,
  trx?: Knex.Transaction,
): Promise<string[]> {
  const exec = trx ?? db;
  const codes: string[] = [];
  const now = new Date().toISOString();

  // Delete old codes from this batch
  await exec("backup_codes").where({ user_id: userId, generation_batch: batch }).del();

  // Generate new codes
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = generateBackupCode();
    const codeHash = await bcrypt.hash(code, 10);

    await exec("backup_codes").insert({
      id: uuidv4(),
      user_id: userId,
      code_hash: codeHash,
      is_used: false,
      used_at: null,
      generation_batch: batch,
      created_at: now,
    });

    codes.push(code);
  }

  // Audit log
  await exec("audit_log").insert({
    id: uuidv4(),
    actor_user_id: userId,
    action: "2fa_backup_codes_generated",
    entity_type: "auth",
    metadata: { batch, count: BACKUP_CODE_COUNT },
    created_at: now,
  });

  return codes;
}

/**
 * Verify and consume a backup code
 */
async function verifyBackupCode(
  userId: string,
  code: string,
  trx?: Knex.Transaction,
): Promise<boolean> {
  const exec = trx ?? db;

  // Get all unused backup codes for this user
  const backupCodes = await exec<BackupCode>("backup_codes").where({
    user_id: userId,
    is_used: false,
  });

  for (const storedCode of backupCodes) {
    const isValid = await bcrypt.compare(code, storedCode.code_hash);
    if (isValid) {
      // Mark code as used
      await exec("backup_codes").where({ id: storedCode.id }).update({
        is_used: true,
        used_at: new Date().toISOString(),
      });
      return true;
    }
  }

  return false;
}

/**
 * Get remaining backup codes count
 */
export async function getRemainingBackupCodesCount(
  userId: string,
  trx?: Knex.Transaction,
): Promise<number> {
  const exec = trx ?? db;

  const result = await exec("backup_codes")
    .where({ user_id: userId, is_used: false })
    .count<{ count: string | number }>("* as count")
    .first();

  return Number(result?.count ?? 0);
}

/**
 * Generate a human-readable backup code
 * Format: XXXX-XXXX (8 alphanumeric characters with dash)
 */
function generateBackupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude ambiguous characters
  let code = "";

  for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    code += chars[randomIndex];

    // Add dash in the middle
    if (i === BACKUP_CODE_LENGTH / 2 - 1) {
      code += "-";
    }
  }

  return code;
}
