import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import * as authService from "../../../../apps/backend/src/modules/auth/auth.service.js";
import * as authRepository from "../../../../apps/backend/src/modules/auth/auth.repository.js";
import * as twofaService from "../../../../apps/backend/src/modules/auth/twofa.service.js";
import * as bruteforceRepo from "../../../../apps/backend/src/modules/auth/bruteforce.repository.js";
import * as pending2faRepo from "../../../../apps/backend/src/modules/auth/pending-2fa.repository.js";
import * as mailerService from "../../../../apps/backend/src/services/mailer.service.js";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";
import type {
  RegisterDTO,
  LoginDTO,
  UserSafe,
  TokenPair,
} from "../../../../apps/backend/src/modules/auth/auth.types.js";
import type { AuthUserRecord } from "../../../../apps/backend/src/modules/auth/auth.repository.js";

// Mock dependencies
jest.mock("../../../../apps/backend/src/modules/auth/auth.repository.js");
jest.mock("../../../../apps/backend/src/modules/auth/twofa.service.js");
jest.mock("../../../../apps/backend/src/modules/auth/bruteforce.repository.js");
jest.mock("../../../../apps/backend/src/modules/auth/pending-2fa.repository.js");
jest.mock("../../../../apps/backend/src/services/mailer.service.js");
jest.mock("../../../../apps/backend/src/modules/auth/timing.utils.js", () => ({
  normalizeAuthTiming: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../../../apps/backend/src/config/terms.js", () => ({
  getCurrentTermsVersion: jest.fn(() => "1.0.0"),
  isTermsVersionOutdated: jest.fn(() => false),
}));
jest.mock("../../../../apps/backend/src/services/i18n.service.js", () => ({
  getEmailTranslations: jest.fn(() => ({
    verification: { subject: "Verify your email" },
    resend: { subject: "Resend verification" },
    passwordReset: { subject: "Reset password" },
  })),
  generateVerificationEmailHtml: jest.fn(() => "<html>verify</html>"),
  generateVerificationEmailText: jest.fn(() => "verify"),
  generateResendVerificationEmailHtml: jest.fn(() => "<html>resend</html>"),
  generateResendVerificationEmailText: jest.fn(() => "resend"),
}));
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

const mockAuthRepo = jest.mocked(authRepository);
const mockTwofaService = jest.mocked(twofaService);
const mockBruteforceRepo = jest.mocked(bruteforceRepo);
const mockPending2faRepo = jest.mocked(pending2faRepo);
const mockMailerService = jest.mocked(mailerService);
const mockBcrypt = jest.mocked(bcrypt);
const mockJwt = jest.mocked(jwt);

// Mock db/index.js - it exports default db which is a Knex instance
jest.mock("../../../../apps/backend/src/db/index.js", () => {
  const createQueryBuilder = (defaultValue: unknown = 1) => {
    const builder = Object.assign(Promise.resolve(defaultValue), {
      where: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue(1),
      insert: jest.fn().mockResolvedValue([]),
    });
    return builder;
  };

  const mockDbFunction = jest.fn((table: string) => createQueryBuilder()) as jest.Mock & {
    where: jest.Mock;
    update: jest.Mock;
  };

  return {
    default: mockDbFunction,
    db: mockDbFunction,
  };
});

