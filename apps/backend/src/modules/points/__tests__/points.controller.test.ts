import type { Request, Response } from "express";
import * as pointsController from "../points.controller.js";
import * as pointsRepository from "../points.repository.js";

// Mock dependencies
jest.mock("../points.repository.js");

const mockPointsRepository = jest.mocked(pointsRepository);

describe("Points Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      user: undefined,
      params: {},
      query: {},
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe("getBadgeCatalogHandler", () => {
    it("should return badge catalog as array", async () => {
      const mockCatalog = new Map([
        [
          "first_session",
          {
            code: "first_session",
            name: "First Session",
            description: "Complete your first session",
            category: "milestone",
            icon: "trophy",
            priority: 10,
            criteria: { sessions: 1 },
          },
        ],
        [
          "streak_7",
          {
            code: "streak_7",
            name: "7 Day Streak",
            description: "Complete sessions for 7 consecutive days",
            category: "streak",
            icon: "fire",
            priority: 20,
            criteria: { streak: 7 },
          },
        ],
      ]);

      mockPointsRepository.getBadgeCatalog.mockResolvedValue(mockCatalog);

      await pointsController.getBadgeCatalogHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockPointsRepository.getBadgeCatalog).toHaveBeenCalledTimes(1);
      expect(mockResponse.json).toHaveBeenCalledWith({
        badges: [
          {
            code: "first_session",
            name: "First Session",
            description: "Complete your first session",
            category: "milestone",
            icon: "trophy",
            priority: 10,
            criteria: { sessions: 1 },
          },
          {
            code: "streak_7",
            name: "7 Day Streak",
            description: "Complete sessions for 7 consecutive days",
            category: "streak",
            icon: "fire",
            priority: 20,
            criteria: { streak: 7 },
          },
        ],
      });
    });

    it("should return empty array if no badges", async () => {
      mockPointsRepository.getBadgeCatalog.mockResolvedValue(new Map());

      await pointsController.getBadgeCatalogHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockPointsRepository.getBadgeCatalog).toHaveBeenCalledTimes(1);
      expect(mockResponse.json).toHaveBeenCalledWith({ badges: [] });
    });

    it("should handle repository errors", async () => {
      mockPointsRepository.getBadgeCatalog.mockRejectedValue(new Error("Database error"));

      await expect(
        pointsController.getBadgeCatalogHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Database error");

      expect(mockPointsRepository.getBadgeCatalog).toHaveBeenCalledTimes(1);
    });
  });
});
