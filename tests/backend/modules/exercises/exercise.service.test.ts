import { db } from "../../../../apps/backend/src/db/connection.js";
import * as exerciseService from "../../../../apps/backend/src/modules/exercises/exercise.service.js";
import * as exerciseRepository from "../../../../apps/backend/src/modules/exercises/exercise.repository.js";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";
import type {
  CreateExerciseDTO,
  UpdateExerciseDTO,
  Exercise,
} from "../../../../apps/backend/src/modules/exercises/exercise.types.js";

// Mock dependencies
jest.mock("../../../../apps/backend/src/modules/exercises/exercise.repository.js");
jest.mock("../../../../apps/backend/src/db/connection.js", () => ({
  db: jest.fn(),
}));

const mockRepo = jest.mocked(exerciseRepository);
const mockDb = jest.mocked(db);

describe("Exercise Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAll", () => {
    it("should return paginated exercises for regular user", async () => {
      const mockExercises = {
        data: [
          { id: "ex-1", name: "Bench Press", owner_id: "user-123" },
          { id: "ex-2", name: "Squat", owner_id: null },
        ],
        total: 2,
        limit: 20,
        offset: 0,
      };

      mockRepo.listExercises.mockResolvedValue(mockExercises as never);

      const result = await exerciseService.getAll("user-123", {}, false);

      expect(result).toEqual(mockExercises);
      expect(mockRepo.listExercises).toHaveBeenCalledWith("user-123", {}, false);
    });

    it("should return exercises with filters", async () => {
      const query = {
        q: "press",
        type_code: "strength",
        limit: 10,
        offset: 5,
      };

      mockRepo.listExercises.mockResolvedValue({
        data: [],
        total: 0,
        limit: 10,
        offset: 5,
      } as never);

      await exerciseService.getAll("user-123", query, false);

      expect(mockRepo.listExercises).toHaveBeenCalledWith("user-123", query, false);
    });

    it("should allow admin to list all exercises", async () => {
      mockRepo.listExercises.mockResolvedValue({
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      } as never);

      await exerciseService.getAll("admin-123", {}, true);

      expect(mockRepo.listExercises).toHaveBeenCalledWith("admin-123", {}, true);
    });
  });

  describe("getOne", () => {
    it("should get exercise owned by user", async () => {
      const mockExercise = {
        id: "ex-123",
        name: "Bench Press",
        owner_id: "user-123",
        archived_at: null,
      } as Exercise;

      mockRepo.getExercise.mockResolvedValue(mockExercise);

      const result = await exerciseService.getOne("ex-123", "user-123", false);

      expect(result).toEqual(mockExercise);
      expect(mockRepo.getExercise).toHaveBeenCalledWith("ex-123", "user-123");
    });

    it("should get global exercise (owner_id null)", async () => {
      const mockExercise = {
        id: "ex-123",
        name: "Bench Press",
        owner_id: null,
        archived_at: null,
      } as Exercise;

      mockRepo.getExercise.mockResolvedValue(mockExercise);

      const result = await exerciseService.getOne("ex-123", "user-123", false);

      expect(result).toEqual(mockExercise);
    });

    it("should throw 404 if exercise not found", async () => {
      mockRepo.getExercise.mockResolvedValue(undefined);

      await expect(exerciseService.getOne("ex-123", "user-123", false)).rejects.toThrow(HttpError);
      await expect(exerciseService.getOne("ex-123", "user-123", false)).rejects.toThrow(
        "EXERCISE_NOT_FOUND",
      );
    });

    it("should throw 404 if exercise owned by different user", async () => {
      const mockExercise = {
        id: "ex-123",
        name: "Bench Press",
        owner_id: "other-user",
        archived_at: null,
      } as Exercise;

      mockRepo.getExercise.mockResolvedValue(mockExercise);

      await expect(exerciseService.getOne("ex-123", "user-123", false)).rejects.toThrow(
        "EXERCISE_NOT_FOUND",
      );
    });

    it("should throw 404 if exercise is archived (non-admin)", async () => {
      const mockExercise = {
        id: "ex-123",
        name: "Bench Press",
        owner_id: "user-123",
        archived_at: "2024-01-01T00:00:00Z",
      } as Exercise;

      mockRepo.getExercise.mockResolvedValue(mockExercise);

      await expect(exerciseService.getOne("ex-123", "user-123", false)).rejects.toThrow(
        "EXERCISE_NOT_FOUND",
      );
    });

    it("should allow admin to get any exercise", async () => {
      const mockExercise = {
        id: "ex-123",
        name: "Bench Press",
        owner_id: "other-user",
        archived_at: null,
      } as Exercise;

      mockRepo.getExerciseRaw.mockResolvedValue(mockExercise);

      const result = await exerciseService.getOne("ex-123", "admin-123", true);

      expect(result).toEqual(mockExercise);
      expect(mockRepo.getExerciseRaw).toHaveBeenCalledWith("ex-123");
    });
  });

  describe("createOne", () => {
    const validDto: CreateExerciseDTO = {
      name: "Bench Press",
      type_code: "strength",
      muscle_group: "chest",
      equipment: "barbell",
      tags: ["compound", "push"],
      is_public: true,
      description_en: "A pressing exercise",
    };

    it("should create exercise for user", async () => {
      // Mock ensureTypeExists
      mockDb.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ code: "strength" }),
      } as never);

      // Mock ensureNameUnique
      mockDb.mockReturnValueOnce({
        whereRaw: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as never);

      mockRepo.createExercise.mockResolvedValue(undefined as never);

      const mockCreated = {
        id: "ex-new",
        name: "Bench Press",
        owner_id: "user-123",
      } as Exercise;

      mockRepo.getExercise.mockResolvedValue(mockCreated);

      const result = await exerciseService.createOne("user-123", validDto, false);

      expect(result).toEqual(mockCreated);
      expect(mockRepo.createExercise).toHaveBeenCalled();
    });

    it("should reject if non-admin tries to create global exercise", async () => {
      const globalDto = { ...validDto, owner_id: null };

      await expect(exerciseService.createOne("user-123", globalDto, false)).rejects.toThrow(
        "EXERCISE_FORBIDDEN",
      );
    });

    it("should reject if non-admin tries to create exercise for different user", async () => {
      const otherUserDto = { ...validDto, owner_id: "other-user" };

      await expect(exerciseService.createOne("user-123", otherUserDto, false)).rejects.toThrow(
        "EXERCISE_FORBIDDEN",
      );
    });

    it("should allow admin to create global exercise", async () => {
      const globalDto = { ...validDto, owner_id: null };

      // Mock ensureTypeExists
      mockDb.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ code: "strength" }),
      } as never);

      // Mock ensureNameUnique
      mockDb.mockReturnValueOnce({
        whereRaw: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as never);

      mockRepo.createExercise.mockResolvedValue(undefined as never);

      const mockCreated = {
        id: "ex-global",
        name: "Bench Press",
        owner_id: null,
      } as Exercise;

      // When owner_id is null, getExercise is called with admin userId
      mockRepo.getExercise.mockResolvedValue(mockCreated);

      const result = await exerciseService.createOne("admin-123", globalDto, true);

      expect(result.owner_id).toBeNull();
      expect(mockRepo.getExercise).toHaveBeenCalled();
    });

    it("should reject invalid exercise type", async () => {
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as never);

      await expect(
        exerciseService.createOne("user-123", { ...validDto, type_code: "invalid" }, false),
      ).rejects.toThrow("EXERCISE_INVALID_TYPE");
    });

    it("should reject duplicate exercise name for same owner", async () => {
      // Mock ensureTypeExists
      mockDb.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ code: "strength" }),
      } as never);

      // Mock ensureNameUnique to find duplicate
      mockDb.mockReturnValueOnce({
        whereRaw: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ id: "existing-ex" }),
      } as never);

      await expect(exerciseService.createOne("user-123", validDto, false)).rejects.toThrow(
        "EXERCISE_DUPLICATE",
      );
    });

    it("should sanitize tags (trim, lowercase, unique, max 25)", async () => {
      // Mock ensureTypeExists
      mockDb.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ code: "strength" }),
      } as never);

      // Mock ensureNameUnique
      mockDb.mockReturnValueOnce({
        whereRaw: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as never);

      mockRepo.createExercise.mockResolvedValue(undefined as never);
      mockRepo.getExercise.mockResolvedValue({ id: "ex-1" } as Exercise);

      const dtoWithTags = {
        ...validDto,
        tags: ["  Push  ", "COMPOUND", "push", "   "],
      };

      await exerciseService.createOne("user-123", dtoWithTags, false);

      const createCall = mockRepo.createExercise.mock.calls[0][0];
      expect(createCall.tags).toEqual(["push", "compound"]);
    });

    it("should sanitize nullable fields (trim empty to null)", async () => {
      // Mock ensureTypeExists
      mockDb.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ code: "strength" }),
      } as never);

      // Mock ensureNameUnique
      mockDb.mockReturnValueOnce({
        whereRaw: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as never);

      mockRepo.createExercise.mockResolvedValue(undefined as never);
      mockRepo.getExercise.mockResolvedValue({ id: "ex-1" } as Exercise);

      const dtoWithEmpty = {
        ...validDto,
        muscle_group: "   ",
        equipment: "",
        description_en: "  valid  ",
      };

      await exerciseService.createOne("user-123", dtoWithEmpty, false);

      const createCall = mockRepo.createExercise.mock.calls[0][0];
      expect(createCall.muscle_group).toBeNull();
      expect(createCall.equipment).toBeNull();
      expect(createCall.description_en).toBe("valid");
    });

    it("should default is_public to false for user-owned exercises", async () => {
      // Mock ensureTypeExists
      mockDb.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ code: "strength" }),
      } as never);

      // Mock ensureNameUnique
      mockDb.mockReturnValueOnce({
        whereRaw: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as never);

      mockRepo.createExercise.mockResolvedValue(undefined as never);
      mockRepo.getExercise.mockResolvedValue({ id: "ex-1" } as Exercise);

      const dtoWithoutPublic = { ...validDto, is_public: undefined };

      await exerciseService.createOne("user-123", dtoWithoutPublic, false);

      const createCall = mockRepo.createExercise.mock.calls[0][0];
      expect(createCall.is_public).toBe(false);
    });

    it("should default is_public to true for global exercises", async () => {
      // Mock ensureTypeExists
      mockDb.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ code: "strength" }),
      } as never);

      // Mock ensureNameUnique
      mockDb.mockReturnValueOnce({
        whereRaw: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as never);

      mockRepo.createExercise.mockResolvedValue(undefined as never);
      mockRepo.getExerciseRaw.mockResolvedValue({ id: "ex-1", owner_id: null } as Exercise);

      const globalDto = { ...validDto, owner_id: null, is_public: undefined };

      await exerciseService.createOne("admin-123", globalDto, true);

      const createCall = mockRepo.createExercise.mock.calls[0][0];
      expect(createCall.is_public).toBe(true);
    });

    it("should throw 500 if created exercise not found", async () => {
      // Mock ensureTypeExists
      mockDb.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ code: "strength" }),
      } as never);

      // Mock ensureNameUnique
      mockDb.mockReturnValueOnce({
        whereRaw: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as never);

      mockRepo.createExercise.mockResolvedValue(undefined as never);
      mockRepo.getExercise.mockResolvedValue(undefined);

      await expect(exerciseService.createOne("user-123", validDto, false)).rejects.toThrow(
        "EXERCISE_CREATE_FAILED",
      );
    });
  });

  describe("updateOne", () => {
    const updateDto: UpdateExerciseDTO = {
      name: "Updated Name",
      muscle_group: "legs",
    };

    it("should update exercise owned by user", async () => {
      const existingExercise = {
        id: "ex-123",
        name: "Old Name",
        owner_id: "user-123",
      } as Exercise;

      mockRepo.getExerciseRaw.mockResolvedValue(existingExercise);

      mockDb.mockReturnValue({
        whereRaw: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        andWhereNot: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as never);

      mockRepo.updateExercise.mockResolvedValue(1);

      const updatedExercise = {
        ...existingExercise,
        name: "Updated Name",
      };

      mockRepo.getExercise.mockResolvedValue(updatedExercise);

      const result = await exerciseService.updateOne("ex-123", "user-123", updateDto, false);

      expect(result).toEqual(updatedExercise);
      expect(mockRepo.updateExercise).toHaveBeenCalledWith("ex-123", expect.any(Object));
    });

    it("should throw 404 if exercise not found", async () => {
      mockRepo.getExerciseRaw.mockResolvedValue(undefined);

      await expect(
        exerciseService.updateOne("ex-123", "user-123", updateDto, false),
      ).rejects.toThrow("EXERCISE_NOT_FOUND");
    });

    it("should throw 403 if non-admin tries to update global exercise", async () => {
      const globalExercise = {
        id: "ex-123",
        name: "Global Exercise",
        owner_id: null,
      } as Exercise;

      mockRepo.getExerciseRaw.mockResolvedValue(globalExercise);

      await expect(
        exerciseService.updateOne("ex-123", "user-123", updateDto, false),
      ).rejects.toThrow("EXERCISE_FORBIDDEN");
    });

    it("should throw 403 if non-admin tries to update other user exercise", async () => {
      const otherUserExercise = {
        id: "ex-123",
        name: "Other User Exercise",
        owner_id: "other-user",
      } as Exercise;

      mockRepo.getExerciseRaw.mockResolvedValue(otherUserExercise);

      await expect(
        exerciseService.updateOne("ex-123", "user-123", updateDto, false),
      ).rejects.toThrow("EXERCISE_FORBIDDEN");
    });

    it("should allow admin to update any exercise", async () => {
      const globalExercise = {
        id: "ex-123",
        name: "Global Exercise",
        owner_id: null,
      } as Exercise;

      mockRepo.getExerciseRaw.mockResolvedValue(globalExercise);
      mockRepo.updateExercise.mockResolvedValue(1);

      const updatedExercise = {
        ...globalExercise,
        name: "Updated Name",
      };

      mockRepo.getExerciseRaw.mockResolvedValue(updatedExercise);

      const result = await exerciseService.updateOne("ex-123", "admin-123", updateDto, true);

      expect(result).toEqual(updatedExercise);
    });

    it("should validate type code if provided", async () => {
      mockRepo.getExerciseRaw.mockResolvedValue({
        id: "ex-123",
        owner_id: "user-123",
      } as Exercise);

      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as never);

      await expect(
        exerciseService.updateOne("ex-123", "user-123", { type_code: "invalid" }, false),
      ).rejects.toThrow("EXERCISE_INVALID_TYPE");
    });

    it("should validate name uniqueness if provided", async () => {
      mockRepo.getExerciseRaw.mockResolvedValue({
        id: "ex-123",
        owner_id: "user-123",
      } as Exercise);

      mockDb.mockReturnValue({
        whereRaw: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        andWhereNot: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ id: "other-ex" }),
      } as never);

      await expect(
        exerciseService.updateOne("ex-123", "user-123", { name: "Duplicate" }, false),
      ).rejects.toThrow("EXERCISE_DUPLICATE");
    });

    it("should throw 404 if update affects 0 rows", async () => {
      mockRepo.getExerciseRaw.mockResolvedValue({
        id: "ex-123",
        owner_id: "user-123",
      } as Exercise);

      // Mock ensureNameUnique for name validation
      mockDb.mockReturnValueOnce({
        whereRaw: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        andWhereNot: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as never);

      mockRepo.updateExercise.mockResolvedValue(0);

      await expect(
        exerciseService.updateOne("ex-123", "user-123", updateDto, false),
      ).rejects.toThrow("EXERCISE_NOT_FOUND");
    });

    it("should throw 500 if refreshed exercise not found (non-admin)", async () => {
      mockRepo.getExerciseRaw.mockResolvedValue({
        id: "ex-123",
        owner_id: "user-123",
      } as Exercise);

      // Mock ensureNameUnique for name validation
      mockDb.mockReturnValueOnce({
        whereRaw: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        andWhereNot: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as never);

      mockRepo.updateExercise.mockResolvedValue(1);
      mockRepo.getExercise.mockResolvedValue(undefined);

      await expect(
        exerciseService.updateOne("ex-123", "user-123", updateDto, false),
      ).rejects.toThrow("EXERCISE_REFRESH_FAILED");
    });

    it("should throw 500 if refreshed exercise not found (admin)", async () => {
      mockRepo.getExerciseRaw.mockResolvedValueOnce({
        id: "ex-123",
        owner_id: null,
      } as Exercise);

      // Mock ensureNameUnique for name validation
      mockDb.mockReturnValueOnce({
        whereRaw: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        andWhereNot: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as never);

      mockRepo.updateExercise.mockResolvedValue(1);
      mockRepo.getExerciseRaw.mockResolvedValueOnce(undefined);

      await expect(
        exerciseService.updateOne("ex-123", "admin-123", updateDto, true),
      ).rejects.toThrow("EXERCISE_REFRESH_FAILED");
    });
  });

  describe("archiveOne", () => {
    it("should archive exercise owned by user", async () => {
      const existingExercise = {
        id: "ex-123",
        name: "Exercise",
        owner_id: "user-123",
      } as Exercise;

      mockRepo.getExerciseRaw.mockResolvedValue(existingExercise);
      mockRepo.archiveExercise.mockResolvedValue(1);

      await exerciseService.archiveOne("ex-123", "user-123", false);

      expect(mockRepo.archiveExercise).toHaveBeenCalledWith("ex-123");
      expect(mockRepo.getExerciseRaw).toHaveBeenCalledWith("ex-123");
    });

    it("should throw 404 if exercise not found", async () => {
      mockRepo.getExerciseRaw.mockResolvedValue(undefined);

      await expect(exerciseService.archiveOne("ex-123", "user-123", false)).rejects.toThrow(
        "EXERCISE_NOT_FOUND",
      );
    });

    it("should throw 403 if non-admin tries to archive global exercise", async () => {
      const globalExercise = {
        id: "ex-123",
        owner_id: null,
      } as Exercise;

      mockRepo.getExerciseRaw.mockResolvedValue(globalExercise);

      await expect(exerciseService.archiveOne("ex-123", "user-123", false)).rejects.toThrow(
        HttpError,
      );
    });

    it("should throw 403 if non-admin tries to archive other user exercise", async () => {
      const otherUserExercise = {
        id: "ex-123",
        owner_id: "other-user",
      } as Exercise;

      mockRepo.getExerciseRaw.mockResolvedValue(otherUserExercise);

      await expect(exerciseService.archiveOne("ex-123", "user-123", false)).rejects.toThrow(
        HttpError,
      );
    });

    it("should allow admin to archive any exercise", async () => {
      const globalExercise = {
        id: "ex-123",
        owner_id: null,
      } as Exercise;

      mockRepo.getExerciseRaw.mockResolvedValue(globalExercise);
      mockRepo.archiveExercise.mockResolvedValue(1);

      await exerciseService.archiveOne("ex-123", "admin-123", true);

      expect(mockRepo.archiveExercise).toHaveBeenCalledWith("ex-123");
    });

    it("should throw 404 if archive affects 0 rows", async () => {
      mockRepo.getExerciseRaw.mockResolvedValue({
        id: "ex-123",
        owner_id: "user-123",
      } as Exercise);

      mockRepo.archiveExercise.mockResolvedValue(0);

      await expect(exerciseService.archiveOne("ex-123", "user-123", false)).rejects.toThrow(
        "EXERCISE_NOT_FOUND",
      );
    });
  });
});
