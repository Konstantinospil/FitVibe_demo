import type { Request, Response } from "express";
import type { JwtPayload } from "../../../../apps/backend/src/auth/auth.types.js";
import {
  listPlansHandler,
  getPlanStatsHandler,
  getPlanHandler,
  createPlanHandler,
  updatePlanHandler,
  archivePlanHandler,
  deletePlanHandler,
} from "../../../../apps/backend/src/modules/plans/plans.controller.js";
import * as service from "../../../../apps/backend/src/modules/plans/plans.service.js";

// Mock the service
jest.mock("../../../../apps/backend/src/modules/plans/plans.service.js");

describe("plans.controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let sendMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    sendMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock, send: sendMock });

    mockRequest = {
      user: { sub: "user-123", role: "user", sid: "session-123" },
      params: {},
      query: {},
      body: {},
    };

    mockResponse = {
      json: jsonMock,
      status: statusMock,
      send: sendMock,
    };

    jest.clearAllMocks();
  });

  describe("listPlansHandler", () => {
    it("should list all plans for authenticated user without query params", async () => {
      const mockPlans = [
        { id: "plan-1", name: "Training Plan A" },
        { id: "plan-2", name: "Training Plan B" },
      ];
      (service.listUserPlans as jest.Mock).mockResolvedValue(mockPlans);

      await listPlansHandler(mockRequest as Request, mockResponse as Response);

      expect(service.listUserPlans).toHaveBeenCalledWith("user-123", {
        status: undefined,
        includeArchived: false,
        search: undefined,
        limit: undefined,
        offset: undefined,
      });
      expect(jsonMock).toHaveBeenCalledWith({ plans: mockPlans });
    });

    it("should list plans with status filter", async () => {
      mockRequest.query = { status: "active" };
      const mockPlans = [{ id: "plan-1", name: "Active Plan" }];
      (service.listUserPlans as jest.Mock).mockResolvedValue(mockPlans);

      await listPlansHandler(mockRequest as Request, mockResponse as Response);

      expect(service.listUserPlans).toHaveBeenCalledWith("user-123", {
        status: "active",
        includeArchived: false,
        search: undefined,
        limit: undefined,
        offset: undefined,
      });
      expect(jsonMock).toHaveBeenCalledWith({ plans: mockPlans });
    });

    it("should list plans with includeArchived flag", async () => {
      mockRequest.query = { includeArchived: "true" };
      const mockPlans = [{ id: "plan-1", name: "Plan" }];
      (service.listUserPlans as jest.Mock).mockResolvedValue(mockPlans);

      await listPlansHandler(mockRequest as Request, mockResponse as Response);

      expect(service.listUserPlans).toHaveBeenCalledWith("user-123", {
        status: undefined,
        includeArchived: true,
        search: undefined,
        limit: undefined,
        offset: undefined,
      });
    });

    it("should list plans with search term", async () => {
      mockRequest.query = { search: "strength" };
      const mockPlans = [{ id: "plan-1", name: "Strength Training" }];
      (service.listUserPlans as jest.Mock).mockResolvedValue(mockPlans);

      await listPlansHandler(mockRequest as Request, mockResponse as Response);

      expect(service.listUserPlans).toHaveBeenCalledWith("user-123", {
        status: undefined,
        includeArchived: false,
        search: "strength",
        limit: undefined,
        offset: undefined,
      });
    });

    it("should list plans with limit and offset for pagination", async () => {
      mockRequest.query = { limit: "10", offset: "20" };
      const mockPlans = [{ id: "plan-1", name: "Plan" }];
      (service.listUserPlans as jest.Mock).mockResolvedValue(mockPlans);

      await listPlansHandler(mockRequest as Request, mockResponse as Response);

      expect(service.listUserPlans).toHaveBeenCalledWith("user-123", {
        status: undefined,
        includeArchived: false,
        search: undefined,
        limit: 10,
        offset: 20,
      });
    });

    it("should list plans with all query parameters combined", async () => {
      mockRequest.query = {
        status: "completed",
        includeArchived: "true",
        search: "cardio",
        limit: "5",
        offset: "10",
      };
      const mockPlans = [{ id: "plan-1", name: "Cardio Plan" }];
      (service.listUserPlans as jest.Mock).mockResolvedValue(mockPlans);

      await listPlansHandler(mockRequest as Request, mockResponse as Response);

      expect(service.listUserPlans).toHaveBeenCalledWith("user-123", {
        status: "completed",
        includeArchived: true,
        search: "cardio",
        limit: 5,
        offset: 10,
      });
    });

    it("should handle empty plans list", async () => {
      (service.listUserPlans as jest.Mock).mockResolvedValue([]);

      await listPlansHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ plans: [] });
    });

    it("should throw when user is not authenticated", async () => {
      mockRequest.user = undefined;

      await expect(
        listPlansHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Authentication required");
    });

    it("should throw when user sub is missing", async () => {
      mockRequest.user = {} as unknown as JwtPayload;

      await expect(
        listPlansHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Authentication required");
    });

    it("should throw when user sub is not a string", async () => {
      mockRequest.user = {
        sub: 123, // Number instead of string
        role: "user",
        sid: "session-123",
      } as unknown as JwtPayload;

      await expect(
        listPlansHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Authentication required");
    });
  });

  describe("getPlanStatsHandler", () => {
    it("should return plan statistics for authenticated user", async () => {
      const mockStats = {
        totalPlans: 15,
        activePlans: 5,
        completedPlans: 10,
        archivedPlans: 2,
      };
      (service.getUserPlanStats as jest.Mock).mockResolvedValue(mockStats);

      await getPlanStatsHandler(mockRequest as Request, mockResponse as Response);

      expect(service.getUserPlanStats).toHaveBeenCalledWith("user-123");
      expect(jsonMock).toHaveBeenCalledWith(mockStats);
    });

    it("should handle zero stats", async () => {
      const mockStats = {
        totalPlans: 0,
        activePlans: 0,
        completedPlans: 0,
        archivedPlans: 0,
      };
      (service.getUserPlanStats as jest.Mock).mockResolvedValue(mockStats);

      await getPlanStatsHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(mockStats);
    });

    it("should throw when user is not authenticated", async () => {
      mockRequest.user = undefined;

      await expect(
        getPlanStatsHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Authentication required");
    });
  });

  describe("getPlanHandler", () => {
    it("should return a specific plan by ID", async () => {
      const mockPlan = {
        id: "plan-123",
        name: "My Training Plan",
        status: "active",
      };
      mockRequest.params = { id: "plan-123" };
      (service.getPlanById as jest.Mock).mockResolvedValue(mockPlan);

      await getPlanHandler(mockRequest as Request, mockResponse as Response);

      expect(service.getPlanById).toHaveBeenCalledWith("user-123", "plan-123");
      expect(jsonMock).toHaveBeenCalledWith(mockPlan);
    });

    it("should handle different plan IDs", async () => {
      const mockPlan = { id: "plan-456", name: "Another Plan" };
      mockRequest.params = { id: "plan-456" };
      (service.getPlanById as jest.Mock).mockResolvedValue(mockPlan);

      await getPlanHandler(mockRequest as Request, mockResponse as Response);

      expect(service.getPlanById).toHaveBeenCalledWith("user-123", "plan-456");
    });

    it("should throw when plan ID is missing", async () => {
      mockRequest.params = {};

      await expect(
        getPlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Plan ID is required");
    });

    it("should throw when plan ID is empty string", async () => {
      mockRequest.params = { id: "" };

      await expect(
        getPlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Plan ID is required");
    });

    it("should throw when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: "plan-123" };

      await expect(
        getPlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Authentication required");
    });
  });

  describe("createPlanHandler", () => {
    it("should create a new plan with valid data", async () => {
      const newPlan = {
        name: "My New Training Plan",
        start_date: "2024-01-01",
        end_date: "2024-12-31",
      };
      const createdPlan = { ...newPlan, id: "plan-789", status: "active" };
      mockRequest.body = newPlan;
      (service.createUserPlan as jest.Mock).mockResolvedValue(createdPlan);

      await createPlanHandler(mockRequest as Request, mockResponse as Response);

      expect(service.createUserPlan).toHaveBeenCalledWith("user-123", newPlan);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(createdPlan);
    });

    it("should create a plan with only required name field", async () => {
      const newPlan = { name: "Minimal Plan" };
      const createdPlan = { ...newPlan, id: "plan-999" };
      mockRequest.body = newPlan;
      (service.createUserPlan as jest.Mock).mockResolvedValue(createdPlan);

      await createPlanHandler(mockRequest as Request, mockResponse as Response);

      expect(service.createUserPlan).toHaveBeenCalledWith("user-123", newPlan);
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it("should create a plan with null dates", async () => {
      const newPlan = { name: "Plan", start_date: null, end_date: null };
      const createdPlan = { ...newPlan, id: "plan-888" };
      mockRequest.body = newPlan;
      (service.createUserPlan as jest.Mock).mockResolvedValue(createdPlan);

      await createPlanHandler(mockRequest as Request, mockResponse as Response);

      expect(service.createUserPlan).toHaveBeenCalledWith("user-123", newPlan);
    });

    it("should trim whitespace from name", async () => {
      const newPlan = { name: "  Trimmed Plan  " };
      const createdPlan = { name: "Trimmed Plan", id: "plan-777" };
      mockRequest.body = newPlan;
      (service.createUserPlan as jest.Mock).mockResolvedValue(createdPlan);

      await createPlanHandler(mockRequest as Request, mockResponse as Response);

      expect(service.createUserPlan).toHaveBeenCalledWith("user-123", {
        name: "Trimmed Plan",
      });
    });

    it("should throw when name is missing", async () => {
      mockRequest.body = { start_date: "2024-01-01" };

      await expect(
        createPlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Invalid plan data");
    });

    it("should throw when name is empty after trim", async () => {
      mockRequest.body = { name: "   " };

      await expect(
        createPlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Invalid plan data");
    });

    it("should throw when name exceeds maximum length", async () => {
      mockRequest.body = { name: "a".repeat(201) };

      await expect(
        createPlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Invalid plan data");
    });

    it("should accept name at maximum length", async () => {
      const newPlan = { name: "a".repeat(200) };
      const createdPlan = { ...newPlan, id: "plan-666" };
      mockRequest.body = newPlan;
      (service.createUserPlan as jest.Mock).mockResolvedValue(createdPlan);

      await createPlanHandler(mockRequest as Request, mockResponse as Response);

      expect(service.createUserPlan).toHaveBeenCalledWith("user-123", newPlan);
    });

    it("should throw when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.body = { name: "Plan" };

      await expect(
        createPlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Authentication required");
    });
  });

  describe("updatePlanHandler", () => {
    it("should update plan name", async () => {
      const updatedPlan = {
        id: "plan-123",
        name: "Updated Plan Name",
        status: "active",
      };
      mockRequest.params = { id: "plan-123" };
      mockRequest.body = { name: "Updated Plan Name" };
      (service.updateUserPlan as jest.Mock).mockResolvedValue(updatedPlan);

      await updatePlanHandler(mockRequest as Request, mockResponse as Response);

      expect(service.updateUserPlan).toHaveBeenCalledWith("user-123", "plan-123", {
        name: "Updated Plan Name",
      });
      expect(jsonMock).toHaveBeenCalledWith(updatedPlan);
    });

    it("should update plan status", async () => {
      const updatedPlan = { id: "plan-123", name: "Plan", status: "completed" };
      mockRequest.params = { id: "plan-123" };
      mockRequest.body = { status: "completed" };
      (service.updateUserPlan as jest.Mock).mockResolvedValue(updatedPlan);

      await updatePlanHandler(mockRequest as Request, mockResponse as Response);

      expect(service.updateUserPlan).toHaveBeenCalledWith("user-123", "plan-123", {
        status: "completed",
      });
    });

    it("should update plan dates", async () => {
      const updatedPlan = {
        id: "plan-123",
        name: "Plan",
        start_date: "2024-02-01",
        end_date: "2024-11-30",
      };
      mockRequest.params = { id: "plan-123" };
      mockRequest.body = { start_date: "2024-02-01", end_date: "2024-11-30" };
      (service.updateUserPlan as jest.Mock).mockResolvedValue(updatedPlan);

      await updatePlanHandler(mockRequest as Request, mockResponse as Response);

      expect(service.updateUserPlan).toHaveBeenCalledWith("user-123", "plan-123", {
        start_date: "2024-02-01",
        end_date: "2024-11-30",
      });
    });

    it("should update multiple fields at once", async () => {
      const updatedPlan = {
        id: "plan-123",
        name: "New Name",
        status: "archived",
        start_date: "2024-01-01",
      };
      mockRequest.params = { id: "plan-123" };
      mockRequest.body = {
        name: "New Name",
        status: "archived",
        start_date: "2024-01-01",
      };
      (service.updateUserPlan as jest.Mock).mockResolvedValue(updatedPlan);

      await updatePlanHandler(mockRequest as Request, mockResponse as Response);

      expect(service.updateUserPlan).toHaveBeenCalledWith("user-123", "plan-123", {
        name: "New Name",
        status: "archived",
        start_date: "2024-01-01",
      });
    });

    it("should accept empty update body", async () => {
      const updatedPlan = { id: "plan-123", name: "Plan" };
      mockRequest.params = { id: "plan-123" };
      mockRequest.body = {};
      (service.updateUserPlan as jest.Mock).mockResolvedValue(updatedPlan);

      await updatePlanHandler(mockRequest as Request, mockResponse as Response);

      expect(service.updateUserPlan).toHaveBeenCalledWith("user-123", "plan-123", {});
    });

    it("should accept null dates", async () => {
      const updatedPlan = { id: "plan-123", name: "Plan", start_date: null };
      mockRequest.params = { id: "plan-123" };
      mockRequest.body = { start_date: null };
      (service.updateUserPlan as jest.Mock).mockResolvedValue(updatedPlan);

      await updatePlanHandler(mockRequest as Request, mockResponse as Response);

      expect(service.updateUserPlan).toHaveBeenCalledWith("user-123", "plan-123", {
        start_date: null,
      });
    });

    it("should throw when plan ID is missing", async () => {
      mockRequest.params = {};
      mockRequest.body = { name: "Updated" };

      await expect(
        updatePlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Plan ID is required");
    });

    it("should throw when name is too short", async () => {
      mockRequest.params = { id: "plan-123" };
      mockRequest.body = { name: "" };

      await expect(
        updatePlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Invalid update data");
    });

    it("should throw when name is too long", async () => {
      mockRequest.params = { id: "plan-123" };
      mockRequest.body = { name: "a".repeat(201) };

      await expect(
        updatePlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Invalid update data");
    });

    it("should throw when status is invalid", async () => {
      mockRequest.params = { id: "plan-123" };
      mockRequest.body = { status: "invalid_status" };

      await expect(
        updatePlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Invalid update data");
    });

    it("should accept valid status values", async () => {
      const statuses = ["active", "completed", "archived"];
      for (const status of statuses) {
        const updatedPlan = { id: "plan-123", name: "Plan", status };
        mockRequest.params = { id: "plan-123" };
        mockRequest.body = { status };
        (service.updateUserPlan as jest.Mock).mockResolvedValue(updatedPlan);

        await updatePlanHandler(mockRequest as Request, mockResponse as Response);

        expect(service.updateUserPlan).toHaveBeenCalledWith("user-123", "plan-123", {
          status,
        });
      }
    });

    it("should throw when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: "plan-123" };
      mockRequest.body = { name: "Updated" };

      await expect(
        updatePlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Authentication required");
    });
  });

  describe("archivePlanHandler", () => {
    it("should archive a plan by ID", async () => {
      mockRequest.params = { id: "plan-123" };
      (service.archiveUserPlan as jest.Mock).mockResolvedValue(undefined);

      await archivePlanHandler(mockRequest as Request, mockResponse as Response);

      expect(service.archiveUserPlan).toHaveBeenCalledWith("user-123", "plan-123");
      expect(statusMock).toHaveBeenCalledWith(204);
      expect(sendMock).toHaveBeenCalled();
    });

    it("should handle archiving different plan IDs", async () => {
      mockRequest.params = { id: "plan-456" };
      (service.archiveUserPlan as jest.Mock).mockResolvedValue(undefined);

      await archivePlanHandler(mockRequest as Request, mockResponse as Response);

      expect(service.archiveUserPlan).toHaveBeenCalledWith("user-123", "plan-456");
    });

    it("should throw when plan ID is missing", async () => {
      mockRequest.params = {};

      await expect(
        archivePlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Plan ID is required");
    });

    it("should throw when plan ID is empty string", async () => {
      mockRequest.params = { id: "" };

      await expect(
        archivePlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Plan ID is required");
    });

    it("should throw when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: "plan-123" };

      await expect(
        archivePlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Authentication required");
    });
  });

  describe("deletePlanHandler", () => {
    it("should delete a plan by ID", async () => {
      mockRequest.params = { id: "plan-123" };
      (service.deleteUserPlan as jest.Mock).mockResolvedValue(undefined);

      await deletePlanHandler(mockRequest as Request, mockResponse as Response);

      expect(service.deleteUserPlan).toHaveBeenCalledWith("user-123", "plan-123");
      expect(statusMock).toHaveBeenCalledWith(204);
      expect(sendMock).toHaveBeenCalled();
    });

    it("should handle deleting different plan IDs", async () => {
      mockRequest.params = { id: "plan-789" };
      (service.deleteUserPlan as jest.Mock).mockResolvedValue(undefined);

      await deletePlanHandler(mockRequest as Request, mockResponse as Response);

      expect(service.deleteUserPlan).toHaveBeenCalledWith("user-123", "plan-789");
    });

    it("should throw when plan ID is missing", async () => {
      mockRequest.params = {};

      await expect(
        deletePlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Plan ID is required");
    });

    it("should throw when plan ID is empty string", async () => {
      mockRequest.params = { id: "" };

      await expect(
        deletePlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Plan ID is required");
    });

    it("should throw when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: "plan-123" };

      await expect(
        deletePlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Authentication required");
    });
  });
});
