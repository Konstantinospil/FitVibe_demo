import * as badgesService from "../badges.service.js";
import * as pointsRepository from "../points.repository.js";
import type { SessionWithExercises } from "../../sessions/sessions.types.js";
import type { SessionMetricsSnapshot } from "../points.types.js";

// Mock dependencies
jest.mock("../points.repository.js");

const mockPointsRepo = jest.mocked(pointsRepository);

describe("Badges Service", () => {
  let mockTrx: { commit: jest.Mock; rollback: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockTrx = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    // Default mock for getCompletedSessionDatesInRange (can be overridden in specific tests)
    mockPointsRepo.getCompletedSessionDatesInRange.mockResolvedValue(new Set());
  });

  describe("evaluateBadgesForSession", () => {
    it("should award FIRST_SESSION badge for user's first completed session", async () => {
      const mockSession: SessionWithExercises = {
        id: "session-123",
        owner_id: "user-123",
        completed_at: "2024-01-01T00:00:00Z",
      } as SessionWithExercises;

      const mockMetrics: SessionMetricsSnapshot = {
        runDistanceMeters: 0,
        rideDistanceMeters: 0,
        totalVolumeKg: 0,
        totalReps: 0,
        totalDurationSec: 0,
      };

      mockPointsRepo.getBadgeCatalog.mockResolvedValue(
        new Set(["first_session", "streak_7_day", "run_10k", "ride_100k"]),
      );
      mockPointsRepo.getUserBadgeCodes.mockResolvedValue(new Set());
      mockPointsRepo.countCompletedSessions.mockResolvedValue(1);
      mockPointsRepo.getCompletedSessionDatesInRange.mockResolvedValue(new Set());
      mockPointsRepo.insertBadgeAward.mockResolvedValue(undefined);

      const result = await badgesService.evaluateBadgesForSession({
        session: mockSession,
        metrics: mockMetrics,
        trx: mockTrx as never,
      });

      expect(result).toHaveLength(1);
      expect(result[0].badgeCode).toBe("first_session");
      expect(result[0].metadata.session_id).toBe("session-123");
      expect(mockPointsRepo.insertBadgeAward).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          badge_type: "first_session",
        }),
        mockTrx,
      );
    });

    it("should not award FIRST_SESSION if user already has it", async () => {
      const mockSession: SessionWithExercises = {
        id: "session-123",
        owner_id: "user-123",
        completed_at: "2024-01-01T00:00:00Z",
      } as SessionWithExercises;

      const mockMetrics: SessionMetricsSnapshot = {
        runDistanceMeters: 0,
        rideDistanceMeters: 0,
        totalVolumeKg: 0,
        totalReps: 0,
        totalDurationSec: 0,
      };

      mockPointsRepo.getBadgeCatalog.mockResolvedValue(new Set(["first_session", "streak_7_day"]));
      mockPointsRepo.getUserBadgeCodes.mockResolvedValue(new Set(["first_session"]));
      mockPointsRepo.getCompletedSessionDatesInRange.mockResolvedValue(new Set());

      const result = await badgesService.evaluateBadgesForSession({
        session: mockSession,
        metrics: mockMetrics,
        trx: mockTrx as never,
      });

      expect(result).toEqual([]);
      expect(mockPointsRepo.insertBadgeAward).not.toHaveBeenCalled();
    });

    it("should not award FIRST_SESSION if user has multiple sessions", async () => {
      const mockSession: SessionWithExercises = {
        id: "session-123",
        owner_id: "user-123",
        completed_at: "2024-01-01T00:00:00Z",
      } as SessionWithExercises;

      const mockMetrics: SessionMetricsSnapshot = {
        runDistanceMeters: 0,
        rideDistanceMeters: 0,
        totalVolumeKg: 0,
        totalReps: 0,
        totalDurationSec: 0,
      };

      mockPointsRepo.getBadgeCatalog.mockResolvedValue(new Set(["first_session"]));
      mockPointsRepo.getUserBadgeCodes.mockResolvedValue(new Set());
      mockPointsRepo.countCompletedSessions.mockResolvedValue(5);
      mockPointsRepo.getCompletedSessionDatesInRange.mockResolvedValue(new Set());

      const result = await badgesService.evaluateBadgesForSession({
        session: mockSession,
        metrics: mockMetrics,
        trx: mockTrx as never,
      });

      expect(result).toEqual([]);
    });

    it("should award STREAK_7_DAY badge for 7 consecutive days of sessions", async () => {
      const mockSession: SessionWithExercises = {
        id: "session-123",
        owner_id: "user-123",
        completed_at: "2024-01-07T12:00:00Z",
      } as SessionWithExercises;

      const mockMetrics: SessionMetricsSnapshot = {
        runDistanceMeters: 0,
        rideDistanceMeters: 0,
        totalVolumeKg: 0,
        totalReps: 0,
        totalDurationSec: 0,
      };

      mockPointsRepo.getBadgeCatalog.mockResolvedValue(new Set(["streak_7_day"]));
      mockPointsRepo.getUserBadgeCodes.mockResolvedValue(new Set());
      mockPointsRepo.getCompletedSessionDatesInRange.mockResolvedValue(
        new Set([
          "2024-01-01",
          "2024-01-02",
          "2024-01-03",
          "2024-01-04",
          "2024-01-05",
          "2024-01-06",
          "2024-01-07",
        ]),
      );
      mockPointsRepo.insertBadgeAward.mockResolvedValue(undefined);

      const result = await badgesService.evaluateBadgesForSession({
        session: mockSession,
        metrics: mockMetrics,
        trx: mockTrx as never,
      });

      expect(result).toHaveLength(1);
      expect(result[0].badgeCode).toBe("streak_7_day");
      expect(result[0].metadata.streak_days).toBe(7);
      expect(result[0].metadata.start_date).toBe("2024-01-01");
      expect(result[0].metadata.end_date).toBe("2024-01-07");
    });

    it("should not award STREAK_7_DAY if user missed a day", async () => {
      const mockSession: SessionWithExercises = {
        id: "session-123",
        owner_id: "user-123",
        completed_at: "2024-01-07T12:00:00Z",
      } as SessionWithExercises;

      const mockMetrics: SessionMetricsSnapshot = {
        runDistanceMeters: 0,
        rideDistanceMeters: 0,
        totalVolumeKg: 0,
        totalReps: 0,
        totalDurationSec: 0,
      };

      mockPointsRepo.getBadgeCatalog.mockResolvedValue(new Set(["streak_7_day"]));
      mockPointsRepo.getUserBadgeCodes.mockResolvedValue(new Set());
      mockPointsRepo.getCompletedSessionDatesInRange.mockResolvedValue(
        new Set([
          "2024-01-01",
          "2024-01-02",
          // Missing 2024-01-03
          "2024-01-04",
          "2024-01-05",
          "2024-01-06",
          "2024-01-07",
        ]),
      );

      const result = await badgesService.evaluateBadgesForSession({
        session: mockSession,
        metrics: mockMetrics,
        trx: mockTrx as never,
      });

      expect(result).toEqual([]);
      expect(mockPointsRepo.insertBadgeAward).not.toHaveBeenCalled();
    });

    it("should award RUN_10K badge for running 10km", async () => {
      const mockSession: SessionWithExercises = {
        id: "session-123",
        owner_id: "user-123",
        completed_at: "2024-01-01T00:00:00Z",
      } as SessionWithExercises;

      const mockMetrics: SessionMetricsSnapshot = {
        runDistanceMeters: 10000,
        rideDistanceMeters: 0,
        totalVolumeKg: 0,
        totalReps: 0,
        totalDurationSec: 0,
      };

      mockPointsRepo.getBadgeCatalog.mockResolvedValue(new Set(["run_10k"]));
      mockPointsRepo.getUserBadgeCodes.mockResolvedValue(new Set());
      mockPointsRepo.insertBadgeAward.mockResolvedValue(undefined);

      const result = await badgesService.evaluateBadgesForSession({
        session: mockSession,
        metrics: mockMetrics,
        trx: mockTrx as never,
      });

      expect(result).toHaveLength(1);
      expect(result[0].badgeCode).toBe("run_10k");
      expect(result[0].metadata.distance_m).toBe(10000);
    });

    it("should not award RUN_10K if distance is less than 10km", async () => {
      const mockSession: SessionWithExercises = {
        id: "session-123",
        owner_id: "user-123",
        completed_at: "2024-01-01T00:00:00Z",
      } as SessionWithExercises;

      const mockMetrics: SessionMetricsSnapshot = {
        runDistanceMeters: 9999,
        rideDistanceMeters: 0,
        totalVolumeKg: 0,
        totalReps: 0,
        totalDurationSec: 0,
      };

      mockPointsRepo.getBadgeCatalog.mockResolvedValue(new Set(["run_10k"]));
      mockPointsRepo.getUserBadgeCodes.mockResolvedValue(new Set());

      const result = await badgesService.evaluateBadgesForSession({
        session: mockSession,
        metrics: mockMetrics,
        trx: mockTrx as never,
      });

      expect(result).toEqual([]);
    });

    it("should award RIDE_100K badge for cycling 100km", async () => {
      const mockSession: SessionWithExercises = {
        id: "session-123",
        owner_id: "user-123",
        completed_at: "2024-01-01T00:00:00Z",
      } as SessionWithExercises;

      const mockMetrics: SessionMetricsSnapshot = {
        runDistanceMeters: 0,
        rideDistanceMeters: 100000,
        totalVolumeKg: 0,
        totalReps: 0,
        totalDurationSec: 0,
      };

      mockPointsRepo.getBadgeCatalog.mockResolvedValue(new Set(["ride_100k"]));
      mockPointsRepo.getUserBadgeCodes.mockResolvedValue(new Set());
      mockPointsRepo.insertBadgeAward.mockResolvedValue(undefined);

      const result = await badgesService.evaluateBadgesForSession({
        session: mockSession,
        metrics: mockMetrics,
        trx: mockTrx as never,
      });

      expect(result).toHaveLength(1);
      expect(result[0].badgeCode).toBe("ride_100k");
      expect(result[0].metadata.distance_m).toBe(100000);
    });

    it("should not award RIDE_100K if distance is less than 100km", async () => {
      const mockSession: SessionWithExercises = {
        id: "session-123",
        owner_id: "user-123",
        completed_at: "2024-01-01T00:00:00Z",
      } as SessionWithExercises;

      const mockMetrics: SessionMetricsSnapshot = {
        runDistanceMeters: 0,
        rideDistanceMeters: 99999,
        totalVolumeKg: 0,
        totalReps: 0,
        totalDurationSec: 0,
      };

      mockPointsRepo.getBadgeCatalog.mockResolvedValue(new Set(["ride_100k"]));
      mockPointsRepo.getUserBadgeCodes.mockResolvedValue(new Set());

      const result = await badgesService.evaluateBadgesForSession({
        session: mockSession,
        metrics: mockMetrics,
        trx: mockTrx as never,
      });

      expect(result).toEqual([]);
    });

    it("should award multiple badges in single session", async () => {
      const mockSession: SessionWithExercises = {
        id: "session-123",
        owner_id: "user-123",
        completed_at: "2024-01-01T00:00:00Z",
      } as SessionWithExercises;

      const mockMetrics: SessionMetricsSnapshot = {
        runDistanceMeters: 10000,
        rideDistanceMeters: 100000,
        totalVolumeKg: 0,
        totalReps: 0,
        totalDurationSec: 0,
      };

      mockPointsRepo.getBadgeCatalog.mockResolvedValue(
        new Set(["first_session", "run_10k", "ride_100k"]),
      );
      mockPointsRepo.getUserBadgeCodes.mockResolvedValue(new Set());
      mockPointsRepo.countCompletedSessions.mockResolvedValue(1);
      mockPointsRepo.insertBadgeAward.mockResolvedValue(undefined);

      const result = await badgesService.evaluateBadgesForSession({
        session: mockSession,
        metrics: mockMetrics,
        trx: mockTrx as never,
      });

      expect(result).toHaveLength(3);
      const badgeCodes = result.map((r) => r.badgeCode);
      expect(badgeCodes).toContain("first_session");
      expect(badgeCodes).toContain("run_10k");
      expect(badgeCodes).toContain("ride_100k");
    });

    it("should not award badge if not in catalog", async () => {
      const mockSession: SessionWithExercises = {
        id: "session-123",
        owner_id: "user-123",
        completed_at: "2024-01-01T00:00:00Z",
      } as SessionWithExercises;

      const mockMetrics: SessionMetricsSnapshot = {
        runDistanceMeters: 10000,
        rideDistanceMeters: 0,
        totalVolumeKg: 0,
        totalReps: 0,
        totalDurationSec: 0,
      };

      mockPointsRepo.getBadgeCatalog.mockResolvedValue(new Set()); // Empty catalog
      mockPointsRepo.getUserBadgeCodes.mockResolvedValue(new Set());

      const result = await badgesService.evaluateBadgesForSession({
        session: mockSession,
        metrics: mockMetrics,
        trx: mockTrx as never,
      });

      expect(result).toEqual([]);
      expect(mockPointsRepo.insertBadgeAward).not.toHaveBeenCalled();
    });

    it("should handle session without completed_at timestamp", async () => {
      const mockSession: SessionWithExercises = {
        id: "session-123",
        owner_id: "user-123",
        completed_at: null,
      } as never;

      const mockMetrics: SessionMetricsSnapshot = {
        runDistanceMeters: 10000,
        rideDistanceMeters: 0,
        totalVolumeKg: 0,
        totalReps: 0,
        totalDurationSec: 0,
      };

      mockPointsRepo.getBadgeCatalog.mockResolvedValue(new Set(["run_10k"]));
      mockPointsRepo.getUserBadgeCodes.mockResolvedValue(new Set());
      mockPointsRepo.insertBadgeAward.mockResolvedValue(undefined);

      const result = await badgesService.evaluateBadgesForSession({
        session: mockSession,
        metrics: mockMetrics,
        trx: mockTrx as never,
      });

      // Should still work, using current time as fallback
      expect(result).toHaveLength(1);
      expect(result[0].badgeCode).toBe("run_10k");
    });
  });
});
