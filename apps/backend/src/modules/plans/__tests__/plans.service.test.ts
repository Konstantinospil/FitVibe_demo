import { v4 as uuidv4 } from "uuid";
import * as plansService from "../plans.service.js";
import * as plansRepository from "../plans.repository.js";
import type { PlanRow } from "../plans.repository.js";
import { db } from "../../../db/connection.js";
import { HttpError } from "../../../utils/http.js";

jest.mock("uuid", () => ({
  v4: jest.fn(() => "00000000-0000-0000-0000-000000000001"),
}));

jest.mock("../plans.repository.js", () => ({
  findPlanById: jest.fn(),
  listPlans: jest.fn(),
  createPlan: jest.fn(),
  updatePlan: jest.fn(),
  archivePlan: jest.fn(),
  deletePlan: jest.fn(),
  updatePlanProgress: jest.fn(),
  countUserPlans: jest.fn(),
}));

jest.mock("../../../db/connection.js", () => ({
  db: jest.fn(),
}));

const mockedFindPlanById = plansRepository.findPlanById as jest.MockedFunction<
  typeof plansRepository.findPlanById
>;
const mockedListPlans = plansRepository.listPlans as jest.MockedFunction<
  typeof plansRepository.listPlans
>;
const mockedCreatePlan = plansRepository.createPlan as jest.MockedFunction<
  typeof plansRepository.createPlan
>;
const mockedUpdatePlan = plansRepository.updatePlan as jest.MockedFunction<
  typeof plansRepository.updatePlan
>;
const mockedArchivePlan = plansRepository.archivePlan as jest.MockedFunction<
  typeof plansRepository.archivePlan
>;
const mockedDeletePlan = plansRepository.deletePlan as jest.MockedFunction<
  typeof plansRepository.deletePlan
>;
const mockedUpdatePlanProgress = plansRepository.updatePlanProgress as jest.MockedFunction<
  typeof plansRepository.updatePlanProgress
>;
const mockedCountUserPlans = plansRepository.countUserPlans as jest.MockedFunction<
  typeof plansRepository.countUserPlans
>;
const mockedDb = db as jest.MockedFunction<typeof db>;
const mockedUuid = uuidv4 as jest.MockedFunction<typeof uuidv4>;

// Helper to create a valid PlanRow mock
const createMockPlan = (overrides?: Partial<PlanRow>): PlanRow => ({
  id: "plan-1",
  user_id: "user-123",
  name: "Test Plan",
  status: "active",
  progress_percent: "0",
  session_count: 0,
  completed_count: 0,
  start_date: null,
  end_date: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  archived_at: null,
  ...overrides,
});

