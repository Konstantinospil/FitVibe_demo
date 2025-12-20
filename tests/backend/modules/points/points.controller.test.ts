import type { Request, Response } from "express";
import * as pointsController from "../../../../apps/backend/src/modules/points/points.controller.js";
import * as pointsService from "../../../../apps/backend/src/modules/points/points.service.js";
import * as pointsRepository from "../../../../apps/backend/src/modules/points/points.repository.js";

// Mock dependencies
jest.mock("../../../../apps/backend/src/modules/points/points.service.js");
jest.mock("../../../../apps/backend/src/modules/points/points.repository.js");

const mockPointsService = jest.mocked(pointsService);
const mockPointsRepository = jest.mocked(pointsRepository);

describe("Points Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  const userId = "user-123";

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
      locals: { requestId: "req-123" },
    };
  });

  describe("getPointsSummaryHandler", () => {
    it("should get points summary successfully", async () => {
      const mockSummary = {
        total_points: 1000,
        current_streak: 5,
        longest_streak: 10,
      };

      mockPointsService.getPointsSummary.mockResolvedValue(mockSummary);

      await pointsController.getPointsSummaryHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.json).toHaveBeenCalledWith(mockSummary);
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;

      await pointsController.getPointsSummaryHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe("getPointsHistoryHandler", () => {
    it("should get points history successfully", async () => {
      const mockHistory = {
        items: [],
        nextCursor: null,
      };

      mockPointsService.getPointsHistory.mockResolvedValue(mockHistory);

      await pointsController.getPointsHistoryHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.json).toHaveBeenCalledWith(mockHistory);
    });
  });

  describe("getBadgeCatalogHandler", () => {
    it("should get badge catalog successfully", async () => {
      const mockCatalog = new Map([
        ["badge1", { code: "badge1", name: "Badge 1", description: "Description" }],
      ]);

      mockPointsRepository.getBadgeCatalog.mockResolvedValue(mockCatalog);

      await pointsController.getBadgeCatalogHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        badges: Array.from(mockCatalog.values()),
      });
    });
  });
});
