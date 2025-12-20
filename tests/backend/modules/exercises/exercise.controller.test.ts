import type { Request, Response } from "express";
import * as exerciseController from "../../../../apps/backend/src/modules/exercises/exercise.controller.js";
import * as exerciseService from "../../../../apps/backend/src/modules/exercises/exercise.service.js";
import * as idempotencyService from "../../../../apps/backend/src/modules/common/idempotency.service.js";
import * as idempotencyHelpers from "../../../../apps/backend/src/modules/common/idempotency.helpers.js";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";

// Mock dependencies
jest.mock("../../../../apps/backend/src/modules/exercises/exercise.service.js");
jest.mock("../../../../apps/backend/src/modules/common/idempotency.service.js");
jest.mock("../../../../apps/backend/src/modules/common/idempotency.helpers.js");

const mockExerciseService = jest.mocked(exerciseService);
const mockIdempotencyService = jest.mocked(idempotencyService);
const mockIdempotencyHelpers = jest.mocked(idempotencyHelpers);

describe("Exercise Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  const userId = "user-123";
  const exerciseId = "exercise-123";

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      user: { sub: userId, role: "athlete" },
      body: {},
      query: {},
      params: {},
      headers: {},
      get: jest.fn().mockReturnValue(null),
      method: "GET",
      baseUrl: "/api/v1",
      route: { path: "/exercises" },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };
  });

  describe("listExercisesHandler", () => {
    it("should list exercises successfully", async () => {
      const mockResult = {
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      };

      mockExerciseService.getAll.mockResolvedValue(mockResult);

      await exerciseController.listExercisesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;

      await exerciseController.listExercisesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it("should parse query parameters", async () => {
      const mockResult = {
        data: [],
        total: 0,
        limit: 10,
        offset: 5,
      };

      mockRequest.query = {
        q: "test",
        type_code: "strength",
        limit: "10",
        offset: "5",
      };
      mockExerciseService.getAll.mockResolvedValue(mockResult);

      await exerciseController.listExercisesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.getAll).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          q: "test",
          type_code: "strength",
          limit: 10,
          offset: 5,
        }),
        false,
      );
    });

    it("should handle admin with owner_id filter", async () => {
      const mockResult = {
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      };

      const otherUserId = "123e4567-e89b-12d3-a456-426614174001"; // Valid UUID
      mockRequest.user = { sub: userId, role: "admin" };
      mockRequest.query = {
        owner_id: otherUserId,
      };
      mockExerciseService.getAll.mockResolvedValue(mockResult);

      await exerciseController.listExercisesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
      expect(mockExerciseService.getAll).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          owner_id: otherUserId,
        }),
        true,
      );
    });

    it("should handle include_archived filter", async () => {
      const mockResult = {
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      };

      mockRequest.query = {
        include_archived: "true",
      };
      mockExerciseService.getAll.mockResolvedValue(mockResult);

      await exerciseController.listExercisesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.getAll).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          include_archived: true,
        }),
        false,
      );
    });

    it("should handle tags filter", async () => {
      const mockResult = {
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      };

      mockRequest.query = {
        tags: "chest,upper-body",
      };
      mockExerciseService.getAll.mockResolvedValue(mockResult);

      await exerciseController.listExercisesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.getAll).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          tags: expect.arrayContaining(["chest", "upper-body"]),
        }),
        false,
      );
    });

    it("should return 400 for invalid query", async () => {
      mockRequest.query = {
        limit: "invalid",
      };

      await exerciseController.listExercisesHandler(
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
  });

  describe("getExerciseHandler", () => {
    it("should get exercise successfully", async () => {
      const mockExercise = {
        id: exerciseId,
        name: "Test Exercise",
        type_code: "strength",
        owner_id: userId,
        is_public: false,
        tags: [],
        archived_at: null,
      };

      mockRequest.params = { id: exerciseId };
      mockExerciseService.getOne.mockResolvedValue(mockExercise);

      await exerciseController.getExerciseHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockExercise);
      expect(mockExerciseService.getOne).toHaveBeenCalledWith(exerciseId, userId, false);
    });

    it("should handle admin user", async () => {
      const mockExercise = {
        id: exerciseId,
        name: "Test Exercise",
        type_code: "strength",
        owner_id: userId,
        is_public: false,
        tags: [],
        archived_at: null,
      };

      mockRequest.user = { sub: userId, role: "admin" };
      mockRequest.params = { id: exerciseId };
      mockExerciseService.getOne.mockResolvedValue(mockExercise);

      await exerciseController.getExerciseHandler(mockRequest as Request, mockResponse as Response);

      expect(mockExerciseService.getOne).toHaveBeenCalledWith(exerciseId, userId, true);
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: exerciseId };

      await exerciseController.getExerciseHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockExerciseService.getOne).not.toHaveBeenCalled();
    });

    it("should return 404 when exercise not found", async () => {
      mockRequest.params = { id: exerciseId };
      mockExerciseService.getOne.mockRejectedValue(
        new HttpError(404, "EXERCISE_NOT_FOUND", "Exercise not found"),
      );

      await expect(
        exerciseController.getExerciseHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("createExerciseHandler", () => {
    it("should create exercise successfully without idempotency", async () => {
      const exerciseData = {
        name: "Test Exercise",
        type_code: "strength",
      };

      const mockExercise = {
        id: exerciseId,
        ...exerciseData,
        owner_id: userId,
        is_public: false,
        tags: [],
        archived_at: null,
      };

      mockRequest.body = exerciseData;
      mockRequest.method = "POST";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue(null);
      mockExerciseService.createOne.mockResolvedValue(mockExercise);

      await exerciseController.createExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockExercise);
      expect(mockExerciseService.createOne).toHaveBeenCalledWith(userId, exerciseData, false);
    });

    it("should create exercise with idempotency key", async () => {
      const exerciseData = {
        name: "Test Exercise",
        type_code: "strength",
      };

      const mockExercise = {
        id: exerciseId,
        ...exerciseData,
        owner_id: userId,
        is_public: false,
        tags: [],
        archived_at: null,
      };

      mockRequest.body = exerciseData;
      mockRequest.method = "POST";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue("idempotency-key-123");
      mockIdempotencyHelpers.getRouteTemplate.mockReturnValue("/api/v1/exercises");
      mockIdempotencyService.resolveIdempotency.mockResolvedValue({
        type: "new",
        recordId: "record-123",
      });
      mockExerciseService.createOne.mockResolvedValue(mockExercise);

      await exerciseController.createExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockExercise);
      expect(mockResponse.set).toHaveBeenCalledWith("Idempotency-Key", "idempotency-key-123");
      expect(mockIdempotencyService.persistIdempotencyResult).toHaveBeenCalledWith(
        "record-123",
        201,
        mockExercise,
      );
    });

    it("should replay idempotent request", async () => {
      const exerciseData = {
        name: "Test Exercise",
        type_code: "strength",
      };

      const mockExercise = {
        id: exerciseId,
        ...exerciseData,
        owner_id: userId,
        is_public: false,
        tags: [],
        archived_at: null,
      };

      mockRequest.body = exerciseData;
      mockRequest.method = "POST";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue("idempotency-key-123");
      mockIdempotencyHelpers.getRouteTemplate.mockReturnValue("/api/v1/exercises");
      mockIdempotencyService.resolveIdempotency.mockResolvedValue({
        type: "replay",
        status: 201,
        body: mockExercise,
      });

      await exerciseController.createExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.set).toHaveBeenCalledWith("Idempotency-Key", "idempotency-key-123");
      expect(mockResponse.set).toHaveBeenCalledWith("Idempotent-Replayed", "true");
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockExercise);
      expect(mockExerciseService.createOne).not.toHaveBeenCalled();
    });

    it("should return 400 for invalid body", async () => {
      mockRequest.body = {
        name: "", // Invalid: empty string
        type_code: "strength",
      };

      await exerciseController.createExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Object),
        }),
      );
      expect(mockExerciseService.createOne).not.toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.body = {
        name: "Test Exercise",
        type_code: "strength",
      };

      await exerciseController.createExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockExerciseService.createOne).not.toHaveBeenCalled();
    });

    it("should handle admin user", async () => {
      const exerciseData = {
        name: "Test Exercise",
        type_code: "strength",
      };

      const mockExercise = {
        id: exerciseId,
        ...exerciseData,
        owner_id: userId,
        is_public: false,
        tags: [],
        archived_at: null,
      };

      mockRequest.user = { sub: userId, role: "admin" };
      mockRequest.body = exerciseData;
      mockRequest.method = "POST";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue(null);
      mockExerciseService.createOne.mockResolvedValue(mockExercise);

      await exerciseController.createExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.createOne).toHaveBeenCalledWith(userId, exerciseData, true);
    });
  });

  describe("updateExerciseHandler", () => {
    it("should update exercise successfully without idempotency", async () => {
      const updateData = {
        name: "Updated Exercise",
      };

      const mockExercise = {
        id: exerciseId,
        name: "Updated Exercise",
        type_code: "strength",
        owner_id: userId,
        is_public: false,
        tags: [],
        archived_at: null,
      };

      mockRequest.params = { id: exerciseId };
      mockRequest.body = updateData;
      mockRequest.method = "PUT";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue(null);
      mockExerciseService.updateOne.mockResolvedValue(mockExercise);

      await exerciseController.updateExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.json).toHaveBeenCalledWith(mockExercise);
      expect(mockExerciseService.updateOne).toHaveBeenCalledWith(
        exerciseId,
        userId,
        updateData,
        false,
      );
    });

    it("should update exercise with idempotency key", async () => {
      const updateData = {
        name: "Updated Exercise",
      };

      const mockExercise = {
        id: exerciseId,
        name: "Updated Exercise",
        type_code: "strength",
        owner_id: userId,
        is_public: false,
        tags: [],
        archived_at: null,
      };

      mockRequest.params = { id: exerciseId };
      mockRequest.body = updateData;
      mockRequest.method = "PUT";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue("idempotency-key-123");
      mockIdempotencyHelpers.getRouteTemplate.mockReturnValue("/api/v1/exercises/:id");
      mockIdempotencyService.resolveIdempotency.mockResolvedValue({
        type: "new",
        recordId: "record-123",
      });
      mockExerciseService.updateOne.mockResolvedValue(mockExercise);

      await exerciseController.updateExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.json).toHaveBeenCalledWith(mockExercise);
      expect(mockResponse.set).toHaveBeenCalledWith("Idempotency-Key", "idempotency-key-123");
      expect(mockIdempotencyService.persistIdempotencyResult).toHaveBeenCalledWith(
        "record-123",
        200,
        mockExercise,
      );
    });

    it("should replay idempotent update request", async () => {
      const updateData = {
        name: "Updated Exercise",
      };

      const mockExercise = {
        id: exerciseId,
        name: "Updated Exercise",
        type_code: "strength",
        owner_id: userId,
        is_public: false,
        tags: [],
        archived_at: null,
      };

      mockRequest.params = { id: exerciseId };
      mockRequest.body = updateData;
      mockRequest.method = "PUT";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue("idempotency-key-123");
      mockIdempotencyHelpers.getRouteTemplate.mockReturnValue("/api/v1/exercises/:id");
      mockIdempotencyService.resolveIdempotency.mockResolvedValue({
        type: "replay",
        status: 200,
        body: mockExercise,
      });

      await exerciseController.updateExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.set).toHaveBeenCalledWith("Idempotency-Key", "idempotency-key-123");
      expect(mockResponse.set).toHaveBeenCalledWith("Idempotent-Replayed", "true");
      expect(mockResponse.json).toHaveBeenCalledWith(mockExercise);
      expect(mockExerciseService.updateOne).not.toHaveBeenCalled();
    });

    it("should return 400 for invalid body", async () => {
      mockRequest.params = { id: exerciseId };
      mockRequest.body = {}; // Invalid: empty object

      await exerciseController.updateExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Object),
        }),
      );
      expect(mockExerciseService.updateOne).not.toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: exerciseId };
      mockRequest.body = { name: "Updated" };

      await exerciseController.updateExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockExerciseService.updateOne).not.toHaveBeenCalled();
    });

    it("should handle admin user", async () => {
      const updateData = {
        name: "Updated Exercise",
      };

      const mockExercise = {
        id: exerciseId,
        name: "Updated Exercise",
        type_code: "strength",
        owner_id: userId,
        is_public: false,
        tags: [],
        archived_at: null,
      };

      mockRequest.user = { sub: userId, role: "admin" };
      mockRequest.params = { id: exerciseId };
      mockRequest.body = updateData;
      mockRequest.method = "PUT";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue(null);
      mockExerciseService.updateOne.mockResolvedValue(mockExercise);

      await exerciseController.updateExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.updateOne).toHaveBeenCalledWith(
        exerciseId,
        userId,
        updateData,
        true,
      );
    });
  });

  describe("deleteExerciseHandler", () => {
    it("should delete exercise successfully without idempotency", async () => {
      mockRequest.params = { id: exerciseId };
      mockRequest.method = "DELETE";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue(null);
      mockExerciseService.archiveOne.mockResolvedValue(undefined);

      await exerciseController.deleteExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
      expect(mockExerciseService.archiveOne).toHaveBeenCalledWith(exerciseId, userId, false);
    });

    it("should delete exercise with idempotency key", async () => {
      mockRequest.params = { id: exerciseId };
      mockRequest.method = "DELETE";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue("idempotency-key-123");
      mockIdempotencyHelpers.getRouteTemplate.mockReturnValue("/api/v1/exercises/:id");
      mockIdempotencyService.resolveIdempotency.mockResolvedValue({
        type: "new",
        recordId: "record-123",
      });
      mockExerciseService.archiveOne.mockResolvedValue(undefined);

      await exerciseController.deleteExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.set).toHaveBeenCalledWith("Idempotency-Key", "idempotency-key-123");
      expect(mockIdempotencyService.persistIdempotencyResult).toHaveBeenCalledWith(
        "record-123",
        204,
        null,
      );
    });

    it("should replay idempotent delete request", async () => {
      mockRequest.params = { id: exerciseId };
      mockRequest.method = "DELETE";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue("idempotency-key-123");
      mockIdempotencyHelpers.getRouteTemplate.mockReturnValue("/api/v1/exercises/:id");
      mockIdempotencyService.resolveIdempotency.mockResolvedValue({
        type: "replay",
        status: 204,
        body: null,
      });

      await exerciseController.deleteExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.set).toHaveBeenCalledWith("Idempotency-Key", "idempotency-key-123");
      expect(mockResponse.set).toHaveBeenCalledWith("Idempotent-Replayed", "true");
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
      expect(mockExerciseService.archiveOne).not.toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: exerciseId };

      await exerciseController.deleteExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockExerciseService.archiveOne).not.toHaveBeenCalled();
    });

    it("should handle admin user", async () => {
      mockRequest.user = { sub: userId, role: "admin" };
      mockRequest.params = { id: exerciseId };
      mockRequest.method = "DELETE";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue(null);
      mockExerciseService.archiveOne.mockResolvedValue(undefined);

      await exerciseController.deleteExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.archiveOne).toHaveBeenCalledWith(exerciseId, userId, true);
    });
  });
});
