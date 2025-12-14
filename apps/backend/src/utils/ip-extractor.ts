/**
 * Secure IP address extraction utility
 * Prevents X-Forwarded-For header spoofing (OWASP A07:2021)
 *
 * Security considerations:
 * - X-Forwarded-For can be spoofed by clients
 * - Only trust X-Forwarded-For when behind a trusted proxy
 * - Use the leftmost IP (actual client) from the chain
 * - Always validate IP format
 */

import type { Request } from "express";
import { env } from "../config/env.js";

const IP_V4_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IP_V6_REGEX = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

/**
 * Validates if a string is a valid IP address (IPv4 or IPv6)
 */
function isValidIP(ip: string): boolean {
  return IP_V4_REGEX.test(ip) || IP_V6_REGEX.test(ip) || ip === "::1" || ip === "::ffff:127.0.0.1";
}

/**
 * Extracts the client IP address from a request, with protection against header spoofing.
 *
 * When behind a proxy (trust proxy enabled):
 * - Uses the leftmost IP from X-Forwarded-For (actual client IP)
 * - Validates IP format before using it
 * - Falls back to socket.remoteAddress if header is invalid
 *
 * When not behind a proxy:
 * - Always uses socket.remoteAddress
 * - Ignores X-Forwarded-For to prevent spoofing
 *
 * @param req - Express request object
 * @returns Client IP address or "unknown" if cannot be determined
 */
export function extractClientIp(req: Request): string {
  // In test environment, always check X-Forwarded-For first to allow test IP injection
  // SECURITY: Only allow test mode behavior when actually in test environment
  // In production, only trust X-Forwarded-For when behind a trusted proxy
  // Note: NODE_ENV is set at process startup and cannot be manipulated by HTTP requests
  const isTestEnv = env.NODE_ENV === "test" && !env.isProduction;
  const shouldCheckForwardedFor = isTestEnv || env.trustProxy;

  if (shouldCheckForwardedFor) {
    const forwardedFor = req.headers["x-forwarded-for"];

    if (forwardedFor && typeof forwardedFor === "string") {
      // X-Forwarded-For format: "client, proxy1, proxy2"
      // We want the leftmost IP (the actual client)
      const ips = forwardedFor.split(",").map((ip) => ip.trim());
      const clientIp = ips[0];

      // Validate the IP format before using it
      if (clientIp && isValidIP(clientIp)) {
        return clientIp;
      }
    }
  }

  // Fallback to socket address
  const socketIp = req.socket?.remoteAddress || req.ip;
  return socketIp && isValidIP(socketIp) ? socketIp : "unknown";
}

/**
 * Extracts the client IP for rate limiting purposes.
 * Returns a consistent identifier that can be used for rate limit keys.
 *
 * @param req - Express request object
 * @returns IP address or identifier string
 */
export function extractClientIpForRateLimit(req: Request): string {
  return extractClientIp(req);
}
