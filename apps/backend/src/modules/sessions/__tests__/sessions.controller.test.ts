import type { Request, Response } from "express";
import * as sessionsController from "../sessions.controller.js";
import * as sessionsService from "../sessions.service.js";

// Mock dependencies
jest.mock("../sessions.service.js");
jest.mock("../../common/idempotency.service.js");

const mockSessionsService = jest.mocked(sessionsService);

// Import mocked modules
import { resolveIdempotency, persistIdempotencyResult } from "../../common/idempotency.service";

const mockResolveIdempotency = jest.mocked(resolveIdempotency);
const mockPersistIdempotencyResult = jest.mocked(persistIdempotencyResult);

// Helper function to create getIdempotencyKey mock
function createGetIdempotencyKeyMock(key: string | null) {
  return jest.fn((header: string) => {
    if (header === "Idempotency-Key") {
      return key;
    }
    return null;
  });
}

describe("Sessions Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      user: { sub: "user-123" },
      params: {},
      query: {},
      body: {},
      headers: {},
      get: jest.fn().mockReturnValue(null),
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
    mockResolveIdempotency.mockResolvedValue({ type: "new", recordId: "rec-1" });
    mockPersistIdempotencyResult.mockResolvedValue();
  });

  describe("listSessionsHandler", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;

      await sessionsController.listSessionsHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
      expect(mockSessionsService.getAll).not.toHaveBeenCalled();
    });

    it("should return 400 when query validation fails", async () => {
      mockRequest.query = { limit: "invalid" };

      await sessionsController.listSessionsHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Object),
        }),
      );
    });

    it("should list user sessions", async () => {
      const mockSessions = [
        {
          id: "session-1",
          title: "Morning Workout",
          status: "completed",
        },
        {
          id: "session-2",
          title: "Evening Run",
          status: "planned",
        },
      ];

      mockSessionsService.getAll.mockResolvedValue(mockSessions as never);

      await sessionsController.listSessionsHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.getAll).toHaveBeenCalledWith("user-123", { limit: 10, offset: 0 });
      expect(mockResponse.json).toHaveBeenCalledWith(mockSessions);
    });

    it("should filter by status", async () => {
      mockRequest.query = { status: "completed" };

      mockSessionsService.getAll.mockResolvedValue([] as never);

      await sessionsController.listSessionsHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.getAll).toHaveBeenCalledWith("user-123", {
        limit: 10,
        offset: 0,
        status: "completed",
      });
    });

    it("should filter by date range", async () => {
      mockRequest.query = { from: "2024-01-01", to: "2024-12-31" };

      mockSessionsService.getAll.mockResolvedValue([] as never);

      await sessionsController.listSessionsHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.getAll).toHaveBeenCalled();
    });
  });

  describe("getSessionHandler", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: "session-123" };

      await sessionsController.getSessionHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockSessionsService.getOne).not.toHaveBeenCalled();
    });

    it("should get session by ID", async () => {
      mockRequest.params = { id: "session-123" };

      const mockSession = {
        id: "session-123",
        title: "Test Session",
        ownerId: "user-123",
      };

      mockSessionsService.getOne.mockResolvedValue(mockSession as never);

      await sessionsController.getSessionHandler(mockRequest as Request, mockResponse as Response);

      expect(mockSessionsService.getOne).toHaveBeenCalledWith("user-123", "session-123");
      expect(mockResponse.json).toHaveBeenCalledWith(mockSession);
    });

    it("should call service with correct parameters", async () => {
      mockRequest.params = { id: "test-session-id" };
      const mockSession = { id: "test-session-id", title: "Test" };
      mockSessionsService.getOne.mockResolvedValue(mockSession as never);

      await sessionsController.getSessionHandler(mockRequest as Request, mockResponse as Response);

      expect(mockSessionsService.getOne).toHaveBeenCalledWith("user-123", "test-session-id");
    });
  });

  describe("createSessionHandler", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.body = { title: "Test Session" };

      await sessionsController.createSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockSessionsService.createOne).not.toHaveBeenCalled();
    });

    it("should return 400 when body validation fails", async () => {
      mockRequest.body = { invalid: "data" };

      await sessionsController.createSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockSessionsService.createOne).not.toHaveBeenCalled();
    });

    it("should handle idempotent session creation with replay", async () => {
      mockRequest.body = { title: "Test Session" };
      mockRequest.headers = { "idempotency-key": "key-123" };
      mockRequest.get = createGetIdempotencyKeyMock("key-123");
      mockRequest.baseUrl = "/api/v1";
      mockRequest.route = { path: "/sessions" };
      mockRequest.method = "POST";

      mockResolveIdempotency.mockResolvedValue({
        type: "replay",
        status: 201,
        body: { id: "session-123", title: "Test Session" },
      });

      await sessionsController.createSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.createOne).not.toHaveBeenCalled();
      expect(mockResponse.set).toHaveBeenCalledWith("Idempotency-Key", "key-123");
      expect(mockResponse.set).toHaveBeenCalledWith("Idempotent-Replayed", "true");
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it("should handle idempotent session creation with new record", async () => {
      mockRequest.body = { title: "Test Session" };
      mockRequest.headers = { "idempotency-key": "key-123" };
      mockRequest.get = createGetIdempotencyKeyMock("key-123");
      mockRequest.baseUrl = "/api/v1";
      mockRequest.route = { path: "/sessions" };
      mockRequest.method = "POST";

      mockResolveIdempotency.mockResolvedValue({
        type: "new",
        recordId: "rec-1",
      });
      const mockCreated = { id: "session-123", title: "Test Session" };
      mockSessionsService.createOne.mockResolvedValue(mockCreated as never);

      await sessionsController.createSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.createOne).toHaveBeenCalled();
      expect(mockPersistIdempotencyResult).toHaveBeenCalledWith("rec-1", 201, mockCreated);
      expect(mockResponse.set).toHaveBeenCalledWith("Idempotency-Key", "key-123");
    });

    it("should handle idempotent session creation with key but no recordId", async () => {
      mockRequest.body = { title: "Test Session" };
      mockRequest.headers = { "idempotency-key": "key-123" };
      mockRequest.get = createGetIdempotencyKeyMock("key-123");
      mockRequest.baseUrl = "/api/v1";
      mockRequest.route = { path: "/sessions" };
      mockRequest.method = "POST";

      mockResolveIdempotency.mockResolvedValue({
        type: "new",
        recordId: null,
      });
      const mockCreated = { id: "session-123", title: "Test Session" };
      mockSessionsService.createOne.mockResolvedValue(mockCreated as never);

      await sessionsController.createSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.createOne).toHaveBeenCalled();
      expect(mockPersistIdempotencyResult).not.toHaveBeenCalled();
      expect(mockResponse.set).toHaveBeenCalledWith("Idempotency-Key", "key-123");
    });

    it("should throw error when idempotency key is empty", async () => {
      mockRequest.body = { title: "Test Session" };
      mockRequest.get = jest.fn((header: string) => {
        if (header === "Idempotency-Key") {
          return "   ";
        }
        return null;
      });

      await expect(
        sessionsController.createSessionHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("IDEMPOTENCY_INVALID");
    });

    it("should throw error when idempotency key is too long", async () => {
      mockRequest.body = { title: "Test Session" };
      const longKey = "a".repeat(201);
      mockRequest.get = jest.fn((header: string) => {
        if (header === "Idempotency-Key") {
          return longKey;
        }
        return null;
      });

      await expect(
        sessionsController.createSessionHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Idempotency-Key header must be 200 characters or fewer");
    });

    it("should create session with valid data", async () => {
      const plannedAt = new Date().toISOString();
      mockRequest.body = {
        title: "New Workout",
        notes: "Test notes",
        planned_at: plannedAt,
        exercises: [],
      };

      const mockCreatedSession = {
        id: "new-session-id",
        title: "New Workout",
        ownerId: "user-123",
      };

      mockSessionsService.createOne.mockResolvedValue(mockCreatedSession as never);

      await sessionsController.createSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.createOne).toHaveBeenCalledWith("user-123", mockRequest.body);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockCreatedSession);
    });

    it("should return 400 for invalid data", async () => {
      mockRequest.body = {
        title: "A", // too short
      };

      await sessionsController.createSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe("updateSessionHandler", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: "session-123" };
      mockRequest.body = { title: "Updated" };

      await sessionsController.updateSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockSessionsService.updateOne).not.toHaveBeenCalled();
    });

    it("should return 400 when validation fails", async () => {
      mockRequest.params = { id: "session-123" };
      mockRequest.body = { invalid: "data" };

      await sessionsController.updateSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockSessionsService.updateOne).not.toHaveBeenCalled();
    });

    it("should update session", async () => {
      mockRequest.params = { id: "session-123" };
      mockRequest.body = {
        title: "Updated Title",
        notes: "Updated notes",
      };

      const mockUpdatedSession = {
        id: "session-123",
        title: "Updated Title",
      };

      mockSessionsService.updateOne.mockResolvedValue(mockUpdatedSession as never);

      await sessionsController.updateSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.updateOne).toHaveBeenCalledWith(
        "user-123",
        "session-123",
        mockRequest.body,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedSession);
    });

    it("should call service with correct parameters", async () => {
      mockRequest.params = { id: "test-session-id" };
      mockRequest.body = { title: "Updated" };

      const mockUpdatedSession = { id: "test-session-id", title: "Updated" };
      mockSessionsService.updateOne.mockResolvedValue(mockUpdatedSession as never);

      await sessionsController.updateSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.updateOne).toHaveBeenCalledWith(
        "user-123",
        "test-session-id",
        mockRequest.body,
      );
    });
  });

  describe("cloneSessionHandler", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: "session-123" };

      await sessionsController.cloneSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockSessionsService.cloneOne).not.toHaveBeenCalled();
    });

    it("should return 400 when body validation fails", async () => {
      mockRequest.params = { id: "session-123" };
      mockRequest.body = { invalid: "data" };

      await sessionsController.cloneSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockSessionsService.cloneOne).not.toHaveBeenCalled();
    });

    it("should handle idempotent clone with replay", async () => {
      mockRequest.params = { id: "session-123" };
      mockRequest.body = { planned_at: new Date().toISOString() };
      mockRequest.headers = { "idempotency-key": "key-123" };
      mockRequest.get = createGetIdempotencyKeyMock("key-123");
      mockRequest.baseUrl = "/api/v1";
      mockRequest.route = { path: "/sessions/:id/clone" };
      mockRequest.method = "POST";

      mockResolveIdempotency.mockResolvedValue({
        type: "replay",
        status: 201,
        body: { id: "cloned-123" },
      });

      await sessionsController.cloneSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.cloneOne).not.toHaveBeenCalled();
      expect(mockResponse.set).toHaveBeenCalledWith("Idempotency-Key", "key-123");
    });

    it("should handle idempotent clone with new record", async () => {
      mockRequest.params = { id: "session-123" };
      mockRequest.body = { planned_at: new Date().toISOString() };
      mockRequest.headers = { "idempotency-key": "key-123" };
      mockRequest.get = createGetIdempotencyKeyMock("key-123");
      mockRequest.baseUrl = "/api/v1";
      mockRequest.route = { path: "/sessions/:id/clone" };
      mockRequest.method = "POST";

      mockResolveIdempotency.mockResolvedValue({
        type: "new",
        recordId: "rec-1",
      });
      const mockCloned = { id: "cloned-123", title: "Cloned Session" };
      mockSessionsService.cloneOne.mockResolvedValue(mockCloned as never);

      await sessionsController.cloneSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.cloneOne).toHaveBeenCalled();
      expect(mockPersistIdempotencyResult).toHaveBeenCalledWith("rec-1", 201, mockCloned);
      expect(mockResponse.set).toHaveBeenCalledWith("Idempotency-Key", "key-123");
    });

    it("should handle idempotent clone with key but no recordId", async () => {
      mockRequest.params = { id: "session-123" };
      mockRequest.body = { planned_at: new Date().toISOString() };
      mockRequest.headers = { "idempotency-key": "key-123" };
      mockRequest.get = createGetIdempotencyKeyMock("key-123");
      mockRequest.baseUrl = "/api/v1";
      mockRequest.route = { path: "/sessions/:id/clone" };
      mockRequest.method = "POST";

      mockResolveIdempotency.mockResolvedValue({
        type: "new",
        recordId: null,
      });
      const mockCloned = { id: "cloned-123", title: "Cloned Session" };
      mockSessionsService.cloneOne.mockResolvedValue(mockCloned as never);

      await sessionsController.cloneSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.cloneOne).toHaveBeenCalled();
      expect(mockPersistIdempotencyResult).not.toHaveBeenCalled();
      expect(mockResponse.set).toHaveBeenCalledWith("Idempotency-Key", "key-123");
    });

    it("should clone existing session", async () => {
      mockRequest.params = { id: "session-123" };
      mockRequest.body = {
        planned_at: new Date().toISOString(),
      };

      const mockClonedSession = {
        id: "cloned-session-id",
        title: "Cloned Session",
      };

      mockSessionsService.cloneOne.mockResolvedValue(mockClonedSession as never);

      await sessionsController.cloneSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.cloneOne).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockClonedSession);
    });

    it("should call service with correct parameters", async () => {
      const plannedAt = new Date().toISOString();
      mockRequest.params = { id: "source-session-id" };
      mockRequest.body = { planned_at: plannedAt };

      const mockClonedSession = { id: "cloned-id", title: "Cloned" };
      mockSessionsService.cloneOne.mockResolvedValue(mockClonedSession as never);

      await sessionsController.cloneSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.cloneOne).toHaveBeenCalledWith(
        "user-123",
        "source-session-id",
        mockRequest.body,
      );
    });
  });

  describe("applyRecurrenceHandler", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: "session-123" };

      await sessionsController.applyRecurrenceHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockSessionsService.applyRecurrence).not.toHaveBeenCalled();
    });

    it("should return 400 when body validation fails", async () => {
      mockRequest.params = { id: "session-123" };
      mockRequest.body = { occurrences: -1 };

      await sessionsController.applyRecurrenceHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockSessionsService.applyRecurrence).not.toHaveBeenCalled();
    });

    it("should handle idempotent recurrence with replay", async () => {
      mockRequest.params = { id: "session-123" };
      mockRequest.body = { occurrences: 5 };
      mockRequest.headers = { "idempotency-key": "key-123" };
      mockRequest.get = createGetIdempotencyKeyMock("key-123");
      mockRequest.baseUrl = "/api/v1";
      mockRequest.route = { path: "/sessions/:id/recurrence" };
      mockRequest.method = "POST";

      mockResolveIdempotency.mockResolvedValue({
        type: "replay",
        status: 201,
        body: { sessions: [] },
      });

      await sessionsController.applyRecurrenceHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.applyRecurrence).not.toHaveBeenCalled();
      expect(mockResponse.set).toHaveBeenCalledWith("Idempotency-Key", "key-123");
    });

    it("should handle idempotent recurrence with new record", async () => {
      mockRequest.params = { id: "session-123" };
      mockRequest.body = { occurrences: 5 };
      mockRequest.headers = { "idempotency-key": "key-123" };
      mockRequest.get = createGetIdempotencyKeyMock("key-123");
      mockRequest.baseUrl = "/api/v1";
      mockRequest.route = { path: "/sessions/:id/recurrence" };
      mockRequest.method = "POST";

      mockResolveIdempotency.mockResolvedValue({
        type: "new",
        recordId: "rec-1",
      });
      const mockSessions = [{ id: "session-1" }, { id: "session-2" }];
      mockSessionsService.applyRecurrence.mockResolvedValue(mockSessions as never);

      await sessionsController.applyRecurrenceHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.applyRecurrence).toHaveBeenCalled();
      expect(mockPersistIdempotencyResult).toHaveBeenCalledWith("rec-1", 201, {
        sessions: mockSessions,
      });
      expect(mockResponse.set).toHaveBeenCalledWith("Idempotency-Key", "key-123");
    });

    it("should handle idempotent recurrence with key but no recordId", async () => {
      mockRequest.params = { id: "session-123" };
      mockRequest.body = { occurrences: 5 };
      mockRequest.headers = { "idempotency-key": "key-123" };
      mockRequest.get = createGetIdempotencyKeyMock("key-123");
      mockRequest.baseUrl = "/api/v1";
      mockRequest.route = { path: "/sessions/:id/recurrence" };
      mockRequest.method = "POST";

      mockResolveIdempotency.mockResolvedValue({
        type: "new",
        recordId: null,
      });
      const mockSessions = [{ id: "session-1" }];
      mockSessionsService.applyRecurrence.mockResolvedValue(mockSessions as never);

      await sessionsController.applyRecurrenceHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.applyRecurrence).toHaveBeenCalled();
      expect(mockPersistIdempotencyResult).not.toHaveBeenCalled();
      expect(mockResponse.set).toHaveBeenCalledWith("Idempotency-Key", "key-123");
    });

    it("should apply recurrence to session", async () => {
      mockRequest.params = { id: "session-123" };
      mockRequest.body = {
        occurrences: 5,
        offset_days: 7,
      };

      const mockGeneratedSessions = [
        { id: "generated-1", title: "Recurring 1" },
        { id: "generated-2", title: "Recurring 2" },
      ];

      mockSessionsService.applyRecurrence.mockResolvedValue(mockGeneratedSessions as never);

      await sessionsController.applyRecurrenceHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.applyRecurrence).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        sessions: mockGeneratedSessions,
      });
    });

    it("should return 400 for invalid recurrence params", async () => {
      mockRequest.params = { id: "session-123" };
      mockRequest.body = {
        occurrences: -1, // invalid
      };

      await sessionsController.applyRecurrenceHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe("deleteSessionHandler", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: "session-123" };

      await sessionsController.deleteSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockSessionsService.cancelOne).not.toHaveBeenCalled();
    });

    it("should cancel session", async () => {
      mockRequest.params = { id: "session-123" };

      mockSessionsService.cancelOne.mockResolvedValue(true);

      await sessionsController.deleteSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.cancelOne).toHaveBeenCalledWith("user-123", "session-123");
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });

    it("should call service with correct parameters", async () => {
      mockRequest.params = { id: "test-session-id" };

      mockSessionsService.cancelOne.mockResolvedValue(true);

      await sessionsController.deleteSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSessionsService.cancelOne).toHaveBeenCalledWith("user-123", "test-session-id");
    });
  });
});
