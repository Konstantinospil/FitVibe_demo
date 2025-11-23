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
  acceptTerms,
  jwksHandler,
} from "./auth.controller.js";
// Removed twofa.controller imports - using two-factor.controller via two-factor.routes.ts instead
import { rateLimit } from "../common/rateLimiter.js";
import { validate } from "../../utils/validation.js";
import {
  RegisterSchema,
  LoginSchema,
  Verify2FALoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  RevokeSessionsSchema,
  AcceptTermsSchema,
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
authRouter.post(
  "/terms/accept",
  rateLimit("auth_terms_accept", 5, 60),
  requireAccessToken,
  validate(AcceptTermsSchema),
  asyncHandler(acceptTerms),
);

authRouter.get("/jwks", asyncHandler(jwksHandler));

// Two-Factor Authentication routes
// All 2FA routes are handled by two-factor.routes.ts (mounted at /2fa)
// Removed duplicate route definitions that were never reached (dead code)
authRouter.use("/2fa", twoFactorRoutes);
