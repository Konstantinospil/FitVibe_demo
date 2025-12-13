import { db } from "../../../../apps/backend/src/db/connection.js";
import * as dsrService from "../../../../apps/backend/src/modules/users/dsr.service.js";
import * as mediaStorageService from "../../../../apps/backend/src/services/mediaStorage.service.js";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";
import type { DeleteSchedule } from "../../../../apps/backend/src/modules/users/dsr.service.js";

// Mock dependencies - create configurable query builders
// Store query builders in module scope for test access
const queryBuilders: Record<string, any> = {};

function createMockQueryBuilder() {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    select: jest.fn().mockResolvedValue([]),
    pluck: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
  };
}

function createMockTrx() {
  const builder = createMockQueryBuilder();
  return Object.assign(
    jest.fn((table: string) => builder),
    builder,
  );
}

jest.mock("../../../../apps/backend/src/db/connection.js", () => {
  const mockDbFunction = jest.fn((table: string) => {
    if (!queryBuilders[table]) {
      queryBuilders[table] = createMockQueryBuilder();
    }
    return queryBuilders[table];
  }) as jest.Mock & {
    transaction: jest.Mock;
  };

  mockDbFunction.transaction = jest.fn(
    (callback: (trx: ReturnType<typeof createMockTrx>) => Promise<void>) =>
      callback(createMockTrx()),
  );

  return {
    db: mockDbFunction,
  };
});
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

const mockMediaStorage = jest.mocked(mediaStorageService);

describe("DSR Service", () => {
  const userId = "user-123";

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear query builders
    Object.keys(queryBuilders).forEach((key) => delete queryBuilders[key]);
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

      // Configure mock for users table - call db() to initialize the builder
      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].first.mockResolvedValue(mockUser);
        queryBuilders["users"].update.mockResolvedValue(1);
      }

      const result = await dsrService.scheduleAccountDeletion(userId);

      expect(result).toBeDefined();
      expect(result.scheduledAt).toBeDefined();
      expect(result.purgeDueAt).toBeDefined();
      expect(result.backupPurgeDueAt).toBeDefined();
      expect(queryBuilders["users"]?.update).toHaveBeenCalled();
    });

    it("should throw 404 when user not found", async () => {
      db("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].first.mockResolvedValue(null);
      }

      await expect(dsrService.scheduleAccountDeletion(userId)).rejects.toThrow(HttpError);
      await expect(dsrService.scheduleAccountDeletion(userId)).rejects.toThrow("User not found");
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

      // Configure mocks for all db calls
      db("users");
      db("media");
      db("sessions");
      db("user_contacts");
      if (queryBuilders["users"]) {
        queryBuilders["users"].first.mockResolvedValue(mockUser);
      }
      if (queryBuilders["media"]) {
        queryBuilders["media"].select.mockResolvedValue(mockMedia);
      }
      if (queryBuilders["sessions"]) {
        queryBuilders["sessions"].pluck.mockResolvedValue(["session-123"]);
      }
      if (queryBuilders["user_contacts"]) {
        queryBuilders["user_contacts"].first.mockResolvedValue({ value: "test@example.com" });
      }
      mockMediaStorage.deleteStorageObject.mockResolvedValue(undefined);

      await dsrService.executeAccountDeletion(userId);

      expect(mockMediaStorage.deleteStorageObject).toHaveBeenCalled();
    });

    it("should throw 404 when user not found", async () => {
      db("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].first.mockResolvedValue(null);
      }

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

      db("users");
      if (queryBuilders["users"]) {
        queryBuilders["users"].first.mockResolvedValue(mockUser);
      }

      await expect(dsrService.executeAccountDeletion(userId)).rejects.toThrow(HttpError);
      await expect(dsrService.executeAccountDeletion(userId)).rejects.toThrow(
        "Account must be pending deletion before purge",
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

      // Configure mocks for processDueAccountDeletions
      db("users");
      db("media");
      db("sessions");
      db("user_contacts");
      if (queryBuilders["users"]) {
        // First call: select users for processDueAccountDeletions
        // Second call: first() to get user in executeAccountDeletion
        queryBuilders["users"].select = jest
          .fn()
          .mockResolvedValueOnce(mockUsers.map((u) => ({ id: u.id })))
          .mockResolvedValue(mockUsers);
        queryBuilders["users"].first = jest.fn().mockResolvedValue(mockUsers[0]);
        (queryBuilders["users"] as unknown as { whereNotNull: jest.Mock }).whereNotNull = jest
          .fn()
          .mockReturnThis();
        (queryBuilders["users"] as unknown as { whereRaw: jest.Mock }).whereRaw = jest
          .fn()
          .mockReturnThis();
      }
      if (queryBuilders["media"]) {
        queryBuilders["media"].select.mockResolvedValue([]);
      }
      if (queryBuilders["sessions"]) {
        queryBuilders["sessions"].pluck.mockResolvedValue([]);
      }
      if (queryBuilders["user_contacts"]) {
        queryBuilders["user_contacts"].first.mockResolvedValue(null);
      }
      mockMediaStorage.deleteStorageObject.mockResolvedValue(undefined);

      const result = await dsrService.processDueAccountDeletions();

      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});
