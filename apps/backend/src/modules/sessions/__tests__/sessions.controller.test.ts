import type { Request, Response } from "express";
import * as sessionsController from "../sessions.controller.js";
import * as sessionsService from "../sessions.service.js";

// Mock dependencies
jest.mock("../sessions.service.js");
jest.mock("../../common/idempotency.service.js");

const mockSessionsService = jest.mocked(sessionsService);

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
    };
    jest.clearAllMocks();
  });

  describe("listSessionsHandler", () => {
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
