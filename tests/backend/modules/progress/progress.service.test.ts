import * as progressService from "../../../../apps/backend/src/modules/progress/progress.service.js";
import * as progressRepository from "../../../../apps/backend/src/modules/progress/progress.repository.js";
import type {
  ProgressSummary,
  TrendsPayload,
  ExercisesPayload,
  PlanProgress,
  ProgressReport,
  TrendPoint,
  ExerciseBreakdown,
} from "../../../../apps/backend/src/modules/progress/progress.types.js";

// Mock dependencies
jest.mock("../../../../apps/backend/src/modules/progress/progress.repository.js");
jest.mock("../../../../apps/backend/src/modules/common/audit.util.js", () => ({
  insertAudit: jest.fn().mockResolvedValue(undefined),
}));

const mockProgressRepo = jest.mocked(progressRepository);

describe("Progress Service", () => {
  const userId = "user-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getSummary", () => {
    it("should return progress summary", async () => {
      const mockSummary: ProgressSummary = {
        period: 7,
        sessions_completed: 5,
        total_reps: 500,
        total_volume: 10000,
        total_duration_min: 300,
        avg_volume_per_session: 2000,
      };

      mockProgressRepo.fetchSummary.mockResolvedValue(mockSummary);

      const result = await progressService.getSummary(userId, 7);

      expect(result).toEqual(mockSummary);
      expect(mockProgressRepo.fetchSummary).toHaveBeenCalledWith(userId, 7);
    });

    it("should return cached summary if available", async () => {
      const mockSummary: ProgressSummary = {
        period: 7,
        sessions_completed: 5,
        total_reps: 500,
        total_volume: 10000,
        total_duration_min: 300,
        avg_volume_per_session: 2000,
      };

      // First call - should fetch from repository
      mockProgressRepo.fetchSummary.mockResolvedValue(mockSummary);
      const result1 = await progressService.getSummary(userId, 7);

      // Second call - should use cache
      const result2 = await progressService.getSummary(userId, 7);

      expect(result1).toEqual(mockSummary);
      expect(result2).toEqual(mockSummary);
      // Should only call fetchSummary once due to caching
      expect(mockProgressRepo.fetchSummary).toHaveBeenCalledTimes(1);
    });
  });

  describe("getTrends", () => {
    it("should return progress trends", async () => {
      const mockTrends: TrendPoint[] = [
        {
          date: "2024-01-01",
          sessions: 3,
          volume: 1500,
        },
      ];

      mockProgressRepo.fetchTrends.mockResolvedValue(mockTrends);

      const result = await progressService.getTrends(userId, 30, "day");

      expect(result.period).toBe(30);
      expect(result.group_by).toBe("day");
      expect(result.data).toEqual(mockTrends);
      expect(mockProgressRepo.fetchTrends).toHaveBeenCalledWith(userId, 30, "day");
    });

    it("should return cached trends if available", async () => {
      const mockTrends: TrendPoint[] = [];

      mockProgressRepo.fetchTrends.mockResolvedValue(mockTrends);
      await progressService.getTrends(userId, 30, "day");
      await progressService.getTrends(userId, 30, "day");

      expect(mockProgressRepo.fetchTrends).toHaveBeenCalledTimes(1);
    });
  });

  describe("getExerciseBreakdown", () => {
    it("should return exercise breakdown", async () => {
      const mockBreakdown: ExerciseBreakdown[] = [
        {
          type_code: "strength",
          sessions: 3,
          total_reps: 90,
          total_volume: 7200,
          total_duration_min: 60,
        },
      ];

      mockProgressRepo.fetchExerciseBreakdown.mockResolvedValue(mockBreakdown);

      const result = await progressService.getExerciseBreakdown(userId, 7);

      expect(result.period).toBe(7);
      expect(result.data).toEqual(mockBreakdown);
      expect(mockProgressRepo.fetchExerciseBreakdown).toHaveBeenCalledWith(userId, 7);
    });
  });

  describe("getPlans", () => {
    it("should return plan progress", async () => {
      const mockPlans: PlanProgress[] = [
        {
          id: "plan-123",
          name: "Weekly Training",
          progress_percent: 70,
          session_count: 10,
          completed_count: 7,
        },
      ];

      mockProgressRepo.fetchPlansProgress.mockResolvedValue(mockPlans);

      const result = await progressService.getPlans(userId);

      expect(result).toEqual(mockPlans);
      expect(mockProgressRepo.fetchPlansProgress).toHaveBeenCalledWith(userId);
    });
  });

  describe("buildProgressReport", () => {
    it("should build progress report", async () => {
      const mockSummary: ProgressSummary = {
        period: 30,
        sessions_completed: 20,
        total_reps: 2000,
        total_volume: 40000,
        total_duration_min: 1200,
        avg_volume_per_session: 2000,
      };

      const mockTrends: TrendPoint[] = [
        {
          date: "2024-01-01",
          sessions: 3,
          volume: 1500,
        },
      ];

      const mockBreakdown: ExerciseBreakdown[] = [];

      mockProgressRepo.fetchSummary.mockResolvedValue(mockSummary);
      mockProgressRepo.fetchTrends.mockResolvedValue(mockTrends);
      mockProgressRepo.fetchExerciseBreakdown.mockResolvedValue(mockBreakdown);
      mockProgressRepo.fetchPlansProgress.mockResolvedValue([]);

      const result = await progressService.buildProgressReport(userId, 30, "day");

      expect(result.summary).toEqual(mockSummary);
      expect(result.trends).toEqual(mockTrends);
      expect(result.exercises).toEqual(mockBreakdown);
      expect(result.period).toBe(30);
      expect(result.group_by).toBe("day");
    });
  });

  describe("renderProgressReportCsv", () => {
    it("should render progress report as CSV", () => {
      const mockReport: ProgressReport = {
        generated_at: new Date().toISOString(),
        period: 7,
        group_by: "day",
        summary: {
          period: 7,
          sessions_completed: 5,
          total_reps: 500,
          total_volume: 10000,
          total_duration_min: 300,
          avg_volume_per_session: 2000,
        },
        trends: [
          {
            date: "2024-01-01",
            sessions: 3,
            volume: 1500,
          },
        ],
        exercises: [
          {
            type_code: "strength",
            sessions: 2,
            total_reps: 60,
            total_volume: 4800,
            total_duration_min: 40,
          },
        ],
        plans: [
          {
            id: "plan-123",
            name: "Weekly Training",
            progress_percent: 70,
            session_count: 10,
            completed_count: 7,
          },
        ],
      };

      const csv = progressService.renderProgressReportCsv(mockReport);

      expect(csv).toContain("section,metric,value");
      expect(csv).toContain("summary,sessions_completed,5");
      expect(csv).toContain("trends,date,sessions,volume");
      expect(csv).toContain("exercises,type_code,sessions");
      expect(csv).toContain("plans,id,name");
    });

    it("should escape CSV values with commas and quotes", () => {
      const mockReport: ProgressReport = {
        generated_at: new Date().toISOString(),
        period: 7,
        group_by: "day",
        summary: {
          period: 7,
          sessions_completed: 5,
          total_reps: 500,
          total_volume: 10000,
          total_duration_min: 300,
          avg_volume_per_session: 2000,
        },
        trends: [],
        exercises: [],
        plans: [
          {
            id: "plan-123",
            name: 'Plan with "quotes" and, commas',
            progress_percent: 70,
            session_count: 10,
            completed_count: 7,
          },
        ],
      };

      const csv = progressService.renderProgressReportCsv(mockReport);

      expect(csv).toContain('"Plan with ""quotes"" and, commas"');
    });
  });
});
