import * as decayService from "../../../../apps/backend/src/jobs/services/vibe-level-decay.service.js";
import * as pointsRepository from "../../../../apps/backend/src/modules/points/points.repository.js";

// Mock dependencies
jest.mock("../../../../apps/backend/src/modules/points/points.repository.js");

// Mock db with proper query builder chaining
let mockSelectResult: unknown[] = [];

jest.mock("../../../../apps/backend/src/db/connection.js", () => {
  const createMockQueryBuilder = () => {
    return {
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockImplementation(() => {
        // Access the outer scope's mockSelectResult
        return Promise.resolve(mockSelectResult);
      }),
    };
  };

  const mockDb = jest.fn(() => createMockQueryBuilder()) as jest.Mock & {
    transaction: jest.Mock;
  };

  mockDb.transaction = jest.fn((cb) => {
    const trx = createMockQueryBuilder();
    return Promise.resolve(cb(trx));
  });

  return {
    db: mockDb,
  };
});

const mockPointsRepo = jest.mocked(pointsRepository);

// Import the mocked db
import { db } from "../../../../apps/backend/src/db/connection.js";
const mockDb = db as jest.Mock & { transaction: jest.Mock };

describe("Vibe Level Decay Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectResult = [];
  });

  describe("applyVibeLevelDecay", () => {
    it("should apply decay to stale ratings", async () => {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 2); // 2 days ago

      mockSelectResult = [
        {
          user_id: "user-1",
          domain_code: "strength",
          vibe_level: 1500,
          rating_deviation: 50,
          volatility: 0.06,
          last_updated_at: oneDayAgo.toISOString(),
        },
      ];

      mockPointsRepo.updateDomainVibeLevel.mockResolvedValue();
      mockPointsRepo.insertVibeLevelChange.mockResolvedValue({
        id: "change-1",
        user_id: "user-1",
        domain_code: "strength",
        session_id: null,
        old_vibe_level: 1500,
        new_vibe_level: 1498, // 2 days * 1 point/day = 2 point loss
        old_rd: 50,
        new_rd: 54, // 2 days * 2 points/day = 4 point increase
        change_amount: -2,
        performance_score: null,
        domain_impact: null,
        points_awarded: null,
        change_reason: "decay",
        metadata: {},
        created_at: new Date().toISOString(),
      });

      await decayService.applyVibeLevelDecay();

      expect(mockDb).toHaveBeenCalledWith("user_domain_vibe_levels");
      expect(mockPointsRepo.updateDomainVibeLevel).toHaveBeenCalledWith(
        "user-1",
        "strength",
        1498, // 1500 - 2
        54, // 50 + 4
        expect.any(Number), // volatility
        expect.any(Object), // transaction
      );
      expect(mockPointsRepo.insertVibeLevelChange).toHaveBeenCalled();
    });

    it("should not decay ratings updated within last day", async () => {
      const recentDate = new Date();
      recentDate.setHours(recentDate.getHours() - 12); // 12 hours ago

      mockSelectResult = [
        {
          user_id: "user-1",
          domain_code: "strength",
          vibe_level: 1500,
          rating_deviation: 50,
          volatility: 0.06,
          last_updated_at: recentDate.toISOString(),
        },
      ];

      await decayService.applyVibeLevelDecay();

      expect(mockPointsRepo.updateDomainVibeLevel).not.toHaveBeenCalled();
    });

    it("should cap decay at maximum values", async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      mockSelectResult = [
        {
          user_id: "user-1",
          domain_code: "strength",
          vibe_level: 1500,
          rating_deviation: 50,
          volatility: 0.06,
          last_updated_at: thirtyDaysAgo.toISOString(),
        },
      ];

      mockPointsRepo.updateDomainVibeLevel.mockResolvedValue();
      mockPointsRepo.insertVibeLevelChange.mockResolvedValue({
        id: "change-1",
        user_id: "user-1",
        domain_code: "strength",
        session_id: null,
        old_vibe_level: 1500,
        new_vibe_level: 1450, // Max 50 point loss
        old_rd: 50,
        new_rd: 100, // Max 50 point increase (50 + 50 = 100)
        change_amount: -50,
        performance_score: null,
        domain_impact: null,
        points_awarded: null,
        change_reason: "decay",
        metadata: {},
        created_at: new Date().toISOString(),
      });

      await decayService.applyVibeLevelDecay();

      expect(mockPointsRepo.updateDomainVibeLevel).toHaveBeenCalledWith(
        "user-1",
        "strength",
        1470, // 1500 - 30 (30 days * 1 point/day, capped at 50 but 30 < 50)
        100, // 50 + 50 (30 days * 2 points/day = 60, but capped at 50, so 50 + 50 = 100)
        expect.any(Number),
        expect.any(Object),
      );
    });

    it("should not decay below minimum vibe level", async () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      mockSelectResult = [
        {
          user_id: "user-1",
          domain_code: "strength",
          vibe_level: 105, // Low vibe level
          rating_deviation: 50,
          volatility: 0.06,
          last_updated_at: tenDaysAgo.toISOString(),
        },
      ];

      mockPointsRepo.updateDomainVibeLevel.mockResolvedValue();
      mockPointsRepo.insertVibeLevelChange.mockResolvedValue({
        id: "change-1",
        user_id: "user-1",
        domain_code: "strength",
        session_id: null,
        old_vibe_level: 105,
        new_vibe_level: 100, // Clamped to minimum
        old_rd: 50,
        new_rd: 70, // 50 + (10 * 2) = 70
        change_amount: -5,
        performance_score: null,
        domain_impact: null,
        points_awarded: null,
        change_reason: "decay",
        metadata: {},
        created_at: new Date().toISOString(),
      });

      await decayService.applyVibeLevelDecay();

      expect(mockPointsRepo.updateDomainVibeLevel).toHaveBeenCalledWith(
        "user-1",
        "strength",
        100, // Clamped to minimum
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
      );
    });

    it("should handle multiple stale ratings", async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      mockSelectResult = [
        {
          user_id: "user-1",
          domain_code: "strength",
          vibe_level: 1500,
          rating_deviation: 50,
          volatility: 0.06,
          last_updated_at: twoDaysAgo.toISOString(),
        },
        {
          user_id: "user-1",
          domain_code: "endurance",
          vibe_level: 1200,
          rating_deviation: 100,
          volatility: 0.06,
          last_updated_at: twoDaysAgo.toISOString(),
        },
        {
          user_id: "user-2",
          domain_code: "strength",
          vibe_level: 2000,
          rating_deviation: 30,
          volatility: 0.06,
          last_updated_at: twoDaysAgo.toISOString(),
        },
      ];

      mockPointsRepo.updateDomainVibeLevel.mockResolvedValue();
      mockPointsRepo.insertVibeLevelChange.mockResolvedValue({
        id: "change-1",
        user_id: "user-1",
        domain_code: "strength",
        session_id: null,
        old_vibe_level: 1500,
        new_vibe_level: 1498,
        old_rd: 50,
        new_rd: 54,
        change_amount: -2,
        performance_score: null,
        domain_impact: null,
        points_awarded: null,
        change_reason: "decay",
        metadata: {},
        created_at: new Date().toISOString(),
      });

      await decayService.applyVibeLevelDecay();

      // Should process all stale ratings
      expect(mockPointsRepo.updateDomainVibeLevel).toHaveBeenCalledTimes(3);
      expect(mockPointsRepo.insertVibeLevelChange).toHaveBeenCalledTimes(3);
    });
  });
});
