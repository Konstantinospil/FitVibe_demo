import type { Request, Response } from "express";
import * as progressController from "../../../../apps/backend/src/modules/progress/progress.controller.js";
import * as progressService from "../../../../apps/backend/src/modules/progress/progress.service.js";

// Mock dependencies
jest.mock("../../../../apps/backend/src/modules/progress/progress.service.js");

const mockProgressService = jest.mocked(progressService);

describe("Progress Controller", () => {
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
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
  });

  describe("summaryHandler", () => {
    it("should get progress summary successfully", async () => {
      const mockSummary = {
        period: 30,
        sessions_completed: 10,
        total_reps: 100,
        total_volume: 5000,
        total_duration_min: 60,
        avg_volume_per_session: 500,
      };

      mockProgressService.getSummary.mockResolvedValue(mockSummary);

      await progressController.summaryHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockSummary);
      expect(mockProgressService.getSummary).toHaveBeenCalledWith(userId, 30);
    });

    it("should use default period when not provided", async () => {
      const mockSummary = {
        period: 30,
        sessions_completed: 5,
        total_reps: 50,
        total_volume: 2500,
        total_duration_min: 30,
        avg_volume_per_session: 500,
      };

      mockProgressService.getSummary.mockResolvedValue(mockSummary);

      await progressController.summaryHandler(mockRequest as Request, mockResponse as Response);

      expect(mockProgressService.getSummary).toHaveBeenCalledWith(userId, 30);
    });

    it("should handle different period values", async () => {
      const mockSummary = {
        period: 7,
        sessions_completed: 3,
        total_reps: 30,
        total_volume: 1500,
        total_duration_min: 20,
        avg_volume_per_session: 500,
      };

      mockRequest.query = { period: "7" };
      mockProgressService.getSummary.mockResolvedValue(mockSummary);

      await progressController.summaryHandler(mockRequest as Request, mockResponse as Response);

      expect(mockProgressService.getSummary).toHaveBeenCalledWith(userId, 7);
    });

    it("should return 400 for invalid period", async () => {
      mockRequest.query = { period: "invalid" };

      await progressController.summaryHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Object),
        }),
      );
      expect(mockProgressService.getSummary).not.toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;

      await progressController.summaryHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockProgressService.getSummary).not.toHaveBeenCalled();
    });
  });

  describe("trendsHandler", () => {
    it("should get trends successfully", async () => {
      const mockTrends = [{ date: "2024-01-01", sessions: 5, volume: 2500 }];

      mockProgressService.getTrends.mockResolvedValue(mockTrends);

      await progressController.trendsHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockTrends);
      expect(mockProgressService.getTrends).toHaveBeenCalledWith(userId, 30, "day");
    });

    it("should use default group_by when not provided", async () => {
      const mockTrends = [{ date: "2024-01-01", sessions: 5, volume: 2500 }];

      mockProgressService.getTrends.mockResolvedValue(mockTrends);

      await progressController.trendsHandler(mockRequest as Request, mockResponse as Response);

      expect(mockProgressService.getTrends).toHaveBeenCalledWith(userId, 30, "day");
    });

    it("should handle group_by week", async () => {
      const mockTrends = [{ date: "2024-01-01", sessions: 5, volume: 2500 }];

      mockRequest.query = { period: "90", group_by: "week" };
      mockProgressService.getTrends.mockResolvedValue(mockTrends);

      await progressController.trendsHandler(mockRequest as Request, mockResponse as Response);

      expect(mockProgressService.getTrends).toHaveBeenCalledWith(userId, 90, "week");
    });

    it("should return 400 for invalid query", async () => {
      mockRequest.query = { period: "invalid" };

      await progressController.trendsHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockProgressService.getTrends).not.toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;

      await progressController.trendsHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockProgressService.getTrends).not.toHaveBeenCalled();
    });
  });

  describe("exercisesHandler", () => {
    it("should get exercise breakdown successfully", async () => {
      const mockBreakdown = [
        { type_code: "strength", sessions: 5, total_reps: 50, total_volume: 2500 },
      ];

      mockProgressService.getExerciseBreakdown.mockResolvedValue(mockBreakdown);

      await progressController.exercisesHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockBreakdown);
      expect(mockProgressService.getExerciseBreakdown).toHaveBeenCalledWith(userId, 90);
    });

    it("should use default period when not provided", async () => {
      const mockBreakdown = [
        { type_code: "strength", sessions: 5, total_reps: 50, total_volume: 2500 },
      ];

      mockProgressService.getExerciseBreakdown.mockResolvedValue(mockBreakdown);

      await progressController.exercisesHandler(mockRequest as Request, mockResponse as Response);

      expect(mockProgressService.getExerciseBreakdown).toHaveBeenCalledWith(userId, 90);
    });

    it("should handle different period values", async () => {
      const mockBreakdown = [
        { type_code: "strength", sessions: 3, total_reps: 30, total_volume: 1500 },
      ];

      mockRequest.query = { period: "7" };
      mockProgressService.getExerciseBreakdown.mockResolvedValue(mockBreakdown);

      await progressController.exercisesHandler(mockRequest as Request, mockResponse as Response);

      expect(mockProgressService.getExerciseBreakdown).toHaveBeenCalledWith(userId, 7);
    });

    it("should return 400 for invalid period", async () => {
      mockRequest.query = { period: "invalid" };

      await progressController.exercisesHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockProgressService.getExerciseBreakdown).not.toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;

      await progressController.exercisesHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockProgressService.getExerciseBreakdown).not.toHaveBeenCalled();
    });
  });

  describe("plansHandler", () => {
    it("should get plans successfully", async () => {
      const mockPlans = [
        {
          id: "plan-1",
          name: "Test Plan",
          status: "active",
          progress_percent: 50,
          session_count: 5,
          completed_count: 2,
        },
      ];

      mockProgressService.getPlans.mockResolvedValue(mockPlans);

      await progressController.plansHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockPlans);
      expect(mockProgressService.getPlans).toHaveBeenCalledWith(userId);
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;

      await progressController.plansHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockProgressService.getPlans).not.toHaveBeenCalled();
    });
  });

  describe("exportHandler", () => {
    it("should export progress report as JSON", async () => {
      const mockReport = {
        period: 30,
        group_by: "week",
        summary: {
          sessions_completed: 10,
          total_volume: 5000,
        },
        trends: [{ date: "2024-01-01", sessions: 5, volume: 2500 }],
      };

      mockRequest.query = { format: "json", period: "30", group_by: "week" };
      mockProgressService.buildProgressReport.mockResolvedValue(mockReport);

      await progressController.exportHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockReport);
      expect(mockProgressService.buildProgressReport).toHaveBeenCalledWith(userId, 30, "week");
    });

    it("should export progress report as CSV", async () => {
      const mockReport = {
        period: 30,
        group_by: "week",
        summary: {
          sessions_completed: 10,
          total_volume: 5000,
        },
        trends: [{ date: "2024-01-01", sessions: 5, volume: 2500 }],
      };
      const mockCsv = "date,sessions,volume\n2024-01-01,5,2500\n";

      mockRequest.query = { format: "csv", period: "30", group_by: "week" };
      mockProgressService.buildProgressReport.mockResolvedValue(mockReport);
      mockProgressService.renderProgressReportCsv.mockReturnValue(mockCsv);

      await progressController.exportHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        'attachment; filename="progress-report-30d-week.csv"',
      );
      expect(mockResponse.send).toHaveBeenCalledWith(mockCsv);
      expect(mockProgressService.renderProgressReportCsv).toHaveBeenCalledWith(mockReport);
    });

    it("should use default format when not provided", async () => {
      const mockReport = {
        period: 30,
        group_by: "week",
        summary: {
          sessions_completed: 10,
          total_volume: 5000,
        },
        trends: [],
      };

      mockRequest.query = { period: "30", group_by: "week" };
      mockProgressService.buildProgressReport.mockResolvedValue(mockReport);

      await progressController.exportHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockReport);
    });

    it("should use default group_by when not provided", async () => {
      const mockReport = {
        period: 30,
        group_by: "week",
        summary: {
          sessions_completed: 10,
          total_volume: 5000,
        },
        trends: [],
      };

      mockRequest.query = { period: "30", format: "json" };
      mockProgressService.buildProgressReport.mockResolvedValue(mockReport);

      await progressController.exportHandler(mockRequest as Request, mockResponse as Response);

      expect(mockProgressService.buildProgressReport).toHaveBeenCalledWith(userId, 30, "week");
    });

    it("should return 400 for invalid query", async () => {
      mockRequest.query = { period: "invalid" };

      await progressController.exportHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockProgressService.buildProgressReport).not.toHaveBeenCalled();
    });

    it("should return 400 for invalid format", async () => {
      mockRequest.query = { format: "xml", period: "30" };

      await progressController.exportHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockProgressService.buildProgressReport).not.toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.query = { format: "json", period: "30" };

      await progressController.exportHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockProgressService.buildProgressReport).not.toHaveBeenCalled();
    });
  });
});

