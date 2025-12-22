import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import * as authService from "../../../../apps/backend/src/modules/auth/auth.service.js";
import * as authRepository from "../../../../apps/backend/src/modules/auth/auth.repository.js";
import { mailerService } from "../../../../apps/backend/src/services/mailer.service.js";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";
import type {
  RegisterDTO,
  LoginDTO,
  LoginContext,
} from "../../../../apps/backend/src/modules/auth/auth.types.js";
import type {
  AuthUserRecord,
  AuthSessionRecord,
  RefreshTokenRecord,
} from "../../../../apps/backend/src/modules/auth/auth.repository.js";
import { getCurrentTermsVersion } from "../../../../apps/backend/src/config/terms.js";
import { getCurrentPrivacyPolicyVersion } from "../../../../apps/backend/src/config/privacy.js";

// Helper function to create complete AuthUserRecord
// Note: For tests that check terms/privacy policy versions, set them explicitly using:
// terms_version: await getCurrentTermsVersion()
// privacy_policy_version: await getCurrentPrivacyPolicyVersion()
function createMockUser(overrides: Partial<AuthUserRecord> = {}): AuthUserRecord {
  return {
    id: "user-123",
    username: "testuser",
    display_name: "Test User",
    locale: "en-US",
    preferred_lang: "en",
    primary_email: "test@example.com",
    email_verified: true,
    role_code: "athlete",
    status: "active",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    password_hash: "hashed-password",
    terms_accepted: true,
    terms_accepted_at: "2024-01-01T00:00:00Z",
    // Default to a placeholder version - tests that check versions should override these
    terms_version: "2024-06-01",
    privacy_policy_accepted: true,
    privacy_policy_accepted_at: "2024-01-01T00:00:00Z",
    privacy_policy_version: "2024-06-01",
    ...overrides,
  };
}

