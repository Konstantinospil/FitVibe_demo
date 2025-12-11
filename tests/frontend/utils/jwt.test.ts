import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  decodeJwt,
  isTokenExpired,
  getRoleFromToken,
  hasRole,
  isAdmin,
  type JwtPayload,
} from "../../src/utils/jwt";

describe("jwt utilities", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("decodeJwt", () => {
    it("should decode a valid JWT", () => {
      const payload: JwtPayload = {
        sub: "user-123",
        role: "user",
        sid: "session-456",
        username: "testuser",
        iat: 1234567890,
        exp: 1234571490,
      };

      const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
      const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_");
      const signature = "signature";
      const token = `${header}.${payloadBase64}.${signature}`;

      const decoded = decodeJwt(token);

      expect(decoded).toEqual(payload);
    });

    it("should return null for null token", () => {
      expect(decodeJwt(null)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(decodeJwt("")).toBeNull();
    });

    it("should return null for invalid token format (not 3 parts)", () => {
      expect(decodeJwt("invalid.token")).toBeNull();
      expect(decodeJwt("only-one-part")).toBeNull();
    });

    it("should return null for invalid base64 payload", () => {
      const invalidToken = "header.invalid-base64!.signature";
      expect(decodeJwt(invalidToken)).toBeNull();
    });

    it("should return null for invalid JSON in payload", () => {
      const invalidJson = btoa("not-json").replace(/\+/g, "-").replace(/\//g, "_");
      const token = `header.${invalidJson}.signature`;
      expect(decodeJwt(token)).toBeNull();
    });

    it("should handle tokens with special characters in base64", () => {
      const payload: JwtPayload = {
        sub: "user-123",
        role: "admin",
        sid: "session-456",
      };
      const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_");
      const token = `header.${payloadBase64}.signature`;

      const decoded = decodeJwt(token);
      expect(decoded).toEqual(payload);
    });
  });

  describe("isTokenExpired", () => {
    it("should return true for null token", () => {
      expect(isTokenExpired(null)).toBe(true);
    });

    it("should return true for token without exp claim", () => {
      const payload = { sub: "user-123", role: "user", sid: "session-456" };
      const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_");
      const token = `header.${payloadBase64}.signature`;

      expect(isTokenExpired(token)).toBe(true);
    });

    it("should return true for expired token", () => {
      const expiredTime = Math.floor(Date.now() / 1000) - 1000; // 1000 seconds ago
      const payload: JwtPayload = {
        sub: "user-123",
        role: "user",
        sid: "session-456",
        exp: expiredTime,
      };
      const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_");
      const token = `header.${payloadBase64}.signature`;

      expect(isTokenExpired(token)).toBe(true);
    });

    it("should return false for token expiring in the future", () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload: JwtPayload = {
        sub: "user-123",
        role: "user",
        sid: "session-456",
        exp: futureTime,
      };
      const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_");
      const token = `header.${payloadBase64}.signature`;

      expect(isTokenExpired(token)).toBe(false);
    });

    it("should return true for token expiring within 5 seconds (buffer)", () => {
      const nearExpiry = Math.floor(Date.now() / 1000) + 3; // 3 seconds from now
      const payload: JwtPayload = {
        sub: "user-123",
        role: "user",
        sid: "session-456",
        exp: nearExpiry,
      };
      const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_");
      const token = `header.${payloadBase64}.signature`;

      expect(isTokenExpired(token)).toBe(true);
    });
  });

  describe("getRoleFromToken", () => {
    it("should extract role from valid token", () => {
      const payload: JwtPayload = {
        sub: "user-123",
        role: "admin",
        sid: "session-456",
      };
      const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_");
      const token = `header.${payloadBase64}.signature`;

      expect(getRoleFromToken(token)).toBe("admin");
    });

    it("should return null for null token", () => {
      expect(getRoleFromToken(null)).toBeNull();
    });

    it("should return null for token without role", () => {
      const payload = { sub: "user-123", sid: "session-456" };
      const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_");
      const token = `header.${payloadBase64}.signature`;

      expect(getRoleFromToken(token)).toBeNull();
    });
  });

  describe("hasRole", () => {
    it("should return true when token has matching role", () => {
      const payload: JwtPayload = {
        sub: "user-123",
        role: "admin",
        sid: "session-456",
      };
      const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_");
      const token = `header.${payloadBase64}.signature`;

      expect(hasRole(token, "admin")).toBe(true);
    });

    it("should return false when token has different role", () => {
      const payload: JwtPayload = {
        sub: "user-123",
        role: "user",
        sid: "session-456",
      };
      const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_");
      const token = `header.${payloadBase64}.signature`;

      expect(hasRole(token, "admin")).toBe(false);
    });

    it("should return false for null token", () => {
      expect(hasRole(null, "admin")).toBe(false);
    });
  });

  describe("isAdmin", () => {
    it("should return true for admin role", () => {
      const payload: JwtPayload = {
        sub: "user-123",
        role: "admin",
        sid: "session-456",
      };
      const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_");
      const token = `header.${payloadBase64}.signature`;

      expect(isAdmin(token)).toBe(true);
    });

    it("should return false for non-admin role", () => {
      const payload: JwtPayload = {
        sub: "user-123",
        role: "user",
        sid: "session-456",
      };
      const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_");
      const token = `header.${payloadBase64}.signature`;

      expect(isAdmin(token)).toBe(false);
    });

    it("should return false for null token", () => {
      expect(isAdmin(null)).toBe(false);
    });
  });
});
