import { db } from "../../../../apps/backend/src/db/connection.js";
import * as progressRepository from "../../../../apps/backend/src/modules/progress/progress.repository.js";

// Mock the database connection
jest.mock("../../../../apps/backend/src/db/connection.js", () => ({
  db: jest.fn(),
}));

const mockDb = jest.mocked(db);

// Add raw helper to mock db
(mockDb as unknown as { raw: jest.Mock }).raw = jest.fn((sql: string) => sql);

describe("Progress Repository", () => {
  let mockQueryBuilder: {
    select: jest.Mock;
    where: jest.Mock;
    whereNot: jest.Mock;
    whereNotNull: jest.Mock;
    andWhere: jest.Mock;
    andWhereNot: jest.Mock;
    join: jest.Mock;
    groupBy: jest.Mock;
    groupByRaw: jest.Mock;
    orderBy: jest.Mock;
    first: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock query builder with chainable methods
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereNot: jest.fn().mockReturnThis(),
      whereNotNull: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      andWhereNot: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      groupByRaw: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
    };

    // Default: db() returns the mock query builder
    mockDb.mockReturnValue(mockQueryBuilder as never);
  });

  describe("fetchSummary", () => {
    it("should fetch summary for user and period", async () => {
      const mockAggregate = {
        sessions_completed: "10",
        total_reps: "500",
        total_volume: "10000",
        total_duration_sec: "3600",
      };

      mockQueryBuilder.first.mockResolvedValue(mockAggregate);

      const result = await progressRepository.fetchSummary("user-123", 30);

      expect(result).toEqual({
        period: 30,
        sessions_completed: 10,
        total_reps: 500,
        total_volume: 10000,
        total_duration_min: 60,
        avg_volume_per_session: 1000,
      });

      expect(mockDb).toHaveBeenCalledWith("session_summary as ss");
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        "ss.owner_id": "user-123",
        "ss.status": "completed",
      });
      expect(mockQueryBuilder.whereNotNull).toHaveBeenCalledWith("ss.completed_at");
    });

    it("should handle zero sessions", async () => {
      const mockAggregate = {
        sessions_completed: "0",
        total_reps: "0",
        total_volume: "0",
        total_duration_sec: "0",
      };

      mockQueryBuilder.first.mockResolvedValue(mockAggregate);

      const result = await progressRepository.fetchSummary("user-123", 7);

      expect(result.sessions_completed).toBe(0);
      expect(result.avg_volume_per_session).toBe(0);
    });

    it("should handle null aggregates", async () => {
      mockQueryBuilder.first.mockResolvedValue(null);

      const result = await progressRepository.fetchSummary("user-123", 30);

      expect(result.sessions_completed).toBe(0);
      expect(result.total_reps).toBe(0);
      expect(result.total_volume).toBe(0);
      expect(result.total_duration_min).toBe(0);
      expect(result.avg_volume_per_session).toBe(0);
    });
  });

  describe("fetchTrends", () => {
    it("should fetch daily trends", async () => {
      const mockRows = [
        {
          bucket_start: new Date("2024-01-01"),
          sessions: "2",
          volume: "1000",
        },
        {
          bucket_start: new Date("2024-01-02"),
          sessions: "3",
          volume: "1500",
        },
      ];

      (mockQueryBuilder as unknown as Promise<typeof mockRows>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockRows);
          return Promise.resolve(mockRows);
        }) as never;

      const result = await progressRepository.fetchTrends("user-123", 30, "day");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: new Date("2024-01-01").toISOString(),
        sessions: 2,
        volume: 1000,
      });
      expect(result[1]).toEqual({
        date: new Date("2024-01-02").toISOString(),
        sessions: 3,
        volume: 1500,
      });

      expect(mockDb).toHaveBeenCalledWith("session_summary as ss");
      expect(mockQueryBuilder.groupByRaw).toHaveBeenCalled();
    });

    it("should fetch weekly trends", async () => {
      const mockRows = [
        {
          week_start: new Date("2024-01-01"),
          sessions: "10",
          total_volume: "5000",
        },
        {
          week_start: new Date("2024-01-08"),
          sessions: "15",
          total_volume: "7500",
        },
      ];

      (mockQueryBuilder as unknown as Promise<typeof mockRows>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockRows);
          return Promise.resolve(mockRows);
        }) as never;

      const result = await progressRepository.fetchTrends("user-123", 90, "week");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: new Date("2024-01-01").toISOString(),
        sessions: 10,
        volume: 5000,
      });
      expect(result[1]).toEqual({
        date: new Date("2024-01-08").toISOString(),
        sessions: 15,
        volume: 7500,
      });

      expect(mockDb).toHaveBeenCalledWith("weekly_aggregates as wa");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("wa.owner_id", "user-123");
    });

    it("should handle empty trends", async () => {
      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      const result = await progressRepository.fetchTrends("user-123", 30, "day");

      expect(result).toEqual([]);
    });
  });

  describe("fetchExerciseBreakdown", () => {
    it("should fetch exercise breakdown", async () => {
      const mockRows = [
        {
          type_code: "barbell_squat",
          sessions: "5",
          total_reps: "100",
          total_volume: "5000",
          total_duration_sec: "1200",
        },
        {
          type_code: "bench_press",
          sessions: "4",
          total_reps: "80",
          total_volume: "4000",
          total_duration_sec: "900",
        },
      ];

      (mockQueryBuilder as unknown as Promise<typeof mockRows>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockRows);
          return Promise.resolve(mockRows);
        }) as never;

      const result = await progressRepository.fetchExerciseBreakdown("user-123", 30);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type_code: "barbell_squat",
        sessions: 5,
        total_reps: 100,
        total_volume: 5000,
        total_duration_min: 20,
      });
      expect(result[1]).toEqual({
        type_code: "bench_press",
        sessions: 4,
        total_reps: 80,
        total_volume: 4000,
        total_duration_min: 15,
      });

      expect(mockDb).toHaveBeenCalledWith("exercise_sets as s");
      expect(mockQueryBuilder.join).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        "sess.owner_id": "user-123",
        "sess.status": "completed",
      });
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith("e.type_code");
    });

    it("should handle empty breakdown", async () => {
      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      const result = await progressRepository.fetchExerciseBreakdown("user-123", 30);

      expect(result).toEqual([]);
    });

    it("should handle null values in aggregates", async () => {
      const mockRows = [
        {
          type_code: "cardio",
          sessions: "3",
          total_reps: null,
          total_volume: null,
          total_duration_sec: "1800",
        },
      ];

      (mockQueryBuilder as unknown as Promise<typeof mockRows>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockRows);
          return Promise.resolve(mockRows);
        }) as never;

      const result = await progressRepository.fetchExerciseBreakdown("user-123", 30);

      expect(result[0]).toEqual({
        type_code: "cardio",
        sessions: 3,
        total_reps: 0,
        total_volume: 0,
        total_duration_min: 30,
      });
    });
  });

  describe("fetchPlansProgress", () => {
    it("should fetch plans progress", async () => {
      const mockRows = [
        {
          id: "plan-1",
          name: "Strength Training",
          progress_percent: "75",
          session_count: "12",
          completed_count: "9",
          status: "active",
          user_id: "user-123",
          start_date: new Date("2024-01-01"),
        },
        {
          id: "plan-2",
          name: "Cardio Plan",
          progress_percent: "50",
          session_count: "10",
          completed_count: "5",
          status: "active",
          user_id: "user-123",
          start_date: new Date("2024-02-01"),
        },
      ];

      (mockQueryBuilder as unknown as Promise<typeof mockRows>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockRows);
          return Promise.resolve(mockRows);
        }) as never;

      const result = await progressRepository.fetchPlansProgress("user-123");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "plan-1",
        name: "Strength Training",
        progress_percent: 75,
        session_count: 12,
        completed_count: 9,
      });
      expect(result[1]).toEqual({
        id: "plan-2",
        name: "Cardio Plan",
        progress_percent: 50,
        session_count: 10,
        completed_count: 5,
      });

      expect(mockDb).toHaveBeenCalledWith("plans");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: "user-123" });
      expect(mockQueryBuilder.andWhereNot).toHaveBeenCalledWith("status", "archived");
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith("start_date", "desc");
    });

    it("should handle null progress values", async () => {
      const mockRows = [
        {
          id: "plan-1",
          name: "New Plan",
          progress_percent: null,
          session_count: null,
          completed_count: null,
          status: "active",
          user_id: "user-123",
          start_date: new Date("2024-01-01"),
        },
      ];

      (mockQueryBuilder as unknown as Promise<typeof mockRows>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockRows);
          return Promise.resolve(mockRows);
        }) as never;

      const result = await progressRepository.fetchPlansProgress("user-123");

      expect(result[0]).toEqual({
        id: "plan-1",
        name: "New Plan",
        progress_percent: 0,
        session_count: 0,
        completed_count: 0,
      });
    });

    it("should handle empty plans list", async () => {
      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      const result = await progressRepository.fetchPlansProgress("user-123");

      expect(result).toEqual([]);
    });
  });
});
