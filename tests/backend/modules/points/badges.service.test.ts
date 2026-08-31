import * as badgesService from "../../../../apps/backend/src/modules/points/badges.service.js";
import * as pointsRepository from "../../../../apps/backend/src/modules/points/points.repository.js";
import type { SessionWithExercises } from "../../../../apps/backend/src/modules/sessions/sessions.types.js";
import type {
  BadgeCatalogEntry,
  SessionMetricsSnapshot,
} from "../../../../apps/backend/src/modules/points/points.types.js";

// Mock dependencies
jest.mock("../../../../apps/backend/src/modules/points/points.repository.js");

const mockPointsRepo = jest.mocked(pointsRepository);

function catalogEntry(
  code: string,
  criteria: Record<string, unknown>,
  extras: Partial<BadgeCatalogEntry> = {},
): BadgeCatalogEntry {
  return {
    code,
    name: code,
    description: "",
    category: "milestone",
    icon: null,
    priority: 10,
    criteria,
    ...extras,
  };
}

describe("Badges Service", () => {
  const userId = "user-123";
  const sessionId = "session-123";

  const createMockSession = (): SessionWithExercises =>
    ({
      id: sessionId,
      owner_id: userId,
      title: "Test Session",
      planned_at: new Date().toISOString(),
      status: "completed",
      completed_at: new Date().toISOString(),
      visibility: "private",
      exercises: [],
    }) as SessionWithExercises;

  const createMockMetrics = (): SessionMetricsSnapshot => ({
    distanceMeters: 0,
    runDistanceMeters: 0,
    rideDistanceMeters: 0,
    rowDistanceMeters: 0,
    averageRpe: null,
  });

  const createMockTrx = () => {
    const builder = Object.assign(Promise.resolve([]), {
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
    });
    return Object.assign(
      jest.fn((table: string) => builder),
      builder,
    );
  };

  function stubContext() {
    mockPointsRepo.getCompletedSessionTypeCodeCounts.mockResolvedValue(new Map());
    mockPointsRepo.getDistinctTypeCodesInWindow.mockResolvedValue(new Set());
    mockPointsRepo.countCompletedSessionsOnUtcDay.mockResolvedValue(1);
    mockPointsRepo.countPersonalRecords.mockResolvedValue(0);
    mockPointsRepo.countFollowsByUser.mockResolvedValue(0);
    mockPointsRepo.getCompletedSessionDatesInRange.mockResolvedValue(new Set());
    mockPointsRepo.countCompletedSessions.mockResolvedValue(1);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    stubContext();
    mockPointsRepo.getBadgeCatalog.mockResolvedValue(
      new Map([
        ["first_session", catalogEntry("first_session", { completed_sessions: 1 })],
        ["streak_7_day", catalogEntry("streak_7_day", { consecutive_days: 7 })],
        ["run_10k", catalogEntry("run_10k", { run_distance_m: 10000 })],
        ["ride_100k", catalogEntry("ride_100k", { ride_distance_m: 100000 })],
      ]),
    );
    mockPointsRepo.getUserBadgeCodes.mockResolvedValue(new Set());
    mockPointsRepo.insertBadgeAward.mockResolvedValue(undefined as never);
  });

  describe("evaluateBadgesForSession", () => {
    it("should award first session badge", async () => {
      const session = createMockSession();
      const metrics = createMockMetrics();
      const trx = createMockTrx();

      const result = await badgesService.evaluateBadgesForSession({ session, metrics, trx });

      expect(result).toHaveLength(1);
      expect(result[0].badgeCode).toBe("first_session");
      expect(mockPointsRepo.insertBadgeAward).toHaveBeenCalled();
    });

    it("should not award first session badge if already owned", async () => {
      const session = createMockSession();
      const metrics = createMockMetrics();
      const trx = createMockTrx();

      mockPointsRepo.getUserBadgeCodes.mockResolvedValue(new Set(["first_session"]));
      mockPointsRepo.countCompletedSessions.mockResolvedValue(2);

      const result = await badgesService.evaluateBadgesForSession({ session, metrics, trx });

      expect(result).toHaveLength(0);
      expect(mockPointsRepo.insertBadgeAward).not.toHaveBeenCalled();
    });

    it("should award streak 7 day badge", async () => {
      const session = createMockSession();
      const metrics = createMockMetrics();
      const trx = createMockTrx();

      const completedAt = new Date(session.completed_at!);
      const streakDays = new Set<string>();
      for (let i = 0; i < 7; i++) {
        const date = new Date(completedAt);
        date.setUTCDate(date.getUTCDate() - i);
        streakDays.add(date.toISOString().slice(0, 10));
      }

      mockPointsRepo.getCompletedSessionDatesInRange.mockResolvedValue(streakDays);
      mockPointsRepo.countCompletedSessions.mockResolvedValue(7);

      const result = await badgesService.evaluateBadgesForSession({ session, metrics, trx });

      expect(result.some((r) => r.badgeCode === "streak_7_day")).toBe(true);
    });

    it("should award run 10k badge", async () => {
      const session = createMockSession();
      const metrics: SessionMetricsSnapshot = {
        ...createMockMetrics(),
        runDistanceMeters: 10000,
      };
      const trx = createMockTrx();

      mockPointsRepo.countCompletedSessions.mockResolvedValue(2);

      const result = await badgesService.evaluateBadgesForSession({ session, metrics, trx });

      expect(result.some((r) => r.badgeCode === "run_10k")).toBe(true);
    });

    it("should award ride 100k badge", async () => {
      const session = createMockSession();
      const metrics: SessionMetricsSnapshot = {
        ...createMockMetrics(),
        rideDistanceMeters: 100000,
      };
      const trx = createMockTrx();

      mockPointsRepo.countCompletedSessions.mockResolvedValue(2);

      const result = await badgesService.evaluateBadgesForSession({ session, metrics, trx });

      expect(result.some((r) => r.badgeCode === "ride_100k")).toBe(true);
    });

    it("should not award multiple badges if already owned", async () => {
      const session = createMockSession();
      const metrics: SessionMetricsSnapshot = {
        ...createMockMetrics(),
        runDistanceMeters: 10000,
        rideDistanceMeters: 100000,
      };
      const trx = createMockTrx();

      mockPointsRepo.getUserBadgeCodes.mockResolvedValue(
        new Set(["first_session", "run_10k", "ride_100k"]),
      );
      mockPointsRepo.countCompletedSessions.mockResolvedValue(5);

      const result = await badgesService.evaluateBadgesForSession({ session, metrics, trx });

      expect(result).toHaveLength(0);
      expect(mockPointsRepo.insertBadgeAward).not.toHaveBeenCalled();
    });

    it("should award first_session and earth_initiate for a first strength session", async () => {
      const session = createMockSession();
      const metrics = createMockMetrics();
      const trx = createMockTrx();

      mockPointsRepo.getBadgeCatalog.mockResolvedValue(
        new Map([
          ["first_session", catalogEntry("first_session", { completed_sessions: 1 })],
          [
            "earth_initiate",
            catalogEntry("earth_initiate", { type_code: "strength", completed_sessions: 1 }),
          ],
        ]),
      );
      mockPointsRepo.getCompletedSessionTypeCodeCounts.mockResolvedValue(
        new Map([["strength", 1]]),
      );

      const result = await badgesService.evaluateBadgesForSession({ session, metrics, trx });

      expect(result.map((r) => r.badgeCode).sort()).toEqual(["earth_initiate", "first_session"]);
    });

    it("should award cross_trainer for four vibes in seven days", async () => {
      const session = createMockSession();
      const metrics = createMockMetrics();
      const trx = createMockTrx();

      mockPointsRepo.getBadgeCatalog.mockResolvedValue(
        new Map([
          [
            "cross_trainer",
            catalogEntry("cross_trainer", { distinct_type_codes: 4, window_days: 7 }),
          ],
        ]),
      );
      mockPointsRepo.getDistinctTypeCodesInWindow.mockResolvedValue(
        new Set(["strength", "agility", "endurance", "explosivity"]),
      );
      mockPointsRepo.countCompletedSessions.mockResolvedValue(4);

      const result = await badgesService.evaluateBadgesForSession({ session, metrics, trx });

      expect(result.some((r) => r.badgeCode === "cross_trainer")).toBe(true);
    });

    it("should award all_the_tales when all six vibes appear in 28 days", async () => {
      const session = createMockSession();
      const metrics = createMockMetrics();
      const trx = createMockTrx();

      mockPointsRepo.getBadgeCatalog.mockResolvedValue(
        new Map([
          [
            "all_the_tales",
            catalogEntry("all_the_tales", { all_type_codes: true, window_days: 28 }),
          ],
        ]),
      );
      mockPointsRepo.getDistinctTypeCodesInWindow.mockResolvedValue(
        new Set([
          "strength",
          "agility",
          "endurance",
          "explosivity",
          "intelligence",
          "regeneration",
        ]),
      );

      const result = await badgesService.evaluateBadgesForSession({ session, metrics, trx });

      expect(result.some((r) => r.badgeCode === "all_the_tales")).toBe(true);
    });

    it("should never award catalog-only role badges", async () => {
      const session = createMockSession();
      const metrics = createMockMetrics();
      const trx = createMockTrx();

      mockPointsRepo.getBadgeCatalog.mockResolvedValue(
        new Map([
          [
            "onboard_pro",
            catalogEntry("onboard_pro", { requires: "coaching" }, { category: "role" }),
          ],
          [
            "privacy_champion",
            catalogEntry("privacy_champion", { requires: "admin_ops" }, { category: "role" }),
          ],
        ]),
      );

      const result = await badgesService.evaluateBadgesForSession({ session, metrics, trx });

      expect(result).toHaveLength(0);
      expect(mockPointsRepo.insertBadgeAward).not.toHaveBeenCalled();
    });
  });

  describe("evaluateBadgesForFollow", () => {
    it("should award first_follow when the user follows someone", async () => {
      mockPointsRepo.getBadgeCatalog.mockResolvedValue(
        new Map([["first_follow", catalogEntry("first_follow", { follower_count: 1 })]]),
      );
      mockPointsRepo.countFollowsByUser.mockResolvedValue(1);
      mockPointsRepo.countCompletedSessions.mockResolvedValue(0);

      const result = await badgesService.evaluateBadgesForFollow(userId);

      expect(result).toHaveLength(1);
      expect(result[0].badgeCode).toBe("first_follow");
    });

    it("should not award session badges during follow evaluation", async () => {
      mockPointsRepo.getBadgeCatalog.mockResolvedValue(
        new Map([
          ["first_session", catalogEntry("first_session", { completed_sessions: 1 })],
          ["first_follow", catalogEntry("first_follow", { follower_count: 1 })],
        ]),
      );
      mockPointsRepo.countFollowsByUser.mockResolvedValue(1);
      mockPointsRepo.countCompletedSessions.mockResolvedValue(5);

      const result = await badgesService.evaluateBadgesForFollow(userId);

      expect(result.map((r) => r.badgeCode)).toEqual(["first_follow"]);
    });
  });
});
