import { Router } from "express";
import { requireAuth } from "../users/users.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as twoFactorController from "./two-factor.controller.js";

const router = Router();

/**
 * Two-Factor Authentication Routes
 * All routes require authentication
 */

// Initialize 2FA setup (get secret, QR code, backup codes)
router.get("/setup", requireAuth, asyncHandler(twoFactorController.setup));

// Enable 2FA after verifying TOTP token
router.post("/enable", requireAuth, asyncHandler(twoFactorController.enable));

// Disable 2FA (requires password + 2FA token)
router.post("/disable", requireAuth, asyncHandler(twoFactorController.disable));

// Verify 2FA token (used during login flow)
router.post("/verify", requireAuth, asyncHandler(twoFactorController.verify));

// Regenerate backup codes
router.post(
  "/backup-codes/regenerate",
  requireAuth,
  asyncHandler(twoFactorController.regenerateBackups),
);

// Get 2FA status and statistics
router.get("/status", requireAuth, asyncHandler(twoFactorController.status));

export default router;
