import { db } from "../../../../apps/backend/src/db/connection.js";
import * as authRepository from "../../../../apps/backend/src/modules/auth/auth.repository.js";

// Mock the database connection
jest.mock("../../../../apps/backend/src/db/connection.js", () => ({
  db: jest.fn(),
}));

const mockDb = jest.mocked(db);

// Add raw helper to mock db
(mockDb as unknown as { raw: jest.Mock }).raw = jest.fn((sql: string) => sql);

// Add transaction method to mock db
(mockDb as unknown as { transaction: jest.Mock }).transaction = jest.fn();

describe("Auth Repository", () => {
  let mockQueryBuilder: {
    select: jest.Mock;
    where: jest.Mock;
    whereNot: jest.Mock;
    whereNull: jest.Mock;
    whereRaw: jest.Mock;
    andWhere: jest.Mock;
    andWhereNot: jest.Mock;
    leftJoin: jest.Mock;
    orderBy: jest.Mock;
    count: jest.Mock;
    first: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    del: jest.Mock;
    returning: jest.Mock;
    transacting: jest.Mock;
    on: jest.Mock;
    andOn: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock transaction that acts as a callable function
    const mockTrxCall = jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      transacting: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      andOn: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
    });

    // Setup transaction mock to call callback by default
    (mockDb as unknown as { transaction: jest.Mock }).transaction.mockImplementation((callback) =>
      callback(mockTrxCall),
    );

    // Create mock query builder with chainable methods
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereNot: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      whereRaw: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      andWhereNot: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      returning: jest.fn().mockResolvedValue([]),
      transacting: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      andOn: jest.fn().mockReturnThis(),
    };

    // Default: db() returns the mock query builder
    mockDb.mockReturnValue(mockQueryBuilder as never);
  });

  describe("findUserByEmail", () => {
    it("should find user by email", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
        display_name: "Test User",
        locale: "en-US",
        preferred_lang: "en",
        status: "active",
        role_code: "athlete",
        password_hash: "hash123",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        primary_email: "test@example.com",
        email_verified: true,
      };

      mockQueryBuilder.first.mockResolvedValue(mockUser);

      const result = await authRepository.findUserByEmail("test@example.com");

      expect(result).toEqual(mockUser);
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalled();
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.whereRaw).toHaveBeenCalledWith("LOWER(c.value) = ?", [
        "test@example.com",
      ]);
    });

    it("should normalize email to lowercase", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      await authRepository.findUserByEmail("TEST@EXAMPLE.COM");

      expect(mockQueryBuilder.whereRaw).toHaveBeenCalledWith("LOWER(c.value) = ?", [
        "test@example.com",
      ]);
    });
  });

  describe("findUserByUsername", () => {
    it("should find user by username case-insensitively", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
        display_name: "Test User",
        primary_email: "test@example.com",
        email_verified: true,
      };

      mockQueryBuilder.first.mockResolvedValue(mockUser);

      const result = await authRepository.findUserByUsername("TestUser");

      expect(result).toEqual(mockUser);
      expect(mockQueryBuilder.whereRaw).toHaveBeenCalledWith("LOWER(u.username) = ?", ["testuser"]);
    });
  });

  describe("findUserById", () => {
    it("should find user by id", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
        display_name: "Test User",
      };

      mockQueryBuilder.first.mockResolvedValue(mockUser);

      const result = await authRepository.findUserById("user-123");

      expect(result).toEqual(mockUser);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("u.id", "user-123");
    });
  });

  describe("createUser", () => {
    it("should create user with primary email in transaction", async () => {
      const mockUser = {
        id: "user-new",
        username: "newuser",
        display_name: "New User",
        primary_email: "new@example.com",
        email_verified: false,
      };

      // Configure mockQueryBuilder to return mockUser
      mockQueryBuilder.first.mockResolvedValue(mockUser);

      // Setup transaction - trx needs to be a callable function
      const trxQueryBuilder = {
        insert: jest.fn().mockResolvedValue([1]),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser),
        transacting: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        on: jest.fn().mockReturnThis(),
        andOn: jest.fn().mockReturnThis(),
      };

      const trxMock = jest.fn().mockReturnValue(trxQueryBuilder);

      (mockDb as unknown as { transaction: jest.Mock }).transaction.mockImplementation((callback) =>
        callback(trxMock),
      );

      const result = await authRepository.createUser({
        id: "user-new",
        username: "newuser",
        display_name: "New User",
        status: "pending_verification",
        role_code: "athlete",
        password_hash: "hash123",
        primaryEmail: "new@example.com",
        emailVerified: false,
      });

      expect(result).toEqual(mockUser);
      expect((mockDb as unknown as { transaction: jest.Mock }).transaction).toHaveBeenCalled();
    });

    it("should use default locale and lang if not provided", async () => {
      const mockUser = {
        id: "user-new",
        username: "newuser",
        display_name: "New User",
        primary_email: "new@example.com",
        email_verified: false,
      };

      // Configure mockQueryBuilder to return mockUser
      mockQueryBuilder.first.mockResolvedValue(mockUser);

      // Setup transaction - trx needs to be a callable function
      const trxQueryBuilder = {
        insert: jest.fn().mockResolvedValue([1]),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser),
        transacting: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        on: jest.fn().mockReturnThis(),
        andOn: jest.fn().mockReturnThis(),
      };

      const trxMock = jest.fn().mockReturnValue(trxQueryBuilder);

      (mockDb as unknown as { transaction: jest.Mock }).transaction.mockImplementation((callback) =>
        callback(trxMock),
      );

      await authRepository.createUser({
        id: "user-new",
        username: "newuser",
        display_name: "New User",
        status: "pending_verification",
        role_code: "athlete",
        password_hash: "hash123",
        primaryEmail: "new@example.com",
      });

      expect((mockDb as unknown as { transaction: jest.Mock }).transaction).toHaveBeenCalled();
    });
  });

  describe("updateUserStatus", () => {
    it("should update user status", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await authRepository.updateUserStatus("user-123", "active");

      expect(result).toBe(1);
      expect(mockDb).toHaveBeenCalledWith("users");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "user-123" });
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });
  });

  describe("updateUserPassword", () => {
    it("should update user password", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await authRepository.updateUserPassword("user-123", "newhash");

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "user-123" });
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });
  });

  describe("insertRefreshToken", () => {
    it("should insert refresh token", async () => {
      const mockToken = {
        id: "token-1",
        user_id: "user-123",
        token_hash: "hash",
        session_jti: "jti-123",
        expires_at: "2024-12-31T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        revoked_at: null,
      };

      mockQueryBuilder.returning.mockResolvedValue([mockToken]);

      const result = await authRepository.insertRefreshToken({
        id: "token-1",
        user_id: "user-123",
        token_hash: "hash",
        session_jti: "jti-123",
        expires_at: "2024-12-31T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
      });

      expect(result).toEqual([mockToken]);
      expect(mockDb).toHaveBeenCalledWith("refresh_tokens");
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });
  });

  describe("revokeRefreshByHash", () => {
    it("should revoke refresh token by hash", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await authRepository.revokeRefreshByHash("token-hash");

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ token_hash: "token-hash" });
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });
  });

  describe("getRefreshByHash", () => {
    it("should get active refresh token by hash", async () => {
      const mockToken = {
        id: "token-1",
        user_id: "user-123",
        token_hash: "hash",
        session_jti: "jti-123",
        expires_at: "2024-12-31T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        revoked_at: null,
      };

      mockQueryBuilder.first.mockResolvedValue(mockToken);

      const result = await authRepository.getRefreshByHash("hash");

      expect(result).toEqual(mockToken);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ token_hash: "hash" });
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("revoked_at");
    });

    it("should return undefined if token not found", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await authRepository.getRefreshByHash("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("revokeRefreshByUserId", () => {
    it("should revoke all refresh tokens for user", async () => {
      mockQueryBuilder.update.mockResolvedValue(3);

      const result = await authRepository.revokeRefreshByUserId("user-123");

      expect(result).toBe(3);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: "user-123" });
    });
  });

  describe("revokeRefreshBySession", () => {
    it("should revoke refresh tokens by session jti", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await authRepository.revokeRefreshBySession("jti-123");

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ session_jti: "jti-123" });
    });
  });

  describe("revokeRefreshByUserExceptSession", () => {
    it("should revoke all user tokens except specific session", async () => {
      mockQueryBuilder.update.mockResolvedValue(2);

      const result = await authRepository.revokeRefreshByUserExceptSession("user-123", "jti-keep");

      expect(result).toBe(2);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: "user-123" });
      expect(mockQueryBuilder.whereNot).toHaveBeenCalledWith({ session_jti: "jti-keep" });
    });
  });

  describe("findRefreshTokenRaw", () => {
    it("should find refresh token without revoke filter", async () => {
      const mockToken = {
        id: "token-1",
        user_id: "user-123",
        token_hash: "hash",
        session_jti: "jti-123",
        expires_at: "2024-12-31T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        revoked_at: "2024-01-02T00:00:00Z",
      };

      mockQueryBuilder.first.mockResolvedValue(mockToken);

      const result = await authRepository.findRefreshTokenRaw("hash");

      expect(result).toEqual(mockToken);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ token_hash: "hash" });
      expect(mockQueryBuilder.whereNull).not.toHaveBeenCalled();
    });
  });

  describe("createAuthToken", () => {
    it("should create auth token", async () => {
      const mockToken = {
        id: "token-1",
        user_id: "user-123",
        token_type: "email_verification",
        token_hash: "hash",
        expires_at: "2024-01-01T01:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        consumed_at: null,
      };

      mockQueryBuilder.returning.mockResolvedValue([mockToken]);

      const result = await authRepository.createAuthToken({
        id: "token-1",
        user_id: "user-123",
        token_type: "email_verification",
        token_hash: "hash",
        expires_at: "2024-01-01T01:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
      });

      expect(result).toEqual([mockToken]);
      expect(mockDb).toHaveBeenCalledWith("auth_tokens");
    });
  });

  describe("deleteAuthTokensByType", () => {
    it("should delete auth tokens by type", async () => {
      mockQueryBuilder.del.mockResolvedValue(2);

      const result = await authRepository.deleteAuthTokensByType("user-123", "email_verification");

      expect(result).toBe(2);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        user_id: "user-123",
        token_type: "email_verification",
      });
    });
  });

  describe("findAuthToken", () => {
    it("should find unconsumed auth token", async () => {
      const mockToken = {
        id: "token-1",
        user_id: "user-123",
        token_type: "email_verification",
        token_hash: "hash",
        expires_at: "2024-01-01T01:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        consumed_at: null,
      };

      mockQueryBuilder.first.mockResolvedValue(mockToken);

      const result = await authRepository.findAuthToken("email_verification", "hash");

      expect(result).toEqual(mockToken);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        token_type: "email_verification",
        token_hash: "hash",
      });
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("consumed_at");
    });
  });

  describe("consumeAuthToken", () => {
    it("should mark auth token as consumed", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await authRepository.consumeAuthToken("token-1");

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "token-1" });
    });
  });

  describe("markAuthTokensConsumed", () => {
    it("should mark all unconsumed tokens of type as consumed", async () => {
      mockQueryBuilder.update.mockResolvedValue(3);

      const result = await authRepository.markAuthTokensConsumed("user-123", "email_verification");

      expect(result).toBe(3);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        user_id: "user-123",
        token_type: "email_verification",
      });
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("consumed_at");
    });
  });

  describe("countAuthTokensSince", () => {
    it("should count auth tokens since date", async () => {
      const mockResult = { count: "5" };
      mockQueryBuilder.first.mockResolvedValue(mockResult);

      const since = new Date("2024-01-01T00:00:00Z");
      const result = await authRepository.countAuthTokensSince(
        "user-123",
        "email_verification",
        since,
      );

      expect(result).toBe(5);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        user_id: "user-123",
        token_type: "email_verification",
      });
    });

    it("should return 0 if no count result", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const since = new Date("2024-01-01T00:00:00Z");
      const result = await authRepository.countAuthTokensSince(
        "user-123",
        "email_verification",
        since,
      );

      expect(result).toBe(0);
    });
  });

  describe("purgeAuthTokensOlderThan", () => {
    it("should purge auth tokens older than date", async () => {
      mockQueryBuilder.del.mockResolvedValue(10);

      const olderThan = new Date("2023-01-01T00:00:00Z");
      const result = await authRepository.purgeAuthTokensOlderThan("email_verification", olderThan);

      expect(result).toBe(10);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ token_type: "email_verification" });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe("createAuthSession", () => {
    it("should create auth session", async () => {
      const mockSession = {
        jti: "jti-123",
        user_id: "user-123",
        user_agent: "Mozilla/5.0",
        ip: "192.168.1.1",
        created_at: "2024-01-01T00:00:00Z",
        expires_at: "2024-01-31T00:00:00Z",
        revoked_at: null,
        last_active_at: null,
      };

      mockQueryBuilder.returning.mockResolvedValue([mockSession]);

      const result = await authRepository.createAuthSession({
        jti: "jti-123",
        user_id: "user-123",
        user_agent: "Mozilla/5.0",
        ip: "192.168.1.1",
        created_at: "2024-01-01T00:00:00Z",
        expires_at: "2024-01-31T00:00:00Z",
      });

      expect(result).toEqual([mockSession]);
      expect(mockDb).toHaveBeenCalledWith("auth_sessions");
    });
  });

  describe("findSessionById", () => {
    it("should find session by jti", async () => {
      const mockSession = {
        jti: "jti-123",
        user_id: "user-123",
        user_agent: "Mozilla/5.0",
        ip: "192.168.1.1",
        created_at: "2024-01-01T00:00:00Z",
        expires_at: "2024-01-31T00:00:00Z",
        revoked_at: null,
        last_active_at: null,
      };

      mockQueryBuilder.first.mockResolvedValue(mockSession);

      const result = await authRepository.findSessionById("jti-123");

      expect(result).toEqual(mockSession);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ jti: "jti-123" });
    });
  });

  describe("listSessionsByUserId", () => {
    it("should list sessions for user", async () => {
      const mockSessions = [
        {
          jti: "jti-1",
          user_id: "user-123",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          jti: "jti-2",
          user_id: "user-123",
          created_at: "2024-01-02T00:00:00Z",
        },
      ];

      (mockQueryBuilder as unknown as Promise<typeof mockSessions>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockSessions);
          return Promise.resolve(mockSessions);
        }) as never;

      const result = await authRepository.listSessionsByUserId("user-123");

      expect(result).toEqual(mockSessions);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: "user-123" });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith("created_at", "desc");
    });
  });

  describe("updateSession", () => {
    it("should update session", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await authRepository.updateSession("jti-123", {
        expires_at: "2024-02-28T00:00:00Z",
        user_agent: "Updated Agent",
      });

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ jti: "jti-123" });
    });
  });

  describe("revokeSessionById", () => {
    it("should revoke session", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await authRepository.revokeSessionById("jti-123");

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ jti: "jti-123" });
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });
  });

  describe("revokeSessionsByUserId", () => {
    it("should revoke all user sessions", async () => {
      mockQueryBuilder.update.mockResolvedValue(3);

      const result = await authRepository.revokeSessionsByUserId("user-123");

      expect(result).toBe(3);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: "user-123" });
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("revoked_at");
    });

    it("should revoke all user sessions except one", async () => {
      mockQueryBuilder.update.mockResolvedValue(2);

      const result = await authRepository.revokeSessionsByUserId("user-123", "jti-keep");

      expect(result).toBe(2);
      expect(mockQueryBuilder.andWhereNot).toHaveBeenCalledWith({ jti: "jti-keep" });
    });
  });

  describe("purgeExpiredSessions", () => {
    it("should purge expired sessions", async () => {
      mockQueryBuilder.del.mockResolvedValue(5);

      const olderThan = new Date("2024-01-01T00:00:00Z");
      const result = await authRepository.purgeExpiredSessions(olderThan);

      expect(result).toBe(5);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });
  });

  describe("markEmailVerified", () => {
    it("should mark email as verified", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await authRepository.markEmailVerified("user-123", "test@example.com");

      expect(result).toBe(1);
      expect(mockDb).toHaveBeenCalledWith("user_contacts");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: "user-123", type: "email" });
      expect(mockQueryBuilder.whereRaw).toHaveBeenCalledWith("LOWER(value) = ?", [
        "test@example.com",
      ]);
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });
  });
});
