import { db } from "../../../db/index.js";
import * as logsRepository from "../logs.repository.js";
import type { AuditLogEntry } from "../logs.types.js";

jest.mock("../../../db/index.js", () => ({
  db: jest.fn(),
}));

const mockDb = jest.mocked(db);

describe("Logs Repository", () => {
  // Helper to create a query builder that returns mock data
  const createTestQueryBuilder = (mockData: AuditLogEntry[] = []) => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      then: jest.fn(
        (resolve: (value: AuditLogEntry[]) => AuditLogEntry[] | PromiseLike<AuditLogEntry[]>) =>
          Promise.resolve(mockData).then(resolve),
      ),
    };
    return builder;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.mockImplementation(() => createTestQueryBuilder() as never);
  });

  describe("listAuditLogs", () => {
    it("should list audit logs with default pagination", async () => {
      const mockLogs: AuditLogEntry[] = [
        {
          id: "log-1",
          actorUserId: "user-1",
          actorUsername: "testuser",
          entityType: "user",
          action: "user.login",
          entityId: "user-1",
          outcome: "success",
          requestId: "req-1",
          metadata: {},
          createdAt: new Date("2025-01-20T10:00:00Z"),
        },
      ];

      // Create a new query builder that returns the mock data
      const testQueryBuilder = createTestQueryBuilder(mockLogs);
      mockDb.mockReturnValueOnce(testQueryBuilder as never);

      const result = await logsRepository.listAuditLogs({});

      expect(result).toEqual(mockLogs);
      expect(mockDb).toHaveBeenCalledWith("audit_log as al");
      expect(testQueryBuilder.limit).toHaveBeenCalledWith(100);
      expect(testQueryBuilder.offset).toHaveBeenCalledWith(0);
      expect(testQueryBuilder.orderBy).toHaveBeenCalledWith("al.created_at", "desc");
    });

    it("should filter by action", async () => {
      const mockLogs: AuditLogEntry[] = [];
      const testQueryBuilder = createTestQueryBuilder(mockLogs);
      mockDb.mockReturnValueOnce(testQueryBuilder as never);

      await logsRepository.listAuditLogs({ action: "user.login" });

      expect(testQueryBuilder.where).toHaveBeenCalledWith("al.action", "user.login");
    });

    it("should filter by entityType", async () => {
      const mockLogs: AuditLogEntry[] = [];
      const testQueryBuilder = createTestQueryBuilder(mockLogs);
      mockDb.mockReturnValueOnce(testQueryBuilder as never);

      await logsRepository.listAuditLogs({ entityType: "user" });

      expect(testQueryBuilder.where).toHaveBeenCalledWith("al.entity_type", "user");
    });

    it("should filter by actorUserId", async () => {
      const mockLogs: AuditLogEntry[] = [];
      const testQueryBuilder = createTestQueryBuilder(mockLogs);
      mockDb.mockReturnValueOnce(testQueryBuilder as never);

      await logsRepository.listAuditLogs({ actorUserId: "user-123" });

      expect(testQueryBuilder.where).toHaveBeenCalledWith("al.actor_user_id", "user-123");
    });

    it("should filter by outcome", async () => {
      const mockLogs: AuditLogEntry[] = [];
      const testQueryBuilder = createTestQueryBuilder(mockLogs);
      mockDb.mockReturnValueOnce(testQueryBuilder as never);

      await logsRepository.listAuditLogs({ outcome: "success" });

      expect(testQueryBuilder.where).toHaveBeenCalledWith("al.outcome", "success");
    });

    it("should apply custom limit and offset", async () => {
      const mockLogs: AuditLogEntry[] = [];
      const testQueryBuilder = createTestQueryBuilder(mockLogs);
      mockDb.mockReturnValueOnce(testQueryBuilder as never);

      await logsRepository.listAuditLogs({ limit: 50, offset: 10 });

      expect(testQueryBuilder.limit).toHaveBeenCalledWith(50);
      expect(testQueryBuilder.offset).toHaveBeenCalledWith(10);
    });

    it("should cap limit at 500", async () => {
      const mockLogs: AuditLogEntry[] = [];
      const testQueryBuilder = createTestQueryBuilder(mockLogs);
      mockDb.mockReturnValueOnce(testQueryBuilder as never);

      await logsRepository.listAuditLogs({ limit: 1000 });

      expect(testQueryBuilder.limit).toHaveBeenCalledWith(500);
    });

    it("should apply multiple filters", async () => {
      const mockLogs: AuditLogEntry[] = [];
      const testQueryBuilder = createTestQueryBuilder(mockLogs);
      mockDb.mockReturnValueOnce(testQueryBuilder as never);

      await logsRepository.listAuditLogs({
        action: "user.login",
        entityType: "user",
        actorUserId: "user-123",
        outcome: "success",
        limit: 25,
        offset: 5,
      });

      expect(testQueryBuilder.where).toHaveBeenCalledWith("al.action", "user.login");
      expect(testQueryBuilder.where).toHaveBeenCalledWith("al.entity_type", "user");
      expect(testQueryBuilder.where).toHaveBeenCalledWith("al.actor_user_id", "user-123");
      expect(testQueryBuilder.where).toHaveBeenCalledWith("al.outcome", "success");
      expect(testQueryBuilder.limit).toHaveBeenCalledWith(25);
      expect(testQueryBuilder.offset).toHaveBeenCalledWith(5);
    });

    it("should join with users table for actorUsername", async () => {
      const mockLogs: AuditLogEntry[] = [];
      const testQueryBuilder = createTestQueryBuilder(mockLogs);
      mockDb.mockReturnValueOnce(testQueryBuilder as never);

      await logsRepository.listAuditLogs({});

      expect(testQueryBuilder.leftJoin).toHaveBeenCalledWith(
        "users as u",
        "al.actor_user_id",
        "u.id",
      );
      expect(testQueryBuilder.select).toHaveBeenCalledWith("u.username as actorUsername");
    });
  });

  describe("getRecentAdminActivity", () => {
    it("should get recent admin activity with default limit", async () => {
      const mockLogs: AuditLogEntry[] = [
        {
          id: "log-1",
          actorUserId: "admin-1",
          actorUsername: "admin",
          entityType: "user",
          action: "user_suspended",
          entityId: "user-2",
          outcome: "success",
          requestId: "req-1",
          metadata: {},
          createdAt: new Date("2025-01-20T10:00:00Z"),
        },
      ];

      const testQueryBuilder = createTestQueryBuilder(mockLogs);
      mockDb.mockReturnValueOnce(testQueryBuilder as never);

      const result = await logsRepository.getRecentAdminActivity();

      expect(result).toEqual(mockLogs);
      expect(testQueryBuilder.whereIn).toHaveBeenCalledWith("al.action", [
        "user_suspended",
        "user_banned",
        "user_activated",
        "user_deleted",
        "report_dismissed",
        "content_hidden",
        "system_maintenance_enabled",
        "system_maintenance_disabled",
      ]);
      expect(testQueryBuilder.limit).toHaveBeenCalledWith(20);
      expect(testQueryBuilder.orderBy).toHaveBeenCalledWith("al.created_at", "desc");
    });

    it("should use custom limit when provided", async () => {
      const mockLogs: AuditLogEntry[] = [];
      const testQueryBuilder = createTestQueryBuilder(mockLogs);
      mockDb.mockReturnValueOnce(testQueryBuilder as never);

      await logsRepository.getRecentAdminActivity(50);

      expect(testQueryBuilder.limit).toHaveBeenCalledWith(50);
    });

    it("should filter only admin actions", async () => {
      const mockLogs: AuditLogEntry[] = [];
      // Create a new query builder instance for this test to capture the actual calls
      const testQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockLogs),
      };
      mockDb.mockReturnValueOnce(testQueryBuilder as never);

      await logsRepository.getRecentAdminActivity();

      expect(testQueryBuilder.whereIn).toHaveBeenCalledWith(
        "al.action",
        expect.arrayContaining(["user_suspended", "user_banned", "user_activated", "user_deleted"]),
      );
    });

    it("should join with users table for actorUsername", async () => {
      const mockLogs: AuditLogEntry[] = [];
      // Create a new query builder instance for this test to capture the actual calls
      const testQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockLogs),
      };
      mockDb.mockReturnValueOnce(testQueryBuilder as never);

      await logsRepository.getRecentAdminActivity();

      expect(testQueryBuilder.leftJoin).toHaveBeenCalledWith(
        "users as u",
        "al.actor_user_id",
        "u.id",
      );
    });
  });
});