describe("Auth Service", () => {
  const userId = "user-123";
  const email = "test@example.com";
  const username = "testuser";
  const password = "SecureP@ssw0rd123";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EMAIL_ENABLED = "false";
    process.env.ACCESS_TOKEN_TTL = "3600";
    process.env.REFRESH_TOKEN_TTL = "604800";
    process.env.EMAIL_VERIFICATION_TTL_SEC = "3600";
    process.env.PASSWORD_RESET_TTL_SEC = "3600";
    // Mock helper functions from bruteforce.repository
    (mockBruteforceRepo.getRemainingAccountAttempts as jest.Mock) = jest.fn((attempt) => {
      if (!attempt) return 5;
      return Math.max(0, 5 - attempt.attempt_count);
    });
    (mockBruteforceRepo.getRemainingIPAttempts as jest.Mock) = jest.fn((attempt) => {
      if (!attempt) {
        return { remainingAttempts: 10, remainingDistinctEmails: 5 };
      }
      return {
        remainingAttempts: Math.max(0, 10 - attempt.total_attempt_count),
        remainingDistinctEmails: Math.max(0, 5 - attempt.distinct_email_count),
      };
    });
  });

  describe("register", () => {
    const validRegisterDto: RegisterDTO = {
      email,
      username,
      password,
      terms_accepted: true,
    };

    it("should register a new user successfully", async () => {
      const hashedPassword = "hashed_password";
      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);
      mockAuthRepo.findUserByEmail.mockResolvedValue(null);
      mockAuthRepo.findUserByUsername.mockResolvedValue(null);
      mockAuthRepo.createUser.mockResolvedValue(undefined);
      mockAuthRepo.createAuthToken.mockResolvedValue(undefined);
      mockAuthRepo.findUserById.mockResolvedValue({
        id: userId,
        username,
        primary_email: email,
        role_code: "athlete",
        status: "pending_verification",
        created_at: new Date().toISOString(),
        locale: "en",
      } as AuthUserRecord);

      const result = await authService.register(validRegisterDto);

      expect(result.user).toBeDefined();
      expect(result.verificationToken).toBeDefined();
      expect(mockAuthRepo.createUser).toHaveBeenCalled();
    });

    it("should throw error when email already exists", async () => {
      mockAuthRepo.findUserByEmail.mockResolvedValue({
        id: userId,
        username,
        primary_email: email,
        status: "active",
      } as AuthUserRecord);
      mockAuthRepo.findUserByUsername.mockResolvedValue(null);

      await expect(authService.register(validRegisterDto)).rejects.toThrow(HttpError);
      await expect(authService.register(validRegisterDto)).rejects.toThrow("AUTH_CONFLICT");
    });

    it("should throw error when username already exists", async () => {
      mockAuthRepo.findUserByEmail.mockResolvedValue(null);
      mockAuthRepo.findUserByUsername.mockResolvedValue({
        id: userId,
        username,
        primary_email: email,
        status: "active",
      } as AuthUserRecord);

      await expect(authService.register(validRegisterDto)).rejects.toThrow(HttpError);
    });

    it("should resend verification for pending user", async () => {
      const pendingUser: AuthUserRecord = {
        id: userId,
        username,
        primary_email: email,
        status: "pending_verification",
        locale: "en",
        created_at: new Date().toISOString(),
        role_code: "athlete",
      };

      mockAuthRepo.findUserByEmail.mockResolvedValue(pendingUser);
      mockAuthRepo.findUserByUsername.mockResolvedValue(null);
      mockAuthRepo.createAuthToken.mockResolvedValue(undefined);
      mockAuthRepo.countAuthTokensSince.mockResolvedValue(0);
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(undefined);
      mockAuthRepo.purgeAuthTokensOlderThan.mockResolvedValue(undefined);

      const result = await authService.register(validRegisterDto);

      expect(result.verificationToken).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it("should throw error when terms not accepted", async () => {
      const dtoWithoutTerms: RegisterDTO = {
        ...validRegisterDto,
        terms_accepted: false,
      };

      mockAuthRepo.findUserByEmail.mockResolvedValue(null);
      mockAuthRepo.findUserByUsername.mockResolvedValue(null);

      await expect(authService.register(dtoWithoutTerms)).rejects.toThrow(HttpError);
      await expect(authService.register(dtoWithoutTerms)).rejects.toThrow(
        "TERMS_ACCEPTANCE_REQUIRED",
      );
    });
  });

  describe("verifyEmail", () => {
    it("should verify email successfully", async () => {
      const token = "verification-token";
      const tokenHash = "token-hash";
      const user: AuthUserRecord = {
        id: userId,
        username,
        primary_email: email,
        status: "pending_verification",
        role_code: "athlete",
        created_at: new Date().toISOString(),
      };

      // Calculate expected hash
      const crypto = await import("crypto");
      const expectedHash = crypto.createHash("sha256").update(token).digest("hex");

      mockAuthRepo.findAuthToken.mockResolvedValue({
        id: "token-id",
        user_id: userId,
        token_type: "email_verification",
        token_hash: expectedHash,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        consumed: false,
      });
      mockAuthRepo.consumeAuthToken.mockResolvedValue(undefined);
      mockAuthRepo.findUserById.mockResolvedValue(user);
      mockAuthRepo.markEmailVerified.mockResolvedValue(undefined);
      mockAuthRepo.updateUserStatus.mockResolvedValue(undefined);
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(undefined);

      const result = await authService.verifyEmail(token);

      expect(result).toBeDefined();
      expect(mockAuthRepo.consumeAuthToken).toHaveBeenCalled();
      expect(mockAuthRepo.markEmailVerified).toHaveBeenCalled();
    });

    it("should throw error when token not found", async () => {
      mockAuthRepo.findAuthToken.mockResolvedValue(null);

      await expect(authService.verifyEmail("invalid-token")).rejects.toThrow(HttpError);
    });

    it("should throw error when token expired", async () => {
      mockAuthRepo.findAuthToken.mockResolvedValue({
        id: "token-id",
        user_id: userId,
        token_type: "email_verification",
        token_hash: "hash",
        expires_at: new Date(Date.now() - 1000).toISOString(),
        consumed: false,
      });

      await expect(authService.verifyEmail("token")).rejects.toThrow(HttpError);
    });
  });

  describe("login", () => {
    const validLoginDto: LoginDTO = {
      email,
      password,
    };

    it("should login successfully without 2FA", async () => {
      const hashedPassword = await bcrypt.hash(password, 12);
      const user: AuthUserRecord = {
        id: userId,
        username,
        primary_email: email,
        password_hash: hashedPassword,
        status: "active",
        role_code: "athlete",
        created_at: new Date().toISOString(),
      };

      mockAuthRepo.findUserByEmail.mockResolvedValue(user);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockTwofaService.is2FAEnabled.mockResolvedValue(false);
      mockBruteforceRepo.getFailedAttempt.mockResolvedValue(null);
      mockBruteforceRepo.resetFailedAttempts.mockResolvedValue(undefined);
      mockAuthRepo.createAuthSession.mockResolvedValue({
        id: "session-123",
        user_id: userId,
        expires_at: new Date(Date.now() + 604800000).toISOString(),
      });
      mockJwt.sign.mockReturnValue("access-token" as never);
      mockJwt.sign.mockReturnValueOnce("access-token" as never);
      mockJwt.sign.mockReturnValueOnce("refresh-token" as never);
      mockAuthRepo.insertRefreshToken.mockResolvedValue(undefined);

      const result = await authService.login(validLoginDto, {
        ip: "127.0.0.1",
        userAgent: "test-agent",
      });

      expect(result).toBeDefined();
      expect(result.tokens).toBeDefined();
    });

    it("should throw error when user not found", async () => {
      mockAuthRepo.findUserByEmail.mockResolvedValue(null);
      mockBruteforceRepo.getFailedAttempt.mockResolvedValue(null);
      mockBruteforceRepo.recordFailedAttempt.mockResolvedValue({
        identifier: email,
        attempt_count: 1,
        locked_until: null,
      });
      mockBruteforceRepo.recordFailedAttemptByIP.mockResolvedValue({
        id: "ip-attempt-id",
        ip_address: "127.0.0.1",
        total_attempt_count: 1,
        distinct_email_count: 1,
        locked_until: null,
        last_attempt_at: new Date().toISOString(),
        first_attempt_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      mockBcrypt.compare.mockResolvedValue(true as never);

      await expect(
        authService.login(validLoginDto, { ip: "127.0.0.1", userAgent: "test-agent" }),
      ).rejects.toThrow(HttpError);
    });

    it("should throw error when password incorrect", async () => {
      const user: AuthUserRecord = {
        id: userId,
        username,
        primary_email: email,
        password_hash: "hashed",
        status: "active",
        role_code: "athlete",
        created_at: new Date().toISOString(),
      };

      mockAuthRepo.findUserByEmail.mockResolvedValue(user);
      mockBcrypt.compare.mockResolvedValue(false as never);
      mockBruteforceRepo.getFailedAttempt.mockResolvedValue(null);
      mockBruteforceRepo.recordFailedAttempt.mockResolvedValue({
        identifier: email,
        attempt_count: 1,
        locked_until: null,
      });
      mockBruteforceRepo.recordFailedAttemptByIP.mockResolvedValue({
        id: "ip-attempt-id",
        ip_address: "127.0.0.1",
        total_attempt_count: 1,
        distinct_email_count: 1,
        locked_until: null,
        last_attempt_at: new Date().toISOString(),
        first_attempt_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await expect(
        authService.login(validLoginDto, { ip: "127.0.0.1", userAgent: "test-agent" }),
      ).rejects.toThrow(HttpError);
    });

    it("should require 2FA when enabled", async () => {
      const hashedPassword = await bcrypt.hash(password, 12);
      const user: AuthUserRecord = {
        id: userId,
        username,
        primary_email: email,
        password_hash: hashedPassword,
        status: "active",
        role_code: "athlete",
        created_at: new Date().toISOString(),
      };

      mockAuthRepo.findUserByEmail.mockResolvedValue(user);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockTwofaService.is2FAEnabled.mockResolvedValue(true);
      mockBruteforceRepo.getFailedAttempt.mockResolvedValue(null);
      mockBruteforceRepo.resetFailedAttempts.mockResolvedValue(undefined);
      mockPending2faRepo.createPending2FASession.mockResolvedValue({
        id: "pending-2fa-123",
        user_id: userId,
        expires_at: new Date(Date.now() + 300000).toISOString(),
      });

      const result = await authService.login(validLoginDto, {
        ip: "127.0.0.1",
        userAgent: "test-agent",
      });

      expect(result.requires2FA).toBe(true);
      if ("pendingSessionId" in result) {
        expect(result.pendingSessionId).toBeDefined();
      }
    });
  });

  describe("refresh", () => {
    it("should refresh tokens successfully", async () => {
      const refreshToken = "refresh-token";
      const sessionId = "session-123";

      // Calculate token hash
      const crypto = await import("crypto");
      const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

      mockJwt.verify.mockReturnValue({
        sub: userId,
        sid: sessionId,
        typ: "refresh",
      } as never);
      mockAuthRepo.getRefreshByHash.mockResolvedValue({
        id: "refresh-id",
        user_id: userId,
        session_id: sessionId,
        session_jti: sessionId, // Must match decoded.sid
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        revoked: false,
      });
      mockAuthRepo.findSessionById.mockResolvedValue({
        id: sessionId,
        user_id: userId,
        expires_at: new Date(Date.now() + 604800000).toISOString(),
      });
      mockAuthRepo.findUserById.mockResolvedValue({
        id: userId,
        username,
        primary_email: email,
        password_hash: "hashed",
        status: "active",
        role_code: "athlete",
        created_at: new Date().toISOString(),
        terms_version: "1.0.0",
      });
      mockJwt.sign.mockReturnValueOnce("new-access-token" as never);
      mockJwt.sign.mockReturnValueOnce("new-refresh-token" as never);
      mockAuthRepo.insertRefreshToken.mockResolvedValue(undefined);
      mockAuthRepo.revokeRefreshByHash.mockResolvedValue(undefined);
      mockAuthRepo.updateSession = jest.fn().mockResolvedValue(undefined);

      const result = await authService.refresh(refreshToken);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.newRefresh).toBeDefined();
      expect(result.accessToken).toBeDefined();
    });

    it("should throw error when refresh token invalid", async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(authService.refresh("invalid-token")).rejects.toThrow(HttpError);
    });
  });

  describe("requestPasswordReset", () => {
    it("should request password reset for existing user", async () => {
      const user: AuthUserRecord = {
        id: userId,
        username,
        primary_email: email,
        status: "active",
        role_code: "athlete",
        created_at: new Date().toISOString(),
      };

      mockAuthRepo.findUserByEmail.mockResolvedValue(user);
      mockAuthRepo.createAuthToken.mockResolvedValue(undefined);
      mockAuthRepo.countAuthTokensSince.mockResolvedValue(0);
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(undefined);
      mockAuthRepo.purgeAuthTokensOlderThan.mockResolvedValue(undefined);

      const result = await authService.requestPasswordReset(email);

      expect(result.resetToken).toBeDefined();
    });

    it("should return empty result for non-existent user (prevent enumeration)", async () => {
      mockAuthRepo.findUserByEmail.mockResolvedValue(null);

      const result = await authService.requestPasswordReset(email);

      expect(result.resetToken).toBeUndefined();
    });
  });

  describe("resetPassword", () => {
    it("should reset password successfully", async () => {
      const token = "reset-token";
      const newPassword = "NewP@ssw0rd123";
      const tokenHash = "token-hash";
      const user: AuthUserRecord = {
        id: userId,
        username,
        primary_email: email,
        status: "active",
        role_code: "athlete",
        created_at: new Date().toISOString(),
      };

      // Calculate expected hash
      const crypto = await import("crypto");
      const expectedHash = crypto.createHash("sha256").update(token).digest("hex");

      mockAuthRepo.findAuthToken.mockResolvedValue({
        id: "token-id",
        user_id: userId,
        token_type: "password_reset",
        token_hash: expectedHash,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        consumed: false,
      });

      mockAuthRepo.consumeAuthToken.mockResolvedValue(undefined);
      mockAuthRepo.findUserById.mockResolvedValue(user);
      mockBcrypt.hash.mockResolvedValue("new-hashed-password" as never);
      mockAuthRepo.updateUserPassword.mockResolvedValue(undefined);
      mockAuthRepo.revokeRefreshByUserId.mockResolvedValue(undefined);

      await authService.resetPassword(token, newPassword);

      expect(mockAuthRepo.updateUserPassword).toHaveBeenCalled();
      expect(mockAuthRepo.revokeRefreshByUserId).toHaveBeenCalled();
    });

    it("should throw error when token not found", async () => {
      mockAuthRepo.findAuthToken.mockResolvedValue(null);

      await expect(authService.resetPassword("invalid-token", "new-password")).rejects.toThrow(
        HttpError,
      );
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      const refreshToken = "refresh-token";
      const crypto = await import("crypto");
      const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

      mockJwt.verify.mockReturnValue({
        sub: userId,
        sid: "session-123",
        typ: "refresh",
      } as never);

      mockAuthRepo.revokeRefreshByHash.mockResolvedValue(undefined);
      mockAuthRepo.revokeSessionById.mockResolvedValue(undefined);

      await authService.logout(refreshToken);

      expect(mockAuthRepo.revokeRefreshByHash).toHaveBeenCalledWith(tokenHash);

      expect(mockAuthRepo.revokeRefreshByHash).toHaveBeenCalled();
    });
  });

  describe("acceptTerms", () => {
    it("should accept terms successfully", async () => {
      const dbModule = await import("../../../../apps/backend/src/db/index.js");
      const mockDb = dbModule.default as jest.Mock;

      await authService.acceptTerms(userId);

      expect(mockDb).toHaveBeenCalledWith("users");
      // Verify the builder chain was called
      const builderCall = mockDb.mock.results[0]?.value;
      if (builderCall && typeof builderCall === "object") {
        const builder = await builderCall;
        expect(builder.where).toHaveBeenCalledWith({ id: userId });
        expect(builder.update).toHaveBeenCalledWith(
          expect.objectContaining({
            terms_accepted: true,
          }),
        );
      }
    });
  });
});
