import type { Request, Response } from "express";
import * as exerciseController from "../exercise.controller.js";
import * as exerciseService from "../exercise.service.js";

jest.mock("../exercise.service.js");

const mockExerciseService = jest.mocked(exerciseService);

describe("Exercise Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      user: { sub: "user-123", role: "athlete", sid: "session-123" },
      params: {},
      query: {},
      body: {},
      headers: {},
      get: jest.fn((headerName: string) => {
        return (mockRequest.headers as Record<string, string>)?.[headerName.toLowerCase()];
      }) as unknown as Request["get"],
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe("listExercisesHandler", () => {
    it("should return 401 if not authenticated", async () => {
      mockRequest.user = undefined;

      await exerciseController.listExercisesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    it("should list exercises with default pagination", async () => {
      const mockExercises = [
        { id: "ex-1", name: "Bench Press", type_code: "strength" },
        { id: "ex-2", name: "Squat", type_code: "strength" },
      ];

      mockExerciseService.getAll.mockResolvedValue(mockExercises as never);

      await exerciseController.listExercisesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.getAll).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          limit: 20,
          offset: 0,
        }),
        false,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockExercises);
    });

    it("should filter by query parameters", async () => {
      mockRequest.query = {
        q: "bench",
        type_code: "strength",
        muscle_group: "chest",
        equipment: "barbell",
        tags: "push,compound",
        limit: "10",
        offset: "5",
      };

      mockExerciseService.getAll.mockResolvedValue([] as never);

      await exerciseController.listExercisesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.getAll).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          q: "bench",
          type_code: "strength",
          muscle_group: "chest",
          equipment: "barbell",
          tags: ["push", "compound"],
          limit: 10,
          offset: 5,
        }),
        false,
      );
    });

    it("should handle include_archived flag", async () => {
      mockRequest.query = { include_archived: "true" };

      mockExerciseService.getAll.mockResolvedValue([] as never);

      await exerciseController.listExercisesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.getAll).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          include_archived: true,
        }),
        false,
      );
    });

    it("should handle is_public filter", async () => {
      mockRequest.query = { is_public: "true" };

      mockExerciseService.getAll.mockResolvedValue([] as never);

      await exerciseController.listExercisesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.getAll).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          is_public: true,
        }),
        false,
      );
    });

    it("should allow admin to filter by owner_id", async () => {
      mockRequest.user = { sub: "admin-123", role: "admin", sid: "session-123" };
      mockRequest.query = { owner_id: "123e4567-e89b-12d3-a456-426614174000" };

      mockExerciseService.getAll.mockResolvedValue([] as never);

      await exerciseController.listExercisesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.getAll).toHaveBeenCalledWith(
        "admin-123",
        expect.objectContaining({
          owner_id: "123e4567-e89b-12d3-a456-426614174000",
        }),
        true,
      );
    });

    it("should handle owner_id=global for admin", async () => {
      mockRequest.user = { sub: "admin-123", role: "admin", sid: "session-123" };
      mockRequest.query = { owner_id: "global" };

      mockExerciseService.getAll.mockResolvedValue([] as never);

      await exerciseController.listExercisesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.getAll).toHaveBeenCalledWith(
        "admin-123",
        expect.objectContaining({
          owner_id: null,
        }),
        true,
      );
    });

    it("should handle owner_id=null for admin", async () => {
      mockRequest.user = { sub: "admin-123", role: "admin", sid: "session-123" };
      mockRequest.query = { owner_id: "null" };

      mockExerciseService.getAll.mockResolvedValue([] as never);

      await exerciseController.listExercisesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.getAll).toHaveBeenCalledWith(
        "admin-123",
        expect.objectContaining({
          owner_id: null,
        }),
        true,
      );
    });

    it("should return 400 for invalid query parameters", async () => {
      mockRequest.query = { limit: "invalid" };

      await exerciseController.listExercisesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.anything() }),
      );
    });

    it("should normalize tags from array", async () => {
      mockRequest.query = { tags: ["push", "compound"] };

      mockExerciseService.getAll.mockResolvedValue([] as never);

      await exerciseController.listExercisesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.getAll).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          tags: ["push", "compound"],
        }),
        false,
      );
    });

    it("should normalize tags from comma-separated string", async () => {
      mockRequest.query = { tags: "push,compound,  strength  " };

      mockExerciseService.getAll.mockResolvedValue([] as never);

      await exerciseController.listExercisesHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.getAll).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          tags: ["push", "compound", "strength"],
        }),
        false,
      );
    });
  });

  describe("getExerciseHandler", () => {
    it("should return 401 if not authenticated", async () => {
      mockRequest.user = undefined;

      await exerciseController.getExerciseHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    it("should get exercise by id", async () => {
      mockRequest.params = { id: "ex-123" };

      const mockExercise = {
        id: "ex-123",
        name: "Bench Press",
        type_code: "strength",
      };

      mockExerciseService.getOne.mockResolvedValue(mockExercise as never);

      await exerciseController.getExerciseHandler(mockRequest as Request, mockResponse as Response);

      expect(mockExerciseService.getOne).toHaveBeenCalledWith("ex-123", "user-123", false);
      expect(mockResponse.json).toHaveBeenCalledWith(mockExercise);
    });

    it("should pass isAdmin flag for admin users", async () => {
      mockRequest.user = { sub: "admin-123", role: "admin", sid: "session-123" };
      mockRequest.params = { id: "ex-123" };

      mockExerciseService.getOne.mockResolvedValue({} as never);

      await exerciseController.getExerciseHandler(mockRequest as Request, mockResponse as Response);

      expect(mockExerciseService.getOne).toHaveBeenCalledWith("ex-123", "admin-123", true);
    });
  });

  describe("createExerciseHandler", () => {
    it("should return 401 if not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.body = {
        name: "New Exercise",
        type_code: "strength",
      };

      await exerciseController.createExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    it("should create exercise with valid data", async () => {
      mockRequest.body = {
        name: "Bench Press",
        type_code: "strength",
        muscle_group: "chest",
        equipment: "barbell",
        tags: ["push", "compound"],
        description_en: "A classic chest exercise",
      };

      const mockCreated = {
        id: "ex-new",
        ...mockRequest.body,
        owner_id: "user-123",
      };

      mockExerciseService.createOne.mockResolvedValue(mockCreated as never);

      await exerciseController.createExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.createOne).toHaveBeenCalledWith(
        "user-123",
        mockRequest.body,
        false,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockCreated);
    });

    it("should return 400 for invalid data", async () => {
      mockRequest.body = {
        name: "",
        type_code: "strength",
      };

      await exerciseController.createExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.anything() }),
      );
      expect(mockExerciseService.createOne).not.toHaveBeenCalled();
    });

    it("should reject name longer than 120 characters", async () => {
      mockRequest.body = {
        name: "A".repeat(121),
        type_code: "strength",
      };

      await exerciseController.createExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockExerciseService.createOne).not.toHaveBeenCalled();
    });

    it("should allow admin to set owner_id", async () => {
      mockRequest.user = { sub: "admin-123", role: "admin", sid: "session-123" };
      mockRequest.body = {
        name: "Global Exercise",
        type_code: "strength",
        owner_id: null,
      };

      mockExerciseService.createOne.mockResolvedValue({} as never);

      await exerciseController.createExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.createOne).toHaveBeenCalledWith(
        "admin-123",
        expect.objectContaining({ owner_id: null }),
        true,
      );
    });
  });

  describe("updateExerciseHandler", () => {
    it("should return 401 if not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: "ex-123" };
      mockRequest.body = { name: "Updated" };

      await exerciseController.updateExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    it("should update exercise with valid data", async () => {
      mockRequest.params = { id: "ex-123" };
      mockRequest.body = {
        name: "Updated Exercise",
        muscle_group: "back",
      };

      const mockUpdated = {
        id: "ex-123",
        name: "Updated Exercise",
        muscle_group: "back",
      };

      mockExerciseService.updateOne.mockResolvedValue(mockUpdated as never);

      await exerciseController.updateExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.updateOne).toHaveBeenCalledWith(
        "ex-123",
        "user-123",
        mockRequest.body,
        false,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockUpdated);
    });

    it("should return 400 for empty update payload", async () => {
      mockRequest.params = { id: "ex-123" };
      mockRequest.body = {};

      await exerciseController.updateExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.anything() }),
      );
      expect(mockExerciseService.updateOne).not.toHaveBeenCalled();
    });

    it("should return 400 for invalid field values", async () => {
      mockRequest.params = { id: "ex-123" };
      mockRequest.body = {
        name: "",
      };

      await exerciseController.updateExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockExerciseService.updateOne).not.toHaveBeenCalled();
    });

    it("should allow partial updates", async () => {
      mockRequest.params = { id: "ex-123" };
      mockRequest.body = {
        equipment: "dumbbell",
      };

      mockExerciseService.updateOne.mockResolvedValue({} as never);

      await exerciseController.updateExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.updateOne).toHaveBeenCalledWith(
        "ex-123",
        "user-123",
        { equipment: "dumbbell" },
        false,
      );
    });
  });

  describe("deleteExerciseHandler", () => {
    it("should return 401 if not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: "ex-123" };

      await exerciseController.deleteExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    it("should archive exercise", async () => {
      mockRequest.params = { id: "ex-123" };

      mockExerciseService.archiveOne.mockResolvedValue(undefined as never);

      await exerciseController.deleteExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.archiveOne).toHaveBeenCalledWith("ex-123", "user-123", false);
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should pass isAdmin flag for admin users", async () => {
      mockRequest.user = { sub: "admin-123", role: "admin", sid: "session-123" };
      mockRequest.params = { id: "ex-123" };

      mockExerciseService.archiveOne.mockResolvedValue(undefined as never);

      await exerciseController.deleteExerciseHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockExerciseService.archiveOne).toHaveBeenCalledWith("ex-123", "admin-123", true);
    });
  });
});
