/**
 * JWT parsing utilities for the frontend.
 * These functions decode JWTs to extract claims without verifying signatures
 * (verification is the backend's responsibility).
 */

import { logger } from "./logger.js";

export interface JwtPayload {
  sub: string; // User ID
  role: string; // User role (athlete, coach, support, admin)
  sid: string; // Session ID
  username?: string;
  jti?: string;
  iat?: number; // Issued at
  exp?: number; // Expires at
  nbf?: number; // Not before
}

/**
 * Decodes a JWT without verifying its signature.
 * Note: This is for client-side role checking only. The backend performs actual verification.
 *
 * @param token - The JWT string
 * @returns Decoded payload or null if invalid
 */
export function decodeJwt(token: string | null): JwtPayload | null {
  if (!token) {
    return null;
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as JwtPayload;
  } catch (error) {
    logger.error("Failed to decode JWT", error instanceof Error ? error : new Error(String(error)), {
      context: "jwt",
    });
    return null;
  }
}

/**
 * Checks if a JWT is expired
 *
 * @param token - The JWT string
 * @returns true if expired, false otherwise
 */
export function isTokenExpired(token: string | null): boolean {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) {
    return true;
  }

  // Add 5 second buffer
  return Date.now() >= payload.exp * 1000 - 5000;
}

/**
 * Extracts the user role from a JWT
 *
 * @param token - The JWT string
 * @returns The role string or null
 */
export function getRoleFromToken(token: string | null): string | null {
  const payload = decodeJwt(token);
  return payload?.role ?? null;
}

/**
 * Checks if the user has a specific role
 *
 * @param token - The JWT string
 * @param requiredRole - The role to check for
 * @returns true if user has the role, false otherwise
 */
export function hasRole(token: string | null, requiredRole: string): boolean {
  const role = getRoleFromToken(token);
  return role === requiredRole;
}

/**
 * Checks if the user has admin role
 *
 * @param token - The JWT string
 * @returns true if user is admin, false otherwise
 */
export function isAdmin(token: string | null): boolean {
  return hasRole(token, "admin");
}
