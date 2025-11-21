import { v4 as uuidv4 } from "uuid";
import type { Knex } from "knex";
import {
  calculateCurrentStreak,
  awardStreakBonus,
  evaluateStreakBonus,
} from "../streaks.service.js";
import { getCompletedSessionDatesInRange, insertPointsEvent } from "../points.repository.js";
import { db } from "../../../db/connection.js";

jest.mock("uuid", () => ({
  v4: jest.fn(() => "00000000-0000-0000-0000-000000000001"),
}));

jest.mock("../points.repository.js", () => ({
  getCompletedSessionDatesInRange: jest.fn(),
  insertPointsEvent: jest.fn(),
}));

jest.mock("../../../db/connection.js", () => ({
  db: Object.assign(jest.fn(), {
    transaction: jest.fn(),
  }),
}));

const mockedGetCompletedSessionDatesInRange =
  getCompletedSessionDatesInRange as jest.MockedFunction<typeof getCompletedSessionDatesInRange>;
const mockedInsertPointsEvent = insertPointsEvent as jest.MockedFunction<typeof insertPointsEvent>;
const mockedUuid = uuidv4 as jest.MockedFunction<typeof uuidv4>;

type TransactionHandler = (trx: Knex.Transaction) => unknown;
type DbMock = jest.Mock & {
  transaction: jest.Mock<Promise<unknown>, [TransactionHandler]>;
};

const mockedDb = db as unknown as DbMock;
const mockedTransaction = mockedDb.transaction;

