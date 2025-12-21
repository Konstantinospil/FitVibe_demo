import type { Request, Response } from "express";
import type { JwtPayload } from "../../../../apps/backend/src/modules/auth/auth.types.js";
import {
  getIdempotencyKey,
  getRouteTemplate,
  requireAuthenticatedUser,
  handleIdempotentRequest,
  withIdempotency,
} from "../../../../apps/backend/src/modules/common/idempotency.helpers.js";
import * as idempotencyService from "../../../../apps/backend/src/modules/common/idempotency.service.js";

// Mock the idempotency service
jest.mock("../../../../apps/backend/src/modules/common/idempotency.service.js");

describe("idempotency.helpers", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let setMock: jest.Mock;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();
    setMock = jest.fn().mockReturnThis();

    mockRequest = {
      get: jest.fn(),
      baseUrl: "",
      route: {},
      method: "POST",
      user: undefined,
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
      set: setMock,
    };

    jest.clearAllMocks();
  });

  describe("getIdempotencyKey", () => {
    it("should return null when header is not provided", () => {
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      const result = getIdempotencyKey(mockRequest as Request);

      expect(result).toBeNull();
      expect(mockRequest.get).toHaveBeenCalledWith("Idempotency-Key");
    });

    it("should return null when header is empty string", () => {
      (mockRequest.get as jest.Mock).mockReturnValue("");

      const result = getIdempotencyKey(mockRequest as Request);

      expect(result).toBeNull();
    });

    it("should return trimmed key when valid header is provided", () => {
      (mockRequest.get as jest.Mock).mockReturnValue("  key-123  ");

      const result = getIdempotencyKey(mockRequest as Request);

      expect(result).toBe("key-123");
    });

    it("should return key without trimming when no whitespace", () => {
      (mockRequest.get as jest.Mock).mockReturnValue("abc-def-ghi");

      const result = getIdempotencyKey(mockRequest as Request);

      expect(result).toBe("abc-def-ghi");
    });

    it("should throw when header is only whitespace", () => {
      (mockRequest.get as jest.Mock).mockReturnValue("   ");

      expect(() => getIdempotencyKey(mockRequest as Request)).toThrow(
        "Idempotency key cannot be empty",
      );
    });

    it("should throw when key exceeds 200 characters", () => {
      const longKey = "a".repeat(201);
      (mockRequest.get as jest.Mock).mockReturnValue(longKey);

      expect(() => getIdempotencyKey(mockRequest as Request)).toThrow(
        "Idempotency-Key header must be 200 characters or fewer",
      );
    });

    it("should accept key at exactly 200 characters", () => {
      const maxKey = "x".repeat(200);
      (mockRequest.get as jest.Mock).mockReturnValue(maxKey);

      const result = getIdempotencyKey(mockRequest as Request);

      expect(result).toBe(maxKey);
    });

    it("should accept UUID format keys", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      (mockRequest.get as jest.Mock).mockReturnValue(uuid);

      const result = getIdempotencyKey(mockRequest as Request);

      expect(result).toBe(uuid);
    });

    it("should accept keys with special characters", () => {
      const key = "request-2024-01-15_user@example.com";
      (mockRequest.get as jest.Mock).mockReturnValue(key);

      const result = getIdempotencyKey(mockRequest as Request);

      expect(result).toBe(key);
    });
  });

  describe("getRouteTemplate", () => {
    it("should return route template with baseUrl and path", () => {
      mockRequest.baseUrl = "/api/v1";
      mockRequest.route = { path: "/users/:id" };

      const result = getRouteTemplate(mockRequest as Request);

      expect(result).toBe("/api/v1/users/:id");
    });

    it("should return path when baseUrl is empty", () => {
      mockRequest.baseUrl = "";
      mockRequest.route = { path: "/sessions/:sessionId" };

      const result = getRouteTemplate(mockRequest as Request);

      expect(result).toBe("/sessions/:sessionId");
    });

    it("should return baseUrl when route has no path", () => {
      mockRequest.baseUrl = "/api/v1";
      mockRequest.route = {};

      const result = getRouteTemplate(mockRequest as Request);

      expect(result).toBe("/api/v1");
    });

    it("should handle undefined baseUrl", () => {
      mockRequest.baseUrl = undefined;
      mockRequest.route = { path: "/health" };

      const result = getRouteTemplate(mockRequest as Request);

      expect(result).toBe("/health");
    });

    it("should remove duplicate slashes", () => {
      mockRequest.baseUrl = "/api/v1/";
      mockRequest.route = { path: "/users" };

      const result = getRouteTemplate(mockRequest as Request);

      expect(result).toBe("/api/v1/users");
    });

    it("should remove trailing slash for non-root paths", () => {
      mockRequest.baseUrl = "/api/v1";
      mockRequest.route = { path: "/plans/" };

      const result = getRouteTemplate(mockRequest as Request);

      expect(result).toBe("/api/v1/plans");
    });

    it("should preserve root slash", () => {
      mockRequest.baseUrl = "";
      mockRequest.route = { path: "/" };

      const result = getRouteTemplate(mockRequest as Request);

      expect(result).toBe("/");
    });

    it("should return root when both are empty", () => {
      mockRequest.baseUrl = "";
      mockRequest.route = {};

      const result = getRouteTemplate(mockRequest as Request);

      expect(result).toBe("/");
    });

    it("should handle route with null path", () => {
      mockRequest.baseUrl = "/api";
      mockRequest.route = { path: null };

      const result = getRouteTemplate(mockRequest as Request);

      expect(result).toBe("/api");
    });

    it("should handle undefined route", () => {
      mockRequest.baseUrl = "/api";
      mockRequest.route = undefined;

      const result = getRouteTemplate(mockRequest as Request);

      expect(result).toBe("/api");
    });

    it("should handle complex path parameters", () => {
      mockRequest.baseUrl = "/api/v1";
      mockRequest.route = { path: "/users/:userId/sessions/:sessionId/exercises/:exerciseId" };

      const result = getRouteTemplate(mockRequest as Request);

      expect(result).toBe("/api/v1/users/:userId/sessions/:sessionId/exercises/:exerciseId");
    });
  });

  describe("requireAuthenticatedUser", () => {
    it("should return user ID when authenticated", () => {
      mockRequest.user = { sub: "user-123", role: "user", sid: "session-123" };

      const result = requireAuthenticatedUser(mockRequest as Request, mockResponse as Response);

      expect(result).toBe("user-123");
    });

    it("should return UUID user ID", () => {
      mockRequest.user = {
        sub: "550e8400-e29b-41d4-a716-446655440000",
        role: "user",
        sid: "session-123",
      };

      const result = requireAuthenticatedUser(mockRequest as Request, mockResponse as Response);

      expect(result).toBe("550e8400-e29b-41d4-a716-446655440000");
    });

    it("should throw when user is undefined", () => {
      mockRequest.user = undefined;

      expect(() =>
        requireAuthenticatedUser(mockRequest as Request, mockResponse as Response),
      ).toThrow("Authentication required");
    });

    it("should throw when user is null", () => {
      mockRequest.user = null;

      expect(() =>
        requireAuthenticatedUser(mockRequest as Request, mockResponse as Response),
      ).toThrow("Authentication required");
    });

    it("should throw when user has no sub property", () => {
      mockRequest.user = {
        role: "user",
        sid: "session-123",
      } as unknown as JwtPayload;

      expect(() =>
        requireAuthenticatedUser(mockRequest as Request, mockResponse as Response),
      ).toThrow("Authentication required");
    });

    it("should throw when sub is not a string", () => {
      mockRequest.user = {
        sub: 123, // Number instead of string
        role: "user",
        sid: "session-123",
      } as unknown as JwtPayload;

      expect(() =>
        requireAuthenticatedUser(mockRequest as Request, mockResponse as Response),
      ).toThrow("Authentication required");
    });

    it("should throw when sub is null", () => {
      mockRequest.user = {
        sub: null,
        role: "user",
        sid: "session-123",
      } as unknown as JwtPayload;

      expect(() =>
        requireAuthenticatedUser(mockRequest as Request, mockResponse as Response),
      ).toThrow("Authentication required");
    });

    it("should throw when sub is undefined", () => {
      mockRequest.user = {
        sub: undefined,
        role: "user",
        sid: "session-123",
      } as unknown as JwtPayload;

      expect(() =>
        requireAuthenticatedUser(mockRequest as Request, mockResponse as Response),
      ).toThrow("Authentication required");
    });

    it("should accept empty string as valid sub", () => {
      mockRequest.user = { sub: "", role: "user", sid: "session-123" };

      const result = requireAuthenticatedUser(mockRequest as Request, mockResponse as Response);

      expect(result).toBe("");
    });

    it("should handle user object with additional properties", () => {
      mockRequest.user = { sub: "user-456", role: "admin", sid: "session-456" };

      const result = requireAuthenticatedUser(mockRequest as Request, mockResponse as Response);

      expect(result).toBe("user-456");
    });
  });

  describe("handleIdempotentRequest", () => {
    const userId = "user-123";
    const payload = { data: "test" };
    let handlerMock: jest.Mock;

    beforeEach(() => {
      handlerMock = jest.fn();
      (mockRequest.get as jest.Mock).mockReturnValue(null);
      mockRequest.method = "POST";
      mockRequest.baseUrl = "/api/v1";
      mockRequest.route = { path: "/plans" };
    });

    it("should return false when no idempotency key is provided", async () => {
      (mockRequest.get as jest.Mock).mockReturnValue(null);

      const result = await handleIdempotentRequest(
        mockRequest as Request,
        mockResponse as Response,
        userId,
        payload,
        handlerMock,
      );

      expect(result).toBe(false);
      expect(handlerMock).not.toHaveBeenCalled();
      expect(idempotencyService.resolveIdempotency).not.toHaveBeenCalled();
    });

    it("should replay previous response when resolution type is replay", async () => {
      const idempotencyKey = "key-123";
      (mockRequest.get as jest.Mock).mockReturnValue(idempotencyKey);

      const replayBody = { id: "plan-456", name: "Cached Plan" };
      (idempotencyService.resolveIdempotency as jest.Mock).mockResolvedValue({
        type: "replay",
        status: 201,
        body: replayBody,
      });

      const result = await handleIdempotentRequest(
        mockRequest as Request,
        mockResponse as Response,
        userId,
        payload,
        handlerMock,
      );

      expect(result).toBe(true);
      expect(handlerMock).not.toHaveBeenCalled();
      expect(setMock).toHaveBeenCalledWith("Idempotency-Key", idempotencyKey);
      expect(setMock).toHaveBeenCalledWith("Idempotent-Replayed", "true");
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(replayBody);
    });

    it("should execute handler and persist result for new request", async () => {
      const idempotencyKey = "key-456";
      (mockRequest.get as jest.Mock).mockReturnValue(idempotencyKey);

      const recordId = "idempotency-record-789";
      (idempotencyService.resolveIdempotency as jest.Mock).mockResolvedValue({
        type: "new",
        recordId,
      });

      const handlerResult = {
        status: 201,
        body: { id: "plan-new", name: "New Plan" },
      };
      handlerMock.mockResolvedValue(handlerResult);

      const result = await handleIdempotentRequest(
        mockRequest as Request,
        mockResponse as Response,
        userId,
        payload,
        handlerMock,
      );

      expect(result).toBe(true);
      expect(handlerMock).toHaveBeenCalledTimes(1);
      expect(idempotencyService.persistIdempotencyResult).toHaveBeenCalledWith(
        recordId,
        201,
        handlerResult.body,
      );
      expect(setMock).toHaveBeenCalledWith("Idempotency-Key", idempotencyKey);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(handlerResult.body);
    });

    it("should handle different HTTP status codes", async () => {
      const idempotencyKey = "key-789";
      (mockRequest.get as jest.Mock).mockReturnValue(idempotencyKey);

      (idempotencyService.resolveIdempotency as jest.Mock).mockResolvedValue({
        type: "new",
        recordId: "record-123",
      });

      const handlerResult = { status: 204, body: null };
      handlerMock.mockResolvedValue(handlerResult);

      await handleIdempotentRequest(
        mockRequest as Request,
        mockResponse as Response,
        userId,
        payload,
        handlerMock,
      );

      expect(statusMock).toHaveBeenCalledWith(204);
      expect(jsonMock).toHaveBeenCalledWith(null);
    });

    it("should pass correct parameters to resolveIdempotency", async () => {
      const idempotencyKey = "key-abc";
      (mockRequest.get as jest.Mock).mockReturnValue(idempotencyKey);
      mockRequest.method = "PATCH";
      mockRequest.baseUrl = "/api/v1";
      mockRequest.route = { path: "/users/:id" };

      (idempotencyService.resolveIdempotency as jest.Mock).mockResolvedValue({
        type: "new",
        recordId: "rec-1",
      });
      handlerMock.mockResolvedValue({ status: 200, body: {} });

      await handleIdempotentRequest(
        mockRequest as Request,
        mockResponse as Response,
        "user-999",
        { update: "data" },
        handlerMock,
      );

      expect(idempotencyService.resolveIdempotency).toHaveBeenCalledWith(
        {
          userId: "user-999",
          method: "PATCH",
          route: "/api/v1/users/:id",
          key: "key-abc",
        },
        { update: "data" },
      );
    });

    it("should not persist result when recordId is null", async () => {
      const idempotencyKey = "key-no-record";
      (mockRequest.get as jest.Mock).mockReturnValue(idempotencyKey);

      (idempotencyService.resolveIdempotency as jest.Mock).mockResolvedValue({
        type: "new",
        recordId: null,
      });

      handlerMock.mockResolvedValue({ status: 200, body: { data: "test" } });

      await handleIdempotentRequest(
        mockRequest as Request,
        mockResponse as Response,
        userId,
        payload,
        handlerMock,
      );

      expect(idempotencyService.persistIdempotencyResult).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it("should execute handler and persist result for pending request", async () => {
      const idempotencyKey = "key-pending";
      (mockRequest.get as jest.Mock).mockReturnValue(idempotencyKey);

      const recordId = "pending-record-123";
      (idempotencyService.resolveIdempotency as jest.Mock).mockResolvedValue({
        type: "pending",
        recordId,
      });

      const handlerResult = {
        status: 200,
        body: { id: "result-456", completed: true },
      };
      handlerMock.mockResolvedValue(handlerResult);

      const result = await handleIdempotentRequest(
        mockRequest as Request,
        mockResponse as Response,
        userId,
        payload,
        handlerMock,
      );

      expect(result).toBe(true);
      expect(handlerMock).toHaveBeenCalledTimes(1);
      expect(idempotencyService.persistIdempotencyResult).toHaveBeenCalledWith(
        recordId,
        200,
        handlerResult.body,
      );
      expect(setMock).toHaveBeenCalledWith("Idempotency-Key", idempotencyKey);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(handlerResult.body);
    });
  });

  describe("withIdempotency", () => {
    const payload = { name: "Test Plan" };
    let handlerMock: jest.Mock;

    beforeEach(() => {
      handlerMock = jest.fn();
      mockRequest.user = { sub: "user-123", role: "user", sid: "session-123" };
      (mockRequest.get as jest.Mock).mockReturnValue(null);
      mockRequest.method = "POST";
      mockRequest.baseUrl = "/api/v1";
      mockRequest.route = { path: "/plans" };
    });

    it("should throw when user is not authenticated", async () => {
      mockRequest.user = undefined;

      await expect(
        withIdempotency(mockRequest as Request, mockResponse as Response, payload, handlerMock),
      ).rejects.toThrow("Authentication required");

      expect(handlerMock).not.toHaveBeenCalled();
    });

    it("should return handled=false and userId when no idempotency key", async () => {
      (mockRequest.get as jest.Mock).mockReturnValue(null);

      const result = await withIdempotency(
        mockRequest as Request,
        mockResponse as Response,
        payload,
        handlerMock,
      );

      expect(result).toEqual({ handled: false, userId: "user-123" });
      expect(handlerMock).not.toHaveBeenCalled();
    });

    it("should return handled=true and userId when request is replayed", async () => {
      const idempotencyKey = "key-replay";
      (mockRequest.get as jest.Mock).mockReturnValue(idempotencyKey);

      (idempotencyService.resolveIdempotency as jest.Mock).mockResolvedValue({
        type: "replay",
        status: 200,
        body: { cached: true },
      });

      const result = await withIdempotency(
        mockRequest as Request,
        mockResponse as Response,
        payload,
        handlerMock,
      );

      expect(result).toEqual({ handled: true, userId: "user-123" });
      expect(handlerMock).not.toHaveBeenCalled();
      expect(setMock).toHaveBeenCalledWith("Idempotent-Replayed", "true");
    });

    it("should execute handler and return handled=true for new request", async () => {
      const idempotencyKey = "key-new";
      (mockRequest.get as jest.Mock).mockReturnValue(idempotencyKey);

      (idempotencyService.resolveIdempotency as jest.Mock).mockResolvedValue({
        type: "new",
        recordId: "rec-456",
      });

      const handlerResult = { status: 201, body: { id: "plan-789" } };
      handlerMock.mockResolvedValue(handlerResult);

      const result = await withIdempotency(
        mockRequest as Request,
        mockResponse as Response,
        payload,
        handlerMock,
      );

      expect(result).toEqual({ handled: true, userId: "user-123" });
      expect(handlerMock).toHaveBeenCalledWith("user-123");
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it("should pass userId to handler function", async () => {
      const idempotencyKey = "key-userid";
      (mockRequest.get as jest.Mock).mockReturnValue(idempotencyKey);
      mockRequest.user = { sub: "user-different", role: "user", sid: "session-123" };

      (idempotencyService.resolveIdempotency as jest.Mock).mockResolvedValue({
        type: "new",
        recordId: "rec-1",
      });

      handlerMock.mockResolvedValue({ status: 200, body: {} });

      await withIdempotency(mockRequest as Request, mockResponse as Response, payload, handlerMock);

      expect(handlerMock).toHaveBeenCalledWith("user-different");
    });

    it("should handle different user IDs", async () => {
      const users = ["user-aaa", "user-bbb", "user-ccc"];

      for (const userId of users) {
        mockRequest.user = { sub: userId, role: "user", sid: "session-123" };
        (mockRequest.get as jest.Mock).mockReturnValue(null);

        const result = await withIdempotency(
          mockRequest as Request,
          mockResponse as Response,
          payload,
          handlerMock,
        );

        expect(result.userId).toBe(userId);
      }
    });

    it("should execute handler and return handled=true for pending request", async () => {
      const idempotencyKey = "key-pending";
      (mockRequest.get as jest.Mock).mockReturnValue(idempotencyKey);

      (idempotencyService.resolveIdempotency as jest.Mock).mockResolvedValue({
        type: "pending",
        recordId: "rec-pending-123",
      });

      const handlerResult = { status: 200, body: { processed: true } };
      handlerMock.mockResolvedValue(handlerResult);

      const result = await withIdempotency(
        mockRequest as Request,
        mockResponse as Response,
        payload,
        handlerMock,
      );

      expect(result).toEqual({ handled: true, userId: "user-123" });
      expect(handlerMock).toHaveBeenCalledWith("user-123");
      expect(idempotencyService.persistIdempotencyResult).toHaveBeenCalledWith(
        "rec-pending-123",
        200,
        handlerResult.body,
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });
});
