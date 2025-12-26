import { RateLimiterMemory } from "rate-limiter-flexible";
import type { NextFunction, Request, Response } from "express";
import { extractClientIpForRateLimit } from "../utils/ip-extractor.js";

const limiters = new Map<string, RateLimiterMemory>();

function getLimiter(key: string, points = 60, duration = 60) {
  if (!limiters.has(key)) {
    limiters.set(key, new RateLimiterMemory({ keyPrefix: key, points, duration }));
  }
  return limiters.get(key)!;
}

/**
 * Clear all rate limiters (for test cleanup)
 */
export function clearRateLimiters(): void {
  limiters.clear();
}

/**
 * Apply a per-IP rate limit with secure IP extraction.
 * Prevents X-Forwarded-For header spoofing (OWASP A07:2021).
 *
 * Example: app.post('/login', rateLimit('login', 5, 60), handler)
 *
 * @param key - Rate limiter key prefix
 * @param points - Maximum requests allowed
 * @param duration - Time window in seconds
 */
export function rateLimit(key: string, points = 60, duration = 60) {
  const limiter = getLimiter(key, points, duration);
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = extractClientIpForRateLimit(req);
    limiter
      .consume(ip)
      .then(() => next())
      .catch((rejRes: { msBeforeNext?: number }) => {
        // Calculate retry-after in seconds
        const retryAfter = Math.ceil((rejRes.msBeforeNext || duration * 1000) / 1000);
        res.setHeader("Retry-After", retryAfter.toString());
        res.status(429).json({
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests",
            requestId: res.locals.requestId,
            retryAfter,
          },
        });
      });
  };
}

/**
 * Apply a rate limit keyed by the authenticated user id with secure IP extraction.
 * Falls back to IP-based limiting if the user context is absent.
 * Prevents X-Forwarded-For header spoofing (OWASP A07:2021).
 *
 * @param key - Rate limiter key prefix
 * @param points - Maximum requests allowed
 * @param duration - Time window in seconds
 */
export function rateLimitByUser(key: string, points = 60, duration = 60) {
  const limiter = getLimiter(`${key}:user`, points, duration);
  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.user?.sub;
    const fallbackIp = extractClientIpForRateLimit(req);
    const identity = userId ? `user:${userId}` : fallbackIp;

    limiter
      .consume(identity)
      .then(() => next())
      .catch((rejRes: { msBeforeNext?: number }) => {
        // Calculate retry-after in seconds
        const retryAfter = Math.ceil((rejRes.msBeforeNext || duration * 1000) / 1000);
        res.setHeader("Retry-After", retryAfter.toString());
        res.status(429).json({
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests",
            requestId: res.locals.requestId,
            retryAfter,
          },
        });
      });
  };
}

/**
 * Apply rate limiting by both IP address and email address.
 * Used for contact form submissions to prevent abuse from both perspectives.
 * Limits by IP and email independently - if either limit is exceeded, the request is rejected.
 *
 * @param key - Rate limiter key prefix
 * @param points - Maximum requests allowed
 * @param duration - Time window in seconds
 */
export function rateLimitByIPAndEmail(key: string, points = 5, duration = 3600) {
  const ipLimiter = getLimiter(`${key}:ip`, points, duration);
  const emailLimiter = getLimiter(`${key}:email`, points, duration);

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = extractClientIpForRateLimit(req);
    const email =
      typeof req.body === "object" && req.body !== null && "email" in req.body
        ? (req.body as { email?: unknown }).email
        : undefined;

    // Normalize email if provided (basic validation - controller will do full validation)
    let normalizedEmail: string | null = null;
    if (email && typeof email === "string") {
      const trimmed = email.trim().toLowerCase();
      // Basic email format check (controller will validate properly)
      if (trimmed.includes("@") && trimmed.length > 0) {
        normalizedEmail = trimmed;
      }
    }

    // Always check IP rate limit
    const ipPromise = ipLimiter.consume(ip);

    // Check email rate limit if valid email is provided
    // If no email, only IP limit applies (but controller validation will catch missing email)
    const emailPromise = normalizedEmail
      ? emailLimiter.consume(`email:${normalizedEmail}`)
      : Promise.resolve();

    // Both limits must pass (if email is provided, both are checked)
    Promise.all([ipPromise, emailPromise])
      .then(() => next())
      .catch((rejRes: { msBeforeNext?: number }) => {
        // Calculate retry-after in seconds
        const retryAfter = Math.ceil((rejRes.msBeforeNext || duration * 1000) / 1000);
        res.setHeader("Retry-After", retryAfter.toString());
        res.status(429).json({
          error: {
            code: "RATE_LIMITED",
            message: "Too many contact form submissions. Please try again later.",
            requestId: res.locals.requestId,
            retryAfter,
          },
        });
      });
  };
}
