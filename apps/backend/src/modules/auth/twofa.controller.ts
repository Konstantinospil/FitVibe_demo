import type { Request, Response } from "express";
import { z } from "zod";
import {
  setupTwoFactor,
  verifyAndEnable2FA,
  disable2FA,
  generateBackupCodes,
  getRemainingBackupCodesCount,
  is2FAEnabled,
} from "./twofa.service.js";
import { findUserById } from "./auth.repository.js";

const verifyCodeSchema = z.object({
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, "Code must be 6 digits"),
});

const disableSchema = z.object({
  password: z.string().min(12),
});

/**
 * GET /auth/2fa/setup
 * Generate TOTP secret and QR code for 2FA setup
 */
export async function setup2FA(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await findUserById(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Get primary email for QR code
  const email = user.username; // Fallback to username if email not available

  const { secret, qrCode, backupCodes } = await setupTwoFactor(userId, email);

  res.json({
    secret,
    qrCode,
    backupCodes,
    message:
      "Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.) and verify with a code to enable 2FA. Save your backup codes in a secure location.",
  });
}

/**
 * POST /auth/2fa/verify
 * Verify TOTP code and enable 2FA
 */
export async function verify2FA(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = verifyCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  await verifyAndEnable2FA(userId, parsed.data.code);

  res.json({
    success: true,
    message: "Two-factor authentication enabled successfully",
  });
}

/**
 * POST /auth/2fa/disable
 * Disable 2FA (requires password confirmation)
 */
export async function disable2FAHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = disableSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const user = await findUserById(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await disable2FA(userId, parsed.data.password, user.password_hash);

  res.json({
    success: true,
    message: "Two-factor authentication disabled successfully",
  });
}

/**
 * POST /auth/2fa/backup-codes/regenerate
 * Generate new backup codes (invalidates old ones)
 */
export async function regenerateBackupCodes(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Check if 2FA is enabled
  const enabled = await is2FAEnabled(userId);
  if (!enabled) {
    res.status(400).json({
      error: "Two-factor authentication is not enabled",
    });
    return;
  }

  // Increment batch number
  const batch = Math.floor(Date.now() / 1000);
  const backupCodes = await generateBackupCodes(userId, batch);

  res.json({
    backupCodes,
    message:
      "New backup codes generated. Previous backup codes have been invalidated. Store these codes in a secure location.",
  });
}

/**
 * GET /auth/2fa/status
 * Get 2FA status and backup codes count
 */
export async function get2FAStatus(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const enabled = await is2FAEnabled(userId);
  const remainingBackupCodes = enabled ? await getRemainingBackupCodesCount(userId) : 0;

  res.json({
    enabled,
    remainingBackupCodes,
    warning:
      remainingBackupCodes <= 2 && remainingBackupCodes > 0 ? "Low backup codes remaining" : null,
  });
}
