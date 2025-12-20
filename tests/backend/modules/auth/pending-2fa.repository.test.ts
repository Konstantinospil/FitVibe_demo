import { db } from "../../../../apps/backend/src/db/index.js";
import * as pending2FARepository from "../../../../apps/backend/src/modules/auth/pending-2fa.repository.js";
import type { Knex } from "knex";

const queryBuilders: Record<string, any> = {};

function createMockQueryBuilder(defaultValue: unknown = null) {
  const builder = Object.assign(Promise.resolve(defaultValue), {
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    first: jest.fn().mockResolvedValue(null),
  });
  return builder;
}

jest.mock("../../../../apps/backend/src/db/index.js", () => {
  const mockDbFunction = jest.fn((table: string) => {
    if (!queryBuilders[table]) {
      queryBuilders[table] = createMockQueryBuilder();
    }
    return queryBuilders[table];
  }) as jest.Mock;

  return {
    db: mockDbFunction,
  };
});

const mockedDb = db as jest.MockedFunction<typeof db>;

describe("pending-2fa.repository", () => {
  const userId = "user-123";
  const sessionId = "session-123";

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(queryBuilders).forEach((key) => delete queryBuilders[key]);
  });

  describe("createPending2FASession", () => {
    it("should create pending 2FA session", async () => {
      const input = {
        id: sessionId,
        user_id: userId,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        ip: "192.168.1.1",
        user_agent: "Mozilla/5.0",
      };

      const mockSession: pending2FARepository.Pending2FASession = {
        id: sessionId,
        user_id: userId,
        created_at: new Date().toISOString(),
        expires_at: input.expires_at,
        ip: input.ip,
        user_agent: input.user_agent,
        verified: false,
      };

      const newBuilder = createMockQueryBuilder();
      queryBuilders["pending_2fa_sessions"] = newBuilder;
      newBuilder.returning.mockResolvedValue([mockSession]);

      const result = await pending2FARepository.createPending2FASession(input);

      expect(result).toEqual(mockSession);
      expect(newBuilder.insert).toHaveBeenCalledWith({
        id: sessionId,
        user_id: userId,
        expires_at: input.expires_at,
        ip: input.ip,
        user_agent: input.user_agent,
        verified: false,
      });
    });

    it("should throw error when insert returns no session", async () => {
      const input = {
        id: sessionId,
        user_id: userId,
        expires_at: new Date().toISOString(),
        ip: null,
        user_agent: null,
      };

      const newBuilder = createMockQueryBuilder();
      queryBuilders["pending_2fa_sessions"] = newBuilder;
      newBuilder.returning.mockResolvedValue([]);

      await expect(pending2FARepository.createPending2FASession(input)).rejects.toThrow(
        "Failed to create pending 2FA session",
      );
    });

    it("should work with transaction", async () => {
      const input = {
        id: sessionId,
        user_id: userId,
        expires_at: new Date().toISOString(),
        ip: null,
        user_agent: null,
      };

      const mockSession: pending2FARepository.Pending2FASession = {
        id: sessionId,
        user_id: userId,
        created_at: new Date().toISOString(),
        expires_at: input.expires_at,
        ip: null,
        user_agent: null,
        verified: false,
      };

      const newBuilder = createMockQueryBuilder();
      newBuilder.returning.mockResolvedValue([mockSession]);
      const mockTrx = ((_table: string) => newBuilder) as unknown as Knex.Transaction;

      await pending2FARepository.createPending2FASession(input, mockTrx);

      expect(newBuilder.insert).toHaveBeenCalled();
    });
  });

  describe("getPending2FASession", () => {
    it("should get pending 2FA session", async () => {
      const mockSession: pending2FARepository.Pending2FASession = {
        id: sessionId,
        user_id: userId,
        created_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
        ip: "192.168.1.1",
        user_agent: "Mozilla/5.0",
        verified: false,
      };

      const newBuilder = createMockQueryBuilder();
      queryBuilders["pending_2fa_sessions"] = newBuilder;
      newBuilder.first.mockResolvedValue(mockSession);

      const result = await pending2FARepository.getPending2FASession(sessionId);

      expect(result).toEqual(mockSession);
      expect(newBuilder.where).toHaveBeenCalledWith({ id: sessionId });
    });

    it("should return null when session not found", async () => {
      const newBuilder = createMockQueryBuilder();
      queryBuilders["pending_2fa_sessions"] = newBuilder;
      newBuilder.first.mockResolvedValue(undefined);

      const result = await pending2FARepository.getPending2FASession(sessionId);

      expect(result).toBeNull();
    });

    it("should work with transaction", async () => {
      const newBuilder = createMockQueryBuilder();
      newBuilder.first.mockResolvedValue(null);
      const mockTrx = ((_table: string) => newBuilder) as unknown as Knex.Transaction;

      await pending2FARepository.getPending2FASession(sessionId, mockTrx);

      expect(newBuilder.where).toHaveBeenCalled();
    });
  });

  describe("markPending2FASessionVerified", () => {
    it("should mark session as verified", async () => {
      const newBuilder = createMockQueryBuilder();
      queryBuilders["pending_2fa_sessions"] = newBuilder;
      newBuilder.update.mockResolvedValue(1);

      await pending2FARepository.markPending2FASessionVerified(sessionId);

      expect(newBuilder.where).toHaveBeenCalledWith({ id: sessionId });
      expect(newBuilder.update).toHaveBeenCalledWith({ verified: true });
    });

    it("should work with transaction", async () => {
      const newBuilder = createMockQueryBuilder();
      newBuilder.update.mockResolvedValue(1);
      const mockTrx = ((_table: string) => newBuilder) as unknown as Knex.Transaction;

      await pending2FARepository.markPending2FASessionVerified(sessionId, mockTrx);

      expect(newBuilder.update).toHaveBeenCalled();
    });
  });

  describe("deletePending2FASession", () => {
    it("should delete pending 2FA session", async () => {
      const newBuilder = createMockQueryBuilder();
      queryBuilders["pending_2fa_sessions"] = newBuilder;
      newBuilder.del.mockResolvedValue(1);

      await pending2FARepository.deletePending2FASession(sessionId);

      expect(newBuilder.where).toHaveBeenCalledWith({ id: sessionId });
      expect(newBuilder.del).toHaveBeenCalled();
    });

    it("should work with transaction", async () => {
      const newBuilder = createMockQueryBuilder();
      newBuilder.del.mockResolvedValue(1);
      const mockTrx = ((_table: string) => newBuilder) as unknown as Knex.Transaction;

      await pending2FARepository.deletePending2FASession(sessionId, mockTrx);

      expect(newBuilder.del).toHaveBeenCalled();
    });
  });

  describe("deleteExpiredPending2FASessions", () => {
    it("should delete expired sessions", async () => {
      const newBuilder = createMockQueryBuilder();
      queryBuilders["pending_2fa_sessions"] = newBuilder;
      newBuilder.del.mockResolvedValue(5);

      const result = await pending2FARepository.deleteExpiredPending2FASessions();

      expect(result).toBe(5);
      expect(newBuilder.where).toHaveBeenCalledWith("expires_at", "<", expect.any(String));
      expect(newBuilder.del).toHaveBeenCalled();
    });

    it("should work with transaction", async () => {
      const newBuilder = createMockQueryBuilder();
      newBuilder.del.mockResolvedValue(3);
      const mockTrx = ((_table: string) => newBuilder) as unknown as Knex.Transaction;

      await pending2FARepository.deleteExpiredPending2FASessions(mockTrx);

      expect(newBuilder.del).toHaveBeenCalled();
    });
  });
});
