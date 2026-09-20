/**
 * Enhanced Security Middleware
 * Additional security hardening beyond Helmet defaults
 */

import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";

/**
 * Generate a cryptographically secure nonce for CSP
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString("base64");
}

/**
 * Enhanced Content Security Policy
 * Stricter than default, can be relaxed per-route if needed
 */
export function enhancedCSP(req: Request, res: Response, next: NextFunction) {
  const nonce = generateNonce();
  res.locals.cspNonce = nonce;

  // Strict CSP for API endpoints (no inline scripts/styles)
  const csp = [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    `connect-src 'self' ${env.allowedOrigins.join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  res.setHeader("Content-Security-Policy", csp);
  next();
}

/**
 * Additional Security Headers
 * Beyond what Helmet provides by default
 */
export function additionalSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Enable XSS filter in older browsers
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Referrer policy for privacy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy (formerly Feature-Policy)
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=()",
  );

  // Cross-Origin policies
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

  // Clear potentially dangerous headers
  res.removeHeader("X-Powered-By");
  res.removeHeader("Server");

  next();
}

/**
 * Request Size Limiter
 * Prevent memory exhaustion from large payloads
 */
export function requestSizeLimiter(maxSizeBytes: number = 10 * 1024 * 1024) {
  return (req: Request, res: Response, next: NextFunction) => {
    let receivedBytes = 0;

    req.on("data", (chunk: Buffer) => {
      receivedBytes += chunk.length;
      if (receivedBytes > maxSizeBytes) {
        req.pause();
        res.status(413).json({
          error: {
            code: "E.VALIDATION.PAYLOAD_TOO_LARGE",
            message: `Request payload too large. Maximum ${maxSizeBytes} bytes allowed.`,
          },
        });
        req.connection.destroy();
      }
    });

    next();
  };
}

/**
 * Slow Request Timeout
 * Terminate requests that take too long
 */
export function slowRequestTimeout(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: {
            code: "E.TIMEOUT.REQUEST_TIMEOUT",
            message: "Request timeout - server took too long to respond",
          },
        });
      }
    }, timeoutMs);

    res.on("finish", () => clearTimeout(timeout));
    res.on("close", () => clearTimeout(timeout));

    next();
  };
}

/**
 * IP Validation Middleware
 * Validate X-Forwarded-For header to prevent IP spoofing
 */
export function validateForwardedIP(req: Request, res: Response, next: NextFunction) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0].split(",") : forwardedFor.split(",");

    // Validate IP format (basic check)
    // codeql[js/polynomial-redos] - Regex patterns are bounded (IP addresses are max 45 chars for IPv6)
    // and used on controlled header data with length limits to prevent ReDoS
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;

    for (const ip of ips) {
      const trimmedIP = ip.trim();
      // Limit IP length to prevent ReDoS (IPv6 max length is 45 characters)
      if (trimmedIP.length > 45) {
        logger.warn(
          { ip: trimmedIP, length: trimmedIP.length },
          "[Security] X-Forwarded-For IP too long, skipping validation",
        );
        continue;
      }
      if (!ipv4Regex.test(trimmedIP) && !ipv6Regex.test(trimmedIP)) {
        // SECURITY FIX (CWE-117): Sanitize user-controlled data before logging
        // Replace newlines and control characters to prevent log injection
        const sanitized = String(forwardedFor)
          .replace(/[\r\n\t]/g, " ")
          .substring(0, 200);
        logger.warn(
          { forwardedFor: sanitized, ip: trimmedIP },
          "[Security] Invalid X-Forwarded-For header",
        );
        // Continue anyway - don't block request
      }
    }
  }

  next();
}

/**
 * Suspicious Pattern Detector
 *
 * This middleware only inspects URL-controlled input (query and route params).
 * Request bodies are validated by route/domain schemas and may legitimately contain
 * punctuation or text fragments that look suspicious out of context.
 */
export function detectSuspiciousPatterns(req: Request, res: Response, next: NextFunction) {
  const MAX_CHECK_LENGTH = 10000;

  const containsPattern = (text: string, patterns: string[]): boolean => {
    const upperText = text.toUpperCase();
    return patterns.some((pattern) => upperText.includes(pattern));
  };

  const sqlPatterns = ["UNION SELECT", "INSERT INTO", "DELETE FROM"];
  const xssPatterns = ["<SCRIPT", "</SCRIPT>", "JAVASCRIPT:", "<IFRAME"];

  const checkString = (value: unknown): boolean => {
    if (typeof value !== "string") {
      return false;
    }

    const bounded = value.slice(0, MAX_CHECK_LENGTH);
    if (containsPattern(bounded, sqlPatterns) || containsPattern(bounded, xssPatterns)) {
      return true;
    }

    const lowerText = bounded.toLowerCase();
    const eventHandlerPatterns = [
      "onerror=",
      "onload=",
      "onclick=",
      "onmouseover=",
      "onfocus=",
      "onsubmit=",
    ];
    if (eventHandlerPatterns.some((pattern) => lowerText.includes(pattern))) {
      return true;
    }

    return bounded.includes("../") || bounded.includes("..\\");
  };

  const checkObject = (obj: Record<string, unknown>): boolean => {
    for (const [key, value] of Object.entries(obj)) {
      if (checkString(key) || checkString(value)) {
        return true;
      }
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        if (checkObject(value as Record<string, unknown>)) {
          return true;
        }
      }
    }
    return false;
  };

  if (
    checkObject(req.query as Record<string, unknown>) ||
    checkObject(req.params as Record<string, unknown>)
  ) {
    logger.warn(
      {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      },
      "[Security] Suspicious pattern detected",
    );

    return res.status(400).json({
      error: {
        code: "E.SECURITY.SUSPICIOUS_INPUT",
        message: "Request contains suspicious URL patterns",
      },
    });
  }

  next();
}

/**
 * No-Cache Headers for Sensitive Routes
 * Prevent browser caching of sensitive data
 */
export function noCacheHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
}

/**
 * Security Headers Summary
 * Logs all security headers for verification
 */
export function logSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  if (env.NODE_ENV === "development") {
    res.on("finish", () => {
      const securityHeaders = [
        "Content-Security-Policy",
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "X-Frame-Options",
        "X-XSS-Protection",
        "Referrer-Policy",
        "Permissions-Policy",
      ];

      const headers: Record<string, string> = {};
      securityHeaders.forEach((header) => {
        const value = res.getHeader(header);
        if (value) {
          headers[header] = String(value);
        }
      });

      if (Object.keys(headers).length < securityHeaders.length) {
        logger.warn(
          {
            path: req.path,
            headers,
            missingCount: securityHeaders.length - Object.keys(headers).length,
          },
          "[Security] Missing security headers",
        );
      }
    });
  }

  next();
}
