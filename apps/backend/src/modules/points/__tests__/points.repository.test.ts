import { db } from "../../../db/connection.js";
import * as pointsRepository from "../points.repository.js";

jest.mock("../../../db/connection.js", () => ({
  db: jest.fn(),
}));

const mockDb = jest.mocked(db);

describe("Points Repository", () => {
  let mockQueryBuilder: {
    insert: jest.Mock;
    returning: jest.Mock;
    select: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orWhere: jest.Mock;
    whereIn: jest.Mock;
    whereNull: jest.Mock;
    whereBetween: jest.Mock;
    first: jest.Mock;
    orderBy: jest.Mock;
    limit: jest.Mock;
    sum: jest.Mock;
    count: jest.Mock;
    then: jest.Mock;
  };

  beforeEach(() => {
    mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      whereBetween: jest.fn().mockReturnThis(),
      first: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sum: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      then: jest.fn(),
    };
    mockDb.mockReturnValue(mockQueryBuilder as never);
    jest.clearAllMocks();
  });

  describe("insertPointsEvent", () => {
    it("should insert points event and return record", async () => {
      const event = {
        id: "event-123",
        user_id: "user-123",
        source_type: "session_completed",
        source_id: "session-123",
        algorithm_version: "1.0",
        points: 100,
        calories: 500,
        metadata: { duration: 60 },
        awarded_at: new Date("2024-01-01"),
        created_at: new Date("2024-01-01"),
      };

      const mockRow = {
        ...event,
        points: "100",
        calories: "500",
        awarded_at: new Date("2024-01-01"),
        created_at: new Date("2024-01-01"),
      };

      mockQueryBuilder.returning.mockResolvedValue([mockRow]);

      const result = await pointsRepository.insertPointsEvent(event);

      expect(mockDb).toHaveBeenCalledWith("user_points");
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(event);
      expect(result.id).toBe("event-123");
      expect(result.points).toBe(100);
      expect(result.calories).toBe(500);
    });

    it("should work with transaction", async () => {
      const mockTrx = jest.fn().mockReturnValue(mockQueryBuilder) as never;
      mockQueryBuilder.returning.mockResolvedValue([
        {
          id: "event-123",
          user_id: "user-123",
          source_type: "test",
          source_id: null,
          algorithm_version: null,
          points: "50",
          calories: null,
          metadata: null,
          awarded_at: new Date(),
          created_at: new Date(),
        },
      ]);

      await pointsRepository.insertPointsEvent(
        {
          id: "event-456",
          user_id: "user-123",
          source_type: "test",
          source_id: null,
          algorithm_version: "v1",
          points: 50,
          calories: null,
          metadata: {},
          awarded_at: new Date(),
          created_at: new Date(),
        },
        mockTrx,
      );

      expect(mockTrx).toHaveBeenCalledWith("user_points");
    });
  });

  describe("findPointsEventBySource", () => {
    it("should find event by source", async () => {
      const mockRow = {
        id: "event-123",
        user_id: "user-123",
        source_type: "session_completed",
        source_id: "session-123",
        algorithm_version: "1.0",
        points: "100",
        calories: "500",
        metadata: { duration: 60 },
        awarded_at: new Date("2024-01-01"),
        created_at: new Date("2024-01-01"),
      };

      mockQueryBuilder.first.mockResolvedValue(mockRow);

      const result = await pointsRepository.findPointsEventBySource(
        "user-123",
        "session_completed",
        "session-123",
      );

      expect(mockDb).toHaveBeenCalledWith("user_points");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        user_id: "user-123",
        source_type: "session_completed",
        source_id: "session-123",
      });
      expect(result?.id).toBe("event-123");
      expect(result?.points).toBe(100);
    });

    it("should return undefined if not found", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await pointsRepository.findPointsEventBySource(
        "user-123",
        "session_completed",
        "session-999",
      );

      expect(result).toBeUndefined();
    });
  });

  describe("getPointsBalance", () => {
    it("should sum points for user", async () => {
      mockQueryBuilder.first.mockResolvedValue({ total: "1500" });

      const result = await pointsRepository.getPointsBalance("user-123");

      expect(mockDb).toHaveBeenCalledWith("user_points");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: "user-123" });
      expect(mockQueryBuilder.sum).toHaveBeenCalledWith("points as total");
      expect(result).toBe(1500);
    });

    it("should return 0 if no points", async () => {
      mockQueryBuilder.first.mockResolvedValue(null);

      const result = await pointsRepository.getPointsBalance("user-999");

      expect(result).toBe(0);
    });

    it("should handle numeric total", async () => {
      mockQueryBuilder.first.mockResolvedValue({ total: 2500 });

      const result = await pointsRepository.getPointsBalance("user-123");

      expect(result).toBe(2500);
    });
  });

  describe("getRecentPointsEvents", () => {
    it("should get recent events with limit", async () => {
      const mockRows = [
        {
          id: "event-2",
          user_id: "user-123",
          source_type: "test",
          source_id: null,
          algorithm_version: null,
          points: "50",
          calories: null,
          metadata: null,
          awarded_at: new Date("2024-01-02"),
          created_at: new Date("2024-01-02"),
        },
        {
          id: "event-1",
          user_id: "user-123",
          source_type: "test",
          source_id: null,
          algorithm_version: null,
          points: "100",
          calories: null,
          metadata: null,
          awarded_at: new Date("2024-01-01"),
          created_at: new Date("2024-01-01"),
        },
      ];

      mockQueryBuilder.limit.mockResolvedValue(mockRows);

      const result = await pointsRepository.getRecentPointsEvents("user-123", 10);

      expect(mockDb).toHaveBeenCalledWith("user_points");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: "user-123" });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith("awarded_at", "desc");
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(2);
      expect(result[0].points).toBe(50);
    });
  });

  describe("getPointsHistory", () => {
    it("should get history with basic options", async () => {
      const mockRows = [
        {
          id: "event-1",
          user_id: "user-123",
          source_type: "test",
          source_id: null,
          algorithm_version: null,
          points: "100",
          calories: null,
          metadata: null,
          awarded_at: new Date("2024-01-01"),
          created_at: new Date("2024-01-01"),
        },
      ];

      mockQueryBuilder.limit.mockResolvedValue(mockRows);

      const result = await pointsRepository.getPointsHistory("user-123", { limit: 20 });

      expect(mockDb).toHaveBeenCalledWith("user_points");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: "user-123" });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
      expect(result).toHaveLength(1);
    });

    it("should filter by date range", async () => {
      mockQueryBuilder.then.mockImplementation((resolve) => {
        resolve([]);
        return Promise.resolve([]);
      });

      await pointsRepository.getPointsHistory("user-123", {
        limit: 20,
        from: new Date("2024-01-01"),
        to: new Date("2024-12-31"),
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("awarded_at", ">=", expect.any(Date));
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("awarded_at", "<=", expect.any(Date));
    });

    it("should handle cursor pagination", async () => {
      mockQueryBuilder.then.mockImplementation((resolve) => {
        resolve([]);
        return Promise.resolve([]);
      });

      await pointsRepository.getPointsHistory("user-123", {
        limit: 20,
        cursor: {
          awardedAt: new Date("2024-01-15"),
          id: "event-100",
        },
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe("getUserPointsProfile", () => {
    it("should return user profile data", async () => {
      const mockStaticRow = {
        user_id: "user-123",
        date_of_birth: "1990-01-01",
        gender_code: "male",
      };

      const mockMetricsRow = {
        user_id: "user-123",
        fitness_level_code: "intermediate",
        training_frequency: "3-4",
        recorded_at: new Date("2024-01-01"),
      };

      // Mock two parallel queries
      mockDb
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(mockStaticRow),
        } as never)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(mockMetricsRow),
        } as never);

      const result = await pointsRepository.getUserPointsProfile("user-123");

      expect(result.dateOfBirth).toBe("1990-01-01");
      expect(result.genderCode).toBe("male");
      expect(result.fitnessLevelCode).toBe("intermediate");
      expect(result.trainingFrequency).toBe("3-4");
    });

    it("should handle missing data", async () => {
      mockDb
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(null),
        } as never)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(null),
        } as never);

      const result = await pointsRepository.getUserPointsProfile("user-999");

      expect(result.dateOfBirth).toBeNull();
      expect(result.genderCode).toBeNull();
      expect(result.fitnessLevelCode).toBeNull();
      expect(result.trainingFrequency).toBeNull();
    });
  });

  describe("getExercisesMetadata", () => {
    it("should return empty map for empty input", async () => {
      const result = await pointsRepository.getExercisesMetadata([]);

      expect(result.size).toBe(0);
      expect(mockDb).not.toHaveBeenCalled();
    });

    it("should get exercise metadata for multiple IDs", async () => {
      const mockRows = [
        {
          id: "ex-1",
          type_code: "strength",
          tags: JSON.stringify(["upper_body", "push"]),
        },
        {
          id: "ex-2",
          type_code: "cardio",
          tags: ["running"],
        },
        {
          id: "ex-3",
          type_code: null,
          tags: null,
        },
      ];

      mockQueryBuilder.select.mockResolvedValue(mockRows);

      const result = await pointsRepository.getExercisesMetadata(["ex-1", "ex-2", "ex-3"]);

      expect(mockDb).toHaveBeenCalledWith("exercises");
      expect(mockQueryBuilder.whereIn).toHaveBeenCalledWith("id", ["ex-1", "ex-2", "ex-3"]);
      expect(result.size).toBe(3);
      expect(result.get("ex-1")?.tags).toEqual(["upper_body", "push"]);
      expect(result.get("ex-2")?.tags).toEqual(["running"]);
      expect(result.get("ex-3")?.tags).toEqual([]);
    });
  });

  describe("getBadgeCatalog", () => {
    it("should return badge catalog as map", async () => {
      const mockRows = [
        {
          code: "first_session",
          name: "First Session",
          description: "Complete your first session",
          category: "milestone",
          icon: "trophy",
          priority: "10",
          criteria: { sessions: 1 },
        },
        {
          code: "streak_7",
          name: "7 Day Streak",
          description: null,
          category: null,
          icon: null,
          priority: null,
          criteria: null,
        },
      ];

      mockQueryBuilder.select.mockResolvedValue(mockRows);

      const result = await pointsRepository.getBadgeCatalog();

      expect(mockDb).toHaveBeenCalledWith("badge_catalog");
      expect(result.size).toBe(2);
      expect(result.get("first_session")?.name).toBe("First Session");
      expect(result.get("first_session")?.priority).toBe(10);
      expect(result.get("streak_7")?.description).toBe("");
    });
  });

  describe("getUserBadgeCodes", () => {
    it("should return set of badge codes", async () => {
      const mockRows = [{ badge_type: "first_session" }, { badge_type: "streak_7" }];

      mockQueryBuilder.select.mockResolvedValue(mockRows);

      const result = await pointsRepository.getUserBadgeCodes("user-123");

      expect(mockDb).toHaveBeenCalledWith("badges");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: "user-123" });
      expect(result.size).toBe(2);
      expect(result.has("first_session")).toBe(true);
      expect(result.has("streak_7")).toBe(true);
    });

    it("should return empty set if no badges", async () => {
      mockQueryBuilder.select.mockResolvedValue([]);

      const result = await pointsRepository.getUserBadgeCodes("user-999");

      expect(result.size).toBe(0);
    });
  });

  describe("insertBadgeAward", () => {
    it("should insert badge award and return record", async () => {
      const award = {
        id: "badge-123",
        user_id: "user-123",
        badge_type: "first_session",
        metadata: { session_id: "session-123" },
        awarded_at: new Date("2024-01-01"),
      };

      const mockRow = {
        ...award,
        awarded_at: new Date("2024-01-01"),
      };

      mockQueryBuilder.returning.mockResolvedValue([mockRow]);

      const result = await pointsRepository.insertBadgeAward(award);

      expect(mockDb).toHaveBeenCalledWith("badges");
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(award);
      expect(result.id).toBe("badge-123");
      expect(result.badge_type).toBe("first_session");
    });
  });

  describe("countCompletedSessions", () => {
    it("should count completed sessions", async () => {
      mockQueryBuilder.first.mockResolvedValue({ count: "15" });

      const result = await pointsRepository.countCompletedSessions("user-123");

      expect(mockDb).toHaveBeenCalledWith("sessions");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        owner_id: "user-123",
        status: "completed",
      });
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("deleted_at");
      expect(result).toBe(15);
    });

    it("should return 0 if no sessions", async () => {
      mockQueryBuilder.first.mockResolvedValue(null);

      const result = await pointsRepository.countCompletedSessions("user-999");

      expect(result).toBe(0);
    });

    it("should handle numeric count", async () => {
      mockQueryBuilder.first.mockResolvedValue({ count: 42 });

      const result = await pointsRepository.countCompletedSessions("user-123");

      expect(result).toBe(42);
    });
  });

  describe("getCompletedSessionDatesInRange", () => {
    it("should return set of completed dates", async () => {
      const mockRows = [
        { completed_at: new Date("2024-01-01T10:00:00Z") },
        { completed_at: new Date("2024-01-01T15:00:00Z") },
        { completed_at: new Date("2024-01-02T10:00:00Z") },
        { completed_at: "2024-01-03T10:00:00Z" },
      ];

      mockQueryBuilder.select.mockResolvedValue(mockRows);

      const result = await pointsRepository.getCompletedSessionDatesInRange(
        "user-123",
        new Date("2024-01-01"),
        new Date("2024-01-31"),
      );

      expect(mockDb).toHaveBeenCalledWith("sessions");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        owner_id: "user-123",
        status: "completed",
      });
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("deleted_at");
      expect(mockQueryBuilder.whereBetween).toHaveBeenCalledWith("completed_at", [
        expect.any(Date),
        expect.any(Date),
      ]);
      expect(result.size).toBe(3);
      expect(result.has("2024-01-01")).toBe(true);
      expect(result.has("2024-01-02")).toBe(true);
      expect(result.has("2024-01-03")).toBe(true);
    });

    it("should skip rows with null completed_at", async () => {
      const mockRows = [
        { completed_at: new Date("2024-01-01") },
        { completed_at: null },
        { completed_at: new Date("2024-01-02") },
      ];

      mockQueryBuilder.select.mockResolvedValue(mockRows);

      const result = await pointsRepository.getCompletedSessionDatesInRange(
        "user-123",
        new Date("2024-01-01"),
        new Date("2024-01-31"),
      );

      expect(result.size).toBe(2);
    });

    it("should return empty set if no sessions", async () => {
      mockQueryBuilder.select.mockResolvedValue([]);

      const result = await pointsRepository.getCompletedSessionDatesInRange(
        "user-999",
        new Date("2024-01-01"),
        new Date("2024-01-31"),
      );

      expect(result.size).toBe(0);
    });
  });
});
