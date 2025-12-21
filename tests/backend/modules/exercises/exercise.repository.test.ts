import { db } from "../../../../apps/backend/src/db/connection.js";
import * as exerciseRepository from "../../../../apps/backend/src/modules/exercises/exercise.repository.js";

// Mock the database connection
jest.mock("../../../../apps/backend/src/db/connection.js", () => ({
  db: jest.fn(),
}));

const mockDb = jest.mocked(db);

describe("Exercise Repository", () => {
  let mockQueryBuilder: {
    where: jest.Mock;
    whereNull: jest.Mock;
    andWhere: jest.Mock;
    andWhereILike: jest.Mock;
    andWhereRaw: jest.Mock;
    orWhere: jest.Mock;
    whereILike: jest.Mock;
    orWhereILike: jest.Mock;
    select: jest.Mock;
    orderBy: jest.Mock;
    limit: jest.Mock;
    offset: jest.Mock;
    count: jest.Mock;
    first: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    clone: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock query builder with chainable methods
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      andWhereILike: jest.fn().mockReturnThis(),
      andWhereRaw: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      whereILike: jest.fn().mockReturnThis(),
      orWhereILike: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue([{ count: "0" }]),
      first: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockResolvedValue([1]),
      update: jest.fn().mockResolvedValue(1),
      clone: jest.fn().mockReturnThis(),
    };

    // Default: db() returns the mock query builder
    mockDb.mockReturnValue(mockQueryBuilder as never);
  });

  describe("listExercises", () => {
    it("should list exercises for regular user", async () => {
      const mockExercises = [
        {
          id: "ex-1",
          owner_id: "user-123",
          name: "Squat",
          type_code: "barbell_squat",
          muscle_group: "legs",
          equipment: "barbell",
          tags: ["strength"],
          is_public: false,
          description_en: "Description",
          description_de: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          archived_at: null,
        },
      ];

      mockQueryBuilder.count.mockResolvedValue([{ count: "1" }]);

      const cloneBuilder = {
        ...mockQueryBuilder,
        then: jest.fn().mockImplementation((resolve) => {
          resolve(mockExercises);
          return Promise.resolve(mockExercises);
        }),
      };

      mockQueryBuilder.clone.mockReturnValue(cloneBuilder as never);

      const result = await exerciseRepository.listExercises("user-123", {}, false);

      expect(result.data).toEqual(mockExercises);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);

      expect(mockDb).toHaveBeenCalledWith("exercises");
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("archived_at");
    });

    it("should filter by type_code", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: "0" }]);
      mockQueryBuilder.clone.mockReturnValue({
        ...mockQueryBuilder,
        then: jest.fn().mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }),
      } as never);

      await exerciseRepository.listExercises("user-123", { type_code: "barbell_squat" }, false);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("type_code", "barbell_squat");
    });

    it("should filter by muscle_group", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: "0" }]);
      mockQueryBuilder.clone.mockReturnValue({
        ...mockQueryBuilder,
        then: jest.fn().mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }),
      } as never);

      await exerciseRepository.listExercises("user-123", { muscle_group: "chest" }, false);

      expect(mockQueryBuilder.andWhereILike).toHaveBeenCalledWith("muscle_group", "%chest%");
    });

    it("should filter by equipment", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: "0" }]);
      mockQueryBuilder.clone.mockReturnValue({
        ...mockQueryBuilder,
        then: jest.fn().mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }),
      } as never);

      await exerciseRepository.listExercises("user-123", { equipment: "dumbbell" }, false);

      expect(mockQueryBuilder.andWhereILike).toHaveBeenCalledWith("equipment", "%dumbbell%");
    });

    it("should filter by is_public", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: "0" }]);
      mockQueryBuilder.clone.mockReturnValue({
        ...mockQueryBuilder,
        then: jest.fn().mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }),
      } as never);

      await exerciseRepository.listExercises("user-123", { is_public: true }, false);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("is_public", true);
    });

    it("should filter by tags", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: "0" }]);
      mockQueryBuilder.clone.mockReturnValue({
        ...mockQueryBuilder,
        then: jest.fn().mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }),
      } as never);

      await exerciseRepository.listExercises("user-123", { tags: ["strength", "power"] }, false);

      expect(mockQueryBuilder.andWhereRaw).toHaveBeenCalledWith("tags @> ?", [
        JSON.stringify(["strength", "power"]),
      ]);
    });

    it("should search by query", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: "0" }]);
      mockQueryBuilder.clone.mockReturnValue({
        ...mockQueryBuilder,
        then: jest.fn().mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }),
      } as never);

      await exerciseRepository.listExercises("user-123", { q: "squat" }, false);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it("should include archived if specified", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: "0" }]);
      mockQueryBuilder.clone.mockReturnValue({
        ...mockQueryBuilder,
        then: jest.fn().mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }),
      } as never);

      await exerciseRepository.listExercises("user-123", { include_archived: true }, false);

      expect(mockQueryBuilder.whereNull).not.toHaveBeenCalledWith("archived_at");
    });

    it("should apply admin ownership filter for null owner", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: "0" }]);
      mockQueryBuilder.clone.mockReturnValue({
        ...mockQueryBuilder,
        then: jest.fn().mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }),
      } as never);

      await exerciseRepository.listExercises("admin-123", { owner_id: null }, true);

      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("owner_id");
    });

    it("should apply admin ownership filter for specific owner", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: "0" }]);
      mockQueryBuilder.clone.mockReturnValue({
        ...mockQueryBuilder,
        then: jest.fn().mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }),
      } as never);

      await exerciseRepository.listExercises("admin-123", { owner_id: "user-456" }, true);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ owner_id: "user-456" });
    });

    it("should use custom pagination", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: "0" }]);
      mockQueryBuilder.clone.mockReturnValue({
        ...mockQueryBuilder,
        then: jest.fn().mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }),
      } as never);

      const result = await exerciseRepository.listExercises(
        "user-123",
        { limit: 10, offset: 5 },
        false,
      );

      expect(result.limit).toBe(10);
      expect(result.offset).toBe(5);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(5);
    });
  });

  describe("getExercise", () => {
    it("should get exercise by id for user", async () => {
      const mockExercise = {
        id: "ex-1",
        owner_id: "user-123",
        name: "Squat",
        type_code: "barbell_squat",
      };

      mockQueryBuilder.first.mockResolvedValue(mockExercise);

      const result = await exerciseRepository.getExercise("ex-1", "user-123");

      expect(result).toEqual(mockExercise);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "ex-1" });
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("archived_at");
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it("should return undefined if exercise not found", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await exerciseRepository.getExercise("nonexistent", "user-123");

      expect(result).toBeUndefined();
    });
  });

  describe("getExerciseRaw", () => {
    it("should get exercise without filters", async () => {
      const mockExercise = {
        id: "ex-1",
        owner_id: "user-123",
        name: "Squat",
        archived_at: "2024-01-01T00:00:00Z",
      };

      mockQueryBuilder.first.mockResolvedValue(mockExercise);

      const result = await exerciseRepository.getExerciseRaw("ex-1");

      expect(result).toEqual(mockExercise);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "ex-1" });
      expect(mockQueryBuilder.whereNull).not.toHaveBeenCalled();
    });
  });

  describe("createExercise", () => {
    it("should create exercise", async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);

      const exercise = {
        id: "ex-new",
        owner_id: "user-123",
        name: "New Exercise",
        type_code: "custom",
        muscle_group: "legs",
        equipment: "none",
        tags: [],
        is_public: false,
        description_en: "Description",
        description_de: null,
      };

      const result = await exerciseRepository.createExercise(exercise);

      expect(result).toEqual([1]);
      expect(mockDb).toHaveBeenCalledWith("exercises");
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...exercise,
          archived_at: null,
        }),
      );
    });
  });

  describe("updateExercise", () => {
    it("should update exercise", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await exerciseRepository.updateExercise("ex-1", {
        name: "Updated Name",
        is_public: true,
      });

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "ex-1" });
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });
  });

  describe("archiveExercise", () => {
    it("should archive exercise", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await exerciseRepository.archiveExercise("ex-1");

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "ex-1" });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          archived_at: expect.any(String),
        }),
      );
    });
  });
});
