import * as progressService from "../progress.service.js";
import * as progressRepository from "../progress.repository.js";
import * as auditUtil from "../../common/audit.util.js";
import type {
  ProgressSummary,
  TrendsPayload,
  ExercisesPayload,
  PlanProgress,
  ProgressReport,
} from "../progress.types.js";

// Mock dependencies
jest.mock("../progress.repository.js");
jest.mock("../../common/audit.util.js");

// Use var for proper hoisting with jest.mock
// eslint-disable-next-line no-var
var mockCacheGet: jest.Mock<any, any, any>;
// eslint-disable-next-line no-var
var mockCacheSet: jest.Mock<any, any, any>;

jest.mock("node-cache", () => {
  mockCacheGet = jest.fn();
  mockCacheSet = jest.fn();

  return jest.fn().mockImplementation(() => ({
    get: mockCacheGet,
    set: mockCacheSet,
  }));
});

const mockProgressRepo = jest.mocked(progressRepository);
const mockAuditUtil = jest.mocked(auditUtil);

describe("Progress Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getSummary", () => {
    it("should return cached summary if available", async () => {
      const mockSummary: ProgressSummary = {
        period: 30,
        sessions_completed: 10,
        total_reps: 500,
        total_volume: 10000,
        total_duration_min: 60,
        avg_volume_per_session: 1000,
      };

      mockCacheGet.mockReturnValue(mockSummary);

      const result = await progressService.getSummary("user-123", 30);

      expect(result).toEqual(mockSummary);
      expect(mockCacheGet).toHaveBeenCalledWith("summary:user-123:30");
      expect(mockProgressRepo.fetchSummary).not.toHaveBeenCalled();
    });

    it("should fetch and cache summary if not cached", async () => {
      const mockSummary: ProgressSummary = {
        period: 30,
        sessions_completed: 10,
        total_reps: 500,
        total_volume: 10000,
        total_duration_min: 60,
        avg_volume_per_session: 1000,
      };

      mockCacheGet.mockReturnValue(undefined);
      mockProgressRepo.fetchSummary.mockResolvedValue(mockSummary);
      mockAuditUtil.insertAudit.mockResolvedValue(undefined);

      const result = await progressService.getSummary("user-123", 30);

      expect(result).toEqual(mockSummary);
      expect(mockProgressRepo.fetchSummary).toHaveBeenCalledWith("user-123", 30);
      expect(mockCacheSet).toHaveBeenCalledWith("summary:user-123:30", mockSummary);
      expect(mockAuditUtil.insertAudit).toHaveBeenCalledWith({
        actorUserId: "user-123",
        entity: "progress",
        action: "summary",
        entityId: "user-123",
        metadata: { period: 30 },
      });
    });

    it("should handle different period values", async () => {
      const mockSummary: ProgressSummary = {
        period: 7,
        sessions_completed: 5,
        total_reps: 200,
        total_volume: 4000,
        total_duration_min: 30,
        avg_volume_per_session: 800,
      };

      mockCacheGet.mockReturnValue(undefined);
      mockProgressRepo.fetchSummary.mockResolvedValue(mockSummary);
      mockAuditUtil.insertAudit.mockResolvedValue(undefined);

      await progressService.getSummary("user-123", 7);

      expect(mockProgressRepo.fetchSummary).toHaveBeenCalledWith("user-123", 7);
      expect(mockCacheSet).toHaveBeenCalledWith("summary:user-123:7", mockSummary);
    });
  });

  describe("getTrends", () => {
    it("should return cached trends if available", async () => {
      const mockTrends: TrendsPayload = {
        period: 30,
        group_by: "day",
        data: [
          { date: "2024-01-01", sessions: 2, volume: 1000 },
          { date: "2024-01-02", sessions: 3, volume: 1500 },
        ],
      };

      mockCacheGet.mockReturnValue(mockTrends);

      const result = await progressService.getTrends("user-123", 30, "day");

      expect(result).toEqual(mockTrends);
      expect(mockCacheGet).toHaveBeenCalledWith("trends:user-123:30:day");
      expect(mockProgressRepo.fetchTrends).not.toHaveBeenCalled();
    });

    it("should fetch and cache trends if not cached", async () => {
      const mockData = [
        { date: "2024-01-01", sessions: 2, volume: 1000 },
        { date: "2024-01-02", sessions: 3, volume: 1500 },
      ];

      mockCacheGet.mockReturnValue(undefined);
      mockProgressRepo.fetchTrends.mockResolvedValue(mockData);
      mockAuditUtil.insertAudit.mockResolvedValue(undefined);

      const result = await progressService.getTrends("user-123", 30, "day");

      expect(result.period).toBe(30);
      expect(result.group_by).toBe("day");
      expect(result.data).toEqual(mockData);
      expect(mockProgressRepo.fetchTrends).toHaveBeenCalledWith("user-123", 30, "day");
      expect(mockCacheSet).toHaveBeenCalled();
      expect(mockAuditUtil.insertAudit).toHaveBeenCalledWith({
        actorUserId: "user-123",
        entity: "progress",
        action: "trends",
        entityId: "user-123",
        metadata: { period: 30, groupBy: "day" },
      });
    });

    it("should handle weekly grouping", async () => {
      const mockData = [
        { date: "2024-01-01", sessions: 10, volume: 5000 },
        { date: "2024-01-08", sessions: 15, volume: 7500 },
      ];

      mockCacheGet.mockReturnValue(undefined);
      mockProgressRepo.fetchTrends.mockResolvedValue(mockData);
      mockAuditUtil.insertAudit.mockResolvedValue(undefined);

      const result = await progressService.getTrends("user-123", 90, "week");

      expect(result.group_by).toBe("week");
      expect(mockProgressRepo.fetchTrends).toHaveBeenCalledWith("user-123", 90, "week");
    });

    it("should handle empty trends", async () => {
      mockCacheGet.mockReturnValue(undefined);
      mockProgressRepo.fetchTrends.mockResolvedValue([]);
      mockAuditUtil.insertAudit.mockResolvedValue(undefined);

      const result = await progressService.getTrends("user-123", 30, "day");

      expect(result.data).toEqual([]);
    });
  });

  describe("getExerciseBreakdown", () => {
    it("should return cached exercise breakdown if available", async () => {
      const mockBreakdown: ExercisesPayload = {
        period: 30,
        data: [
          {
            type_code: "barbell_squat",
            sessions: 5,
            total_reps: 100,
            total_volume: 5000,
            total_duration_min: 20,
          },
          {
            type_code: "bench_press",
            sessions: 4,
            total_reps: 80,
            total_volume: 4000,
            total_duration_min: 15,
          },
        ],
      };

      mockCacheGet.mockReturnValue(mockBreakdown);

      const result = await progressService.getExerciseBreakdown("user-123", 30);

      expect(result).toEqual(mockBreakdown);
      expect(mockCacheGet).toHaveBeenCalledWith("ex_bd:user-123:30");
      expect(mockProgressRepo.fetchExerciseBreakdown).not.toHaveBeenCalled();
    });

    it("should fetch and cache exercise breakdown if not cached", async () => {
      const mockData = [
        {
          type_code: "barbell_squat",
          sessions: 5,
          total_reps: 100,
          total_volume: 5000,
          total_duration_min: 20,
        },
      ];

      mockCacheGet.mockReturnValue(undefined);
      mockProgressRepo.fetchExerciseBreakdown.mockResolvedValue(mockData);
      mockAuditUtil.insertAudit.mockResolvedValue(undefined);

      const result = await progressService.getExerciseBreakdown("user-123", 30);

      expect(result.period).toBe(30);
      expect(result.data).toEqual(mockData);
      expect(mockProgressRepo.fetchExerciseBreakdown).toHaveBeenCalledWith("user-123", 30);
      expect(mockCacheSet).toHaveBeenCalled();
      expect(mockAuditUtil.insertAudit).toHaveBeenCalledWith({
        actorUserId: "user-123",
        entity: "progress",
        action: "exercises_breakdown",
        entityId: "user-123",
        metadata: { period: 30 },
      });
    });

    it("should handle empty exercise breakdown", async () => {
      mockCacheGet.mockReturnValue(undefined);
      mockProgressRepo.fetchExerciseBreakdown.mockResolvedValue([]);
      mockAuditUtil.insertAudit.mockResolvedValue(undefined);

      const result = await progressService.getExerciseBreakdown("user-123", 30);

      expect(result.data).toEqual([]);
    });
  });

  describe("getPlans", () => {
    it("should return cached plans if available", async () => {
      const mockPlans: PlanProgress[] = [
        {
          id: "plan-1",
          name: "Strength Training",
          progress_percent: 75,
          session_count: 12,
          completed_count: 9,
        },
        {
          id: "plan-2",
          name: "Cardio Plan",
          progress_percent: 50,
          session_count: 10,
          completed_count: 5,
        },
      ];

      mockCacheGet.mockReturnValue(mockPlans);

      const result = await progressService.getPlans("user-123");

      expect(result).toEqual(mockPlans);
      expect(mockCacheGet).toHaveBeenCalledWith("plans:user-123");
      expect(mockProgressRepo.fetchPlansProgress).not.toHaveBeenCalled();
    });

    it("should fetch and cache plans if not cached", async () => {
      const mockPlans: PlanProgress[] = [
        {
          id: "plan-1",
          name: "Strength Training",
          progress_percent: 75,
          session_count: 12,
          completed_count: 9,
        },
      ];

      mockCacheGet.mockReturnValue(undefined);
      mockProgressRepo.fetchPlansProgress.mockResolvedValue(mockPlans);
      mockAuditUtil.insertAudit.mockResolvedValue(undefined);

      const result = await progressService.getPlans("user-123");

      expect(result).toEqual(mockPlans);
      expect(mockProgressRepo.fetchPlansProgress).toHaveBeenCalledWith("user-123");
      expect(mockCacheSet).toHaveBeenCalledWith("plans:user-123", mockPlans);
      expect(mockAuditUtil.insertAudit).toHaveBeenCalledWith({
        actorUserId: "user-123",
        entity: "progress",
        action: "plans",
        entityId: "user-123",
      });
    });

    it("should handle empty plans list", async () => {
      mockCacheGet.mockReturnValue(undefined);
      mockProgressRepo.fetchPlansProgress.mockResolvedValue([]);
      mockAuditUtil.insertAudit.mockResolvedValue(undefined);

      const result = await progressService.getPlans("user-123");

      expect(result).toEqual([]);
    });
  });

  describe("buildProgressReport", () => {
    it("should build complete progress report", async () => {
      const mockSummary: ProgressSummary = {
        period: 30,
        sessions_completed: 10,
        total_reps: 500,
        total_volume: 10000,
        total_duration_min: 60,
        avg_volume_per_session: 1000,
      };

      const mockTrends = [
        { date: "2024-01-01", sessions: 2, volume: 1000 },
        { date: "2024-01-02", sessions: 3, volume: 1500 },
      ];

      const mockExercises = [
        {
          type_code: "barbell_squat",
          sessions: 5,
          total_reps: 100,
          total_volume: 5000,
          total_duration_min: 20,
        },
      ];

      const mockPlans: PlanProgress[] = [
        {
          id: "plan-1",
          name: "Strength Training",
          progress_percent: 75,
          session_count: 12,
          completed_count: 9,
        },
      ];

      mockProgressRepo.fetchSummary.mockResolvedValue(mockSummary);
      mockProgressRepo.fetchTrends.mockResolvedValue(mockTrends);
      mockProgressRepo.fetchExerciseBreakdown.mockResolvedValue(mockExercises);
      mockProgressRepo.fetchPlansProgress.mockResolvedValue(mockPlans);
      mockAuditUtil.insertAudit.mockResolvedValue(undefined);

      const result = await progressService.buildProgressReport("user-123", 30, "day");

      expect(result.period).toBe(30);
      expect(result.group_by).toBe("day");
      expect(result.summary).toEqual(mockSummary);
      expect(result.trends).toEqual(mockTrends);
      expect(result.exercises).toEqual(mockExercises);
      expect(result.plans).toEqual(mockPlans);
      expect(result.generated_at).toBeDefined();
      expect(new Date(result.generated_at)).toBeInstanceOf(Date);
      expect(mockAuditUtil.insertAudit).toHaveBeenCalledWith({
        actorUserId: "user-123",
        entity: "progress",
        action: "export_report",
        entityId: "user-123",
        metadata: { period: 30, groupBy: "day" },
      });
    });

    it("should call all repository functions in parallel", async () => {
      mockProgressRepo.fetchSummary.mockResolvedValue({
        period: 30,
        sessions_completed: 0,
        total_reps: 0,
        total_volume: 0,
        total_duration_min: 0,
        avg_volume_per_session: 0,
      });
      mockProgressRepo.fetchTrends.mockResolvedValue([]);
      mockProgressRepo.fetchExerciseBreakdown.mockResolvedValue([]);
      mockProgressRepo.fetchPlansProgress.mockResolvedValue([]);
      mockAuditUtil.insertAudit.mockResolvedValue(undefined);

      await progressService.buildProgressReport("user-123", 30, "week");

      expect(mockProgressRepo.fetchSummary).toHaveBeenCalledWith("user-123", 30);
      expect(mockProgressRepo.fetchTrends).toHaveBeenCalledWith("user-123", 30, "week");
      expect(mockProgressRepo.fetchExerciseBreakdown).toHaveBeenCalledWith("user-123", 30);
      expect(mockProgressRepo.fetchPlansProgress).toHaveBeenCalledWith("user-123");
    });
  });

  describe("renderProgressReportCsv", () => {
    it("should render complete CSV report", () => {
      const mockReport: ProgressReport = {
        generated_at: "2024-01-01T00:00:00Z",
        period: 30,
        group_by: "day",
        summary: {
          period: 30,
          sessions_completed: 10,
          total_reps: 500,
          total_volume: 10000,
          total_duration_min: 60,
          avg_volume_per_session: 1000,
        },
        trends: [
          { date: "2024-01-01", sessions: 2, volume: 1000 },
          { date: "2024-01-02", sessions: 3, volume: 1500 },
        ],
        exercises: [
          {
            type_code: "barbell_squat",
            sessions: 5,
            total_reps: 100,
            total_volume: 5000,
            total_duration_min: 20,
          },
        ],
        plans: [
          {
            id: "plan-1",
            name: "Strength Training",
            progress_percent: 75,
            session_count: 12,
            completed_count: 9,
          },
        ],
      };

      const csv = progressService.renderProgressReportCsv(mockReport);

      expect(csv).toContain("section,metric,value");
      expect(csv).toContain("summary,sessions_completed,10");
      expect(csv).toContain("summary,total_reps,500");
      expect(csv).toContain("summary,total_volume,10000");
      expect(csv).toContain("trends,date,sessions,volume");
      expect(csv).toContain("trends,2024-01-01,2,1000");
      expect(csv).toContain(
        "exercises,type_code,sessions,total_reps,total_volume,total_duration_min",
      );
      expect(csv).toContain("exercises,barbell_squat,5,100,5000,20");
      expect(csv).toContain("plans,id,name,progress_percent,session_count,completed_count");
      expect(csv).toContain("plans,plan-1,Strength Training,75,12,9");
    });

    it("should handle CSV escaping for special characters", () => {
      const mockReport: ProgressReport = {
        generated_at: "2024-01-01T00:00:00Z",
        period: 30,
        group_by: "day",
        summary: {
          period: 30,
          sessions_completed: 0,
          total_reps: 0,
          total_volume: 0,
          total_duration_min: 0,
          avg_volume_per_session: 0,
        },
        trends: [],
        exercises: [],
        plans: [
          {
            id: "plan-1",
            name: 'Plan with "quotes"',
            progress_percent: 50,
            session_count: 10,
            completed_count: 5,
          },
        ],
      };

      const csv = progressService.renderProgressReportCsv(mockReport);

      expect(csv).toContain('plans,plan-1,"Plan with ""quotes""",50,10,5');
    });

    it("should handle empty data sections", () => {
      const mockReport: ProgressReport = {
        generated_at: "2024-01-01T00:00:00Z",
        period: 30,
        group_by: "day",
        summary: {
          period: 30,
          sessions_completed: 0,
          total_reps: 0,
          total_volume: 0,
          total_duration_min: 0,
          avg_volume_per_session: 0,
        },
        trends: [],
        exercises: [],
        plans: [],
      };

      const csv = progressService.renderProgressReportCsv(mockReport);

      expect(csv).toContain("section,metric,value");
      expect(csv).toContain("summary,sessions_completed,0");
      expect(csv).toContain("trends,date,sessions,volume");
      expect(csv).toContain(
        "exercises,type_code,sessions,total_reps,total_volume,total_duration_min",
      );
      expect(csv).toContain("plans,id,name,progress_percent,session_count,completed_count");
    });

    it("should handle values with newlines", () => {
      const mockReport: ProgressReport = {
        generated_at: "2024-01-01T00:00:00Z",
        period: 30,
        group_by: "day",
        summary: {
          period: 30,
          sessions_completed: 0,
          total_reps: 0,
          total_volume: 0,
          total_duration_min: 0,
          avg_volume_per_session: 0,
        },
        trends: [],
        exercises: [],
        plans: [
          {
            id: "plan-1",
            name: "Plan\nwith\nnewlines",
            progress_percent: 25,
            session_count: 8,
            completed_count: 2,
          },
        ],
      };

      const csv = progressService.renderProgressReportCsv(mockReport);

      expect(csv).toContain('"Plan\nwith\nnewlines"');
    });

    it("should handle values with commas", () => {
      const mockReport: ProgressReport = {
        generated_at: "2024-01-01T00:00:00Z",
        period: 30,
        group_by: "day",
        summary: {
          period: 30,
          sessions_completed: 0,
          total_reps: 0,
          total_volume: 0,
          total_duration_min: 0,
          avg_volume_per_session: 0,
        },
        trends: [],
        exercises: [],
        plans: [
          {
            id: "plan-1",
            name: "Plan, with, commas",
            progress_percent: 60,
            session_count: 15,
            completed_count: 9,
          },
        ],
      };

      const csv = progressService.renderProgressReportCsv(mockReport);

      expect(csv).toContain('"Plan, with, commas"');
    });
  });
});
