// apps/backend/src/middlewares/csrf.ts
/**
 * CSRF middleware - implements double-submit token verification with optional origin checks.
 * Usage: mount after cookieParser and before routes.
 */

import type { Request, Response, NextFunction } from "express";
import Tokens from "csrf";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";

const tokens = new Tokens();
const CSRF_COOKIE_NAME = "__Host-fitvibe-csrf";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type CsrfRequest = Request & {
  csrfToken?: () => string;
  _csrfSecret?: string;
};

function ensureSecret(req: CsrfRequest, res: Response): string {
  if (req._csrfSecret) {
    return req._csrfSecret;
  }

  const existing =
    typeof req.cookies?.[CSRF_COOKIE_NAME] === "string" ? req.cookies[CSRF_COOKIE_NAME] : null;
  const secret = existing || tokens.secretSync();

  if (!existing) {
    // SECURITY: Double-submit cookie pattern for CSRF protection
    // The secret is stored in an HttpOnly cookie (not accessible to JavaScript),
    // sent only over HTTPS in production (secure flag), and uses SameSite to prevent CSRF.
    // This is the standard OWASP-recommended pattern and is NOT clear-text storage.
    // codeql[js/clear-text-storage-of-sensitive-data] - HttpOnly + Secure + SameSite cookie is secure
    // lgtm[js/clear-text-storage-of-sensitive-data] - HttpOnly + Secure + SameSite cookie is secure
    res.cookie(CSRF_COOKIE_NAME, secret, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      sameSite: "lax", // CSRF protection
      secure: env.isProduction, // HTTPS-only in production
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  Object.defineProperty(req, "_csrfSecret", {
    value: secret,
    enumerable: false,
    configurable: false,
  });

  if (typeof req.csrfToken !== "function") {
    Object.defineProperty(req, "csrfToken", {
      enumerable: false,
      configurable: true,
      writable: true,
      value: () => tokens.create(secret),
    });
  }

  return secret;
}

function extractToken(req: Request): string | null {
  const headerToken =
    (req.headers["x-csrf-token"] as string | undefined) ||
    (req.headers["csrf-token"] as string | undefined) ||
    (req.headers["x-xsrf-token"] as string | undefined);
  if (headerToken && typeof headerToken === "string") {
    return headerToken;
  }

  const bodyToken =
    typeof req.body === "object" && req.body !== null && "_csrf" in req.body
      ? (req.body as Record<string, unknown>)["_csrf"]
      : null;

  if (typeof bodyToken === "string") {
    return bodyToken;
  }

  if (typeof req.query === "object" && req.query !== null) {
    const candidate = (req.query as Record<string, unknown>)._csrf;
    if (typeof candidate === "string") {
      return candidate;
    }
  }

  return null;
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const csrfReq = req as CsrfRequest;
  const method = req.method.toUpperCase();
  const secret = ensureSecret(csrfReq, res);

  if (SAFE_METHODS.has(method)) {
    return next();
  }

  const token = extractToken(req);
  if (!token || !tokens.verify(secret, token)) {
    return next(new HttpError(403, "CSRF_TOKEN_INVALID", "Invalid CSRF token"));
  }

  return next();
}

// helper to return token to frontend (frontend reads this and sends header)
export function csrfTokenRoute(req: Request, res: Response) {
  const csrfReq = req as CsrfRequest;
  const secret = ensureSecret(csrfReq, res);
  const token = tokens.create(secret);
  res.json({ csrfToken: token });
}

// additional origin/referrer check (optional but recommended)
export function validateOrigin(allowedOrigins: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase();
    if (SAFE_METHODS.has(method)) {
      return next();
    }

    const origin = req.headers["origin"];
    const referer = req.headers["referer"];

    if (origin) {
      if (allowedOrigins.includes(origin)) {
        return next();
      }
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Origin not allowed" } });
    }

    if (referer) {
      try {
        const refererHost = new URL(referer).origin;
        if (allowedOrigins.includes(refererHost)) {
          return next();
        }
        return res.status(403).json({
          error: { code: "FORBIDDEN", message: "Referer not allowed" },
        });
      } catch {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Invalid referer" } });
      }
    }

    return res.status(403).json({
      error: { code: "FORBIDDEN", message: "Missing Origin/Referer header" },
    });
  };
}
