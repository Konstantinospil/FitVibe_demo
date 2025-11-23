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
    // codeql[js/polynomial-redos] - Regex patterns are bounded (IP addresses are max 45 chars for IPv6)
    // and used on controlled header data with length limits to prevent ReDoS
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;

    for (const ip of ips) {
      const trimmedIP = ip.trim();
      // Limit IP length to prevent ReDoS (IPv6 max length is 45 characters)
      if (trimmedIP.length > 45) {
        console.warn("[Security] X-Forwarded-For IP too long, skipping validation");
        continue;
      }
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
 * SECURITY FIX: ReDoS prevention - Using safer string matching with length limits
 * to avoid polynomial backtracking in regex patterns
 */
export function detectSuspiciousPatterns(req: Request, res: Response, next: NextFunction) {
  // SECURITY: Limit input length to prevent ReDoS attacks
  const MAX_CHECK_LENGTH = 10000; // 10KB max per string

  // Helper to safely check for patterns using string methods instead of regex
  const containsPattern = (text: string, patterns: string[]): boolean => {
    const upperText = text.toUpperCase();
    for (const pattern of patterns) {
      if (upperText.includes(pattern)) {
        return true;
      }
    }
    return false;
  };

  // SQL Injection - Use simple string matching instead of regex
  const sqlPatterns = ["UNION SELECT", "INSERT INTO", "DELETE FROM", "UPDATE SET"];

  // XSS patterns - Check for specific strings
  const xssPatterns = ["<SCRIPT", "</SCRIPT>", "JAVASCRIPT:", "<IFRAME"];

  const checkString = (value: unknown): boolean => {
    if (typeof value !== "string") {
      return false;
    }

    // Limit length to prevent ReDoS
    const trimmed = value.length > MAX_CHECK_LENGTH ? value.substring(0, MAX_CHECK_LENGTH) : value;

    // Check for SQL injection patterns
    // codeql[js/polynomial-redos] - Using string matching (containsPattern) instead of regex to prevent ReDoS
    if (containsPattern(trimmed, sqlPatterns)) {
      return true;
    }

    // Check for XSS patterns
    if (containsPattern(trimmed, xssPatterns)) {
      return true;
    }

    // Check for event handlers (onxxx=) - Use string search only, no regex to prevent ReDoS
    const lowerText = trimmed.toLowerCase();
    const eventHandlerPatterns = [
      "onerror=",
      "onload=",
      "onclick=",
      "onmouseover=",
      "onfocus=",
      "onblur=",
      "onchange=",
      "onsubmit=",
      "onkeydown=",
      "onkeyup=",
      "onmousedown=",
      "onmouseup=",
      "ondblclick=",
      "onscroll=",
    ];
    if (eventHandlerPatterns.some((pattern) => lowerText.includes(pattern))) {
      return true;
    }
    // Check for generic "on" followed by alphanumeric and "=" (simple string check)
    // Limit scope to prevent ReDoS by only checking first 1000 chars
    const searchWindow = lowerText.substring(0, Math.min(1000, lowerText.length));
    for (let i = 0; i < searchWindow.length - 4; i++) {
      if (searchWindow.substring(i, i + 2) === "on") {
        // Check next 2-10 chars for alphanumeric followed by =
        const after = searchWindow.substring(i + 2, Math.min(i + 12, searchWindow.length));
        let foundAlnum = false;
        for (let j = 0; j < after.length && j < 10; j++) {
          const char = after[j];
          if ((char >= "a" && char <= "z") || (char >= "0" && char <= "9")) {
            foundAlnum = true;
          } else if (char === "=" && foundAlnum) {
            return true;
          } else if (char !== " ") {
            break;
          }
        }
      }
    }

    // Check for path traversal - Simple string check
    if (trimmed.includes("../") || trimmed.includes("..\\")) {
      return true;
    }

    // Check for command injection characters - Simple character check (no regex)
    const dangerousChars = [";", "&", "|", "`", "$", "(", ")"];
    if (dangerousChars.some((char) => trimmed.includes(char))) {
      return true;
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