// Mock dependencies
jest.mock("../../../../apps/backend/src/modules/auth/auth.repository.js");
jest.mock("../../../../apps/backend/src/modules/auth/pending-2fa.repository.js", () => ({
  createPending2FASession: jest.fn().mockResolvedValue(undefined),
  getPending2FASession: jest.fn().mockResolvedValue(undefined),
  markPending2FASessionVerified: jest.fn().mockResolvedValue(undefined),
  deletePending2FASession: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../../../apps/backend/src/modules/auth/twofa.service.js", () => ({
  is2FAEnabled: jest.fn().mockResolvedValue(false),
  verify2FACode: jest.fn().mockResolvedValue(true),
}));
jest.mock("../../../../apps/backend/src/modules/auth/bruteforce.repository.js", () => ({
  getFailedAttempt: jest.fn().mockResolvedValue(undefined),
  getFailedAttemptByIP: jest.fn().mockResolvedValue(null),
  recordFailedAttempt: jest.fn().mockResolvedValue({
    id: "attempt-1",
    identifier: "test@example.com",
    ip_address: "127.0.0.1",
    user_agent: "Mozilla/5.0",
    attempt_count: 1,
    locked_until: null,
    last_attempt_at: new Date().toISOString(),
    first_attempt_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  recordFailedAttemptByIP: jest.fn().mockResolvedValue({
    id: "ip-attempt-1",
    ip_address: "127.0.0.1",
    distinct_email_count: 1,
    total_attempt_count: 1,
    locked_until: null,
    last_attempt_at: new Date().toISOString(),
    first_attempt_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  resetFailedAttempts: jest.fn().mockResolvedValue(undefined),
  resetFailedAttemptsByIP: jest.fn().mockResolvedValue(undefined),
  isAccountLocked: jest.fn().mockReturnValue(false),
  isIPLocked: jest.fn().mockReturnValue(false),
  getRemainingLockoutSeconds: jest.fn().mockReturnValue(0),
  getRemainingIPLockoutSeconds: jest.fn().mockReturnValue(0),
  getRemainingAccountAttempts: jest.fn().mockReturnValue(5),
  getRemainingIPAttempts: jest.fn().mockReturnValue({
    remainingAttempts: 5,
    remainingDistinctEmails: 5,
  }),
  getMaxAccountAttempts: jest.fn().mockReturnValue(5),
  getMaxIPAttempts: jest.fn().mockReturnValue(10),
  getMaxIPDistinctEmails: jest.fn().mockReturnValue(5),
}));
jest.mock("../../../../apps/backend/src/services/mailer.service.js", () => ({
  mailerService: {
    send: jest.fn().mockResolvedValue(undefined),
    verify: jest.fn().mockResolvedValue(true),
  },
}));
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");
jest.mock("crypto");
jest.mock("uuid", () => ({
  v4: jest.fn(() => "550e8400-e29b-41d4-a716-446655440000"),
}));

// Mock env and RSA_KEYS
jest.mock("../../../../apps/backend/src/config/env.js", () => ({
  env: {
    ACCESS_TOKEN_TTL: 900,
    REFRESH_TOKEN_TTL: 1209600,
    EMAIL_VERIFICATION_TTL_SEC: 900,
    PASSWORD_RESET_TTL_SEC: 900,
    frontendUrl: "http://localhost:3000",
    email: {
      enabled: true,
      smtp: {
        host: "smtp.test.local",
        port: 2525,
        secure: false,
        user: "test-user",
        pass: "test-pass",
      },
      from: {
        name: "FitVibe Tests",
        email: "noreply@fitvibe.test",
      },
    },
  },
  RSA_KEYS: {
    privateKey: "mock-private-key",
    publicKey: "mock-public-key",
  },
}));

// Mock db
jest.mock("../../../../apps/backend/src/db/index.js", () => {
  const insert = jest.fn().mockResolvedValue([]);
  const mockDb = jest.fn(() => ({
    insert,
  }));
  return {
    __esModule: true,
    default: mockDb,
    db: mockDb,
  };
});

// Mock metrics
jest.mock("../../../../apps/backend/src/observability/metrics.js", () => ({
  incrementRefreshReuse: jest.fn(),
}));

// Mock password policy
jest.mock("../../../../apps/backend/src/modules/auth/passwordPolicy.js", () => ({
  assertPasswordPolicy: jest.fn(),
}));

const mockAuthRepo = jest.mocked(authRepository);
const mockMailer = jest.mocked(mailerService);
const mockBcrypt = jest.mocked(bcrypt);
const mockJwt = jest.mocked(jwt);
const mockCrypto = jest.mocked(crypto);
const mockUuidv4Fn = jest.mocked(uuidv4);
describe("Auth Service", () => {
  let mockRandomBytes: jest.Mock;
  let mockCreateHash: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup crypto mocks
    const mockHashInstance: {
      update: jest.Mock;
      digest: jest.Mock;
    } = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue("mock-hash"),
    };
    mockRandomBytes = jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue("mock-token"),
    } as unknown as Buffer);
    mockCreateHash = jest.fn().mockReturnValue(mockHashInstance);

    mockCrypto.randomBytes = mockRandomBytes as never;
    mockCrypto.createHash = mockCreateHash as never;

    // Reset uuid mock
    (mockUuidv4Fn as jest.Mock).mockReturnValue("550e8400-e29b-41d4-a716-446655440000");
  });

  describe("register", () => {
    const validRegisterDto: RegisterDTO = {
      email: "test@example.com",
      username: "testuser",
      password: "SecureP@ssw0rd123",
      terms_accepted: true,
      profile: {
        display_name: "Test User",
      },
    };

    it("should register a new user successfully", async () => {
      const mockUserId = "user-123";

      mockAuthRepo.findUserByEmail.mockResolvedValue(undefined);
      mockAuthRepo.findUserByUsername.mockResolvedValue(undefined);
      mockBcrypt.hash.mockResolvedValue("hashed-password" as never);
      mockAuthRepo.createUser.mockResolvedValue(undefined);
      mockAuthRepo.purgeAuthTokensOlderThan.mockResolvedValue(0);
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(0);
      mockAuthRepo.createAuthToken.mockResolvedValue([]);
      mockAuthRepo.findUserById.mockResolvedValue({
        id: mockUserId,
        username: "testuser",
        primary_email: "test@example.com",
        role_code: "athlete",
        status: "pending_verification",
        created_at: "2024-01-01T00:00:00Z",
        password_hash: "hashed-password",
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: "2024-06-01",
      } as AuthUserRecord);

      mockMailer.send.mockResolvedValue(undefined);

      const result = await authService.register(validRegisterDto);

      expect(result.verificationToken).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe("test@example.com");
      expect(result.user?.username).toBe("testuser");
      expect(mockAuthRepo.createUser).toHaveBeenCalled();
      expect(mockAuthRepo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          terms_accepted: true,
          terms_accepted_at: expect.any(String),
          terms_version: expect.any(String),
        }),
      );

      expect(mockMailer.send).toHaveBeenCalled();
    });

    it("should reject registration without terms acceptance", async () => {
      const invalidDto: RegisterDTO = {
        ...validRegisterDto,
        terms_accepted: false,
      };

      await expect(() => authService.register(invalidDto)).rejects.toThrow(HttpError);
      await expect(() => authService.register(invalidDto)).rejects.toThrow(
        "TERMS_ACCEPTANCE_REQUIRED",
      );
      expect(mockAuthRepo.createUser).not.toHaveBeenCalled();
    });

    it("should resend verification email if user exists with pending_verification status", async () => {
      const existingUser = createMockUser({
        status: "pending_verification",
        email_verified: false,
      });

      mockAuthRepo.findUserByEmail.mockResolvedValue(existingUser);
      mockAuthRepo.findUserByUsername.mockResolvedValue(undefined);
      mockAuthRepo.purgeAuthTokensOlderThan.mockResolvedValue(0);
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(0);
      mockAuthRepo.createAuthToken.mockResolvedValue([]);
      mockAuthRepo.countAuthTokensSince.mockResolvedValue(0);
      mockMailer.send.mockResolvedValue(undefined);

      const result = await authService.register(validRegisterDto);

      expect(result.verificationToken).toBeDefined();
      expect(result.user?.id).toBe("user-123");
      expect(mockAuthRepo.createUser).not.toHaveBeenCalled();

      expect(mockMailer.send).toHaveBeenCalled();
    });

    it("should throw conflict error if user already exists with active status", async () => {
      const existingUser = createMockUser();

      mockAuthRepo.findUserByEmail.mockResolvedValue(existingUser);
      mockAuthRepo.findUserByUsername.mockResolvedValue(undefined);

      await expect(() => authService.register(validRegisterDto)).rejects.toThrow(HttpError);
      await expect(() => authService.register(validRegisterDto)).rejects.toThrow("AUTH_CONFLICT");
    });

    it("should throw error if username is taken", async () => {
      const existingUser = createMockUser({
        id: "user-456",
        primary_email: "other@example.com",
      });

      mockAuthRepo.findUserByEmail.mockResolvedValue(undefined);
      mockAuthRepo.findUserByUsername.mockResolvedValue(existingUser);

      await expect(() => authService.register(validRegisterDto)).rejects.toThrow(HttpError);
    });

    it("should throw rate limit error if too many verification emails sent", async () => {
      const existingUser = createMockUser({
        status: "pending_verification",
        email_verified: false,
      });

      mockAuthRepo.findUserByEmail.mockResolvedValue(existingUser);
      mockAuthRepo.findUserByUsername.mockResolvedValue(undefined);
      mockAuthRepo.purgeAuthTokensOlderThan.mockResolvedValue(0);
      mockAuthRepo.countAuthTokensSince.mockResolvedValue(3);

      await expect(() => authService.register(validRegisterDto)).rejects.toThrow(HttpError);
      await expect(() => authService.register(validRegisterDto)).rejects.toThrow(
        "AUTH_TOO_MANY_REQUESTS",
      );
    });
  });

  describe("verifyEmail", () => {
    it("should verify email successfully", async () => {
      const mockToken = "verification-token";
      const mockUser = createMockUser();

      const mockAuthToken = {
        id: "token-123",
        user_id: "user-123",
        token_type: "email_verification",
        token_hash: "mock-hash",
        expires_at: new Date(Date.now() + 60000).toISOString(),
        created_at: "2024-01-01T00:00:00Z",
        consumed_at: null,
      };

      mockAuthRepo.findAuthToken.mockResolvedValue(mockAuthToken);
      mockAuthRepo.consumeAuthToken.mockResolvedValue(1);
      mockAuthRepo.updateUserStatus.mockResolvedValue(1);
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(1);
      mockAuthRepo.findUserById.mockResolvedValue(mockUser);
      mockAuthRepo.markEmailVerified.mockResolvedValue(1);

      const result = await authService.verifyEmail(mockToken);

      expect(result.id).toBe("user-123");
      expect(result.email).toBe("test@example.com");
      expect(mockAuthRepo.updateUserStatus).toHaveBeenCalledWith("user-123", "active");
      expect(mockAuthRepo.markEmailVerified).toHaveBeenCalled();
    });

    it("should throw error if token is invalid", async () => {
      mockAuthRepo.findAuthToken.mockResolvedValue(undefined);

      await expect(authService.verifyEmail("invalid-token")).rejects.toThrow(HttpError);
      await expect(authService.verifyEmail("invalid-token")).rejects.toThrow("AUTH_INVALID_TOKEN");
    });

    it("should throw error if token is expired", async () => {
      const mockAuthToken = {
        id: "token-123",
        user_id: "user-123",
        token_type: "email_verification",
        token_hash: "mock-hash",
        expires_at: new Date(Date.now() - 60000).toISOString(),
        created_at: "2024-01-01T00:00:00Z",
        consumed_at: null,
      };

      mockAuthRepo.findAuthToken.mockResolvedValue(mockAuthToken);
      mockAuthRepo.consumeAuthToken.mockResolvedValue(1);

      await expect(authService.verifyEmail("expired-token")).rejects.toThrow(HttpError);
      await expect(authService.verifyEmail("expired-token")).rejects.toThrow("AUTH_TOKEN_EXPIRED");
    });

    it("should throw error if user not found after verification", async () => {
      const mockAuthToken = {
        id: "token-123",
        user_id: "user-123",
        token_type: "email_verification",
        token_hash: "mock-hash",
        expires_at: new Date(Date.now() + 60000).toISOString(),
        created_at: "2024-01-01T00:00:00Z",
        consumed_at: null,
      };

      mockAuthRepo.findAuthToken.mockResolvedValue(mockAuthToken);
      mockAuthRepo.consumeAuthToken.mockResolvedValue(1);
      mockAuthRepo.updateUserStatus.mockResolvedValue(1);
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(1);
      mockAuthRepo.findUserById.mockResolvedValue(undefined);

      await expect(authService.verifyEmail("token")).rejects.toThrow(HttpError);
      await expect(authService.verifyEmail("token")).rejects.toThrow("AUTH_USER_NOT_FOUND");
    });
  });

  describe("login", () => {
    const validLoginDto: LoginDTO = {
      email: "test@example.com",
      password: "SecureP@ssw0rd123",
    };

    const loginContext: LoginContext = {
      userAgent: "Mozilla/5.0",
      ip: "127.0.0.1",
      requestId: "req-123",
    };

    it("should login successfully without 2FA", async () => {
      const mockUser = createMockUser({
        id: "user-123",
        username: "testuser",
        primary_email: "test@example.com",
        role_code: "athlete",
        status: "active",
      });

      mockAuthRepo.findUserByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockAuthRepo.createAuthSession.mockResolvedValue([]);
      mockJwt.sign.mockReturnValue("mock-jwt-token" as never);
      mockAuthRepo.insertRefreshToken.mockResolvedValue([]);

      const result = await authService.login(validLoginDto, loginContext);

      // Check discriminated union type
      expect(result.requires2FA).toBe(false);
      if (!result.requires2FA) {
        expect(result.user.id).toBe("user-123");
        expect(result.tokens.accessToken).toBe("mock-jwt-token");
        expect(result.tokens.refreshToken).toBe("mock-jwt-token");
        expect(result.session.id).toBeDefined();
      }
      expect(mockAuthRepo.createAuthSession).toHaveBeenCalled();
      expect(mockAuthRepo.insertRefreshToken).toHaveBeenCalled();
    });

    it("should flag outdated terms version on login", async () => {
      const mockUser = createMockUser({
        id: "user-123",
        username: "testuser",
        primary_email: "test@example.com",
        role_code: "athlete",
        status: "active",
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: "2024-01-01", // Old version
      });

      mockAuthRepo.findUserByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockAuthRepo.createAuthSession.mockResolvedValue([]);
      mockAuthRepo.insertRefreshToken.mockResolvedValue([]);

      const result = await authService.login(validLoginDto, loginContext);

      expect(result).toHaveProperty("termsOutdated", true);
      expect(result).toHaveProperty("requires2FA", false);
      expect(mockAuthRepo.createAuthSession).toHaveBeenCalled();
    });

    it("should throw error if user not found", async () => {
      mockAuthRepo.findUserByEmail.mockResolvedValue(undefined);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(authService.login(validLoginDto, loginContext)).rejects.toThrow(HttpError);
      await expect(authService.login(validLoginDto, loginContext)).rejects.toThrow(
        "AUTH_INVALID_CREDENTIALS",
      );
    });

    it("should throw error if user status is not active", async () => {
      const mockUser = createMockUser({
        status: "pending_verification",
        email_verified: false,
      });

      mockAuthRepo.findUserByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(authService.login(validLoginDto, loginContext)).rejects.toThrow(HttpError);
      await expect(authService.login(validLoginDto, loginContext)).rejects.toThrow(
        "AUTH_INVALID_CREDENTIALS",
      );
    });

    it("should throw error if password is incorrect", async () => {
      const mockUser = createMockUser({
        id: "user-123",
        username: "testuser",
        primary_email: "test@example.com",
        role_code: "athlete",
        status: "active",
      });

      mockAuthRepo.findUserByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(authService.login(validLoginDto, loginContext)).rejects.toThrow(HttpError);
      await expect(authService.login(validLoginDto, loginContext)).rejects.toThrow(
        "AUTH_INVALID_CREDENTIALS",
      );
    });
  });

  describe("refresh", () => {
    const mockRefreshToken = "mock-refresh-token";
    const mockSessionId = "session-123";

    it("should refresh tokens successfully", async () => {
      const mockPayload = {
        sub: "user-123",
        sid: mockSessionId,
        typ: "refresh",
      };

      const mockRefreshRecord = {
        id: "refresh-123",
        user_id: "user-123",
        token_hash: "mock-hash",
        session_jti: mockSessionId,
        expires_at: new Date(Date.now() + 60000).toISOString(),
        created_at: "2024-01-01T00:00:00Z",
        revoked_at: null,
      };

      const mockSession: AuthSessionRecord = {
        jti: mockSessionId,
        user_id: "user-123",
        user_agent: "Mozilla/5.0",
        ip: "127.0.0.1",
        created_at: "2024-01-01T00:00:00Z",
        expires_at: new Date(Date.now() + 60000).toISOString(),
        revoked_at: null,
        last_active_at: "2024-01-01T00:00:00Z",
      };

      const mockUser = createMockUser({
        id: "user-123",
        username: "testuser",
        primary_email: "test@example.com",
        role_code: "athlete",
        status: "active",
        terms_version: await getCurrentTermsVersion(),
        privacy_policy_version: await getCurrentPrivacyPolicyVersion(),
      });

      mockJwt.verify.mockReturnValue(mockPayload as never);
      mockAuthRepo.getRefreshByHash.mockResolvedValue(mockRefreshRecord);
      mockAuthRepo.findSessionById.mockResolvedValue(mockSession);
      mockAuthRepo.findUserById.mockResolvedValue(mockUser);
      mockAuthRepo.revokeRefreshByHash.mockResolvedValue(1);
      mockJwt.sign.mockReturnValue("new-token" as never);
      mockAuthRepo.insertRefreshToken.mockResolvedValue([]);
      mockAuthRepo.updateSession.mockResolvedValue(1);

      const result = await authService.refresh(mockRefreshToken);

      expect(result.user.id).toBe("user-123");
      expect(result.newRefresh).toBe("new-token");
      expect(result.accessToken).toBe("new-token");
      expect(mockAuthRepo.revokeRefreshByHash).toHaveBeenCalled();
      expect(mockAuthRepo.insertRefreshToken).toHaveBeenCalled();
    });

    it("should reject refresh if terms version is outdated", async () => {
      const mockPayload = {
        sub: "user-123",
        sid: mockSessionId,
        typ: "refresh",
      };

      const mockRefreshRecord = {
        id: "refresh-123",
        user_id: "user-123",
        token_hash: "mock-hash",
        session_jti: mockSessionId,
        expires_at: new Date(Date.now() + 60000).toISOString(),
        created_at: "2024-01-01T00:00:00Z",
        revoked_at: null,
      };

      const mockSession: AuthSessionRecord = {
        jti: mockSessionId,
        user_id: "user-123",
        user_agent: "Mozilla/5.0",
        ip: "127.0.0.1",
        created_at: "2024-01-01T00:00:00Z",
        expires_at: new Date(Date.now() + 60000).toISOString(),
        revoked_at: null,
        last_active_at: "2024-01-01T00:00:00Z",
      };

      const mockUser = createMockUser({
        id: "user-123",
        username: "testuser",
        primary_email: "test@example.com",
        role_code: "athlete",
        status: "active",
        terms_version: "2024-01-01", // Old version
      });

      mockJwt.verify.mockReturnValue(mockPayload as never);
      mockAuthRepo.getRefreshByHash.mockResolvedValue(mockRefreshRecord);
      mockAuthRepo.findSessionById.mockResolvedValue(mockSession);
      mockAuthRepo.findUserById.mockResolvedValue(mockUser);

      await expect(authService.refresh(mockRefreshToken)).rejects.toThrow(HttpError);
      await expect(authService.refresh(mockRefreshToken)).rejects.toThrow("TERMS_VERSION_OUTDATED");
    });

    it("should throw error if refresh token is invalid", async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(authService.refresh(mockRefreshToken)).rejects.toThrow(HttpError);
      await expect(authService.refresh(mockRefreshToken)).rejects.toThrow("AUTH_INVALID_REFRESH");
    });

    it("should throw error if refresh record not found", async () => {
      const mockPayload = {
        sub: "user-123",
        sid: mockSessionId,
        typ: "refresh",
      };

      mockJwt.verify.mockReturnValue(mockPayload as never);
      mockAuthRepo.getRefreshByHash.mockResolvedValue(undefined);
      mockAuthRepo.findRefreshTokenRaw.mockResolvedValue(undefined);

      await expect(authService.refresh(mockRefreshToken)).rejects.toThrow(HttpError);
      await expect(authService.refresh(mockRefreshToken)).rejects.toThrow("AUTH_INVALID_REFRESH");
    });

    it("should revoke session family if refresh token is reused", async () => {
      const mockPayload = {
        sub: "user-123",
        sid: mockSessionId,
        typ: "refresh",
      };

      const mockHistorical = {
        id: "refresh-old",
        user_id: "user-123",
        token_hash: "mock-hash",
        session_jti: mockSessionId,
        expires_at: "2024-01-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        revoked_at: "2024-01-02T00:00:00Z",
      };

      mockJwt.verify.mockReturnValue(mockPayload as never);
      mockAuthRepo.getRefreshByHash.mockResolvedValue(undefined);
      mockAuthRepo.findRefreshTokenRaw.mockResolvedValue(mockHistorical);
      mockAuthRepo.revokeSessionById.mockResolvedValue(1);
      mockAuthRepo.revokeRefreshBySession.mockResolvedValue(1);

      await expect(authService.refresh(mockRefreshToken)).rejects.toThrow(HttpError);
      expect(mockAuthRepo.revokeSessionById).toHaveBeenCalledWith(mockSessionId);
      expect(mockAuthRepo.revokeRefreshBySession).toHaveBeenCalledWith(mockSessionId);
    });

    it("should throw error if session is revoked", async () => {
      const mockPayload = {
        sub: "user-123",
        sid: mockSessionId,
        typ: "refresh",
      };

      const mockRefreshRecord = {
        id: "refresh-123",
        user_id: "user-123",
        token_hash: "mock-hash",
        session_jti: mockSessionId,
        expires_at: new Date(Date.now() + 60000).toISOString(),
        created_at: "2024-01-01T00:00:00Z",
        revoked_at: null,
      };

      const mockSession: AuthSessionRecord = {
        jti: mockSessionId,
        user_id: "user-123",
        user_agent: "Mozilla/5.0",
        ip: "127.0.0.1",
        created_at: "2024-01-01T00:00:00Z",
        expires_at: new Date(Date.now() + 60000).toISOString(),
        revoked_at: "2024-01-02T00:00:00Z",
        last_active_at: "2024-01-01T00:00:00Z",
      };

      mockJwt.verify.mockReturnValue(mockPayload as never);
      mockAuthRepo.getRefreshByHash.mockResolvedValue(mockRefreshRecord);
      mockAuthRepo.findSessionById.mockResolvedValue(mockSession);
      mockAuthRepo.revokeRefreshByHash.mockResolvedValue(1);

      await expect(authService.refresh(mockRefreshToken)).rejects.toThrow(HttpError);
      await expect(authService.refresh(mockRefreshToken)).rejects.toThrow("AUTH_SESSION_REVOKED");
    });

    it("should throw error if refresh token is expired", async () => {
      const mockPayload = {
        sub: "user-123",
        sid: mockSessionId,
        typ: "refresh",
      };

      const mockRefreshRecord = {
        id: "refresh-123",
        user_id: "user-123",
        token_hash: "mock-hash",
        session_jti: mockSessionId,
        expires_at: new Date(Date.now() - 60000).toISOString(),
        created_at: "2024-01-01T00:00:00Z",
        revoked_at: null,
      };

      const mockSession: AuthSessionRecord = {
        jti: mockSessionId,
        user_id: "user-123",
        user_agent: "Mozilla/5.0",
        ip: "127.0.0.1",
        created_at: "2024-01-01T00:00:00Z",
        expires_at: new Date(Date.now() + 60000).toISOString(),
        revoked_at: null,
        last_active_at: "2024-01-01T00:00:00Z",
      };

      mockJwt.verify.mockReturnValue(mockPayload as never);
      mockAuthRepo.getRefreshByHash.mockResolvedValue(mockRefreshRecord);
      mockAuthRepo.findSessionById.mockResolvedValue(mockSession);
      mockAuthRepo.revokeRefreshByHash.mockResolvedValue(1);
      mockAuthRepo.revokeSessionById.mockResolvedValue(1);

      await expect(authService.refresh(mockRefreshToken)).rejects.toThrow(HttpError);
      await expect(authService.refresh(mockRefreshToken)).rejects.toThrow("AUTH_REFRESH_EXPIRED");
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      const mockRefreshToken = "mock-refresh-token";
      const mockPayload = {
        sub: "user-123",
        sid: "session-123",
        typ: "refresh",
      };

      mockJwt.verify.mockReturnValue(mockPayload as never);
      mockAuthRepo.revokeRefreshByHash.mockResolvedValue(1);
      mockAuthRepo.revokeRefreshBySession.mockResolvedValue(1);
      mockAuthRepo.revokeSessionById.mockResolvedValue(1);

      await authService.logout(mockRefreshToken);

      expect(mockAuthRepo.revokeRefreshByHash).toHaveBeenCalled();
      expect(mockAuthRepo.revokeRefreshBySession).toHaveBeenCalledWith("session-123");
      expect(mockAuthRepo.revokeSessionById).toHaveBeenCalledWith("session-123");
    });

    it("should handle logout without refresh token", async () => {
      await authService.logout(undefined);

      expect(mockAuthRepo.revokeRefreshByHash).not.toHaveBeenCalled();
    });

    it("should handle logout with invalid token gracefully", async () => {
      const mockRefreshToken = "invalid-token";

      mockJwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });
      mockAuthRepo.revokeRefreshByHash.mockResolvedValue(1);

      await authService.logout(mockRefreshToken);

      expect(mockAuthRepo.revokeRefreshByHash).toHaveBeenCalled();
    });
  });

  describe("requestPasswordReset", () => {
    it("should generate password reset token for active user", async () => {
      const mockUser = createMockUser();

      mockAuthRepo.findUserByEmail.mockResolvedValue(mockUser);
      mockAuthRepo.purgeAuthTokensOlderThan.mockResolvedValue(0);
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(0);
      mockAuthRepo.createAuthToken.mockResolvedValue([]);
      mockMailer.send.mockResolvedValue(undefined);

      const result = await authService.requestPasswordReset("test@example.com");

      expect(result.resetToken).toBeDefined();
      expect(mockAuthRepo.createAuthToken).toHaveBeenCalled();

      expect(mockMailer.send).toHaveBeenCalled();
    });

    it("should not reveal if user does not exist", async () => {
      mockAuthRepo.findUserByEmail.mockResolvedValue(undefined);

      const result = await authService.requestPasswordReset("nonexistent@example.com");

      expect(result.resetToken).toBeUndefined();
      expect(mockAuthRepo.createAuthToken).not.toHaveBeenCalled();

      expect(mockMailer.send).not.toHaveBeenCalled();
    });

    it("should not send reset token if user is not active", async () => {
      const mockUser = createMockUser({
        status: "pending_verification",
        email_verified: false,
      });

      mockAuthRepo.findUserByEmail.mockResolvedValue(mockUser);

      const result = await authService.requestPasswordReset("test@example.com");

      expect(result.resetToken).toBeUndefined();
      expect(mockAuthRepo.createAuthToken).not.toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    it("should reset password successfully", async () => {
      const mockToken = "reset-token";
      const newPassword = "NewP@ssw0rd456";

      const mockAuthToken = {
        id: "token-123",
        user_id: "user-123",
        token_type: "password_reset",
        token_hash: "mock-hash",
        expires_at: new Date(Date.now() + 60000).toISOString(),
        created_at: "2024-01-01T00:00:00Z",
        consumed_at: null,
      };

      const mockUser = createMockUser({
        password_hash: "old-hashed-password",
      });

      mockAuthRepo.findAuthToken.mockResolvedValue(mockAuthToken);
      mockAuthRepo.findUserById.mockResolvedValue(mockUser);
      mockBcrypt.hash.mockResolvedValue("new-hashed-password" as never);
      mockAuthRepo.updateUserPassword.mockResolvedValue(1);
      mockAuthRepo.consumeAuthToken.mockResolvedValue(1);
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(1);
      mockAuthRepo.revokeRefreshByUserId.mockResolvedValue(1);

      await authService.resetPassword(mockToken, newPassword);

      expect(mockAuthRepo.updateUserPassword).toHaveBeenCalledWith(
        "user-123",
        "new-hashed-password",
      );
      expect(mockAuthRepo.consumeAuthToken).toHaveBeenCalledWith("token-123");
      expect(mockAuthRepo.revokeRefreshByUserId).toHaveBeenCalledWith("user-123");
    });

    it("should throw error if token is invalid", async () => {
      mockAuthRepo.findAuthToken.mockResolvedValue(undefined);

      await expect(authService.resetPassword("invalid-token", "NewP@ssw0rd456")).rejects.toThrow(
        HttpError,
      );
      await expect(authService.resetPassword("invalid-token", "NewP@ssw0rd456")).rejects.toThrow(
        "AUTH_INVALID_TOKEN",
      );
    });

    it("should throw error if token is expired", async () => {
      const mockAuthToken = {
        id: "token-123",
        user_id: "user-123",
        token_type: "password_reset",
        token_hash: "mock-hash",
        expires_at: new Date(Date.now() - 60000).toISOString(),
        created_at: "2024-01-01T00:00:00Z",
        consumed_at: null,
      };

      mockAuthRepo.findAuthToken.mockResolvedValue(mockAuthToken);
      mockAuthRepo.consumeAuthToken.mockResolvedValue(1);

      await expect(authService.resetPassword("expired-token", "NewP@ssw0rd456")).rejects.toThrow(
        HttpError,
      );
      await expect(authService.resetPassword("expired-token", "NewP@ssw0rd456")).rejects.toThrow(
        "AUTH_INVALID_TOKEN",
      );
    });

    it("should throw error if user not found", async () => {
      const mockAuthToken = {
        id: "token-123",
        user_id: "user-123",
        token_type: "password_reset",
        token_hash: "mock-hash",
        expires_at: new Date(Date.now() + 60000).toISOString(),
        created_at: "2024-01-01T00:00:00Z",
        consumed_at: null,
      };

      mockAuthRepo.findAuthToken.mockResolvedValue(mockAuthToken);
      mockAuthRepo.findUserById.mockResolvedValue(undefined);

      await expect(authService.resetPassword("token", "NewP@ssw0rd456")).rejects.toThrow(HttpError);
      await expect(authService.resetPassword("token", "NewP@ssw0rd456")).rejects.toThrow(
        "AUTH_USER_NOT_FOUND",
      );
    });
  });

  describe("listSessions", () => {
    it("should list user sessions", async () => {
      const mockSessions = [
        {
          jti: "session-1",
          user_id: "user-123",
          user_agent: "Mozilla/5.0",
          ip: "127.0.0.1",
          created_at: "2024-01-01T00:00:00Z",
          expires_at: "2024-01-15T00:00:00Z",
          revoked_at: null,
        },
        {
          jti: "session-2",
          user_id: "user-123",
          user_agent: "Chrome",
          ip: "192.168.1.1",
          created_at: "2024-01-02T00:00:00Z",
          expires_at: "2024-01-16T00:00:00Z",
          revoked_at: null,
        },
      ];

      mockAuthRepo.listSessionsByUserId.mockResolvedValue(mockSessions as never);

      const result = await authService.listSessions("user-123", "session-1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("session-1");
      expect(result[0].isCurrent).toBe(true);
      expect(result[1].id).toBe("session-2");
      expect(result[1].isCurrent).toBe(false);
    });

    it("should return empty array if no sessions", async () => {
      mockAuthRepo.listSessionsByUserId.mockResolvedValue([] as never);

      const result = await authService.listSessions("user-123");

      expect(result).toEqual([]);
    });
  });

  describe("revokeSessions", () => {
    it("should revoke single session", async () => {
      const mockSession: AuthSessionRecord = {
        jti: "session-1",
        user_id: "user-123",
        user_agent: "Mozilla/5.0",
        ip: "127.0.0.1",
        created_at: "2024-01-01T00:00:00Z",
        expires_at: "2024-01-15T00:00:00Z",
        revoked_at: null,
        last_active_at: "2024-01-01T00:00:00Z",
      };

      mockAuthRepo.findSessionById.mockResolvedValue(mockSession);
      mockAuthRepo.revokeSessionById.mockResolvedValue(1);
      mockAuthRepo.revokeRefreshBySession.mockResolvedValue(1);

      const result = await authService.revokeSessions("user-123", {
        sessionId: "session-1",
      });

      expect(result.revoked).toBe(1);
      expect(mockAuthRepo.revokeSessionById).toHaveBeenCalledWith("session-1");
      expect(mockAuthRepo.revokeRefreshBySession).toHaveBeenCalledWith("session-1");
    });

    it("should revoke all sessions", async () => {
      const mockSessions = [
        {
          jti: "session-1",
          user_id: "user-123",
          revoked_at: null,
        },
        {
          jti: "session-2",
          user_id: "user-123",
          revoked_at: null,
        },
      ];

      mockAuthRepo.listSessionsByUserId.mockResolvedValue(mockSessions as never);
      mockAuthRepo.revokeSessionsByUserId.mockResolvedValue(1);
      mockAuthRepo.revokeRefreshByUserId.mockResolvedValue(1);

      const result = await authService.revokeSessions("user-123", {
        revokeAll: true,
      });

      expect(result.revoked).toBe(2);
      expect(mockAuthRepo.revokeSessionsByUserId).toHaveBeenCalledWith("user-123");
      expect(mockAuthRepo.revokeRefreshByUserId).toHaveBeenCalledWith("user-123");
    });

    it("should revoke other sessions", async () => {
      const mockSessions = [
        {
          jti: "session-1",
          user_id: "user-123",
          revoked_at: null,
        },
        {
          jti: "session-2",
          user_id: "user-123",
          revoked_at: null,
        },
        {
          jti: "session-3",
          user_id: "user-123",
          revoked_at: null,
        },
      ];

      mockAuthRepo.listSessionsByUserId.mockResolvedValue(mockSessions as never);
      mockAuthRepo.revokeSessionsByUserId.mockResolvedValue(1);
      mockAuthRepo.revokeRefreshByUserExceptSession.mockResolvedValue(1);

      const result = await authService.revokeSessions("user-123", {
        revokeOthers: true,
        currentSessionId: "session-1",
      });

      expect(result.revoked).toBe(2);
      expect(mockAuthRepo.revokeSessionsByUserId).toHaveBeenCalledWith("user-123", "session-1");
      expect(mockAuthRepo.revokeRefreshByUserExceptSession).toHaveBeenCalledWith(
        "user-123",
        "session-1",
      );
    });

    it("should throw error if no revoke option specified", async () => {
      await expect(authService.revokeSessions("user-123", {})).rejects.toThrow(HttpError);
      await expect(authService.revokeSessions("user-123", {})).rejects.toThrow(
        "AUTH_INVALID_SCOPE",
      );
    });

    it("should throw error if session not found", async () => {
      mockAuthRepo.findSessionById.mockResolvedValue(undefined);

      await expect(
        authService.revokeSessions("user-123", { sessionId: "nonexistent" }),
      ).rejects.toThrow(HttpError);
      await expect(
        authService.revokeSessions("user-123", { sessionId: "nonexistent" }),
      ).rejects.toThrow("AUTH_SESSION_NOT_FOUND");
    });

    it("should throw error if trying to revoke others without current session", async () => {
      await expect(authService.revokeSessions("user-123", { revokeOthers: true })).rejects.toThrow(
        HttpError,
      );
      await expect(authService.revokeSessions("user-123", { revokeOthers: true })).rejects.toThrow(
        "Current session id required",
      );
    });
  });

  describe("acceptTerms", () => {
    const userId = "user-123";

    it("should accept terms and update user record", async () => {
      const mockDb = await import("../../../../apps/backend/src/db/index.js");
      const mockUpdate = jest.fn().mockResolvedValue(1);
      const mockWhere = jest.fn().mockReturnValue({
        update: mockUpdate,
      });
      (mockDb.db as unknown as jest.Mock).mockReturnValue({
        where: mockWhere,
      });

      await authService.acceptTerms(userId);

      expect(mockDb.db).toHaveBeenCalledWith("users");
      expect(mockWhere).toHaveBeenCalledWith({ id: userId });
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          terms_accepted: true,
          terms_accepted_at: expect.any(String),
          terms_version: expect.any(String),
          updated_at: expect.any(String),
        }),
      );
    });
  });

  describe("session helpers", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("marks the current session when listing", async () => {
      const now = new Date().toISOString();
      const baseSession = {
        jti: "current",
        user_id: "user-1",
        user_agent: "Chrome",
        ip: "10.0.0.1",
        created_at: now,
        expires_at: now,
        revoked_at: null,
        last_active_at: now,
      };
      const otherSession = {
        ...baseSession,
        jti: "other",
        user_agent: "Safari",
        ip: "10.0.0.2",
      };
      mockAuthRepo.listSessionsByUserId.mockResolvedValue([
        baseSession,
        otherSession,
      ] as AuthSessionRecord[]);

      const sessions = await authService.listSessions("user-1", "current");

      expect(sessions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "current", isCurrent: true }),
          expect.objectContaining({ id: "other", isCurrent: false }),
        ]),
      );
      expect(mockAuthRepo.listSessionsByUserId).toHaveBeenCalledWith("user-1");
    });

    it("revokes other sessions when requested", async () => {
      const now = new Date().toISOString();
      const current = {
        jti: "current",
        user_id: "user-1",
        user_agent: null,
        ip: null,
        created_at: now,
        expires_at: now,
        revoked_at: null,
        last_active_at: now,
      };
      const old = { ...current, jti: "old" };
      mockAuthRepo.listSessionsByUserId.mockResolvedValue([current, old] as AuthSessionRecord[]);
      mockAuthRepo.revokeSessionsByUserId.mockResolvedValue(1);
      mockAuthRepo.revokeRefreshByUserExceptSession.mockResolvedValue(1);

      const result = await authService.revokeSessions("user-1", {
        revokeOthers: true,
        currentSessionId: "current",
        context: { requestId: "req-1" },
      });

      expect(result.revoked).toBe(1);
      expect(mockAuthRepo.revokeSessionsByUserId).toHaveBeenCalledWith("user-1", "current");
      expect(mockAuthRepo.revokeRefreshByUserExceptSession).toHaveBeenCalledWith(
        "user-1",
        "current",
      );
    });

    it("throws if requesting to revoke others without a current session id", async () => {
      await expect(
        authService.revokeSessions("user-1", { revokeOthers: true, currentSessionId: null }),
      ).rejects.toThrow("Current session id required");
    });
  });

  describe("refresh token reuse detection", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("revokes the session family and emits audit when a refresh token is reused", async () => {
      const refreshToken = "reused-token";
      const mockHash = mockCrypto.createHash("sha256") as unknown as {
        update: (data: string | Uint8Array) => { digest: (format: string) => string };
      };
      const tokenHash = mockHash.update(refreshToken).digest("hex");
      const historical = {
        id: "token-1",
        user_id: "user-1",
        token_hash: tokenHash,
        session_jti: "session-1",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        created_at: new Date(Date.now() - 120_000).toISOString(),
        revoked_at: new Date(Date.now() - 60_000).toISOString(),
      };

      mockAuthRepo.getRefreshByHash.mockResolvedValue(undefined);
      mockAuthRepo.findRefreshTokenRaw.mockResolvedValue(historical as RefreshTokenRecord);
      mockAuthRepo.revokeSessionById.mockResolvedValue(1);
      mockAuthRepo.revokeRefreshBySession.mockResolvedValue(1);

      const decoded = {
        sub: "user-1",
        sid: "session-1",
        typ: "refresh",
      };
      mockJwt.verify.mockReturnValue(decoded as never);

      await expect(
        authService.refresh(refreshToken, {
          requestId: "req-123",
          ip: "203.0.113.5",
          userAgent: "jest-agent",
        }),
      ).rejects.toMatchObject({ status: 401, code: "AUTH_INVALID_REFRESH" });

      expect(mockAuthRepo.revokeSessionById).toHaveBeenCalledWith("session-1");
      expect(mockAuthRepo.revokeRefreshBySession).toHaveBeenCalledWith("session-1");
    });
  });
});
