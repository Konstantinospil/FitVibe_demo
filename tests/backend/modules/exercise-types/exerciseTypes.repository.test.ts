import { db } from "../../../../apps/backend/src/db/connection.js";
import * as exerciseTypesRepository from "../../../../apps/backend/src/modules/exercise-types/exerciseTypes.repository.js";

// Mock the database connection
jest.mock("../../../../apps/backend/src/db/connection.js", () => ({
  db: jest.fn(),
}));

const mockDb = jest.mocked(db);

// Add raw helper to mock db
(mockDb as unknown as { raw: jest.Mock }).raw = jest.fn((sql: string) => sql);

describe("Exercise Types Repository", () => {
  let mockQueryBuilder: {
    where: jest.Mock;
    orderBy: jest.Mock;
    select: jest.Mock;
    leftJoin: jest.Mock;
    first: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    on: jest.Mock;
    andOn: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock query builder with chainable methods
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockResolvedValue([1]),
      update: jest.fn().mockResolvedValue(1),
      on: jest.fn().mockReturnThis(),
      andOn: jest.fn().mockReturnThis(),
    };

    // Default: db() returns the mock query builder
    mockDb.mockReturnValue(mockQueryBuilder as never);
  });

  describe("listExerciseTypes", () => {
    it("should list active exercise types", async () => {
      const mockTypes = [
        {
          code: "barbell_squat",
          name: "Barbell Squat",
          description: "Squat with barbell",
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          code: "bench_press",
          name: "Bench Press",
          description: "Press with bench",
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      (mockQueryBuilder as unknown as Promise<typeof mockTypes>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockTypes);
          return Promise.resolve(mockTypes);
        }) as never;

      const result = await exerciseTypesRepository.listExerciseTypes();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        code: "barbell_squat",
        name: "Barbell Squat",
        description: "Squat with barbell",
      });
      expect(result[1]).toEqual({
        code: "bench_press",
        name: "Bench Press",
        description: "Press with bench",
      });

      expect(mockDb).toHaveBeenCalledWith("exercise_types");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ is_active: true });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith("name");
    });

    it("should handle empty list", async () => {
      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      const result = await exerciseTypesRepository.listExerciseTypes();

      expect(result).toEqual([]);
    });
  });

  describe("getExerciseType", () => {
    it("should get exercise type by code", async () => {
      const mockType = {
        code: "barbell_squat",
        name: "Barbell Squat",
        description: "Squat with barbell",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockQueryBuilder.first.mockResolvedValue(mockType);

      const result = await exerciseTypesRepository.getExerciseType("barbell_squat");

      expect(result).toEqual({
        code: "barbell_squat",
        name: "Barbell Squat",
        description: "Squat with barbell",
      });

      expect(mockDb).toHaveBeenCalledWith("exercise_types");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ code: "barbell_squat" });
    });

    it("should return undefined if type not found", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await exerciseTypesRepository.getExerciseType("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("createExerciseType", () => {
    it("should create exercise type", async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);

      await exerciseTypesRepository.createExerciseType({
        code: "new_exercise",
        name: "New Exercise",
        description: "Description",
      });

      expect(mockDb).toHaveBeenCalledWith("exercise_types");
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "new_exercise",
          name: "New Exercise",
          description: "Description",
          is_active: true,
        }),
      );
    });
  });

  describe("updateExerciseType", () => {
    it("should update exercise type", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await exerciseTypesRepository.updateExerciseType("barbell_squat", {
        name: "Updated Name",
        description: "Updated Description",
      });

      expect(result).toBe(1);
      expect(mockDb).toHaveBeenCalledWith("exercise_types");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ code: "barbell_squat" });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated Name",
          description: "Updated Description",
        }),
      );
    });

    it("should update only specified fields", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await exerciseTypesRepository.updateExerciseType("barbell_squat", {
        name: "Updated Name",
      });

      expect(result).toBe(1);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated Name",
        }),
      );
    });
  });

  describe("deleteExerciseType", () => {
    it("should soft delete exercise type", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await exerciseTypesRepository.deleteExerciseType("barbell_squat");

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ code: "barbell_squat" });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
        }),
      );
    });
  });

  describe("restoreExerciseType", () => {
    it("should restore soft deleted exercise type", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await exerciseTypesRepository.restoreExerciseType("barbell_squat");

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ code: "barbell_squat" });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: true,
        }),
      );
    });
  });

  describe("getTranslatedExerciseTypes", () => {
    it("should get translated exercise types", async () => {
      const mockTranslatedTypes = [
        {
          code: "barbell_squat",
          name: "Kniebeugen mit Langhantel",
          description: "Squat with barbell",
        },
        {
          code: "bench_press",
          name: "Bankdrücken",
          description: "Press with bench",
        },
      ];

      (mockQueryBuilder as unknown as Promise<typeof mockTranslatedTypes>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockTranslatedTypes);
          return Promise.resolve(mockTranslatedTypes);
        }) as never;

      const result = await exerciseTypesRepository.getTranslatedExerciseTypes("de-DE");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        code: "barbell_squat",
        name: "Kniebeugen mit Langhantel",
        description: "Squat with barbell",
      });
      expect(result[1]).toEqual({
        code: "bench_press",
        name: "Bankdrücken",
        description: "Press with bench",
      });

      expect(mockDb).toHaveBeenCalledWith("exercise_types as t");
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        "translations as tr",
        expect.any(Function),
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ "t.is_active": true });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith("name");
    });

    it("should fallback to default name when translation not found", async () => {
      const mockTypes = [
        {
          code: "barbell_squat",
          name: "Barbell Squat",
          description: "Squat with barbell",
        },
      ];

      (mockQueryBuilder as unknown as Promise<typeof mockTypes>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockTypes);
          return Promise.resolve(mockTypes);
        }) as never;

      const result = await exerciseTypesRepository.getTranslatedExerciseTypes("fr-FR");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Barbell Squat");
    });
  });
});
