import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { decodeJwt, isTokenExpired, getRoleFromToken, hasRole, isAdmin } from "../../src/utils/jwt";

describe("jwt utils", () => {
  const createMockToken = (payload: Record<string, any>): string => {
    const header = { alg: "RS256", typ: "JWT" };
    const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_");
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_");
    return `${encodedHeader}.${encodedPayload}.signature`;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("decodeJwt", () => {
    it("should decode valid JWT token", () => {
      const payload = { sub: "user-1", role: "user", sid: "session-1" };
      const token = createMockToken(payload);

      const result = decodeJwt(token);

      expect(result).toEqual(payload);
    });

    it("should return null for null token", () => {
      expect(decodeJwt(null)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(decodeJwt("")).toBeNull();
    });

    it("should return null for invalid token format", () => {
      expect(decodeJwt("invalid.token")).toBeNull();
      expect(decodeJwt("only-one-part")).toBeNull();
    });

    it("should return null for invalid base64 payload", () => {
      expect(decodeJwt("header.invalid-payload.signature")).toBeNull();
    });

    it("should decode token with all optional fields", () => {
      const payload = {
        sub: "user-1",
        role: "admin",
        sid: "session-1",
        username: "testuser",
        jti: "jti-123",
        iat: 1000000000,
        exp: 2000000000,
        nbf: 1000000000,
      };
      const token = createMockToken(payload);

      const result = decodeJwt(token);

      expect(result).toEqual(payload);
    });
  });

  describe("isTokenExpired", () => {
    it("should return true for null token", () => {
      expect(isTokenExpired(null)).toBe(true);
    });

    it("should return true for token without exp claim", () => {
      const payload = { sub: "user-1", role: "user" };
      const token = createMockToken(payload);

      expect(isTokenExpired(token)).toBe(true);
    });

    it("should return false for token that is not expired", () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
      const payload = { sub: "user-1", role: "user", exp: futureExp };
      const token = createMockToken(payload);

      expect(isTokenExpired(token)).toBe(false);
    });

    it("should return true for expired token", () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour in past
      const payload = { sub: "user-1", role: "user", exp: pastExp };
      const token = createMockToken(payload);

      expect(isTokenExpired(token)).toBe(true);
    });

    it("should return true for token expiring within 5 seconds (buffer)", () => {
      const nearExp = Math.floor(Date.now() / 1000) + 3; // 3 seconds in future
      const payload = { sub: "user-1", role: "user", exp: nearExp };
      const token = createMockToken(payload);

      expect(isTokenExpired(token)).toBe(true);
    });
  });

  describe("getRoleFromToken", () => {
    it("should return role from token", () => {
      const payload = { sub: "user-1", role: "admin" };
      const token = createMockToken(payload);

      expect(getRoleFromToken(token)).toBe("admin");
    });

    it("should return null for null token", () => {
      expect(getRoleFromToken(null)).toBeNull();
    });

    it("should return null for token without role", () => {
      const payload = { sub: "user-1" };
      const token = createMockToken(payload);

      expect(getRoleFromToken(token)).toBeNull();
    });
  });

  describe("hasRole", () => {
    it("should return true when user has required role", () => {
      const payload = { sub: "user-1", role: "admin" };
      const token = createMockToken(payload);

      expect(hasRole(token, "admin")).toBe(true);
    });

    it("should return false when user does not have required role", () => {
      const payload = { sub: "user-1", role: "user" };
      const token = createMockToken(payload);

      expect(hasRole(token, "admin")).toBe(false);
    });

    it("should return false for null token", () => {
      expect(hasRole(null, "admin")).toBe(false);
    });
  });

  describe("isAdmin", () => {
    it("should return true for admin token", () => {
      const payload = { sub: "user-1", role: "admin" };
      const token = createMockToken(payload);

      expect(isAdmin(token)).toBe(true);
    });

    it("should return false for non-admin token", () => {
      const payload = { sub: "user-1", role: "user" };
      const token = createMockToken(payload);

      expect(isAdmin(token)).toBe(false);
    });

    it("should return false for null token", () => {
      expect(isAdmin(null)).toBe(false);
    });
  });
});
