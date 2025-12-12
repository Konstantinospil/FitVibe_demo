import { db } from "../../../../apps/backend/src/db/connection.js";
import * as idempotencyService from "../../../../apps/backend/src/modules/common/idempotency.service.js";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";
import type { IdempotencyContext } from "../../../../apps/backend/src/modules/common/idempotency.service.js";

// Mock db
jest.mock("../../../../apps/backend/src/db/connection.js", () => {
  const createQueryBuilder = (defaultValue: unknown = []) => {
    const builder = Object.assign(Promise.resolve(defaultValue), {
      where: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue(1),
      onConflict: jest.fn().mockReturnThis(),
      ignore: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue(defaultValue),
      first: jest.fn().mockResolvedValue(null),
    });
    return builder;
  };

  const mockDbFunction = jest.fn(createQueryBuilder) as jest.Mock;

  return {
    db: mockDbFunction,
  };
});

const mockDb = jest.mocked(db);

describe("Idempotency Service", () => {
  const context: IdempotencyContext = {
    userId: "user-123",
    method: "POST",
    route: "/api/v1/sessions",
    key: "idempotency-key-123",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("resolveIdempotency", () => {
    it("should return new record when key does not exist", async () => {
      const payload = { title: "Test Session" };
      const mockInserted = [
        {
          id: "record-123",
          user_id: context.userId,
          method: context.method,
          route: context.route,
          key: context.key,
          request_hash: expect.any(String),
          response_status: null,
          response_body: null,
          created_at: expect.any(String),
          updated_at: expect.any(String),
        },
      ];

      const mockBuilder = {
        insert: jest.fn().mockReturnThis(),
        onConflict: jest.fn().mockReturnThis(),
        ignore: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue(mockInserted),
      };
      mockDb.mockReturnValue(mockBuilder as never);

      const result = await idempotencyService.resolveIdempotency(context, payload);

      expect(result.type).toBe("new");
      if (result.type === "new" || result.type === "pending") {
        expect(result.recordId).toBe("record-123");
      }
    });

    it("should return replay when existing record has response", async () => {
      const payload = { title: "Test Session" };
      // Calculate the actual hash that will be computed
      const crypto = await import("node:crypto");
      const requestHash = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

      const existingRecord = {
        id: "record-123",
        request_hash: requestHash,
        response_status: 201,
        response_body: { id: "session-123" },
      };

      // First insert returns empty (conflict)
      const mockInsertBuilder = {
        insert: jest.fn().mockReturnThis(),
        onConflict: jest.fn().mockReturnThis(),
        ignore: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      };

      // Then query returns existing record
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(existingRecord),
      };

      mockDb
        .mockReturnValueOnce(mockInsertBuilder as never)
        .mockReturnValueOnce(mockQueryBuilder as never);

      const result = await idempotencyService.resolveIdempotency(context, payload);

      expect(result.type).toBe("replay");
      if (result.type === "replay") {
        expect(result.status).toBe(201);
        expect(result.body).toEqual({ id: "session-123" });
      }
    });

    it("should return pending when existing record has no response", async () => {
      const payload = { title: "Test Session" };
      // Calculate the actual hash that will be computed
      const crypto = await import("node:crypto");
      const requestHash = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

      const existingRecord = {
        id: "record-123",
        request_hash: requestHash,
        response_status: null,
        response_body: null,
      };

      const mockInsertBuilder = {
        insert: jest.fn().mockReturnThis(),
        onConflict: jest.fn().mockReturnThis(),
        ignore: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(existingRecord),
      };

      mockDb
        .mockReturnValueOnce(mockInsertBuilder as never)
        .mockReturnValueOnce(mockQueryBuilder as never);

      const result = await idempotencyService.resolveIdempotency(context, payload);

      expect(result.type).toBe("pending");
      if (result.type === "pending" || result.type === "new") {
        expect(result.recordId).toBe("record-123");
      }
    });

    it("should throw error when request hash mismatch", async () => {
      const payload1 = { title: "Test Session 1" };
      const payload2 = { title: "Test Session 2" };

      // Calculate hash for payload1 (what's stored)
      const crypto = await import("node:crypto");
      const hash1 = crypto.createHash("sha256").update(JSON.stringify(payload1)).digest("hex");

      const existingRecord = {
        id: "record-123",
        request_hash: hash1,
        response_status: null,
        response_body: null,
      };

      const mockInsertBuilder = {
        insert: jest.fn().mockReturnThis(),
        onConflict: jest.fn().mockReturnThis(),
        ignore: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(existingRecord),
      };

      mockDb
        .mockReturnValueOnce(mockInsertBuilder as never)
        .mockReturnValueOnce(mockQueryBuilder as never);

      await expect(idempotencyService.resolveIdempotency(context, payload2)).rejects.toThrow(
        HttpError,
      );
      await expect(idempotencyService.resolveIdempotency(context, payload2)).rejects.toThrow(
        "IDEMPOTENCY_MISMATCH",
      );
    });
  });

  describe("persistIdempotencyResult", () => {
    it("should persist idempotency result", async () => {
      const recordId = "record-123";
      const status = 201;
      const body = { id: "session-123" };

      const mockBuilder = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };
      mockDb.mockReturnValue(mockBuilder as never);

      await idempotencyService.persistIdempotencyResult(recordId, status, body);

      expect(mockBuilder.where).toHaveBeenCalledWith({ id: recordId });
      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          response_status: status,
          response_body: body,
        }),
      );
    });

    it("should handle null body", async () => {
      const recordId = "record-123";
      const status = 204;

      const mockBuilder = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };
      mockDb.mockReturnValue(mockBuilder as never);

      await idempotencyService.persistIdempotencyResult(recordId, status, null);

      expect(mockBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          response_status: status,
          response_body: null,
        }),
      );
    });
  });
});
