import * as exerciseTypesService from "../../../../apps/backend/src/modules/exercise-types/exerciseTypes.service.js";
import * as exerciseTypesRepository from "../../../../apps/backend/src/modules/exercise-types/exerciseTypes.repository.js";
import * as auditUtil from "../../../../apps/backend/src/modules/common/audit.util.js";
import type { ExerciseType } from "../../../../apps/backend/src/modules/exercise-types/exerciseTypes.types.js";

// Mock dependencies
jest.mock("../../../../apps/backend/src/modules/exercise-types/exerciseTypes.repository.js");
jest.mock("../../../../apps/backend/src/modules/common/audit.util.js");

// Use var for proper hoisting with jest.mock
// eslint-disable-next-line no-var
var mockCacheGet: jest.Mock<any, any, any>;
// eslint-disable-next-line no-var
var mockCacheSet: jest.Mock<any, any, any>;
// eslint-disable-next-line no-var
var mockCacheKeys: jest.Mock<any, any, any>;
// eslint-disable-next-line no-var
var mockCacheDel: jest.Mock<any, any, any>;

jest.mock("node-cache", () => {
  mockCacheGet = jest.fn();
  mockCacheSet = jest.fn();
  mockCacheKeys = jest.fn().mockReturnValue([]);
  mockCacheDel = jest.fn();

  return jest.fn().mockImplementation(() => ({
    get: mockCacheGet,
    set: mockCacheSet,
    keys: mockCacheKeys,
    del: mockCacheDel,
  }));
});

// Mock env
jest.mock("../../../../apps/backend/src/config/env.js", () => ({
  env: {
    typesCacheTtl: 60,
  },
}));

const mockExerciseTypesRepo = jest.mocked(exerciseTypesRepository);
const mockAuditUtil = jest.mocked(auditUtil);

