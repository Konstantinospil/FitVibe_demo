import { insertAudit } from "../../../../apps/backend/src/modules/common/audit.util.js";
import { db } from "../../../../apps/backend/src/db/connection.js";
import { logger } from "../../../../apps/backend/src/config/logger.js";

jest.mock("../../../../apps/backend/src/db/connection");
jest.mock("../../../../apps/backend/src/config/logger", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe("audit.util", () => {
  let mockDbInsert: jest.Mock;

  beforeEach(() => {
    mockDbInsert = jest.fn().mockResolvedValue([]);
    (db as unknown as jest.Mock).mockReturnValue({
      insert: mockDbInsert,
    });

    jest.clearAllMocks();
  });

  describe("insertAudit", () => {
    it("should insert audit log with all fields", async () => {
      await insertAudit({
        actorUserId: "user-123",
        entityType: "user",
        action: "update_profile",
        entityId: "profile-456",
        outcome: "success",
        requestId: "req-789",
        metadata: { field: "email", oldValue: "old@example.com", newValue: "new@example.com" },
      });

      expect(db).toHaveBeenCalledWith("audit_log");
      expect(mockDbInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_user_id: "user-123",
          entity_type: "user",
          action: "update_profile",
          entity_id: "profile-456",
          outcome: "success",
          request_id: "req-789",
          metadata: { field: "email", oldValue: "old@example.com", newValue: "new@example.com" },
        }),
      );

      const calls = mockDbInsert.mock.calls as unknown[][];
      const callArg = calls[0]?.[0] as Record<string, unknown> | undefined;
      expect(callArg).toBeDefined();
      expect(typeof callArg?.id).toBe("string");
      expect(typeof callArg?.created_at).toBe("string");
    });

    it("should use defaults for optional fields", async () => {
      await insertAudit({
        entityType: "session",
        action: "create",
      });

      expect(mockDbInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_user_id: null,
          entity_type: "session",
          action: "create",
          entity_id: null,
          outcome: "success",
          request_id: null,
          metadata: {},
        }),
      );
    });

    it("should use deprecated entity field when entityType is not provided", async () => {
      await insertAudit({
        entity: "legacy_entity",
        action: "legacy_action",
      });

      expect(mockDbInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: "legacy_entity",
          action: "legacy_action",
        }),
      );
    });

    it("should prefer entityType over deprecated entity field", async () => {
      await insertAudit({
        entityType: "new_entity",
        entity: "old_entity",
        action: "test_action",
      });

      expect(mockDbInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: "new_entity",
          action: "test_action",
        }),
      );
    });

    it("should log warning and return early when entityType is missing", async () => {
      await insertAudit({
        action: "test_action",
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ action: "test_action" }),
        "[AUDIT] missing entityType",
      );
      expect(db).not.toHaveBeenCalled();
      expect(mockDbInsert).not.toHaveBeenCalled();
    });

    it("should handle null actorUserId", async () => {
      await insertAudit({
        actorUserId: null,
        entityType: "system",
        action: "automated_task",
      });

      expect(mockDbInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_user_id: null,
          entity_type: "system",
        }),
      );
    });

    it("should handle null entityId", async () => {
      await insertAudit({
        entityType: "system",
        action: "global_event",
        entityId: null,
      });

      expect(mockDbInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_id: null,
          entity_type: "system",
        }),
      );
    });

    it("should handle null requestId", async () => {
      await insertAudit({
        entityType: "task",
        action: "scheduled",
        requestId: null,
      });

      expect(mockDbInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          request_id: null,
          entity_type: "task",
        }),
      );
    });

    it("should handle empty metadata object", async () => {
      await insertAudit({
        entityType: "user",
        action: "login",
        metadata: {},
      });

      expect(mockDbInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {},
        }),
      );
    });

    it("should handle complex metadata with nested objects", async () => {
      const complexMetadata = {
        changes: {
          profile: { name: "New Name" },
          settings: { theme: "dark" },
        },
        ip: "192.168.1.1",
        userAgent: "Mozilla/5.0",
      };

      await insertAudit({
        entityType: "user",
        action: "update",
        metadata: complexMetadata,
      });

      expect(mockDbInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: complexMetadata,
        }),
      );
    });

    it("should generate unique UUID for id field", async () => {
      await insertAudit({
        entityType: "test1",
        action: "action1",
      });

      await insertAudit({
        entityType: "test2",
        action: "action2",
      });

      const calls = mockDbInsert.mock.calls as unknown[][];
      const firstCallArg = calls[0]?.[0] as Record<string, unknown> | undefined;
      const secondCallArg = calls[1]?.[0] as Record<string, unknown> | undefined;

      expect(firstCallArg).toBeDefined();
      expect(secondCallArg).toBeDefined();
      expect(typeof firstCallArg?.id).toBe("string");
      expect(typeof secondCallArg?.id).toBe("string");
      expect(firstCallArg?.id).not.toBe(secondCallArg?.id);
    });

    it("should generate ISO timestamp for created_at", async () => {
      await insertAudit({
        entityType: "test",
        action: "timestamp_test",
      });

      const calls = mockDbInsert.mock.calls as unknown[][];
      const callArg = calls[0]?.[0] as Record<string, unknown> | undefined;
      expect(callArg).toBeDefined();

      const createdAt = callArg?.created_at;
      expect(typeof createdAt).toBe("string");
      expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(createdAt as string).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it("should handle database insert error gracefully", async () => {
      const dbError = new Error("Database connection failed");
      mockDbInsert.mockRejectedValue(dbError);

      await insertAudit({
        entityType: "test",
        action: "error_test",
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: dbError, action: "error_test" }),
        "[AUDIT] insert failed",
      );
    });

    it("should continue execution after database error", async () => {
      mockDbInsert.mockRejectedValue(new Error("DB Error"));

      const result = await insertAudit({
        entityType: "test",
        action: "test",
      });

      expect(result).toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });

    it("should handle different outcome values", async () => {
      const outcomes = ["success", "failure", "pending", "cancelled"];

      for (const outcome of outcomes) {
        await insertAudit({
          entityType: "test",
          action: "test_action",
          outcome,
        });
      }

      expect(mockDbInsert).toHaveBeenCalledTimes(outcomes.length);
      const calls = mockDbInsert.mock.calls as unknown[][];
      outcomes.forEach((outcome, index) => {
        const callArg = calls[index]?.[0] as Record<string, unknown> | undefined;
        expect(callArg).toBeDefined();
        expect(callArg?.outcome).toBe(outcome);
      });
    });

    it("should handle various action types", async () => {
      const actions = [
        "create",
        "read",
        "update",
        "delete",
        "login",
        "logout",
        "upload",
        "download",
      ];

      for (const action of actions) {
        await insertAudit({
          entityType: "test",
          action,
        });
      }

      expect(mockDbInsert).toHaveBeenCalledTimes(actions.length);
    });

    it("should handle various entity types", async () => {
      const entityTypes = ["user", "session", "plan", "exercise", "media", "audit_log"];

      for (const entityType of entityTypes) {
        await insertAudit({
          entityType,
          action: "test",
        });
      }

      expect(mockDbInsert).toHaveBeenCalledTimes(entityTypes.length);
    });

    it("should handle metadata with special characters", async () => {
      const metadata = {
        message: "Quote: \"test\", Apostrophe: 'test'",
        symbol: "@#$%^&*()",
        unicode: "こんにちは",
      };

      await insertAudit({
        entityType: "test",
        action: "special_chars",
        metadata,
      });

      expect(mockDbInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata,
        }),
      );
    });

    it("should handle metadata with arrays", async () => {
      const metadata = {
        tags: ["tag1", "tag2", "tag3"],
        permissions: ["read", "write"],
      };

      await insertAudit({
        entityType: "test",
        action: "array_metadata",
        metadata,
      });

      expect(mockDbInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata,
        }),
      );
    });

    it("should handle long action names", async () => {
      const longAction = "a".repeat(200);

      await insertAudit({
        entityType: "test",
        action: longAction,
      });

      expect(mockDbInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: longAction,
        }),
      );
    });

    it("should handle UUID format entity IDs", async () => {
      const uuidEntityId = "550e8400-e29b-41d4-a716-446655440000";

      await insertAudit({
        entityType: "test",
        action: "uuid_test",
        entityId: uuidEntityId,
      });

      expect(mockDbInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_id: uuidEntityId,
        }),
      );
    });
  });
});