describe("streaks.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedTransaction.mockImplementation((handler: TransactionHandler) =>
      Promise.resolve(handler({} as unknown as Knex.Transaction)),
    );
    mockedUuid.mockReturnValue("00000000-0000-0000-0000-000000000001");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("calculateCurrentStreak", () => {
    it("should return 0 when no completed sessions exist", async () => {
      mockedGetCompletedSessionDatesInRange.mockResolvedValue(new Set());

      const result = await calculateCurrentStreak("user-123", new Date("2025-01-20T10:00:00Z"));

      expect(result).toBe(0);
      expect(mockedGetCompletedSessionDatesInRange).toHaveBeenCalledWith(
        "user-123",
        expect.any(Date),
        new Date("2025-01-20T10:00:00Z"),
        undefined,
      );
    });

    it("should calculate streak for consecutive days", async () => {
      const completedDates = new Set([
        "2025-01-20", // Today
        "2025-01-19", // Yesterday
        "2025-01-18", // Day before
        "2025-01-17", // 3 days ago
      ]);
      mockedGetCompletedSessionDatesInRange.mockResolvedValue(completedDates);

      const result = await calculateCurrentStreak("user-123", new Date("2025-01-20T10:00:00Z"));

      expect(result).toBe(4);
    });

    it("should stop counting when streak is broken", async () => {
      const completedDates = new Set([
        "2025-01-20", // Today
        "2025-01-19", // Yesterday
        "2025-01-17", // 2 days ago (gap on 2025-01-18)
        "2025-01-16", // 3 days ago
      ]);
      mockedGetCompletedSessionDatesInRange.mockResolvedValue(completedDates);

      const result = await calculateCurrentStreak("user-123", new Date("2025-01-20T10:00:00Z"));

      expect(result).toBe(2); // Only today and yesterday
    });

    it("should handle UTC date normalization correctly", async () => {
      const completedDates = new Set([
        "2025-01-20", // Today
        "2025-01-19", // Yesterday
      ]);
      mockedGetCompletedSessionDatesInRange.mockResolvedValue(completedDates);

      // Test with different times on the same day
      const result1 = await calculateCurrentStreak("user-123", new Date("2025-01-20T00:00:00Z"));
      const result2 = await calculateCurrentStreak("user-123", new Date("2025-01-20T23:59:59Z"));

      expect(result1).toBe(2);
      expect(result2).toBe(2);
    });

    it("should limit streak calculation to 90 days maximum", async () => {
      // Create a set with 100 consecutive days
      const completedDates = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const date = new Date("2025-01-20T10:00:00Z");
        date.setDate(date.getDate() - i);
        completedDates.add(date.toISOString().slice(0, 10));
      }
      mockedGetCompletedSessionDatesInRange.mockResolvedValue(completedDates);

      const result = await calculateCurrentStreak("user-123", new Date("2025-01-20T10:00:00Z"));

      expect(result).toBe(90); // Capped at 90 days
    });

    it("should work with transaction parameter", async () => {
      const completedDates = new Set(["2025-01-20", "2025-01-19"]);
      mockedGetCompletedSessionDatesInRange.mockResolvedValue(completedDates);
      const mockTrx = {} as unknown as Knex.Transaction;

      const result = await calculateCurrentStreak(
        "user-123",
        new Date("2025-01-20T10:00:00Z"),
        mockTrx,
      );

      expect(result).toBe(2);
      expect(mockedGetCompletedSessionDatesInRange).toHaveBeenCalledWith(
        "user-123",
        expect.any(Date),
        new Date("2025-01-20T10:00:00Z"),
        mockTrx,
      );
    });

    it("should handle lookback period correctly", async () => {
      const completedDates = new Set(["2025-01-20"]);
      mockedGetCompletedSessionDatesInRange.mockResolvedValue(completedDates);

      await calculateCurrentStreak("user-123", new Date("2025-01-20T10:00:00Z"));

      const callArgs = mockedGetCompletedSessionDatesInRange.mock.calls[0];
      const lookbackStart = callArgs[1];
      const completedAt = callArgs[2];

      // Should look back 90 days
      const expectedLookback = new Date(completedAt);
      expectedLookback.setDate(expectedLookback.getDate() - 90);

      expect(lookbackStart.getTime()).toBeCloseTo(expectedLookback.getTime(), -1000);
    });
  });

  describe("awardStreakBonus", () => {
    beforeEach(() => {
      mockedInsertPointsEvent.mockResolvedValue({
        id: "event-123",
        user_id: "user-123",
        source_type: "streak_bonus",
        source_id: "session-123",
        algorithm_version: "v1",
        points: 5,
        calories: null,
        metadata: { streak_days: 3, bonus_tier: 5 },
        awarded_at: new Date("2025-01-20T10:00:00Z").toISOString(),
        created_at: new Date("2025-01-20T10:00:00Z").toISOString(),
      });
    });

    it("should return 0 for streaks less than 3 days", async () => {
      const result = await awardStreakBonus(
        "user-123",
        "session-123",
        2,
        new Date("2025-01-20T10:00:00Z"),
      );

      expect(result).toBe(0);
      expect(mockedInsertPointsEvent).not.toHaveBeenCalled();
    });

    it("should award 5 bonus points for 3-6 day streak", async () => {
      const result = await awardStreakBonus(
        "user-123",
        "session-123",
        3,
        new Date("2025-01-20T10:00:00Z"),
      );

      expect(result).toBe(5);
      expect(mockedInsertPointsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          source_type: "streak_bonus",
          source_id: "session-123",
          points: 5,
          metadata: expect.objectContaining({
            streak_days: 3,
            bonus_tier: 5,
          }),
        }),
        undefined,
      );
    });

    it("should award 5 bonus points for 6 day streak", async () => {
      const result = await awardStreakBonus(
        "user-123",
        "session-123",
        6,
        new Date("2025-01-20T10:00:00Z"),
      );

      expect(result).toBe(5);
      expect(mockedInsertPointsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          points: 5,
          metadata: expect.objectContaining({
            streak_days: 6,
            bonus_tier: 5,
          }),
        }),
        undefined,
      );
    });

    it("should award 10 bonus points for 7-13 day streak", async () => {
      const result = await awardStreakBonus(
        "user-123",
        "session-123",
        7,
        new Date("2025-01-20T10:00:00Z"),
      );

      expect(result).toBe(10);
      expect(mockedInsertPointsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          points: 10,
          metadata: expect.objectContaining({
            streak_days: 7,
            bonus_tier: 10,
          }),
        }),
        undefined,
      );
    });

    it("should award 10 bonus points for 13 day streak", async () => {
      const result = await awardStreakBonus(
        "user-123",
        "session-123",
        13,
        new Date("2025-01-20T10:00:00Z"),
      );

      expect(result).toBe(10);
    });

    it("should award 20 bonus points for 14-29 day streak", async () => {
      const result = await awardStreakBonus(
        "user-123",
        "session-123",
        14,
        new Date("2025-01-20T10:00:00Z"),
      );

      expect(result).toBe(20);
      expect(mockedInsertPointsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          points: 20,
          metadata: expect.objectContaining({
            streak_days: 14,
            bonus_tier: 20,
          }),
        }),
        undefined,
      );
    });

    it("should award 20 bonus points for 29 day streak", async () => {
      const result = await awardStreakBonus(
        "user-123",
        "session-123",
        29,
        new Date("2025-01-20T10:00:00Z"),
      );

      expect(result).toBe(20);
    });

    it("should award 50 bonus points for 30+ day streak", async () => {
      const result = await awardStreakBonus(
        "user-123",
        "session-123",
        30,
        new Date("2025-01-20T10:00:00Z"),
      );

      expect(result).toBe(50);
      expect(mockedInsertPointsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          points: 50,
          metadata: expect.objectContaining({
            streak_days: 30,
            bonus_tier: 50,
          }),
        }),
        undefined,
      );
    });

    it("should award 50 bonus points for very long streak", async () => {
      const result = await awardStreakBonus(
        "user-123",
        "session-123",
        90,
        new Date("2025-01-20T10:00:00Z"),
      );

      expect(result).toBe(50);
    });

    it("should work with transaction parameter", async () => {
      const mockTrx = {} as unknown as Knex.Transaction;

      await awardStreakBonus(
        "user-123",
        "session-123",
        5,
        new Date("2025-01-20T10:00:00Z"),
        mockTrx,
      );

      expect(mockedInsertPointsEvent).toHaveBeenCalledWith(expect.any(Object), mockTrx);
    });

    it("should use deterministic UUID for event ID", async () => {
      mockedUuid.mockReturnValue("test-uuid-123");

      await awardStreakBonus("user-123", "session-123", 5, new Date("2025-01-20T10:00:00Z"));

      expect(mockedInsertPointsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "test-uuid-123",
        }),
        undefined,
      );
    });
  });

  describe("evaluateStreakBonus", () => {
    beforeEach(() => {
      mockedGetCompletedSessionDatesInRange.mockResolvedValue(
        new Set(["2025-01-20", "2025-01-19", "2025-01-18"]),
      );
      mockedInsertPointsEvent.mockResolvedValue({
        id: "event-123",
        user_id: "user-123",
        source_type: "streak_bonus",
        source_id: "session-123",
        algorithm_version: "v1",
        points: 5,
        calories: null,
        metadata: { streak_days: 3, bonus_tier: 5 },
        awarded_at: new Date("2025-01-20T10:00:00Z").toISOString(),
        created_at: new Date("2025-01-20T10:00:00Z").toISOString(),
      });
    });

    it("should calculate streak and award bonus points", async () => {
      const result = await evaluateStreakBonus(
        "user-123",
        "session-123",
        new Date("2025-01-20T10:00:00Z"),
      );

      expect(result).toEqual({
        streakLength: 3,
        bonusPoints: 5,
      });
      expect(mockedGetCompletedSessionDatesInRange).toHaveBeenCalled();
      expect(mockedInsertPointsEvent).toHaveBeenCalled();
    });

    it("should handle string date parameter", async () => {
      const result = await evaluateStreakBonus("user-123", "session-123", "2025-01-20T10:00:00Z");

      expect(result).toEqual({
        streakLength: 3,
        bonusPoints: 5,
      });
    });

    it("should return 0 bonus points when streak is less than 3 days", async () => {
      mockedGetCompletedSessionDatesInRange.mockResolvedValue(new Set(["2025-01-20"]));

      const result = await evaluateStreakBonus(
        "user-123",
        "session-123",
        new Date("2025-01-20T10:00:00Z"),
      );

      expect(result).toEqual({
        streakLength: 1,
        bonusPoints: 0,
      });
      expect(mockedInsertPointsEvent).not.toHaveBeenCalled();
    });

    it("should execute within a transaction", async () => {
      const transactionHandler = jest.fn();
      mockedTransaction.mockImplementation((handler: TransactionHandler) => {
        transactionHandler(handler);
        return Promise.resolve(handler({} as unknown as Knex.Transaction));
      });

      await evaluateStreakBonus("user-123", "session-123", new Date("2025-01-20T10:00:00Z"));

      expect(mockedTransaction).toHaveBeenCalled();
    });

    it("should handle no completed sessions", async () => {
      mockedGetCompletedSessionDatesInRange.mockResolvedValue(new Set());

      const result = await evaluateStreakBonus(
        "user-123",
        "session-123",
        new Date("2025-01-20T10:00:00Z"),
      );

      expect(result).toEqual({
        streakLength: 0,
        bonusPoints: 0,
      });
      expect(mockedInsertPointsEvent).not.toHaveBeenCalled();
    });

    it("should handle long streaks correctly", async () => {
      const completedDates = new Set<string>();
      for (let i = 0; i < 30; i++) {
        const date = new Date("2025-01-20T10:00:00Z");
        date.setDate(date.getDate() - i);
        completedDates.add(date.toISOString().slice(0, 10));
      }
      mockedGetCompletedSessionDatesInRange.mockResolvedValue(completedDates);

      const result = await evaluateStreakBonus(
        "user-123",
        "session-123",
        new Date("2025-01-20T10:00:00Z"),
      );

      expect(result).toEqual({
        streakLength: 30,
        bonusPoints: 50,
      });
    });
  });
});
