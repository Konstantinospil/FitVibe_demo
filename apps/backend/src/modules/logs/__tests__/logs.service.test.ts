/**
 * Unit tests for logs service
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import * as service from "../logs.service";
import * as repo from "../logs.repository";
import type { AuditLogEntry } from "../logs.types";

// Mock the repository
jest.mock("../logs.repository", () => ({
  listAuditLogs: jest.fn(),
  getRecentAdminActivity: jest.fn(),
}));

describe("Logs Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listLogs", () => {
    it("should list audit logs", async () => {
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
          createdAt: new Date().toISOString(),
        },
      ];

      jest.mocked(repo.listAuditLogs).mockResolvedValue(mockLogs);

      const result = await service.listLogs({ limit: 10 });

      expect(result).toEqual(mockLogs);
      expect(repo.listAuditLogs).toHaveBeenCalledWith({ limit: 10 });
    });

    it("should handle filtering by actorUserId", async () => {
      const mockLogs: AuditLogEntry[] = [];
      jest.mocked(repo.listAuditLogs).mockResolvedValue(mockLogs);

      await service.listLogs({ actorUserId: "user-1", limit: 10 });

      expect(repo.listAuditLogs).toHaveBeenCalledWith({ actorUserId: "user-1", limit: 10 });
    });

    it("should handle filtering by action", async () => {
      const mockLogs: AuditLogEntry[] = [];
      jest.mocked(repo.listAuditLogs).mockResolvedValue(mockLogs);

      await service.listLogs({ action: "user.login", limit: 10 });

      expect(repo.listAuditLogs).toHaveBeenCalledWith({ action: "user.login", limit: 10 });
    });

    it("should handle filtering by entityType", async () => {
      const mockLogs: AuditLogEntry[] = [];
      jest.mocked(repo.listAuditLogs).mockResolvedValue(mockLogs);

      await service.listLogs({ entityType: "user", limit: 10 });

      expect(repo.listAuditLogs).toHaveBeenCalledWith({ entityType: "user", limit: 10 });
    });

    it("should handle filtering by outcome", async () => {
      const mockLogs: AuditLogEntry[] = [];
      jest.mocked(repo.listAuditLogs).mockResolvedValue(mockLogs);

      await service.listLogs({ outcome: "success", limit: 10 });

      expect(repo.listAuditLogs).toHaveBeenCalledWith({ outcome: "success", limit: 10 });
    });

    it("should handle all filters together", async () => {
      const mockLogs: AuditLogEntry[] = [];
      jest.mocked(repo.listAuditLogs).mockResolvedValue(mockLogs);

      await service.listLogs({
        action: "user.login",
        entityType: "user",
        actorUserId: "user-123",
        outcome: "success",
        limit: 25,
        offset: 5,
      });

      expect(repo.listAuditLogs).toHaveBeenCalledWith({
        action: "user.login",
        entityType: "user",
        actorUserId: "user-123",
        outcome: "success",
        limit: 25,
        offset: 5,
      });
    });
  });

  describe("getRecentActivity", () => {
    it("should get recent admin activity", async () => {
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
          createdAt: new Date().toISOString(),
        },
      ];

      jest.mocked(repo.getRecentAdminActivity).mockResolvedValue(mockLogs);

      const result = await service.getRecentActivity(5);

      expect(result).toEqual(mockLogs);
      expect(repo.getRecentAdminActivity).toHaveBeenCalledWith(5);
    });

    it("should use default limit when not provided", async () => {
      jest.mocked(repo.getRecentAdminActivity).mockResolvedValue([]);

      await service.getRecentActivity();

      expect(repo.getRecentAdminActivity).toHaveBeenCalledWith(undefined);
    });
  });
});
