/**
 * Unit tests for pending-2fa.repository
 *
 * Tests CRUD operations for temporary 2FA login sessions
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { Knex } from "knex";
import * as pending2faRepo from "../pending-2fa.repository";
import type { Pending2FASession } from "../pending-2fa.repository";
import * as dbIndex from "../../../db/index.js";

// Mock database
jest.mock("../../../db/index.js", () => ({
  __esModule: true,
  default: jest.fn(),
  db: jest.fn(),
}));

describe("Pending 2FA Repository", () => {
  let mockDb: jest.MockedFunction<Knex>;
  let mockQueryBuilder: {
    insert: jest.MockedFunction<typeof mockQueryBuilder.insert>;
    where: jest.MockedFunction<typeof mockQueryBuilder.where>;
    first: jest.MockedFunction<typeof mockQueryBuilder.first>;
    update: jest.MockedFunction<typeof mockQueryBuilder.update>;
    del: jest.MockedFunction<typeof mockQueryBuilder.del>;
    returning: jest.MockedFunction<typeof mockQueryBuilder.returning>;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock query builder
    mockQueryBuilder = {
      insert: jest.fn<typeof mockQueryBuilder.insert>().mockReturnThis(),
      where: jest.fn<typeof mockQueryBuilder.where>().mockReturnThis(),
      first: jest.fn<typeof mockQueryBuilder.first>().mockReturnThis(),
      update: jest.fn<typeof mockQueryBuilder.update>().mockReturnThis(),
      del: jest.fn<typeof mockQueryBuilder.del>().mockReturnThis(),
      returning: jest.fn<typeof mockQueryBuilder.returning>().mockReturnThis(),
    };

    // Mock db function to return query builder
    mockDb = jest.fn(() => mockQueryBuilder) as unknown as jest.MockedFunction<Knex>;
    const dbModule = jest.mocked(dbIndex);
    dbModule.default = mockDb;
    dbModule.db = mockDb;
  });

  describe("createPending2FASession", () => {
    it("should create a new pending 2FA session", async () => {
      const input = {
        id: "session-123",
        user_id: "user-456",
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        ip: "127.0.0.1",
        user_agent: "Mozilla/5.0",
      };

      const expectedSession: Pending2FASession = {
        ...input,
        created_at: new Date().toISOString(),
        verified: false,
      };

      mockQueryBuilder.returning.mockResolvedValue([expectedSession] as never);

      const result = await pending2faRepo.createPending2FASession(input);

      expect(result).toEqual(expectedSession);
      expect(mockDb).toHaveBeenCalledWith("pending_2fa_sessions");
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        id: input.id,
        user_id: input.user_id,
        expires_at: input.expires_at,
        ip: input.ip,
        user_agent: input.user_agent,
        verified: false,
      });
      expect(mockQueryBuilder.returning).toHaveBeenCalledWith("*");
    });

    it("should throw error if creation fails", async () => {
      const input = {
        id: "session-123",
        user_id: "user-456",
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        ip: "127.0.0.1",
        user_agent: "Mozilla/5.0",
      };

      mockQueryBuilder.returning.mockResolvedValue([] as never);

      await expect(pending2faRepo.createPending2FASession(input)).rejects.toThrow(
        "Failed to create pending 2FA session",
      );
    });

    it("should support transactions", async () => {
      const input = {
        id: "session-123",
        user_id: "user-456",
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        ip: "127.0.0.1",
        user_agent: "Mozilla/5.0",
      };

      const expectedSession: Pending2FASession = {
        ...input,
        created_at: new Date().toISOString(),
        verified: false,
      };

      mockQueryBuilder.returning.mockResolvedValue([expectedSession] as never);

      const mockTrx = mockDb as unknown as Knex.Transaction;
      await pending2faRepo.createPending2FASession(input, mockTrx);

      // Verify transaction was used instead of default db
      expect(mockTrx).toHaveBeenCalledWith("pending_2fa_sessions");
    });
  });

  describe("getPending2FASession", () => {
    it("should retrieve pending 2FA session by ID", async () => {
      const sessionId = "session-123";
      const expectedSession: Pending2FASession = {
        id: sessionId,
        user_id: "user-456",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        ip: "127.0.0.1",
        user_agent: "Mozilla/5.0",
        verified: false,
      };

      mockQueryBuilder.first.mockResolvedValue(expectedSession as never);

      const result = await pending2faRepo.getPending2FASession(sessionId);

      expect(result).toEqual(expectedSession);
      expect(mockDb).toHaveBeenCalledWith("pending_2fa_sessions");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: sessionId });
      expect(mockQueryBuilder.first).toHaveBeenCalled();
    });

    it("should return null if session not found", async () => {
      const sessionId = "non-existent-session";
      mockQueryBuilder.first.mockResolvedValue(undefined as never);

      const result = await pending2faRepo.getPending2FASession(sessionId);

      expect(result).toBeNull();
    });

    it("should support transactions", async () => {
      const sessionId = "session-123";
      const mockTrx = mockDb as unknown as Knex.Transaction;

      mockQueryBuilder.first.mockResolvedValue(null as never);

      await pending2faRepo.getPending2FASession(sessionId, mockTrx);

      expect(mockTrx).toHaveBeenCalledWith("pending_2fa_sessions");
    });
  });

  describe("markPending2FASessionVerified", () => {
    it("should mark session as verified", async () => {
      const sessionId = "session-123";
      mockQueryBuilder.update.mockResolvedValue(1 as never);

      await pending2faRepo.markPending2FASessionVerified(sessionId);

      expect(mockDb).toHaveBeenCalledWith("pending_2fa_sessions");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: sessionId });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ verified: true });
    });

    it("should support transactions", async () => {
      const sessionId = "session-123";
      const mockTrx = mockDb as unknown as Knex.Transaction;

      mockQueryBuilder.update.mockResolvedValue(1 as never);

      await pending2faRepo.markPending2FASessionVerified(sessionId, mockTrx);

      expect(mockTrx).toHaveBeenCalledWith("pending_2fa_sessions");
    });
  });

  describe("deletePending2FASession", () => {
    it("should delete pending 2FA session", async () => {
      const sessionId = "session-123";
      mockQueryBuilder.del.mockResolvedValue(1 as never);

      await pending2faRepo.deletePending2FASession(sessionId);

      expect(mockDb).toHaveBeenCalledWith("pending_2fa_sessions");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: sessionId });
      expect(mockQueryBuilder.del).toHaveBeenCalled();
    });

    it("should support transactions", async () => {
      const sessionId = "session-123";
      const mockTrx = mockDb as unknown as Knex.Transaction;

      mockQueryBuilder.del.mockResolvedValue(1 as never);

      await pending2faRepo.deletePending2FASession(sessionId, mockTrx);

      expect(mockTrx).toHaveBeenCalledWith("pending_2fa_sessions");
    });
  });

  describe("deleteExpiredPending2FASessions", () => {
    it("should delete all expired sessions", async () => {
      const deletedCount = 5;
      mockQueryBuilder.del.mockResolvedValue(deletedCount as never);

      const result = await pending2faRepo.deleteExpiredPending2FASessions();

      expect(result).toBe(deletedCount);
      expect(mockDb).toHaveBeenCalledWith("pending_2fa_sessions");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "expires_at",
        "<",
        expect.any(String), // ISO date string
      );
      expect(mockQueryBuilder.del).toHaveBeenCalled();
    });

    it("should return 0 if no expired sessions", async () => {
      mockQueryBuilder.del.mockResolvedValue(0 as never);

      const result = await pending2faRepo.deleteExpiredPending2FASessions();

      expect(result).toBe(0);
    });

    it("should support transactions", async () => {
      const mockTrx = mockDb as unknown as Knex.Transaction;
      mockQueryBuilder.del.mockResolvedValue(3 as never);

      await pending2faRepo.deleteExpiredPending2FASessions(mockTrx);

      expect(mockTrx).toHaveBeenCalledWith("pending_2fa_sessions");
    });
  });

  describe("Edge cases", () => {
    it("should handle null IP addresses", async () => {
      const input = {
        id: "session-123",
        user_id: "user-456",
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        ip: null,
        user_agent: "Mozilla/5.0",
      };

      const expectedSession: Pending2FASession = {
        ...input,
        created_at: new Date().toISOString(),
        verified: false,
      };

      mockQueryBuilder.returning.mockResolvedValue([expectedSession] as never);

      const result = await pending2faRepo.createPending2FASession(input);

      expect(result.ip).toBeNull();
    });

    it("should handle null user agents", async () => {
      const input = {
        id: "session-123",
        user_id: "user-456",
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        ip: "127.0.0.1",
        user_agent: null,
      };

      const expectedSession: Pending2FASession = {
        ...input,
        created_at: new Date().toISOString(),
        verified: false,
      };

      mockQueryBuilder.returning.mockResolvedValue([expectedSession] as never);

      const result = await pending2faRepo.createPending2FASession(input);

      expect(result.user_agent).toBeNull();
    });
  });
});
