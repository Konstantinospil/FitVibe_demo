/**
 * Enhanced Security Middleware
 * Additional security hardening beyond Helmet defaults
 */

import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

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
    `connect-src 'self' ${process.env.ALLOWED_ORIGINS || ""}`,
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
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;

    for (const ip of ips) {
      const trimmedIP = ip.trim();
      if (!ipv4Regex.test(trimmedIP) && !ipv6Regex.test(trimmedIP)) {
        // SECURITY FIX (CWE-117): Sanitize user-controlled data before logging
        // Replace newlines and control characters to prevent log injection
        const sanitized = String(forwardedFor)
          .replace(/[\r\n\t]/g, " ")
          .substring(0, 200);
        console.warn("[Security] Invalid X-Forwarded-For header:", sanitized);
        // Continue anyway - don't block request
      }
    }
  }

  next();
}

/**
 * Suspicious Pattern Detector
 * Detect common attack patterns in request parameters
 *
 * SECURITY FIX: ReDoS prevention - replaced patterns with .* to avoid polynomial backtracking
 * SECURITY FIX: Improved HTML/XSS detection to avoid bypasses
 */
export function detectSuspiciousPatterns(req: Request, res: Response, next: NextFunction) {
  const suspiciousPatterns = [
    // SQL Injection - Fixed: Removed .* to prevent ReDoS
    /\bUNION\b[\s\S]{0,100}\bSELECT\b/i,
    /\bINSERT\b[\s\S]{0,100}\bINTO\b/i,
    /\bDELETE\b[\s\S]{0,100}\bFROM\b/i,
    /\bUPDATE\b[\s\S]{0,100}\bSET\b/i,

    // XSS - Fixed: More specific patterns, limited length to prevent ReDoS
    /<script[\s\S]{0,500}>/i,
    /<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers
    /<iframe[\s\S]{0,500}>/i,
    /onerror\s*=/i,
    /onload\s*=/i,

    // Path Traversal
    /\.\.[/\\]/,
    /\.\.[\\]/,

    // Command Injection
    /[;&|`$()]/,
  ];

  const checkString = (value: any): boolean => {
    if (typeof value !== "string") {
      return false;
    }

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(value)) {
        return true;
      }
    }
    return false;
  };

  const checkObject = (obj: Record<string, unknown>): boolean => {
    for (const key in obj) {
      const value = obj[key];
      if (checkString(key) || checkString(value)) {
        return true;
      }
      if (typeof value === "object" && value !== null) {
        if (checkObject(value as Record<string, unknown>)) {
          return true;
        }
      }
    }
    return false;
  };

  // Check query, params, and body
  if (
    checkObject(req.query as Record<string, unknown>) ||
    checkObject(req.params as Record<string, unknown>) ||
    checkObject(req.body as Record<string, unknown>)
  ) {
    console.warn("[Security] Suspicious pattern detected:", {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(400).json({
      error: {
        code: "E.SECURITY.SUSPICIOUS_INPUT",
        message: "Request contains suspicious patterns",
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
  if (process.env.NODE_ENV === "development") {
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
        console.warn("[Security] Missing security headers:", {
          path: req.path,
          headers,
        });
      }
    });
  }

  next();
}
