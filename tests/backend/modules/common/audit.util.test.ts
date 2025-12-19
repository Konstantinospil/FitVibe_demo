import * as auditUtil from "../../../../apps/backend/src/modules/common/audit.util.js";
import { db } from "../../../../apps/backend/src/db/connection.js";
import { logger } from "../../../../apps/backend/src/config/logger.js";
import crypto from "crypto";

jest.mock("../../../../apps/backend/src/db/connection.js");
jest.mock("../../../../apps/backend/src/config/logger.js", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));
jest.mock("crypto", () => ({
  randomUUID: jest.fn(() => "uuid-123"),
}));

const mockedDb = db as jest.MockedFunction<typeof db>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe("audit.util", () => {
  let mockQueryBuilder: {
    insert: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryBuilder = {
      insert: jest.fn().mockResolvedValue([{ id: "uuid-123" }]),
    };

    mockedDb.mockReturnValue(mockQueryBuilder as never);
  });

  describe("insertAudit", () => {
    it("should insert audit log", async () => {
      const payload = {
        actorUserId: "user-123",
        entityType: "session",
        action: "create",
        entityId: "session-123",
        outcome: "success",
        requestId: "req-123",
        metadata: { key: "value" },
      };

      await auditUtil.insertAudit(payload);

      expect(mockedDb).toHaveBeenCalledWith("audit_log");
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_user_id: "user-123",
          entity_type: "session",
          action: "create",
          entity_id: "session-123",
          outcome: "success",
          request_id: "req-123",
          metadata: { key: "value" },
          created_at: expect.any(String),
        }),
      );
    });

    it("should use entityType over entity", async () => {
      const payload = {
        entityType: "session",
        entity: "old-entity",
        action: "create",
      };

      await auditUtil.insertAudit(payload);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: "session",
        }),
      );
    });

    it("should use entity when entityType not provided", async () => {
      const payload = {
        entity: "session",
        action: "create",
      };

      await auditUtil.insertAudit(payload);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: "session",
        }),
      );
    });

    it("should use default values", async () => {
      const payload = {
        action: "create",
        entityType: "session",
      };

      await auditUtil.insertAudit(payload);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_user_id: null,
          entity_id: null,
          outcome: "success",
          request_id: null,
          metadata: {},
        }),
      );
    });

    it("should log warning when entityType missing", async () => {
      const payload = {
        action: "create",
      };

      await auditUtil.insertAudit(payload);

      expect(mockedLogger.warn).toHaveBeenCalledWith(
        { action: "create" },
        "[AUDIT] missing entityType",
      );
      expect(mockQueryBuilder.insert).not.toHaveBeenCalled();
    });

    it("should handle insert errors", async () => {
      const payload = {
        action: "create",
        entityType: "session",
      };

      const error = new Error("Database error");
      mockQueryBuilder.insert.mockRejectedValue(error);

      await auditUtil.insertAudit(payload);

      expect(mockedLogger.error).toHaveBeenCalledWith(
        { err: error, action: "create" },
        "[AUDIT] insert failed",
      );
    });
  });

  describe("logAudit", () => {
    it("should log audit with all fields", async () => {
      const payload = {
        action: "update",
        entityType: "user",
        entityId: "user-123",
        userId: "actor-123",
        outcome: "success",
        requestId: "req-123",
        metadata: { key: "value" },
      };

      await auditUtil.logAudit(payload);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_user_id: "actor-123",
          entity_type: "user",
          action: "update",
          entity_id: "user-123",
          outcome: "success",
          request_id: "req-123",
          metadata: { key: "value" },
        }),
      );
    });

    it("should use default values", async () => {
      const payload = {
        action: "delete",
        entityType: "session",
      };

      await auditUtil.logAudit(payload);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_user_id: null,
          entity_id: null,
          outcome: "success",
          request_id: null,
          metadata: {},
        }),
      );
    });

    it("should handle null values", async () => {
      const payload = {
        action: "view",
        entityType: "session",
        entityId: null,
        userId: null,
        requestId: null,
      };

      await auditUtil.logAudit(payload);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_user_id: null,
          entity_id: null,
          request_id: null,
        }),
      );
    });
  });
});

