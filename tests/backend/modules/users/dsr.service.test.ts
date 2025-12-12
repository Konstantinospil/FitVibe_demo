import { db } from "../../../../apps/backend/src/db/connection.js";
import * as dsrService from "../../../../apps/backend/src/modules/users/dsr.service.js";
import * as mediaStorageService from "../../../../apps/backend/src/services/mediaStorage.service.js";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";
import type { DeleteSchedule } from "../../../../apps/backend/src/modules/users/dsr.service.js";

// Mock dependencies
jest.mock("../../../../apps/backend/src/db/connection.js");
jest.mock("../../../../apps/backend/src/services/mediaStorage.service.js");
jest.mock("../../../../apps/backend/src/modules/common/audit.util.js", () => ({
  insertAudit: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../../../apps/backend/src/config/env.js", () => ({
  env: {
    dsr: {
      purgeDelayMinutes: 14 * 24 * 60, // 14 days
      backupPurgeDays: 30,
    },
    mediaStorageRoot: "/tmp/test-storage",
  },
}));

const mockDb = jest.mocked(db);
const mockMediaStorage = jest.mocked(mediaStorageService);

describe("DSR Service", () => {
  const userId = "user-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("scheduleAccountDeletion", () => {
    it("should schedule account deletion", async () => {
      const mockUser = {
        id: userId,
        username: "testuser",
        status: "active",
        deleted_at: null,
        purge_scheduled_at: null,
        backup_purge_due_at: null,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockReturnValue(mockQueryBuilder as never);

      const result = await dsrService.scheduleAccountDeletion(userId);

      expect(result).toBeDefined();
      expect(result.scheduledAt).toBeDefined();
      expect(result.purgeDueAt).toBeDefined();
      expect(result.backupPurgeDueAt).toBeDefined();
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });

    it("should throw 404 when user not found", async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      };

      mockDb.mockReturnValue(mockQueryBuilder as never);

      await expect(dsrService.scheduleAccountDeletion(userId)).rejects.toThrow(HttpError);
      await expect(dsrService.scheduleAccountDeletion(userId)).rejects.toThrow("USER_NOT_FOUND");
    });
  });

  describe("executeAccountDeletion", () => {
    it("should execute account deletion", async () => {
      const mockUser = {
        id: userId,
        username: "testuser",
        status: "pending_deletion",
        deleted_at: new Date().toISOString(),
        purge_scheduled_at: null,
        backup_purge_due_at: null,
      };

      const mockMedia = [
        {
          id: "media-1",
          storage_key: "storage-key-1",
          owner_id: userId,
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser),
        select: jest.fn().mockResolvedValue(mockMedia),
        update: jest.fn().mockResolvedValue(1),
        delete: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockReturnValue(mockQueryBuilder as never);
      mockMediaStorage.deleteStorageObject.mockResolvedValue(undefined);

      await dsrService.executeAccountDeletion(userId);

      expect(mockMediaStorage.deleteStorageObject).toHaveBeenCalled();
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });

    it("should throw 404 when user not found", async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      };

      mockDb.mockReturnValue(mockQueryBuilder as never);

      await expect(dsrService.executeAccountDeletion(userId)).rejects.toThrow(HttpError);
    });

    it("should throw error when user status is not pending_deletion", async () => {
      const mockUser = {
        id: userId,
        username: "testuser",
        status: "active",
        deleted_at: null,
        purge_scheduled_at: null,
        backup_purge_due_at: null,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser),
      };

      mockDb.mockReturnValue(mockQueryBuilder as never);

      await expect(dsrService.executeAccountDeletion(userId)).rejects.toThrow(HttpError);
      await expect(dsrService.executeAccountDeletion(userId)).rejects.toThrow(
        "USER_DELETE_INVALID_STATE",
      );
    });
  });

  describe("processDueAccountDeletions", () => {
    it("should process due account deletions", async () => {
      const mockUsers = [
        {
          id: userId,
          username: "testuser",
          status: "pending_deletion",
          deleted_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          purge_scheduled_at: new Date(Date.now() - 1000).toISOString(),
          backup_purge_due_at: null,
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        whereNotNull: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockUsers),
        first: jest.fn().mockResolvedValue(mockUsers[0]),
        update: jest.fn().mockResolvedValue(1),
        delete: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockReturnValue(mockQueryBuilder as never);
      mockMediaStorage.deleteStorageObject.mockResolvedValue(undefined);

      const result = await dsrService.processDueAccountDeletions();

      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});
