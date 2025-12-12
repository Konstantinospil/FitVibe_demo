import * as badgesService from "../../../../apps/backend/src/modules/points/badges.service.js";
import * as pointsRepository from "../../../../apps/backend/src/modules/points/points.repository.js";
import type { SessionWithExercises } from "../../../../apps/backend/src/modules/sessions/sessions.types.js";
import type { SessionMetricsSnapshot } from "../../../../apps/backend/src/modules/points/points.types.js";

// Mock dependencies
jest.mock("../../../../apps/backend/src/modules/points/points.repository.js");

const mockPointsRepo = jest.mocked(pointsRepository);

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

  beforeEach(() => {
    jest.clearAllMocks();
    mockPointsRepo.getBadgeCatalog.mockResolvedValue(
      new Set(["first_session", "streak_7_day", "run_10k", "ride_100k"]),
    );
    mockPointsRepo.getUserBadgeCodes.mockResolvedValue(new Set());
  });

  describe("evaluateBadgesForSession", () => {
    it("should award first session badge", async () => {
      const session = createMockSession();
      const metrics = createMockMetrics();
      const trx = createMockTrx();

      mockPointsRepo.countCompletedSessions.mockResolvedValue(1);
      mockPointsRepo.getCompletedSessionDatesInRange.mockResolvedValue(new Set());
      mockPointsRepo.insertBadgeAward.mockResolvedValue(undefined);

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
      mockPointsRepo.getCompletedSessionDatesInRange.mockResolvedValue(new Set());

      const result = await badgesService.evaluateBadgesForSession({ session, metrics, trx });

      expect(result).toHaveLength(0);
      expect(mockPointsRepo.countCompletedSessions).not.toHaveBeenCalled();
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
      mockPointsRepo.insertBadgeAward.mockResolvedValue(undefined);

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
      mockPointsRepo.getCompletedSessionDatesInRange.mockResolvedValue(new Set());
      mockPointsRepo.insertBadgeAward.mockResolvedValue(undefined);

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
      mockPointsRepo.getCompletedSessionDatesInRange.mockResolvedValue(new Set());
      mockPointsRepo.insertBadgeAward.mockResolvedValue(undefined);

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
      mockPointsRepo.getCompletedSessionDatesInRange.mockResolvedValue(new Set());

      const result = await badgesService.evaluateBadgesForSession({ session, metrics, trx });

      expect(result).toHaveLength(0);
      expect(mockPointsRepo.insertBadgeAward).not.toHaveBeenCalled();
    });
  });
});
