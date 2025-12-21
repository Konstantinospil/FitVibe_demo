import type { Request, Response } from "express";
import type { JwtPayload } from "../../../../apps/backend/src/modules/auth/auth.types.js";
import * as pointsController from "../../../../apps/backend/src/modules/points/points.controller.js";
import * as pointsRepository from "../../../../apps/backend/src/modules/points/points.repository.js";
import * as pointsService from "../../../../apps/backend/src/modules/points/points.service.js";

// Helper to create complete JwtPayload
function createMockJwtPayload(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    sub: "user-123",
    role: "user",
    sid: "session-123",
    ...overrides,
  };
}

// Mock dependencies
jest.mock("../../../../apps/backend/src/modules/points/points.repository.js");
jest.mock("../../../../apps/backend/src/modules/points/points.service.js");

const mockPointsRepository = jest.mocked(pointsRepository);
const mockPointsService = jest.mocked(pointsService);

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
      locals: { requestId: "req-123" },
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

  describe("getPointsSummaryHandler", () => {
    it("should return points summary for authenticated user", async () => {
      mockRequest.user = createMockJwtPayload({ sub: "user-123" });
      const mockSummary = {
        balance: 1500,
        recent: [],
      };

      mockPointsService.getPointsSummary.mockResolvedValue(mockSummary);

      await pointsController.getPointsSummaryHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockPointsService.getPointsSummary).toHaveBeenCalledWith("user-123");
      expect(mockResponse.json).toHaveBeenCalledWith(mockSummary);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should return 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;

      await pointsController.getPointsSummaryHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockPointsService.getPointsSummary).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "UNAUTHENTICATED",
            message: "Missing authenticated user context",
          }),
        }),
      );
    });

    it("should return 401 when user.sub is missing", async () => {
      mockRequest.user = undefined;

      await pointsController.getPointsSummaryHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockPointsService.getPointsSummary).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe("getPointsHistoryHandler", () => {
    it("should return points history for authenticated user", async () => {
      mockRequest.user = createMockJwtPayload({ sub: "user-123" });
      mockRequest.query = { limit: "10" };
      const mockHistory = {
        items: [
          {
            id: "1",
            user_id: "user-123",
            source_type: "session_completed",
            source_id: "session-1",
            algorithm_version: "v1",
            points: 100,
            calories: null,
            metadata: {},
            awarded_at: "2025-01-20T10:00:00Z",
            created_at: "2025-01-20T10:00:00Z",
          },
        ],
        nextCursor: "next-cursor",
      };

      mockPointsService.getPointsHistory.mockResolvedValue(mockHistory);

      await pointsController.getPointsHistoryHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockPointsService.getPointsHistory).toHaveBeenCalledWith("user-123", {
        limit: 10,
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockHistory);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should return 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.query = {};

      await pointsController.getPointsHistoryHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockPointsService.getPointsHistory).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it("should return 400 when query validation fails", async () => {
      mockRequest.user = createMockJwtPayload({ sub: "user-123" });
      mockRequest.query = { limit: "invalid" };

      await pointsController.getPointsHistoryHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockPointsService.getPointsHistory).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Object),
        }),
      );
    });

    it("should handle query parameters correctly", async () => {
      mockRequest.user = createMockJwtPayload({ sub: "user-123" });
      mockRequest.query = {
        cursor: "cursor-123",
        limit: "20",
        from: "2025-01-01",
        to: "2025-01-31",
      };
      const mockHistory = { items: [], nextCursor: null };

      mockPointsService.getPointsHistory.mockResolvedValue(mockHistory);

      await pointsController.getPointsHistoryHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockPointsService.getPointsHistory).toHaveBeenCalledWith("user-123", {
        cursor: "cursor-123",
        limit: 20,
        from: "2025-01-01",
        to: "2025-01-31",
      });
    });
  });
});
