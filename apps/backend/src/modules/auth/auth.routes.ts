import { Router } from "express";
import {
  register,
  login,
  verify2FALogin,
  refresh,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  listSessions,
  revokeSessions,
  jwksHandler,
} from "./auth.controller.js";
import {
  setup2FA,
  verify2FA,
  disable2FAHandler,
  regenerateBackupCodes,
  get2FAStatus,
} from "./twofa.controller.js";
import { rateLimit } from "../common/rateLimiter.js";
import { validate } from "../../utils/validation.js";
import {
  RegisterSchema,
  LoginSchema,
  Verify2FALoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  RevokeSessionsSchema,
} from "./auth.schemas.js";
import { requireAccessToken } from "./auth.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import twoFactorRoutes from "./two-factor.routes.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  rateLimit("auth_register", 10, 60),
  validate(RegisterSchema),
  asyncHandler(register),
);
authRouter.get("/verify", rateLimit("auth_verify", 60, 60), asyncHandler(verifyEmail));
authRouter.post(
  "/login",
  rateLimit("auth_login", 10, 60),
  validate(LoginSchema),
  asyncHandler(login),
);
authRouter.post(
  "/login/verify-2fa",
  rateLimit("auth_2fa_login", 10, 60),
  validate(Verify2FALoginSchema),
  asyncHandler(verify2FALogin),
);
authRouter.post("/refresh", rateLimit("auth_refresh", 60, 60), asyncHandler(refresh));
authRouter.post("/logout", rateLimit("auth_logout", 60, 60), asyncHandler(logout));
authRouter.post(
  "/password/forgot",
  rateLimit("auth_pw_forgot", 5, 60),
  validate(ForgotPasswordSchema),
  asyncHandler(forgotPassword),
);
authRouter.post(
  "/password/reset",
  rateLimit("auth_pw_reset", 5, 60),
  validate(ResetPasswordSchema),
  asyncHandler(resetPassword),
);

authRouter.get(
  "/sessions",
  rateLimit("auth_sessions", 60, 60),
  requireAccessToken,
  asyncHandler(listSessions),
);
authRouter.post(
  "/sessions/revoke",
  rateLimit("auth_sessions_revoke", 10, 60),
  requireAccessToken,
  validate(RevokeSessionsSchema),
  asyncHandler(revokeSessions),
);

authRouter.get("/jwks", asyncHandler(jwksHandler));

// Two-Factor Authentication routes
authRouter.use("/2fa", twoFactorRoutes);
authRouter.get(
  "/2fa/setup",
  rateLimit("auth_2fa_setup", 5, 300),
  requireAccessToken,
  asyncHandler(setup2FA),
);
authRouter.post(
  "/2fa/verify",
  rateLimit("auth_2fa_verify", 10, 60),
  requireAccessToken,
  asyncHandler(verify2FA),
);
authRouter.post(
  "/2fa/disable",
  rateLimit("auth_2fa_disable", 5, 300),
  requireAccessToken,
  asyncHandler(disable2FAHandler),
);
authRouter.post(
  "/2fa/backup-codes/regenerate",
  rateLimit("auth_2fa_backup", 3, 3600),
  requireAccessToken,
  asyncHandler(regenerateBackupCodes),
);
authRouter.get(
  "/2fa/status",
  rateLimit("auth_2fa_status", 60, 60),
  requireAccessToken,
  asyncHandler(get2FAStatus),
);
