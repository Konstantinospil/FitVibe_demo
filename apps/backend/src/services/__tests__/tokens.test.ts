/**
 * Unit tests for tokens service
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { generateKeyPairSync } from "node:crypto";
import jwt from "jsonwebtoken";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccess,
  verifyRefresh,
  issueTokenPair,
} from "../tokens.js";
import { env } from "../../config/env.js";
import { newJti } from "../../utils/hash.js";

// Generate valid RSA keys for testing
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// Mock dependencies
jest.mock("../../config/env.js", () => ({
  env: {
    ACCESS_TOKEN_TTL: "15m",
    REFRESH_TOKEN_TTL: "7d",
  },
  get RSA_KEYS() {
    return {
      privateKey: privateKey.toString(),
      publicKey: publicKey.toString(),
    };
  },
}));

jest.mock("../../utils/hash.js", () => ({
  newJti: jest.fn(() => "test-jti-123"),
}));

describe("Tokens Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("signAccessToken", () => {
    it("should sign access token with claims", () => {
      const claims = {
        sub: "user-123",
        username: "testuser",
        role: "user" as const,
        sid: "session-123",
      };

      const token = signAccessToken(claims);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
    });

    it("should sign access token without sid", () => {
      const claims = {
        sub: "user-123",
        username: "testuser",
        role: "user" as const,
      };

      const token = signAccessToken(claims);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
    });
  });

  describe("signRefreshToken", () => {
    it("should sign refresh token", () => {
      const token = signRefreshToken("user-123", "jti-456");

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });
  });

  describe("verifyAccess", () => {
    it("should verify valid access token", () => {
      const claims = {
        sub: "user-123",
        username: "testuser",
        role: "user" as const,
        sid: "session-123",
      };

      const token = signAccessToken(claims);
      const decoded = verifyAccess(token);

      expect(decoded.sub).toBe("user-123");
      expect(decoded.role).toBe("user");
      expect(decoded.sid).toBe("session-123");
    });

    it("should throw error for invalid token", () => {
      const invalidToken = "invalid.token.here";

      expect(() => verifyAccess(invalidToken)).toThrow();
    });

    it("should throw error for expired token", () => {
      // Create an expired token using the actual private key
      const expiredToken = jwt.sign(
        { sub: "user-123", username: "testuser", role: "user" },
        privateKey.toString(),
        {
          algorithm: "RS256",
          expiresIn: "-1h", // Expired 1 hour ago
        },
      );

      expect(() => verifyAccess(expiredToken)).toThrow();
    });
  });

  describe("verifyRefresh", () => {
    it("should verify valid refresh token", () => {
      const token = signRefreshToken("user-123", "jti-456");
      const decoded = verifyRefresh(token);

      expect(decoded.sub).toBe("user-123");
      expect(decoded.jti).toBe("jti-456");
      expect(decoded.typ).toBe("refresh");
    });

    it("should throw error for invalid token", () => {
      const invalidToken = "invalid.token.here";

      expect(() => verifyRefresh(invalidToken)).toThrow();
    });
  });

  describe("issueTokenPair", () => {
    it("should issue access and refresh token pair", () => {
      const user = {
        id: "user-123",
        username: "testuser",
      };

      const result = issueTokenPair(user);

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result).toHaveProperty("accessExpiresIn");
      expect(result).toHaveProperty("jti");

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.accessExpiresIn).toBe(env.ACCESS_TOKEN_TTL);
      expect(result.jti).toBe("test-jti-123");
    });

    it("should generate new JTI for each token pair", () => {
      jest.mocked(newJti).mockReturnValueOnce("jti-1").mockReturnValueOnce("jti-2");

      const user = {
        id: "user-123",
        username: "testuser",
      };

      const result1 = issueTokenPair(user);
      const result2 = issueTokenPair(user);

      expect(result1.jti).toBe("jti-1");
      expect(result2.jti).toBe("jti-2");
    });

    it("should include JTI in access token sid", () => {
      const user = {
        id: "user-123",
        username: "testuser",
      };

      const result = issueTokenPair(user);
      const decoded = verifyAccess(result.accessToken);

      expect(decoded.sid).toBe(result.jti);
    });
  });
});
