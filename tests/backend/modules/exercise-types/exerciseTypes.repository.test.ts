import { db } from "../../../../apps/backend/src/db/connection.js";
import * as exerciseTypesRepository from "../../../../apps/backend/src/modules/exercise-types/exerciseTypes.repository.js";
import type { ExerciseType } from "../../../../apps/backend/src/modules/exercise-types/exerciseTypes.types.js";

// Mock db
const queryBuilders: Record<string, any> = {};

function createMockQueryBuilder(defaultValue: unknown = []) {
  const builder = Object.assign(Promise.resolve(defaultValue), {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(1),
    leftJoin: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnValue({}),
  });
  (builder as any).raw = jest.fn().mockReturnValue({});
  return builder;
}

jest.mock("../../../../apps/backend/src/db/connection.js", () => {
  const mockDbFunction = jest.fn((table: string) => {
    if (!queryBuilders[table]) {
      queryBuilders[table] = createMockQueryBuilder();
    }
    return queryBuilders[table];
  }) as jest.Mock & {
    raw: jest.Mock;
  };

  mockDbFunction.raw = jest.fn().mockReturnValue({});

  return {
    db: mockDbFunction,
  };
});

describe("Exercise Types Repository", () => {
  const typeCode = "strength";

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(queryBuilders).forEach((key) => delete queryBuilders[key]);
  });

  describe("listExerciseTypes", () => {
    it("should list exercise types", async () => {
      const mockTypes: ExerciseType[] = [
        { code: typeCode, name: "Strength", description: "Strength training" },
      ];

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("exercise_types");
      if (queryBuilders["exercise_types"]) {
        queryBuilders["exercise_types"].orderBy.mockResolvedValue(mockTypes);
      }

      const result = await exerciseTypesRepository.listExerciseTypes();

      expect(result).toEqual(mockTypes);
      expect(queryBuilders["exercise_types"]?.where).toHaveBeenCalledWith({ is_active: true });
    });
  });

  describe("getExerciseType", () => {
    it("should get exercise type by code", async () => {
      const mockType = {
        code: typeCode,
        name: "Strength",
        description: "Strength training",
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("exercise_types");
      if (queryBuilders["exercise_types"]) {
        queryBuilders["exercise_types"].first.mockResolvedValue(mockType);
      }

      const result = await exerciseTypesRepository.getExerciseType(typeCode);

      expect(result).toEqual(mockType);
      expect(queryBuilders["exercise_types"]?.where).toHaveBeenCalledWith({ code: typeCode });
    });
  });

  describe("createExerciseType", () => {
    it("should create exercise type", async () => {
      const exerciseType: ExerciseType = {
        code: typeCode,
        name: "Strength",
        description: "Strength training",
      };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("exercise_types");
      if (queryBuilders["exercise_types"]) {
        queryBuilders["exercise_types"].insert.mockResolvedValue([]);
      }

      await exerciseTypesRepository.createExerciseType(exerciseType);

      expect(queryBuilders["exercise_types"]?.insert).toHaveBeenCalled();
    });
  });

  describe("updateExerciseType", () => {
    it("should update exercise type", async () => {
      const updates: Partial<ExerciseType> = { name: "Updated Name" };

      const dbModule = await import("../../../../apps/backend/src/db/connection.js");
      const dbFn = dbModule.db as jest.Mock;
      dbFn("exercise_types");
      if (queryBuilders["exercise_types"]) {
        queryBuilders["exercise_types"].update.mockResolvedValue(1);
      }

      await exerciseTypesRepository.updateExerciseType(typeCode, updates);

      expect(queryBuilders["exercise_types"]?.where).toHaveBeenCalledWith({ code: typeCode });
      expect(queryBuilders["exercise_types"]?.update).toHaveBeenCalled();
    });
  });
});
