import type { NextFunction, Request, Response } from "express";
import {
  register as doRegister,
  login as doLogin,
  verify2FALogin as doVerify2FALogin,
  refresh as doRefresh,
  logout as doLogout,
  verifyEmail as doVerifyEmail,
  requestPasswordReset,
  resetPassword as doResetPassword,
  listSessions as doListSessions,
  revokeSessions as doRevokeSessions,
} from "./auth.service.js";
import { env, JWKS } from "../../config/env.js";
import {
  RegisterSchema,
  LoginSchema,
  Verify2FALoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  RevokeSessionsSchema,
} from "./auth.schemas.js";
import type { z } from "zod";
import type { LoginContext } from "./auth.types.js";
import { HttpError } from "../../utils/http.js";
import { verifyAccess } from "../../services/tokens.js";
import { getIdempotencyKey, getRouteTemplate } from "../common/idempotency.helpers.js";
import { resolveIdempotency, persistIdempotencyResult } from "../common/idempotency.service.js";
import { extractClientIp } from "../../utils/ip-extractor.js";

function setRefreshCookie(res: Response, token: string) {
  res.cookie(env.REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
    domain: env.COOKIE_DOMAIN,
    maxAge: env.REFRESH_TOKEN_TTL * 1000,
  });
}

function setAccessCookie(res: Response, token: string) {
  res.cookie(env.ACCESS_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
    domain: env.COOKIE_DOMAIN,
    maxAge: env.ACCESS_TOKEN_TTL * 1000,
  });
}

function clearAuthCookies(res: Response) {
  const options = {
    domain: env.COOKIE_DOMAIN,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.COOKIE_SECURE,
  };
  res.clearCookie(env.REFRESH_COOKIE_NAME, options);
  res.clearCookie(env.ACCESS_COOKIE_NAME, options);
}

function bearerToken(header?: string): string | null {
  if (!header || typeof header !== "string") {
    return null;
  }
  const [scheme, value] = header.split(" ");
  if (!value || scheme.toLowerCase() !== "bearer") {
    return null;
  }
  return value;
}

function currentSessionId(req: Request): string | null {
  const token =
    (req.cookies?.[env.ACCESS_COOKIE_NAME] as string | undefined) ??
    bearerToken(req.headers.authorization ?? undefined);
  if (!token) {
    return null;
  }
  try {
    const decoded = verifyAccess(token);
    return typeof decoded.sid === "string" ? decoded.sid : null;
  } catch {
    return null;
  }
}

function buildAuthContext(req: Request, res: Response): LoginContext {
  return {
    userAgent: req.get("user-agent") ?? null,
    ip: extractClientIp(req),
    requestId: req.requestId ?? res.locals.requestId ?? null,
  };
}

function getAuthenticatedUser(req: Request): { sub?: string; sid?: string; role?: string } | null {
  return req.user ?? null;
}

type RegisterInput = z.infer<typeof RegisterSchema>;
type LoginInput = z.infer<typeof LoginSchema>;
type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload: RegisterInput = RegisterSchema.parse(req.body);

    // Idempotency support for registration
    const idempotencyKey = getIdempotencyKey(req);
    if (idempotencyKey) {
      const userId = `anon:${payload.email}`; // Use email as user scope for unauthenticated operation
      const route = getRouteTemplate(req);

      let recordId: string | null = null;

      const resolution = await resolveIdempotency(
        {
          userId,
          method: req.method,
          route,
          key: idempotencyKey,
        },
        payload,
      );

      if (resolution.type === "replay") {
        res.set("Idempotency-Key", idempotencyKey);
        res.set("Idempotent-Replayed", "true");
        res.status(resolution.status).json(resolution.body);
        return;
      }

      recordId = resolution.recordId;

      // Execute registration
      const { verificationToken } = await doRegister(payload);

      const response: Record<string, unknown> = {
        message: "If the email is valid, a verification link will be sent shortly.",
      };
      if (!env.isProduction && verificationToken) {
        response.debugVerificationToken = verificationToken;
        response.verificationUrl = `${env.frontendUrl}/verify?token=${verificationToken}`;
      }

      // Persist idempotency result
      if (recordId) {
        await persistIdempotencyResult(recordId, 202, response);
      }

      res.set("Idempotency-Key", idempotencyKey);
      res.status(202).json(response);
      return;
    }

    // No idempotency key - proceed normally
    const { verificationToken } = await doRegister(payload);

    const response: Record<string, unknown> = {
      message: "If the email is valid, a verification link will be sent shortly.",
    };
    if (!env.isProduction && verificationToken) {
      response.debugVerificationToken = verificationToken;
      response.verificationUrl = `${env.frontendUrl}/verify?token=${verificationToken}`;
    }
    res.status(202).json(response);
    return;
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
    const bodyToken =
      req.body && typeof req.body === "object" && "token" in req.body
        ? (req.body as Record<string, unknown>).token
        : undefined;
    const token = typeof bodyToken === "string" ? bodyToken : queryToken;
    if (!token) {
      throw new HttpError(400, "AUTH_INVALID_TOKEN", "AUTH_INVALID_TOKEN");
    }
    const user = await doVerifyEmail(token);
    res.json({ user });
    return;
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const credentials: LoginInput = LoginSchema.parse(req.body);
    const context = buildAuthContext(req, res);
    const result = await doLogin(credentials, context);

    // Check if 2FA is required
    if (result.requires2FA) {
      res.json({
        requires2FA: true,
        pendingSessionId: result.pendingSessionId,
      });
      return;
    }

    // Normal login flow (no 2FA)
    // SECURITY: Tokens are ONLY set in HttpOnly cookies, never exposed to JavaScript
    setAccessCookie(res, result.tokens.accessToken);
    setRefreshCookie(res, result.tokens.refreshToken);
    res.json({
      requires2FA: false,
      user: result.user,
      session: result.session,
    });
    return;
  } catch (error) {
    next(error);
  }
}