describe("Plans Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUuid.mockReturnValue(
      "00000000-0000-0000-0000-000000000001" as unknown as ReturnType<typeof uuidv4>,
    );
  });

  describe("getPlanById", () => {
    it("should return plan when found and user owns it", async () => {
      const mockPlan = createMockPlan();

      mockedFindPlanById.mockResolvedValue(mockPlan);

      const result = await plansService.getPlanById("user-123", "plan-1");

      expect(result).toEqual(mockPlan);
      expect(mockedFindPlanById).toHaveBeenCalledWith("plan-1");
    });

    it("should throw 404 when plan not found", async () => {
      mockedFindPlanById.mockResolvedValue(undefined);

      await expect(plansService.getPlanById("user-123", "plan-1")).rejects.toThrow(HttpError);
      await expect(plansService.getPlanById("user-123", "plan-1")).rejects.toThrow(
        "Plan not found",
      );
    });

    it("should throw 403 when user does not own plan", async () => {
      const mockPlan = createMockPlan({ user_id: "user-456" }); // Different user

      mockedFindPlanById.mockResolvedValue(mockPlan);

      await expect(plansService.getPlanById("user-123", "plan-1")).rejects.toThrow(HttpError);
      await expect(plansService.getPlanById("user-123", "plan-1")).rejects.toThrow("Access denied");
    });
  });

  describe("listUserPlans", () => {
    it("should list plans for user", async () => {
      const mockPlans = [createMockPlan({ name: "Plan 1" })];

      mockedListPlans.mockResolvedValue(mockPlans);

      const result = await plansService.listUserPlans("user-123");

      expect(result).toEqual(mockPlans);
      expect(mockedListPlans).toHaveBeenCalledWith(
        { userId: "user-123" },
        { limit: undefined, offset: undefined },
      );
    });

    it("should apply filters when provided", async () => {
      const mockPlans: never[] = [];
      mockedListPlans.mockResolvedValue(mockPlans);

      await plansService.listUserPlans("user-123", {
        status: "active",
        includeArchived: false,
        search: "test",
        limit: 10,
        offset: 5,
      });

      expect(mockedListPlans).toHaveBeenCalledWith(
        {
          userId: "user-123",
          status: "active",
          includeArchived: false,
          search: "test",
        },
        { limit: 10, offset: 5 },
      );
    });
  });

  describe("createUserPlan", () => {
    it("should create a new plan", async () => {
      const mockPlan = createMockPlan({
        id: "00000000-0000-0000-0000-000000000001",
        name: "New Plan",
        start_date: "2025-01-01",
        end_date: "2025-12-31",
      });

      mockedCreatePlan.mockResolvedValue(mockPlan);

      const result = await plansService.createUserPlan("user-123", {
        name: "New Plan",
        start_date: "2025-01-01",
        end_date: "2025-12-31",
      });

      expect(result).toEqual(mockPlan);
      expect(mockedCreatePlan).toHaveBeenCalledWith({
        id: "00000000-0000-0000-0000-000000000001",
        user_id: "user-123",
        name: "New Plan",
        start_date: "2025-01-01",
        end_date: "2025-12-31",
      });
    });

    it("should create plan with null dates when not provided", async () => {
      const mockPlan = createMockPlan({
        id: "00000000-0000-0000-0000-000000000001",
        name: "New Plan",
      });

      mockedCreatePlan.mockResolvedValue(mockPlan);

      await plansService.createUserPlan("user-123", {
        name: "New Plan",
      });

      expect(mockedCreatePlan).toHaveBeenCalledWith({
        id: "00000000-0000-0000-0000-000000000001",
        user_id: "user-123",
        name: "New Plan",
        start_date: undefined,
        end_date: undefined,
      });
    });
  });

  describe("updateUserPlan", () => {
    it("should update plan when user owns it", async () => {
      const existingPlan = createMockPlan({ name: "Old Plan" });

      const updatedPlan = {
        ...existingPlan,
        name: "Updated Plan",
      };

      mockedFindPlanById
        .mockResolvedValueOnce(existingPlan) // For ownership check
        .mockResolvedValueOnce(updatedPlan); // For returning updated plan
      mockedUpdatePlan.mockResolvedValue(1);

      const result = await plansService.updateUserPlan("user-123", "plan-1", {
        name: "Updated Plan",
      });

      expect(result).toEqual(updatedPlan);
      expect(mockedUpdatePlan).toHaveBeenCalledWith("plan-1", { name: "Updated Plan" });
    });

    it("should throw 404 when plan not found after update", async () => {
      const existingPlan = createMockPlan({ name: "Old Plan" });

      mockedFindPlanById
        .mockResolvedValueOnce(existingPlan) // For ownership check
        .mockResolvedValueOnce(undefined); // Plan not found after update
      mockedUpdatePlan.mockResolvedValue(0);

      await expect(
        plansService.updateUserPlan("user-123", "plan-1", { name: "Updated Plan" }),
      ).rejects.toThrow(HttpError);
      await expect(
        plansService.updateUserPlan("user-123", "plan-1", { name: "Updated Plan" }),
      ).rejects.toThrow("Plan not found or already archived");
    });

    it("should throw 500 when updated plan cannot be retrieved", async () => {
      const existingPlan = createMockPlan({ name: "Old Plan" });

      mockedFindPlanById
        .mockResolvedValueOnce(existingPlan) // For ownership check
        .mockResolvedValueOnce(undefined); // Plan not found after update
      mockedUpdatePlan.mockResolvedValue(1); // Update succeeded but plan not found

      await expect(
        plansService.updateUserPlan("user-123", "plan-1", { name: "Updated Plan" }),
      ).rejects.toThrow(HttpError);
      await expect(
        plansService.updateUserPlan("user-123", "plan-1", { name: "Updated Plan" }),
      ).rejects.toThrow("Failed to retrieve updated plan");
    });
  });

  describe("archiveUserPlan", () => {
    it("should archive plan when user owns it", async () => {
      const existingPlan = createMockPlan();

      mockedFindPlanById.mockResolvedValue(existingPlan);
      mockedArchivePlan.mockResolvedValue(1);

      await plansService.archiveUserPlan("user-123", "plan-1");

      expect(mockedArchivePlan).toHaveBeenCalledWith("plan-1");
    });

    it("should throw 404 when plan not found or already archived", async () => {
      const existingPlan = createMockPlan();

      mockedFindPlanById.mockResolvedValue(existingPlan);
      mockedArchivePlan.mockResolvedValue(0);

      await expect(plansService.archiveUserPlan("user-123", "plan-1")).rejects.toThrow(HttpError);
      await expect(plansService.archiveUserPlan("user-123", "plan-1")).rejects.toThrow(
        "Plan not found or already archived",
      );
    });
  });

  describe("deleteUserPlan", () => {
    it("should delete plan when user owns it", async () => {
      const existingPlan = createMockPlan();

      mockedFindPlanById.mockResolvedValue(existingPlan);
      mockedDeletePlan.mockResolvedValue(1);

      await plansService.deleteUserPlan("user-123", "plan-1");

      expect(mockedDeletePlan).toHaveBeenCalledWith("plan-1");
    });

    it("should throw 404 when plan not found", async () => {
      const existingPlan = createMockPlan();

      mockedFindPlanById.mockResolvedValue(existingPlan);
      mockedDeletePlan.mockResolvedValue(0);

      await expect(plansService.deleteUserPlan("user-123", "plan-1")).rejects.toThrow(HttpError);
      await expect(plansService.deleteUserPlan("user-123", "plan-1")).rejects.toThrow(
        "Plan not found",
      );
    });
  });

  describe("recomputeProgress", () => {
    let mockQueryBuilder: {
      where: jest.Mock;
      select: jest.Mock;
      first: jest.Mock;
    };

    beforeEach(() => {
      mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        first: jest.fn(),
      };
      mockedDb.mockReturnValue(mockQueryBuilder as never);
    });

    it("should recompute progress for a plan", async () => {
      const existingPlan = createMockPlan();

      mockedFindPlanById.mockResolvedValue(existingPlan);
      mockQueryBuilder.first.mockResolvedValue({
        total: "10",
        completed: "7",
      });
      mockedUpdatePlanProgress.mockResolvedValue(1);

      await plansService.recomputeProgress("user-123", "plan-1");

      expect(mockedDb).toHaveBeenCalledWith("sessions");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ plan_id: "plan-1" });
      expect(mockedUpdatePlanProgress).toHaveBeenCalledWith("plan-1", 10, 7, undefined);
    });

    it("should work with transaction", async () => {
      const mockTrx = {} as never;
      mockQueryBuilder.first.mockResolvedValue({
        total: "5",
        completed: "3",
      });
      mockedUpdatePlanProgress.mockResolvedValue(1);

      await plansService.recomputeProgress("user-123", "plan-1", mockTrx);

      expect(mockedUpdatePlanProgress).toHaveBeenCalledWith("plan-1", 5, 3, mockTrx);
    });

    it("should handle zero sessions", async () => {
      const existingPlan = createMockPlan();

      mockedFindPlanById.mockResolvedValue(existingPlan);
      mockQueryBuilder.first.mockResolvedValue({
        total: "0",
        completed: "0",
      });
      mockedUpdatePlanProgress.mockResolvedValue(1);

      await plansService.recomputeProgress("user-123", "plan-1");

      expect(mockedUpdatePlanProgress).toHaveBeenCalledWith("plan-1", 0, 0, undefined);
    });

    it("should handle null session stats", async () => {
      const existingPlan = createMockPlan();

      mockedFindPlanById.mockResolvedValue(existingPlan);
      mockQueryBuilder.first.mockResolvedValue(null);
      mockedUpdatePlanProgress.mockResolvedValue(1);

      await plansService.recomputeProgress("user-123", "plan-1");

      expect(mockedUpdatePlanProgress).toHaveBeenCalledWith("plan-1", 0, 0, undefined);
    });
  });

  describe("getUserPlanStats", () => {
    it("should return plan statistics for user", async () => {
      mockedCountUserPlans
        .mockResolvedValueOnce(10) // total (includeArchived: true)
        .mockResolvedValueOnce(5) // active
        .mockResolvedValueOnce(3) // completed
        .mockResolvedValueOnce(10) // total for archived calculation
        .mockResolvedValueOnce(8); // non-archived

      const result = await plansService.getUserPlanStats("user-123");

      expect(result).toEqual({
        total: 10,
        active: 5,
        completed: 3,
        archived: 2, // 10 - 8
      });
    });

    it("should handle archived calculation error gracefully", async () => {
      mockedCountUserPlans
        .mockResolvedValueOnce(10) // total (includeArchived: true)
        .mockResolvedValueOnce(5) // active
        .mockResolvedValueOnce(3) // completed
        .mockResolvedValueOnce(10) // total for archived calculation
        .mockRejectedValueOnce(new Error("Database error")); // non-archived fails

      const result = await plansService.getUserPlanStats("user-123");

      expect(result).toEqual({
        total: 10,
        active: 5,
        completed: 3,
        archived: 0, // Falls back to 0 on error
      });
    });
  });
});
