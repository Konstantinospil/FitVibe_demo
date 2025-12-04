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
