import { db } from "../../../../apps/backend/src/db/connection.js";
import * as exerciseRepository from "../../../../apps/backend/src/modules/exercises/exercise.repository.js";
import type {
  Exercise,
  ExerciseQuery,
} from "../../../../apps/backend/src/modules/exercises/exercise.types.js";

// Mock db - create reusable builders
const queryBuilders: Record<string, any> = {};

function createMockQueryBuilder(defaultValue: unknown = []) {
  const builder = Object.assign(Promise.resolve(defaultValue), {
    where: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    andWhereILike: jest.fn().mockReturnThis(),
    andWhereRaw: jest.fn().mockReturnThis(),
    orWhereILike: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    clone: jest.fn().mockImplementation(function (this: any) {
      // Return a new builder with the same methods
      return createMockQueryBuilder(defaultValue);
    }),
    count: jest.fn().mockResolvedValue([{ count: "0" }]),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(1),
  });
  return builder;
}

jest.mock("../../../../apps/backend/src/db/connection.js", () => {
  const mockDbFunction = jest.fn((table: string) => {
    if (!queryBuilders[table]) {
      queryBuilders[table] = createMockQueryBuilder();
    }
    return queryBuilders[table];
  }) as jest.Mock;

  return {
    db: mockDbFunction,
  };
});

const mockDb = jest.mocked(db);

// Export queryBuilders for test access
export { queryBuilders };

describe("Exercise Repository", () => {
  const userId = "user-123";
  const exerciseId = "exercise-123";

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(queryBuilders).forEach((key) => delete queryBuilders[key]);
  });

  describe("listExercises", () => {
    it("should list exercises with default query", async () => {
      const query: ExerciseQuery = {};
      const mockExercises: Exercise[] = [];

      mockDb("exercises");
      if (queryBuilders["exercises"]) {
        // For the count query (clone().count())
        const countBuilder = createMockQueryBuilder();
        countBuilder.count = jest.fn().mockResolvedValue([{ count: "0" }]);
        queryBuilders["exercises"].clone = jest.fn().mockReturnValue(countBuilder);

        // For the data query (clone().select().orderBy().limit().offset())
        const dataBuilder = createMockQueryBuilder(mockExercises);
        dataBuilder.offset = jest.fn().mockResolvedValue(mockExercises);
        // Make clone return the dataBuilder for the second call
        queryBuilders["exercises"].clone
          .mockReturnValueOnce(countBuilder)
          .mockReturnValueOnce(dataBuilder);
      }

      const result = await exerciseRepository.listExercises(userId, query, false);

      expect(result.data).toEqual(mockExercises);
      expect(result.total).toBe(0);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("should filter by type_code", async () => {
      const query: ExerciseQuery = { type_code: "strength" };

      mockDb("exercises");
      if (queryBuilders["exercises"]) {
        const countBuilder = createMockQueryBuilder();
        countBuilder.count = jest.fn().mockResolvedValue([{ count: "1" }]);
        const dataBuilder = createMockQueryBuilder([]);
        dataBuilder.offset = jest.fn().mockResolvedValue([]);
        queryBuilders["exercises"].clone
          .mockReturnValueOnce(countBuilder)
          .mockReturnValueOnce(dataBuilder);
      }

      await exerciseRepository.listExercises(userId, query, false);

      expect(queryBuilders["exercises"]?.andWhere).toHaveBeenCalledWith("type_code", "strength");
    });

    it("should apply admin ownership filter", async () => {
      const query: ExerciseQuery = { owner_id: "other-user" };

      mockDb("exercises");
      if (queryBuilders["exercises"]) {
        const countBuilder = createMockQueryBuilder();
        countBuilder.count = jest.fn().mockResolvedValue([{ count: "0" }]);
        const dataBuilder = createMockQueryBuilder([]);
        dataBuilder.offset = jest.fn().mockResolvedValue([]);
        queryBuilders["exercises"].clone
          .mockReturnValueOnce(countBuilder)
          .mockReturnValueOnce(dataBuilder);
      }

      await exerciseRepository.listExercises(userId, query, true);

      expect(queryBuilders["exercises"]?.where).toHaveBeenCalledWith({ owner_id: "other-user" });
    });
  });

  describe("getExercise", () => {
    it("should get exercise by id", async () => {
      const mockExercise: Exercise = {
        id: exerciseId,
        name: "Test Exercise",
        type_code: "strength",
        owner_id: userId,
        is_public: false,
        tags: [],
        archived_at: null,
      };

      mockDb("exercises");
      if (queryBuilders["exercises"]) {
        queryBuilders["exercises"].first.mockResolvedValue(mockExercise);
      }

      const result = await exerciseRepository.getExercise(exerciseId, userId);

      expect(result).toEqual(mockExercise);
      expect(queryBuilders["exercises"]?.where).toHaveBeenCalledWith({ id: exerciseId });
    });
  });

  describe("createExercise", () => {
    it("should create exercise", async () => {
      const exerciseData: Exercise = {
        id: exerciseId,
        name: "Test Exercise",
        type_code: "strength",
        owner_id: userId,
        is_public: false,
        tags: [],
        archived_at: null,
      };

      mockDb("exercises");
      if (queryBuilders["exercises"]) {
        queryBuilders["exercises"].insert.mockResolvedValue([exerciseId]);
      }

      const result = await exerciseRepository.createExercise(exerciseData);

      expect(Array.isArray(result)).toBe(true);
      expect(queryBuilders["exercises"]?.insert).toHaveBeenCalled();
    });
  });

  describe("updateExercise", () => {
    it("should update exercise", async () => {
      const updateData = { name: "Updated Exercise" };

      mockDb("exercises");
      if (queryBuilders["exercises"]) {
        queryBuilders["exercises"].update.mockResolvedValue(1);
      }

      await exerciseRepository.updateExercise(exerciseId, updateData);

      expect(queryBuilders["exercises"]?.where).toHaveBeenCalledWith({ id: exerciseId });
      expect(queryBuilders["exercises"]?.update).toHaveBeenCalled();
    });
  });

  describe("archiveExercise", () => {
    it("should archive exercise", async () => {
      mockDb("exercises");
      if (queryBuilders["exercises"]) {
        queryBuilders["exercises"].update.mockResolvedValue(1);
      }

      await exerciseRepository.archiveExercise(exerciseId);

      expect(queryBuilders["exercises"]?.where).toHaveBeenCalledWith({ id: exerciseId });
      expect(queryBuilders["exercises"]?.update).toHaveBeenCalled();
    });
  });

  describe("getExerciseRaw", () => {
    it("should get exercise raw", async () => {
      const mockExercise: Exercise = {
        id: exerciseId,
        name: "Test Exercise",
        type_code: "strength",
        owner_id: userId,
        is_public: false,
        tags: [],
        archived_at: null,
      };

      mockDb("exercises");
      if (queryBuilders["exercises"]) {
        queryBuilders["exercises"].first.mockResolvedValue(mockExercise);
      }

      const result = await exerciseRepository.getExerciseRaw(exerciseId);

      expect(result).toEqual(mockExercise);
      expect(queryBuilders["exercises"]?.where).toHaveBeenCalledWith({ id: exerciseId });
    });
  });
});
