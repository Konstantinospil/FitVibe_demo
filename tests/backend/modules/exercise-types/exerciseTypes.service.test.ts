import * as exerciseTypesService from "../../../../apps/backend/src/modules/exercise-types/exerciseTypes.service.js";
import * as exerciseTypesRepository from "../../../../apps/backend/src/modules/exercise-types/exerciseTypes.repository.js";
import type { ExerciseType } from "../../../../apps/backend/src/modules/exercise-types/exerciseTypes.types.js";

// Mock dependencies
jest.mock("../../../../apps/backend/src/modules/exercise-types/exerciseTypes.repository.js");
jest.mock("../../../../apps/backend/src/modules/common/audit.util.js", () => ({
  insertAudit: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../../../apps/backend/src/config/env.js", () => ({
  env: {
    typesCacheTtl: 3600,
  },
}));

const mockCache = new Map<string, unknown>();
const mockNodeCache = {
  get: jest.fn((key: string) => mockCache.get(key)),
  set: jest.fn((key: string, value: unknown) => {
    mockCache.set(key, value);
  }),
  del: jest.fn((key: string) => mockCache.delete(key)),
  keys: jest.fn(() => Array.from(mockCache.keys())),
  flushAll: jest.fn(() => mockCache.clear()),
};

jest.mock("node-cache", () => {
  return jest.fn(() => ({
    get: jest.fn((key: string) => mockCache.get(key)),
    set: jest.fn((key: string, value: unknown) => {
      mockCache.set(key, value);
    }),
    del: jest.fn((key: string) => mockCache.delete(key)),
    keys: jest.fn(() => Array.from(mockCache.keys())),
    flushAll: jest.fn(() => mockCache.clear()),
  }));
});

const mockExerciseTypesRepo = jest.mocked(exerciseTypesRepository);

describe("Exercise Types Service", () => {
  const adminId = "admin-123";

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache.clear();
  });

  describe("getAllTypes", () => {
    it("should return all exercise types", async () => {
      const mockTypes: ExerciseType[] = [
        {
          code: "strength",
          name: "Strength",
          description: "Strength training exercises",
          muscle_groups: ["chest", "back"],
          equipment: ["barbell", "dumbbell"],
        },
      ];

      mockExerciseTypesRepo.listExerciseTypes.mockResolvedValue(mockTypes);

      const result = await exerciseTypesService.getAllTypes();

      expect(result).toEqual(mockTypes);
      expect(mockExerciseTypesRepo.listExerciseTypes).toHaveBeenCalled();
    });

    it("should return cached types on second call", async () => {
      const mockTypes: ExerciseType[] = [
        {
          code: "strength",
          name: "Strength",
          description: "",
          muscle_groups: [],
          equipment: [],
        },
      ];

      mockExerciseTypesRepo.listExerciseTypes.mockResolvedValue(mockTypes);

      const result1 = await exerciseTypesService.getAllTypes();
      const result2 = await exerciseTypesService.getAllTypes();

      expect(result1).toEqual(mockTypes);
      expect(result2).toEqual(mockTypes);
      // Should only call repository once due to caching
      expect(mockExerciseTypesRepo.listExerciseTypes).toHaveBeenCalledTimes(1);
    });

    it("should return translated types when locale provided", async () => {
      const mockTypes: ExerciseType[] = [
        {
          code: "strength",
          name: "Kraft",
          description: "Krafttraining",
          muscle_groups: [],
          equipment: [],
        },
      ];

      mockExerciseTypesRepo.getTranslatedExerciseTypes.mockResolvedValue(mockTypes);

      const result = await exerciseTypesService.getAllTypes("de");

      expect(result).toEqual(mockTypes);
      expect(mockExerciseTypesRepo.getTranslatedExerciseTypes).toHaveBeenCalledWith("de");
    });
  });

  describe("getOneType", () => {
    it("should return exercise type by code", async () => {
      const mockType: ExerciseType = {
        code: "strength",
        name: "Strength",
        description: "Strength training",
        muscle_groups: [],
        equipment: [],
      };

      mockExerciseTypesRepo.getExerciseType.mockResolvedValue(mockType);

      const result = await exerciseTypesService.getOneType("strength");

      expect(result).toEqual(mockType);
      expect(mockExerciseTypesRepo.getExerciseType).toHaveBeenCalledWith("strength");
    });

    it("should return null when type not found", async () => {
      mockExerciseTypesRepo.getExerciseType.mockResolvedValue(null);

      const result = await exerciseTypesService.getOneType("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("addType", () => {
    const validType: ExerciseType = {
      code: "new-type",
      name: "New Type",
      description: "A new exercise type",
      muscle_groups: ["chest"],
      equipment: ["barbell"],
    };

    it("should create exercise type", async () => {
      mockExerciseTypesRepo.getExerciseType.mockResolvedValueOnce(null); // Check existence
      mockExerciseTypesRepo.createExerciseType.mockResolvedValue(undefined);
      mockExerciseTypesRepo.getExerciseType.mockResolvedValueOnce(validType); // Return created

      const result = await exerciseTypesService.addType(validType, adminId);

      expect(result).toEqual(validType);
      expect(mockExerciseTypesRepo.createExerciseType).toHaveBeenCalledWith(validType);
    });

    it("should throw error when code already exists", async () => {
      mockExerciseTypesRepo.getExerciseType.mockResolvedValue(validType);

      await expect(exerciseTypesService.addType(validType, adminId)).rejects.toThrow(
        "EXERCISE_INVALID_TYPE",
      );
    });
  });

  describe("editType", () => {
    const existingType: ExerciseType = {
      code: "strength",
      name: "Strength",
      description: "Original description",
      muscle_groups: [],
      equipment: [],
    };

    it("should update exercise type", async () => {
      const updates: Partial<ExerciseType> = {
        name: "Updated Strength",
      };

      const mockUpdated: ExerciseType = {
        ...existingType,
        name: "Updated Strength",
      };

      mockExerciseTypesRepo.getExerciseType
        .mockResolvedValueOnce(existingType) // Check existence
        .mockResolvedValueOnce(mockUpdated); // Return updated
      mockExerciseTypesRepo.updateExerciseType.mockResolvedValue(undefined);

      const result = await exerciseTypesService.editType("strength", updates, adminId);

      expect(result).toEqual(mockUpdated);
      expect(mockExerciseTypesRepo.updateExerciseType).toHaveBeenCalledWith("strength", updates);
    });

    it("should throw error when type not found", async () => {
      mockExerciseTypesRepo.getExerciseType.mockResolvedValue(null);

      await expect(
        exerciseTypesService.editType("nonexistent", { name: "New Name" }, adminId),
      ).rejects.toThrow("EXERCISE_NOT_FOUND");
    });
  });

  describe("removeType", () => {
    it("should delete exercise type", async () => {
      const existingType: ExerciseType = {
        code: "strength",
        name: "Strength",
        description: "",
        muscle_groups: [],
        equipment: [],
      };

      mockExerciseTypesRepo.getExerciseType.mockResolvedValue(existingType);
      mockExerciseTypesRepo.deleteExerciseType.mockResolvedValue(undefined);

      await exerciseTypesService.removeType("strength", adminId);

      expect(mockExerciseTypesRepo.deleteExerciseType).toHaveBeenCalledWith("strength");
    });

    it("should throw error when type not found", async () => {
      mockExerciseTypesRepo.getExerciseType.mockResolvedValue(null);

      await expect(exerciseTypesService.removeType("nonexistent", adminId)).rejects.toThrow(
        "EXERCISE_NOT_FOUND",
      );
    });
  });
});
