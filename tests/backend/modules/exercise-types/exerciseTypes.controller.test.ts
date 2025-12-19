import type { Request, Response } from "express";
import * as exerciseTypesController from "../../../../apps/backend/src/modules/exercise-types/exerciseTypes.controller.js";
import * as exerciseTypesService from "../../../../apps/backend/src/modules/exercise-types/exerciseTypes.service.js";

jest.mock("../../../../apps/backend/src/modules/exercise-types/exerciseTypes.service.js");

const mockExerciseTypesService = jest.mocked(exerciseTypesService);

describe("Exercise Types Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  const adminId = "admin-123";
  const typeCode = "strength";

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      user: { sub: adminId, role: "admin" },
      body: {},
      query: {},
      params: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  describe("listTypes", () => {
    it("should list exercise types", async () => {
      const mockTypes = [
        {
          code: "strength",
          name: "Strength",
          description: "Strength training exercises",
        },
      ];

      mockExerciseTypesService.getAllTypes.mockResolvedValue(mockTypes);

      await exerciseTypesController.listTypes(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockTypes);
      expect(mockExerciseTypesService.getAllTypes).toHaveBeenCalledWith(undefined);
    });

    it("should list exercise types with locale", async () => {
      const mockTypes = [
        {
          code: "strength",
          name: "Kraft",
          description: "Krafttraining",
        },
      ];

      mockRequest.query = { locale: "de" };
      mockExerciseTypesService.getAllTypes.mockResolvedValue(mockTypes);

      await exerciseTypesController.listTypes(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockTypes);
      expect(mockExerciseTypesService.getAllTypes).toHaveBeenCalledWith("de");
    });
  });

  describe("getType", () => {
    it("should get exercise type", async () => {
      const mockType = {
        code: typeCode,
        name: "Strength",
        description: "Strength training exercises",
      };

      mockRequest.params = { code: typeCode };
      mockExerciseTypesService.getOneType.mockResolvedValue(mockType);

      await exerciseTypesController.getType(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockType);
      expect(mockExerciseTypesService.getOneType).toHaveBeenCalledWith(typeCode);
    });

    it("should return 404 when type not found", async () => {
      mockRequest.params = { code: "nonexistent" };
      mockExerciseTypesService.getOneType.mockResolvedValue(null);

      await exerciseTypesController.getType(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Not found" });
    });
  });

  describe("createType", () => {
    it("should create exercise type", async () => {
      const typeData = {
        code: typeCode,
        name: "Strength",
        description: "Strength training",
      };

      const mockType = {
        code: typeCode,
        name: "Strength",
        description: "Strength training",
      };

      mockRequest.body = typeData;
      mockExerciseTypesService.addType.mockResolvedValue(mockType);

      await exerciseTypesController.createType(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockType);
      expect(mockExerciseTypesService.addType).toHaveBeenCalledWith(typeData, adminId);
    });

    it("should return 400 for invalid body", async () => {
      mockRequest.body = {
        code: "a", // Invalid: too short
        name: "Strength",
      };

      await exerciseTypesController.createType(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Object),
        }),
      );
      expect(mockExerciseTypesService.addType).not.toHaveBeenCalled();
    });

    it("should handle missing description", async () => {
      const typeData = {
        code: typeCode,
        name: "Strength",
      };

      const mockType = {
        code: typeCode,
        name: "Strength",
        description: null,
      };

      mockRequest.body = typeData;
      mockExerciseTypesService.addType.mockResolvedValue(mockType);

      await exerciseTypesController.createType(mockRequest as Request, mockResponse as Response);

      expect(mockExerciseTypesService.addType).toHaveBeenCalledWith(typeData, adminId);
    });
  });

  describe("updateType", () => {
    it("should update exercise type", async () => {
      const updateData = {
        name: "Updated Strength",
        description: "Updated description",
      };

      const mockType = {
        code: typeCode,
        name: "Updated Strength",
        description: "Updated description",
      };

      mockRequest.params = { code: typeCode };
      mockRequest.body = updateData;
      mockExerciseTypesService.editType.mockResolvedValue(mockType);

      await exerciseTypesController.updateType(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockType);
      expect(mockExerciseTypesService.editType).toHaveBeenCalledWith(typeCode, updateData, adminId);
    });

    it("should return 400 for invalid body", async () => {
      mockRequest.params = { code: typeCode };
      mockRequest.body = {
        name: "ab", // Invalid: too short
      };

      await exerciseTypesController.updateType(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockExerciseTypesService.editType).not.toHaveBeenCalled();
    });

    it("should handle partial update", async () => {
      const updateData = {
        name: "Updated Strength",
      };

      const mockType = {
        code: typeCode,
        name: "Updated Strength",
        description: "Original description",
      };

      mockRequest.params = { code: typeCode };
      mockRequest.body = updateData;
      mockExerciseTypesService.editType.mockResolvedValue(mockType);

      await exerciseTypesController.updateType(mockRequest as Request, mockResponse as Response);

      expect(mockExerciseTypesService.editType).toHaveBeenCalledWith(typeCode, updateData, adminId);
    });
  });

  describe("deleteType", () => {
    it("should delete exercise type", async () => {
      mockRequest.params = { code: typeCode };
      mockExerciseTypesService.removeType.mockResolvedValue(undefined);

      await exerciseTypesController.deleteType(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
      expect(mockExerciseTypesService.removeType).toHaveBeenCalledWith(typeCode, adminId);
    });
  });
});

