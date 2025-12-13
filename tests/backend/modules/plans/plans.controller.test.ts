import type { Request, Response } from "express";
import * as plansController from "../../../../apps/backend/src/modules/plans/plans.controller.js";
import * as plansService from "../../../../apps/backend/src/modules/plans/plans.service.js";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";

// Mock dependencies
jest.mock("../../../../apps/backend/src/modules/plans/plans.service.js");

const mockPlansService = jest.mocked(plansService);

describe("Plans Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  const userId = "user-123";
  const planId = "plan-123";

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      user: { sub: userId, role: "athlete" },
      body: {},
      query: {},
      params: {},
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("listPlansHandler", () => {
    it("should list plans successfully", async () => {
      const mockPlans = [];

      mockPlansService.listUserPlans.mockResolvedValue(mockPlans);

      await plansController.listPlansHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({ plans: mockPlans });
    });
  });

  describe("getPlanHandler", () => {
    it("should get plan successfully", async () => {
      const mockPlan = {
        id: planId,
        user_id: userId,
        name: "Test Plan",
        status: "active",
      };

      mockRequest.params = { id: planId };
      mockPlansService.getPlanById.mockResolvedValue(mockPlan as never);

      await plansController.getPlanHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockPlan);
    });

    it("should throw 400 when plan ID is missing", async () => {
      mockRequest.params = {};

      await expect(
        plansController.getPlanHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("createPlanHandler", () => {
    it("should create plan successfully", async () => {
      const planData = {
        name: "Test Plan",
      };

      const mockPlan = {
        id: planId,
        user_id: userId,
        ...planData,
        status: "active",
      };

      mockRequest.body = planData;
      mockPlansService.createUserPlan.mockResolvedValue(mockPlan as never);

      await plansController.createPlanHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockPlan);
    });
  });
});
