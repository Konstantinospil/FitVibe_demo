import jwt from "jsonwebtoken";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccess,
  verifyRefresh,
  issueTokenPair,
} from "../../../apps/backend/src/services/tokens.js";
import { env, RSA_KEYS } from "../../../apps/backend/src/config/env.js";
import { newJti } from "../../../apps/backend/src/utils/hash.js";

// Mock jwt
jest.mock("jsonwebtoken");
const mockJwt = jest.mocked(jwt);

// Mock env
jest.mock("../../../apps/backend/src/config/env.js", () => ({
  env: {
    ACCESS_TOKEN_TTL: "15m",
    REFRESH_TOKEN_TTL: "7d",
  },
  RSA_KEYS: {
    privateKey: "mock-private-key",
    publicKey: "mock-public-key",
  },
}));

// Mock hash utility
jest.mock("../../../apps/backend/src/utils/hash.js", () => ({
  newJti: jest.fn().mockReturnValue("mock-jti-123"),
}));

describe("Tokens Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("signAccessToken", () => {
    it("should sign access token with correct claims", () => {
      const claims = {
        sub: "user-123",
        username: "testuser",
        role: "user" as const,
      };
      mockJwt.sign.mockReturnValue("signed-access-token" as never);

      const result = signAccessToken(claims);

      expect(result).toBe("signed-access-token");
      expect(mockJwt.sign).toHaveBeenCalledWith(claims, RSA_KEYS.privateKey, {
        algorithm: "RS256",
        expiresIn: env.ACCESS_TOKEN_TTL,
      });
    });

    it("should sign access token with session ID", () => {
      const claims = {
        sub: "user-123",
        username: "testuser",
        role: "user" as const,
        sid: "session-456",
      };
      mockJwt.sign.mockReturnValue("signed-access-token" as never);

      const result = signAccessToken(claims);

      expect(result).toBe("signed-access-token");
      expect(mockJwt.sign).toHaveBeenCalledWith(claims, RSA_KEYS.privateKey, {
        algorithm: "RS256",
        expiresIn: env.ACCESS_TOKEN_TTL,
      });
    });
  });

  describe("signRefreshToken", () => {
    it("should sign refresh token with correct payload", () => {
      const sub = "user-123";
      const jti = "jti-456";
      mockJwt.sign.mockReturnValue("signed-refresh-token" as never);

      const result = signRefreshToken(sub, jti);

      expect(result).toBe("signed-refresh-token");
      expect(mockJwt.sign).toHaveBeenCalledWith({ sub, jti, typ: "refresh" }, RSA_KEYS.privateKey, {
        algorithm: "RS256",
        expiresIn: env.REFRESH_TOKEN_TTL,
      });
    });
  });

  describe("verifyAccess", () => {
    it("should verify and return access token payload", () => {
      const token = "valid-access-token";
      const payload = {
        sub: "user-123",
        username: "testuser",
        role: "user",
        iat: 1234567890,
        exp: 1234567890,
      };
      mockJwt.verify.mockReturnValue(payload);

      const result = verifyAccess(token);

      expect(result).toEqual(payload);
      expect(mockJwt.verify).toHaveBeenCalledWith(token, RSA_KEYS.publicKey, {
        algorithms: ["RS256"],
      });
    });

    it("should handle string decoded token", () => {
      const token = "valid-access-token";
      const payloadString = JSON.stringify({
        sub: "user-123",
        username: "testuser",
        role: "user",
      });
      mockJwt.verify.mockReturnValue(payloadString as never);

      const result = verifyAccess(token);

      expect(result).toEqual(JSON.parse(payloadString));
    });

    it("should throw error for invalid token", () => {
      const token = "invalid-token";
      mockJwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      expect(() => verifyAccess(token)).toThrow("Invalid token");
    });

    it("should throw error for expired token", () => {
      const token = "expired-token";
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError("Token expired", new Date());
      });

      expect(() => verifyAccess(token)).toThrow();
    });
  });

  describe("verifyRefresh", () => {
    it("should verify and return refresh token payload", () => {
      const token = "valid-refresh-token";
      const payload = {
        sub: "user-123",
        jti: "jti-456",
        typ: "refresh",
        iat: 1234567890,
        exp: 1234567890,
      };
      mockJwt.verify.mockReturnValue(payload);

      const result = verifyRefresh(token);

      expect(result).toEqual(payload);
      expect(mockJwt.verify).toHaveBeenCalledWith(token, RSA_KEYS.publicKey, {
        algorithms: ["RS256"],
      });
    });

    it("should handle string decoded token", () => {
      const token = "valid-refresh-token";
      const payloadString = JSON.stringify({
        sub: "user-123",
        jti: "jti-456",
        typ: "refresh",
      });
      mockJwt.verify.mockReturnValue(payloadString as never);

      const result = verifyRefresh(token);

      expect(result).toEqual(JSON.parse(payloadString));
    });

    it("should throw error for invalid token", () => {
      const token = "invalid-token";
      mockJwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      expect(() => verifyRefresh(token)).toThrow("Invalid token");
    });

    it("should throw error for expired token", () => {
      const token = "expired-token";
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError("Token expired", new Date());
      });

      expect(() => verifyRefresh(token)).toThrow();
    });
  });

  describe("issueTokenPair", () => {
    it("should issue access and refresh token pair", () => {
      const user = {
        id: "user-123",
        username: "testuser",
      };
      mockJwt.sign
        .mockReturnValueOnce("access-token" as never)
        .mockReturnValueOnce("refresh-token" as never);

      const result = issueTokenPair(user);

      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        accessExpiresIn: env.ACCESS_TOKEN_TTL,
        jti: "mock-jti-123",
      });
      expect(newJti).toHaveBeenCalled();
      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
      expect(mockJwt.sign).toHaveBeenNthCalledWith(
        1,
        {
          sub: user.id,
          username: user.username,
          role: "user",
          sid: "mock-jti-123",
        },
        RSA_KEYS.privateKey,
        {
          algorithm: "RS256",
          expiresIn: env.ACCESS_TOKEN_TTL,
        },
      );
      expect(mockJwt.sign).toHaveBeenNthCalledWith(
        2,
        { sub: user.id, jti: "mock-jti-123", typ: "refresh" },
        RSA_KEYS.privateKey,
        {
          algorithm: "RS256",
          expiresIn: env.REFRESH_TOKEN_TTL,
        },
      );
    });

    it("should use generated JTI for both tokens", () => {
      const user = {
        id: "user-456",
        username: "anotheruser",
      };
      (newJti as jest.Mock).mockReturnValue("custom-jti-789");
      mockJwt.sign
        .mockReturnValueOnce("access-token" as never)
        .mockReturnValueOnce("refresh-token" as never);

      const result = issueTokenPair(user);

      expect(result.jti).toBe("custom-jti-789");
      expect(mockJwt.sign).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ sid: "custom-jti-789" }),
        expect.any(String),
        expect.any(Object),
      );
      expect(mockJwt.sign).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ jti: "custom-jti-789" }),
        expect.any(String),
        expect.any(Object),
      );
    });
  });
});
