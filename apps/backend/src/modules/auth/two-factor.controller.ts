import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { HttpError } from "../../utils/http.js";
import {
  initializeTwoFactorSetup,
  enableTwoFactor,
  disableTwoFactor,
  verifyTotpToken,
  regenerateBackupCodes,
  getBackupCodeStats,
} from "./two-factor.service.js";
import { db } from "../../db/connection.js";
import { logger } from "../../config/logger.js";

/**
 * Validation schemas
 */
const EnableTwoFactorSchema = z.object({
  secret: z.string().min(16),
  token: z.string().regex(/^\d{6}$/, "Token must be 6 digits"),
});

const VerifyTwoFactorSchema = z.object({
  token: z.string().min(6).max(8), // TOTP (6) or backup code (8)
});

const DisableTwoFactorSchema = z.object({
  password: z.string().min(1),
  token: z.string().min(6).max(8), // Require 2FA token to disable
});

/**
 * Initialize 2FA setup
 * GET /api/v1/auth/2fa/setup
 * Returns secret, QR code, and backup codes
 */
export async function setup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new HttpError(401, "E.UNAUTHENTICATED", "Authentication required");
    }

    // Get user email
    const user = await db("users")
      .where({ id: userId })
      .select("email", "two_factor_enabled")
      .first<{ email: string; two_factor_enabled: boolean }>();

    if (!user) {
      throw new HttpError(404, "E.USER.NOT_FOUND", "User not found");
    }

    if (user.two_factor_enabled) {
      throw new HttpError(
        400,
        "E.2FA.ALREADY_ENABLED",
        "Two-factor authentication already enabled",
      );
    }

    // Initialize setup
    const setup = await initializeTwoFactorSetup(user.email);

    res.json({
      secret: setup.secret,
      qrCode: setup.qrCodeUrl,
      backupCodes: setup.backupCodes,
      message:
        "Save your backup codes in a safe place. You will need them if you lose access to your authenticator app.",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Enable 2FA after verifying token
 * POST /api/v1/auth/2fa/enable
 * Requires valid TOTP token to confirm setup
 */
export async function enable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new HttpError(401, "E.UNAUTHENTICATED", "Authentication required");
    }

    const parsed = EnableTwoFactorSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, "E.VALIDATION.FAILED", "Invalid input", parsed.error.flatten());
    }

    const { secret, token } = parsed.data;

    // Verify token before enabling
    if (!verifyTotpToken(token, secret)) {
      throw new HttpError(400, "E.2FA.INVALID_TOKEN", "Invalid verification token");
    }

    // Get backup codes from setup (should be temporarily stored or re-generated)
    // For simplicity, we'll generate new ones here
    const { generateBackupCodes } = await import("./two-factor.service.js");
    const backupCodes = generateBackupCodes();

    const ipAddress = req.ip ?? null;
    const userAgent = req.get("user-agent") ?? null;

    // Enable 2FA in transaction
    await db.transaction(async (trx) => {
      await enableTwoFactor(userId, secret, backupCodes, ipAddress, userAgent, trx);
    });

    logger.info({ userId }, "[2fa] Two-factor authentication enabled successfully");

    res.json({
      message: "Two-factor authentication enabled successfully",
      backupCodes,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Disable 2FA
 * POST /api/v1/auth/2fa/disable
 * Requires password and 2FA token for security
 */
export async function disable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new HttpError(401, "E.UNAUTHENTICATED", "Authentication required");
    }

    const parsed = DisableTwoFactorSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, "E.VALIDATION.FAILED", "Invalid input", parsed.error.flatten());
    }

    const { password, token } = parsed.data;

    // Verify password
    const user = await db("users")
      .where({ id: userId })
      .select("password_hash", "two_factor_enabled", "two_factor_secret")
      .first<{
        password_hash: string;
        two_factor_enabled: boolean;
        two_factor_secret: string | null;
      }>();

    if (!user) {
      throw new HttpError(404, "E.USER.NOT_FOUND", "User not found");
    }

    if (!user.two_factor_enabled) {
      throw new HttpError(400, "E.2FA.NOT_ENABLED", "Two-factor authentication not enabled");
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      throw new HttpError(401, "E.AUTH.INVALID_CREDENTIALS", "Invalid password");
    }

    // Verify 2FA token
    if (!user.two_factor_secret || !verifyTotpToken(token, user.two_factor_secret)) {
      throw new HttpError(400, "E.2FA.INVALID_TOKEN", "Invalid 2FA token");
    }

    const ipAddress = req.ip ?? null;
    const userAgent = req.get("user-agent") ?? null;

    // Disable 2FA
    await db.transaction(async (trx) => {
      await disableTwoFactor(userId, ipAddress, userAgent, trx);
    });

    logger.info({ userId }, "[2fa] Two-factor authentication disabled");

    res.json({
      message: "Two-factor authentication disabled successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify 2FA token (used during login)
 * POST /api/v1/auth/2fa/verify
 */
export async function verify(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new HttpError(401, "E.UNAUTHENTICATED", "Authentication required");
    }

    const parsed = VerifyTwoFactorSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, "E.VALIDATION.FAILED", "Invalid input", parsed.error.flatten());
    }

    const { token } = parsed.data;

    const ipAddress = req.ip ?? null;
    const userAgent = req.get("user-agent") ?? null;

    const { verifyTwoFactorToken } = await import("./two-factor.service.js");
    const valid = await db.transaction(async (trx) => {
      return verifyTwoFactorToken(userId, token, ipAddress, userAgent, trx);
    });

    if (!valid) {
      throw new HttpError(400, "E.2FA.INVALID_TOKEN", "Invalid 2FA token");
    }

    res.json({
      message: "2FA verification successful",
      verified: true,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Regenerate backup codes
 * POST /api/v1/auth/2fa/backup-codes/regenerate
 */
export async function regenerateBackups(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new HttpError(401, "E.UNAUTHENTICATED", "Authentication required");
    }

    // Check if 2FA is enabled
    const user = await db("users")
      .where({ id: userId })
      .select("two_factor_enabled")
      .first<{ two_factor_enabled: boolean }>();

    if (!user || !user.two_factor_enabled) {
      throw new HttpError(400, "E.2FA.NOT_ENABLED", "Two-factor authentication not enabled");
    }

    const ipAddress = req.ip ?? null;
    const userAgent = req.get("user-agent") ?? null;

    const backupCodes = await db.transaction(async (trx) => {
      return regenerateBackupCodes(userId, ipAddress, userAgent, trx);
    });

    logger.info({ userId }, "[2fa] Backup codes regenerated");

    res.json({
      message: "Backup codes regenerated successfully",
      backupCodes,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get 2FA status and backup code statistics
 * GET /api/v1/auth/2fa/status
 */
export async function status(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new HttpError(401, "E.UNAUTHENTICATED", "Authentication required");
    }

    const user = await db("users")
      .where({ id: userId })
      .select("two_factor_enabled", "two_factor_enabled_at")
      .first<{ two_factor_enabled: boolean; two_factor_enabled_at: Date | null }>();

    if (!user) {
      throw new HttpError(404, "E.USER.NOT_FOUND", "User not found");
    }

    let backupCodeStats = null;
    if (user.two_factor_enabled) {
      backupCodeStats = await getBackupCodeStats(userId);
    }

    res.json({
      enabled: user.two_factor_enabled,
      enabledAt: user.two_factor_enabled_at,
      backupCodes: backupCodeStats,
    });
  } catch (error) {
    next(error);
  }
}
