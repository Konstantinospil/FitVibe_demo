import { db } from "../../../db/connection.js";
import * as plansRepository from "../plans.repository.js";

// Mock the database connection
jest.mock("../../../db/connection.js", () => ({
  db: jest.fn(),
}));

const mockDb = jest.mocked(db);

describe("Plans Repository", () => {
  let mockQueryBuilder: {
    select: jest.Mock;
    where: jest.Mock;
    whereIn: jest.Mock;
    whereNull: jest.Mock;
    whereRaw: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    limit: jest.Mock;
    offset: jest.Mock;
    first: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    del: jest.Mock;
    returning: jest.Mock;
    count: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock query builder with chainable methods
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      whereRaw: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      returning: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockReturnThis(),
    };

    // Make the query builder callable (for transaction usage)
    const callableMockQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
    Object.assign(callableMockQueryBuilder, mockQueryBuilder);

    // Default: db() returns the mock query builder
    mockDb.mockReturnValue(mockQueryBuilder as never);
  });

  describe("findPlanById", () => {
    it("should find a plan by ID", async () => {
      const mockPlan = {
        id: "plan-123",
        user_id: "user-123",
        name: "Summer Training",
        status: "active",
        progress_percent: "45.50",
        session_count: 10,
        completed_count: 5,
        start_date: "2024-06-01",
        end_date: "2024-08-31",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-15T00:00:00Z",
        archived_at: null,
      };

      mockQueryBuilder.first.mockResolvedValue(mockPlan);

      const result = await plansRepository.findPlanById("plan-123");

      expect(result).toEqual(mockPlan);
      expect(mockDb).toHaveBeenCalledWith("plans");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "plan-123" });
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("archived_at");
    });

    it("should return undefined if plan not found", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await plansRepository.findPlanById("non-existent");

      expect(result).toBeUndefined();
    });

    it("should include archived plans when includeArchived is true", async () => {
      const mockPlan = {
        id: "plan-123",
        user_id: "user-123",
        name: "Archived Plan",
        status: "completed",
        progress_percent: "100.00",
        session_count: 10,
        completed_count: 10,
        start_date: "2024-01-01",
        end_date: "2024-03-31",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-04-01T00:00:00Z",
        archived_at: "2024-04-01T00:00:00Z",
      };

      mockQueryBuilder.first.mockResolvedValue(mockPlan);

      const result = await plansRepository.findPlanById("plan-123", { includeArchived: true });

      expect(result).toEqual(mockPlan);
      expect(mockQueryBuilder.whereNull).not.toHaveBeenCalled();
    });

    it("should work with transaction", async () => {
      const mockTrx = jest.fn().mockReturnValue(mockQueryBuilder) as never;
      Object.assign(mockTrx, mockQueryBuilder);
      mockQueryBuilder.first.mockResolvedValue(null);

      await plansRepository.findPlanById("plan-123", { trx: mockTrx });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "plan-123" });
    });
  });

  describe("listPlans", () => {
    it("should list all plans with default options", async () => {
      const mockPlans = [
        {
          id: "plan-1",
          user_id: "user-123",
          name: "Plan 1",
          status: "active",
          progress_percent: "0.00",
          session_count: 0,
          completed_count: 0,
          start_date: null,
          end_date: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          archived_at: null,
        },
      ];

      // Make query builder thenable to support await
      (mockQueryBuilder as unknown as Promise<typeof mockPlans>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockPlans);
          return Promise.resolve(mockPlans);
        }) as never;

      const result = await plansRepository.listPlans();

      expect(result).toEqual(mockPlans);
      expect(mockDb).toHaveBeenCalledWith("plans");
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("archived_at");
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith("created_at", "desc");
    });

    it("should filter by user_id", async () => {
      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      await plansRepository.listPlans({ userId: "user-123" });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: "user-123" });
    });

    it("should filter by status", async () => {
      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      await plansRepository.listPlans({ status: "active" });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ status: "active" });
    });

    it("should include archived plans when requested", async () => {
      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      await plansRepository.listPlans({ includeArchived: true });

      expect(mockQueryBuilder.whereNull).not.toHaveBeenCalled();
    });

    it("should filter by search term", async () => {
      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      await plansRepository.listPlans({ search: "Summer" });

      expect(mockQueryBuilder.whereRaw).toHaveBeenCalledWith("LOWER(name) LIKE ?", ["%summer%"]);
    });

    it("should apply pagination", async () => {
      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      await plansRepository.listPlans({}, { limit: 20, offset: 10 });

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(10);
    });

    it("should combine multiple filters", async () => {
      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      await plansRepository.listPlans(
        { userId: "user-123", status: "active", search: "training" },
        { limit: 10, offset: 0 },
      );

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: "user-123" });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ status: "active" });
      expect(mockQueryBuilder.whereRaw).toHaveBeenCalledWith("LOWER(name) LIKE ?", ["%training%"]);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(0);
    });
  });

  describe("createPlan", () => {
    it("should create a new plan with minimal data", async () => {
      const mockPlan = {
        id: "plan-123",
        user_id: "user-123",
        name: "New Plan",
        status: "active",
        progress_percent: 0,
        session_count: 0,
        completed_count: 0,
        start_date: null,
        end_date: null,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        archived_at: null,
      };

      mockQueryBuilder.returning.mockResolvedValue([mockPlan]);

      const result = await plansRepository.createPlan({
        id: "plan-123",
        user_id: "user-123",
        name: "New Plan",
      });

      expect(result).toEqual(mockPlan);
      expect(mockDb).toHaveBeenCalledWith("plans");
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "plan-123",
          user_id: "user-123",
          name: "New Plan",
          status: "active",
          progress_percent: 0,
          session_count: 0,
          completed_count: 0,
        }),
      );
    });

    it("should create a plan with full data", async () => {
      const mockPlan = {
        id: "plan-123",
        user_id: "user-123",
        name: "Summer Training",
        status: "planned",
        progress_percent: 0,
        session_count: 0,
        completed_count: 0,
        start_date: "2024-06-01",
        end_date: "2024-08-31",
        created_at: expect.any(String),
        updated_at: expect.any(String),
        archived_at: null,
      };

      mockQueryBuilder.returning.mockResolvedValue([mockPlan]);

      const result = await plansRepository.createPlan({
        id: "plan-123",
        user_id: "user-123",
        name: "Summer Training",
        status: "planned",
        start_date: "2024-06-01",
        end_date: "2024-08-31",
      });

      expect(result).toEqual(mockPlan);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "planned",
          start_date: "2024-06-01",
          end_date: "2024-08-31",
        }),
      );
    });

    it("should work with transaction", async () => {
      const mockTrx = jest.fn().mockReturnValue(mockQueryBuilder) as never;
      Object.assign(mockTrx, mockQueryBuilder);
      const mockPlan = {
        id: "plan-123",
        user_id: "user-123",
        name: "New Plan",
        status: "active",
        progress_percent: 0,
        session_count: 0,
        completed_count: 0,
        start_date: null,
        end_date: null,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        archived_at: null,
      };

      mockQueryBuilder.returning.mockResolvedValue([mockPlan]);

      const result = await plansRepository.createPlan(
        {
          id: "plan-123",
          user_id: "user-123",
          name: "New Plan",
        },
        mockTrx,
      );

      expect(result).toEqual(mockPlan);
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });
  });

  describe("updatePlan", () => {
    it("should update plan name", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await plansRepository.updatePlan("plan-123", { name: "Updated Name" });

      expect(result).toBe(1);
      expect(mockDb).toHaveBeenCalledWith("plans");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "plan-123" });
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("archived_at");
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated Name",
          updated_at: expect.any(String),
        }),
      );
    });

    it("should update plan status", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await plansRepository.updatePlan("plan-123", { status: "completed" });

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "completed",
        }),
      );
    });

    it("should update progress metrics", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await plansRepository.updatePlan("plan-123", {
        progress_percent: 75.5,
        session_count: 20,
        completed_count: 15,
      });

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          progress_percent: 75.5,
          session_count: 20,
          completed_count: 15,
        }),
      );
    });

    it("should update dates", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await plansRepository.updatePlan("plan-123", {
        start_date: "2024-07-01",
        end_date: "2024-09-30",
      });

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          start_date: "2024-07-01",
          end_date: "2024-09-30",
        }),
      );
    });

    it("should allow setting dates to null", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await plansRepository.updatePlan("plan-123", {
        start_date: null,
        end_date: null,
      });

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          start_date: null,
          end_date: null,
        }),
      );
    });

    it("should update multiple fields at once", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await plansRepository.updatePlan("plan-123", {
        name: "Updated Plan",
        status: "active",
        progress_percent: 50,
        start_date: "2024-06-01",
      });

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated Plan",
          status: "active",
          progress_percent: 50,
          start_date: "2024-06-01",
        }),
      );
    });

    it("should return 0 if plan not found or archived", async () => {
      mockQueryBuilder.update.mockResolvedValue(0);

      const result = await plansRepository.updatePlan("non-existent", { name: "Test" });

      expect(result).toBe(0);
    });

    it("should work with transaction", async () => {
      const mockTrx = jest.fn().mockReturnValue(mockQueryBuilder) as never;
      Object.assign(mockTrx, mockQueryBuilder);
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await plansRepository.updatePlan("plan-123", { name: "Test" }, mockTrx);

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "plan-123" });
    });
  });

  describe("archivePlan", () => {
    it("should archive a plan", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await plansRepository.archivePlan("plan-123");

      expect(result).toBe(1);
      expect(mockDb).toHaveBeenCalledWith("plans");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "plan-123" });
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("archived_at");
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          archived_at: expect.any(String),
          updated_at: expect.any(String),
        }),
      );
    });

    it("should return 0 if plan not found or already archived", async () => {
      mockQueryBuilder.update.mockResolvedValue(0);

      const result = await plansRepository.archivePlan("non-existent");

      expect(result).toBe(0);
    });

    it("should work with transaction", async () => {
      const mockTrx = jest.fn().mockReturnValue(mockQueryBuilder) as never;
      Object.assign(mockTrx, mockQueryBuilder);
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await plansRepository.archivePlan("plan-123", mockTrx);

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "plan-123" });
    });
  });

  describe("deletePlan", () => {
    it("should hard delete a plan", async () => {
      mockQueryBuilder.del.mockResolvedValue(1);

      const result = await plansRepository.deletePlan("plan-123");

      expect(result).toBe(1);
      expect(mockDb).toHaveBeenCalledWith("plans");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "plan-123" });
      expect(mockQueryBuilder.del).toHaveBeenCalled();
    });

    it("should return 0 if plan not found", async () => {
      mockQueryBuilder.del.mockResolvedValue(0);

      const result = await plansRepository.deletePlan("non-existent");

      expect(result).toBe(0);
    });

    it("should work with transaction", async () => {
      const mockTrx = jest.fn().mockReturnValue(mockQueryBuilder) as never;
      Object.assign(mockTrx, mockQueryBuilder);
      mockQueryBuilder.del.mockResolvedValue(1);

      const result = await plansRepository.deletePlan("plan-123", mockTrx);

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "plan-123" });
    });
  });

  describe("countUserPlans", () => {
    it("should count all plans for a user", async () => {
      mockQueryBuilder.first.mockResolvedValue({ count: "5" });

      const result = await plansRepository.countUserPlans("user-123");

      expect(result).toBe(5);
      expect(mockDb).toHaveBeenCalledWith("plans");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: "user-123" });
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("archived_at");
      expect(mockQueryBuilder.count).toHaveBeenCalledWith("* as count");
    });

    it("should return 0 if no plans found", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await plansRepository.countUserPlans("user-123");

      expect(result).toBe(0);
    });

    it("should filter by status", async () => {
      mockQueryBuilder.first.mockResolvedValue({ count: "3" });

      await plansRepository.countUserPlans("user-123", { status: "active" });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: "user-123" });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ status: "active" });
    });

    it("should include archived plans when requested", async () => {
      mockQueryBuilder.first.mockResolvedValue({ count: "8" });

      await plansRepository.countUserPlans("user-123", { includeArchived: true });

      expect(mockQueryBuilder.whereNull).not.toHaveBeenCalled();
    });

    it("should work with transaction", async () => {
      const mockTrx = jest.fn().mockReturnValue(mockQueryBuilder) as never;
      Object.assign(mockTrx, mockQueryBuilder);
      mockQueryBuilder.first.mockResolvedValue({ count: "5" });

      const result = await plansRepository.countUserPlans("user-123", {}, mockTrx);

      expect(result).toBe(5);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: "user-123" });
    });
  });

  describe("updatePlanProgress", () => {
    it("should update plan progress with correct percentage", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await plansRepository.updatePlanProgress("plan-123", 10, 5);

      expect(result).toBe(1);
      expect(mockDb).toHaveBeenCalledWith("plans");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "plan-123" });
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("archived_at");
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          session_count: 10,
          completed_count: 5,
          progress_percent: 50,
          updated_at: expect.any(String),
        }),
      );
    });

    it("should handle 100% completion", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await plansRepository.updatePlanProgress("plan-123", 20, 20);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          session_count: 20,
          completed_count: 20,
          progress_percent: 100,
        }),
      );
    });

    it("should handle 0% progress (no sessions)", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await plansRepository.updatePlanProgress("plan-123", 0, 0);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          session_count: 0,
          completed_count: 0,
          progress_percent: 0,
        }),
      );
    });

    it("should round progress to 2 decimal places", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await plansRepository.updatePlanProgress("plan-123", 3, 1);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          session_count: 3,
          completed_count: 1,
          progress_percent: 33.33,
        }),
      );
    });

    it("should handle partial progress", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await plansRepository.updatePlanProgress("plan-123", 8, 3);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          session_count: 8,
          completed_count: 3,
          progress_percent: 37.5,
        }),
      );
    });

    it("should return 0 if plan not found or archived", async () => {
      mockQueryBuilder.update.mockResolvedValue(0);

      const result = await plansRepository.updatePlanProgress("non-existent", 10, 5);

      expect(result).toBe(0);
    });

    it("should work with transaction", async () => {
      const mockTrx = jest.fn().mockReturnValue(mockQueryBuilder) as never;
      Object.assign(mockTrx, mockQueryBuilder);
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await plansRepository.updatePlanProgress("plan-123", 10, 5, mockTrx);

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "plan-123" });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty search string", async () => {
      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      await plansRepository.listPlans({ search: "" });

      expect(mockQueryBuilder.whereRaw).toHaveBeenCalledWith("LOWER(name) LIKE ?", ["%%"]);
    });

    it("should handle special characters in search", async () => {
      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      await plansRepository.listPlans({ search: "Plan's & Training" });

      expect(mockQueryBuilder.whereRaw).toHaveBeenCalledWith("LOWER(name) LIKE ?", [
        "%plan's & training%",
      ]);
    });

    it("should handle zero pagination offset", async () => {
      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      await plansRepository.listPlans({}, { limit: 10, offset: 0 });

      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(0);
    });

    it("should handle decimal progress_percent from database", async () => {
      const mockPlan = {
        id: "plan-123",
        user_id: "user-123",
        name: "Test Plan",
        status: "active",
        progress_percent: "45.67", // String from database
        session_count: 10,
        completed_count: 5,
        start_date: null,
        end_date: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        archived_at: null,
      };

      mockQueryBuilder.first.mockResolvedValue(mockPlan);

      const result = await plansRepository.findPlanById("plan-123");

      expect(result?.progress_percent).toBe("45.67");
    });

    it("should handle large session counts", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await plansRepository.updatePlanProgress("plan-123", 1000, 750);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          session_count: 1000,
          completed_count: 750,
          progress_percent: 75,
        }),
      );
    });
  });
});