describe("Exercise Types Service", () => {
  let mockCacheInstance: {
    get: jest.Mock;
    set: jest.Mock;
    keys: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reference the mocks for easy access in tests
    mockCacheInstance = {
      get: mockCacheGet,
      set: mockCacheSet,
      keys: mockCacheKeys,
      del: mockCacheDel,
    };
  });

  describe("getAllTypes", () => {
    it("should return cached types if available", async () => {
      const mockTypes: ExerciseType[] = [
        {
          code: "barbell_squat",
          name: "Barbell Squat",
          description: "Squat with barbell",
        },
        {
          code: "bench_press",
          name: "Bench Press",
          description: "Press with bench",
        },
      ];

      mockCacheInstance.get.mockReturnValue(mockTypes);

      const result = await exerciseTypesService.getAllTypes();

      expect(result).toEqual(mockTypes);
      expect(mockCacheInstance.get).toHaveBeenCalledWith("types_default");
      expect(mockExerciseTypesRepo.listExerciseTypes).not.toHaveBeenCalled();
    });

    it("should fetch and cache types if not cached", async () => {
      const mockTypes: ExerciseType[] = [
        {
          code: "barbell_squat",
          name: "Barbell Squat",
          description: "Squat with barbell",
        },
      ];

      mockCacheInstance.get.mockReturnValue(undefined);
      mockExerciseTypesRepo.listExerciseTypes.mockResolvedValue(mockTypes);

      const result = await exerciseTypesService.getAllTypes();

      expect(result).toEqual(mockTypes);
      expect(mockExerciseTypesRepo.listExerciseTypes).toHaveBeenCalled();
      expect(mockCacheInstance.set).toHaveBeenCalledWith("types_default", mockTypes);
    });

    it("should use translated types when locale is provided", async () => {
      const mockTranslatedTypes: ExerciseType[] = [
        {
          code: "barbell_squat",
          name: "Kniebeugen mit Langhantel",
          description: "Squat with barbell",
        },
      ];

      mockCacheInstance.get.mockReturnValue(undefined);
      mockExerciseTypesRepo.getTranslatedExerciseTypes.mockResolvedValue(mockTranslatedTypes);

      const result = await exerciseTypesService.getAllTypes("de-DE");

      expect(result).toEqual(mockTranslatedTypes);
      expect(mockExerciseTypesRepo.getTranslatedExerciseTypes).toHaveBeenCalledWith("de-DE");
      expect(mockCacheInstance.set).toHaveBeenCalledWith("types_de-DE", mockTranslatedTypes);
    });

    it("should cache types per locale", async () => {
      mockCacheInstance.get.mockReturnValue(undefined);
      mockExerciseTypesRepo.getTranslatedExerciseTypes.mockResolvedValue([]);

      await exerciseTypesService.getAllTypes("fr-FR");

      expect(mockCacheInstance.get).toHaveBeenCalledWith("types_fr-FR");
      expect(mockCacheInstance.set).toHaveBeenCalledWith("types_fr-FR", []);
    });
  });

  describe("getOneType", () => {
    it("should return exercise type if found", async () => {
      const mockType: ExerciseType = {
        code: "barbell_squat",
        name: "Barbell Squat",
        description: "Squat with barbell",
      };

      mockExerciseTypesRepo.getExerciseType.mockResolvedValue(mockType);

      const result = await exerciseTypesService.getOneType("barbell_squat");

      expect(result).toEqual(mockType);
      expect(mockExerciseTypesRepo.getExerciseType).toHaveBeenCalledWith("barbell_squat");
    });

    it("should return null if type not found", async () => {
      mockExerciseTypesRepo.getExerciseType.mockResolvedValue(undefined);

      const result = await exerciseTypesService.getOneType("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("addType", () => {
    it("should create new exercise type", async () => {
      const newType: ExerciseType = {
        code: "new_exercise",
        name: "New Exercise",
        description: "Description",
      };

      mockExerciseTypesRepo.getExerciseType
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(newType);
      mockExerciseTypesRepo.createExerciseType.mockResolvedValue(undefined);
      mockAuditUtil.insertAudit.mockResolvedValue(undefined);
      mockCacheInstance.keys.mockReturnValue(["types_default", "types_de-DE", "other_key"]);

      const result = await exerciseTypesService.addType(newType, "user-123");

      expect(result).toEqual(newType);
      expect(mockExerciseTypesRepo.createExerciseType).toHaveBeenCalledWith(newType);
      expect(mockCacheInstance.del).toHaveBeenCalledWith("types_default");
      expect(mockCacheInstance.del).toHaveBeenCalledWith("types_de-DE");
      expect(mockCacheInstance.del).not.toHaveBeenCalledWith("other_key");
      expect(mockAuditUtil.insertAudit).toHaveBeenCalledWith({
        actorUserId: "user-123",
        entity: "exercise_types",
        action: "create",
        entityId: "new_exercise",
        metadata: { code: "new_exercise" },
      });
    });

    it("should throw conflict error if type already exists", async () => {
      const existingType: ExerciseType = {
        code: "existing_exercise",
        name: "Existing Exercise",
        description: "Already exists",
      };

      mockExerciseTypesRepo.getExerciseType.mockResolvedValue(existingType);

      await expect(exerciseTypesService.addType(existingType, "user-123")).rejects.toThrow(
        "EXERCISE_INVALID_TYPE",
      );

      expect(mockExerciseTypesRepo.createExerciseType).not.toHaveBeenCalled();
    });

    it("should create type without audit if no userId provided", async () => {
      const newType: ExerciseType = {
        code: "new_exercise",
        name: "New Exercise",
        description: "Description",
      };

      mockExerciseTypesRepo.getExerciseType
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(newType);
      mockExerciseTypesRepo.createExerciseType.mockResolvedValue(undefined);
      mockCacheInstance.keys.mockReturnValue([]);

      await exerciseTypesService.addType(newType);

      expect(mockExerciseTypesRepo.createExerciseType).toHaveBeenCalled();
      expect(mockAuditUtil.insertAudit).not.toHaveBeenCalled();
    });

    it("should invalidate all types caches", async () => {
      const newType: ExerciseType = {
        code: "new_exercise",
        name: "New Exercise",
        description: "Description",
      };

      mockExerciseTypesRepo.getExerciseType
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(newType);
      mockExerciseTypesRepo.createExerciseType.mockResolvedValue(undefined);
      mockCacheInstance.keys.mockReturnValue([
        "types_default",
        "types_en-US",
        "types_de-DE",
        "types_fr-FR",
      ]);

      await exerciseTypesService.addType(newType);

      expect(mockCacheInstance.del).toHaveBeenCalledTimes(4);
    });
  });

  describe("editType", () => {
    it("should update existing exercise type", async () => {
      const existingType: ExerciseType = {
        code: "barbell_squat",
        name: "Barbell Squat",
        description: "Old description",
      };

      const updatedType: ExerciseType = {
        code: "barbell_squat",
        name: "Updated Name",
        description: "New description",
      };

      mockExerciseTypesRepo.getExerciseType
        .mockResolvedValueOnce(existingType)
        .mockResolvedValueOnce(updatedType);
      mockExerciseTypesRepo.updateExerciseType.mockResolvedValue(1);
      mockAuditUtil.insertAudit.mockResolvedValue(undefined);
      mockCacheInstance.keys.mockReturnValue(["types_default"]);

      const result = await exerciseTypesService.editType(
        "barbell_squat",
        { name: "Updated Name", description: "New description" },
        "user-123",
      );

      expect(result).toEqual(updatedType);
      expect(mockExerciseTypesRepo.updateExerciseType).toHaveBeenCalledWith("barbell_squat", {
        name: "Updated Name",
        description: "New description",
      });
      expect(mockCacheInstance.del).toHaveBeenCalledWith("types_default");
      expect(mockAuditUtil.insertAudit).toHaveBeenCalledWith({
        actorUserId: "user-123",
        entity: "exercise_types",
        action: "update",
        entityId: "barbell_squat",
        metadata: { code: "barbell_squat" },
      });
    });

    it("should throw not found error if type does not exist", async () => {
      mockExerciseTypesRepo.getExerciseType.mockResolvedValue(undefined);

      await expect(
        exerciseTypesService.editType("nonexistent", { name: "Updated" }, "user-123"),
      ).rejects.toThrow("EXERCISE_NOT_FOUND");

      expect(mockExerciseTypesRepo.updateExerciseType).not.toHaveBeenCalled();
    });

    it("should update type without audit if no userId provided", async () => {
      const existingType: ExerciseType = {
        code: "barbell_squat",
        name: "Barbell Squat",
        description: "Old description",
      };

      mockExerciseTypesRepo.getExerciseType
        .mockResolvedValueOnce(existingType)
        .mockResolvedValueOnce(existingType);
      mockExerciseTypesRepo.updateExerciseType.mockResolvedValue(1);
      mockCacheInstance.keys.mockReturnValue([]);

      await exerciseTypesService.editType("barbell_squat", { name: "Updated" });

      expect(mockExerciseTypesRepo.updateExerciseType).toHaveBeenCalled();
      expect(mockAuditUtil.insertAudit).not.toHaveBeenCalled();
    });

    it("should invalidate caches when updating", async () => {
      const existingType: ExerciseType = {
        code: "barbell_squat",
        name: "Barbell Squat",
        description: "Description",
      };

      mockExerciseTypesRepo.getExerciseType.mockResolvedValue(existingType);
      mockExerciseTypesRepo.updateExerciseType.mockResolvedValue(1);
      mockCacheInstance.keys.mockReturnValue(["types_default", "types_de-DE"]);

      await exerciseTypesService.editType("barbell_squat", { name: "Updated" });

      expect(mockCacheInstance.del).toHaveBeenCalledTimes(2);
    });
  });

  describe("removeType", () => {
    it("should delete existing exercise type", async () => {
      const existingType: ExerciseType = {
        code: "barbell_squat",
        name: "Barbell Squat",
        description: "Description",
      };

      mockExerciseTypesRepo.getExerciseType.mockResolvedValue(existingType);
      mockExerciseTypesRepo.deleteExerciseType.mockResolvedValue(1);
      mockAuditUtil.insertAudit.mockResolvedValue(undefined);
      mockCacheInstance.keys.mockReturnValue(["types_default"]);

      await exerciseTypesService.removeType("barbell_squat", "user-123");

      expect(mockExerciseTypesRepo.deleteExerciseType).toHaveBeenCalledWith("barbell_squat");
      expect(mockCacheInstance.del).toHaveBeenCalledWith("types_default");
      expect(mockAuditUtil.insertAudit).toHaveBeenCalledWith({
        actorUserId: "user-123",
        entity: "exercise_types",
        action: "delete",
        entityId: "barbell_squat",
        metadata: { code: "barbell_squat" },
      });
    });

    it("should throw not found error if type does not exist", async () => {
      mockExerciseTypesRepo.getExerciseType.mockResolvedValue(undefined);

      await expect(exerciseTypesService.removeType("nonexistent", "user-123")).rejects.toThrow(
        "EXERCISE_NOT_FOUND",
      );

      expect(mockExerciseTypesRepo.deleteExerciseType).not.toHaveBeenCalled();
    });

    it("should delete type without audit if no userId provided", async () => {
      const existingType: ExerciseType = {
        code: "barbell_squat",
        name: "Barbell Squat",
        description: "Description",
      };

      mockExerciseTypesRepo.getExerciseType.mockResolvedValue(existingType);
      mockExerciseTypesRepo.deleteExerciseType.mockResolvedValue(1);
      mockCacheInstance.keys.mockReturnValue([]);

      await exerciseTypesService.removeType("barbell_squat");

      expect(mockExerciseTypesRepo.deleteExerciseType).toHaveBeenCalled();
      expect(mockAuditUtil.insertAudit).not.toHaveBeenCalled();
    });

    it("should invalidate caches when deleting", async () => {
      const existingType: ExerciseType = {
        code: "barbell_squat",
        name: "Barbell Squat",
        description: "Description",
      };

      mockExerciseTypesRepo.getExerciseType.mockResolvedValue(existingType);
      mockExerciseTypesRepo.deleteExerciseType.mockResolvedValue(1);
      mockCacheInstance.keys.mockReturnValue(["types_default", "types_en-US", "other_cache_key"]);

      await exerciseTypesService.removeType("barbell_squat");

      expect(mockCacheInstance.del).toHaveBeenCalledWith("types_default");
      expect(mockCacheInstance.del).toHaveBeenCalledWith("types_en-US");
      expect(mockCacheInstance.del).not.toHaveBeenCalledWith("other_cache_key");
    });
  });
});