export async function verify2FALogin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payload = Verify2FALoginSchema.parse(req.body);
    const context = buildAuthContext(req, res);
    const { user, tokens, session } = await doVerify2FALogin(
      payload.pendingSessionId,
      payload.code,
      context,
    );

    // SECURITY: Tokens are ONLY set in HttpOnly cookies, never exposed to JavaScript
    setAccessCookie(res, tokens.accessToken);
    setRefreshCookie(res, tokens.refreshToken);
    res.json({
      user,
      session,
    });
    return;
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[env.REFRESH_COOKIE_NAME] as string | undefined;
    if (!token) {
      throw new HttpError(401, "UNAUTHENTICATED", "UNAUTHENTICATED");
    }
    const context = buildAuthContext(req, res);
    const { user, newRefresh, accessToken } = await doRefresh(token, context);
    setRefreshCookie(res, newRefresh);
    setAccessCookie(res, accessToken);
    res.json({ user });
    return;
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[env.REFRESH_COOKIE_NAME] as string | undefined;
    const context = buildAuthContext(req, res);
    await doLogout(token, context);
    clearAuthCookies(res);
    res.status(204).send();
    return;
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payload: ForgotPasswordInput = ForgotPasswordSchema.parse(req.body);

    // Idempotency support for password reset request
    const idempotencyKey = getIdempotencyKey(req);
    if (idempotencyKey) {
      const userId = `anon:${payload.email}`; // Use email as user scope
      const route = getRouteTemplate(req);

      let recordId: string | null = null;

      const resolution = await resolveIdempotency(
        {
          userId,
          method: req.method,
          route,
          key: idempotencyKey,
        },
        payload,
      );

      if (resolution.type === "replay") {
        res.set("Idempotency-Key", idempotencyKey);
        res.set("Idempotent-Replayed", "true");
        res.status(resolution.status).json(resolution.body);
        return;
      }

      recordId = resolution.recordId;

      // Execute password reset request
      const { resetToken } = await requestPasswordReset(payload.email);
      const response: Record<string, unknown> = {
        message: "If the email is registered, a reset link will be sent shortly.",
      };
      if (!env.isProduction && resetToken) {
        response.debugResetToken = resetToken;
        response.resetUrl = `${env.appBaseUrl}/auth/password/reset?token=${resetToken}`;
      }

      // Persist idempotency result
      if (recordId) {
        await persistIdempotencyResult(recordId, 202, response);
      }

      res.set("Idempotency-Key", idempotencyKey);
      res.status(202).json(response);
      return;
    }

    // No idempotency key - proceed normally
    const { resetToken } = await requestPasswordReset(payload.email);
    const response: Record<string, unknown> = {
      message: "If the email is registered, a reset link will be sent shortly.",
    };
    if (!env.isProduction && resetToken) {
      response.debugResetToken = resetToken;
      response.resetUrl = `${env.appBaseUrl}/auth/password/reset?token=${resetToken}`;
    }
    res.status(202).json(response);
    return;
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payload: ResetPasswordInput = ResetPasswordSchema.parse(req.body);

    // SECURITY: Idempotency is NOT supported for password reset endpoints
    // because there is no safe way to scope the userId for unauthenticated requests.
    // Using user-controlled data (token) as userId scope would create a security vulnerability
    // where attackers could manipulate scoping to bypass checks or access cached responses.
    // Password resets are one-time operations where the risk of duplicate requests is minimal.

    await doResetPassword(payload.token, payload.newPassword);
    clearAuthCookies(res);
    res.status(204).send();
    return;
  } catch (error) {
    next(error);
  }
}

export async function listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authUser = getAuthenticatedUser(req);
    const userId = authUser?.sub;
    if (!userId) {
      throw new HttpError(401, "UNAUTHENTICATED", "UNAUTHENTICATED");
    }
    const sessionId = authUser?.sid ?? currentSessionId(req);
    const sessions = await doListSessions(userId, sessionId ?? null);
    res.json({ sessions });
    return;
  } catch (error) {
    next(error);
  }
}

export async function revokeSessions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUser = getAuthenticatedUser(req);
    const userId = authUser?.sub;
    if (!userId) {
      throw new HttpError(401, "UNAUTHENTICATED", "UNAUTHENTICATED");
    }
    const payload = RevokeSessionsSchema.parse(req.body ?? {});
    const sessionId = authUser?.sid ?? currentSessionId(req);
    if (payload.revokeOthers && !sessionId) {
      throw new HttpError(
        400,
        "AUTH_SESSION_UNKNOWN",
        "Current session is required to revoke others",
      );
    }
    const context = buildAuthContext(req, res);
    const result = await doRevokeSessions(userId, {
      sessionId: payload.sessionId ?? undefined,
      revokeAll: payload.revokeAll ?? false,
      revokeOthers: payload.revokeOthers ?? false,
      currentSessionId: sessionId,
      context,
    });

    const revokingCurrent =
      Boolean(payload.revokeAll) || (payload.sessionId ? payload.sessionId === sessionId : false);

    if (revokingCurrent || payload.revokeAll) {
      clearAuthCookies(res);
      res.status(204).send();
      return;
    }

    res.json({ revoked: result.revoked });
    return;
  } catch (error) {
    next(error);
  }
}

export function jwksHandler(_req: Request, res: Response) {
  res.json(JWKS);
}
