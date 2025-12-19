import {
  purgeStaleIdempotencyKeys,
  purgeExpiredAuthTokens,
  purgeExpiredRefreshTokens,
  purgeUnverifiedAccounts,
  runRetentionSweep,
} from "../../../apps/backend/src/services/retention.service.js";
import * as dsrService from "../../../apps/backend/src/modules/users/dsr.service.js";

// Mock dependencies
jest.mock("../../../apps/backend/src/modules/users/dsr.service.js", () => ({
  processDueAccountDeletions: jest.fn().mockResolvedValue(0),
}));

const mockQueryBuilders: Record<string, any> = {};

function createMockQueryBuilder() {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    del: jest.fn().mockResolvedValue(0),
  };
}

jest.mock("../../../apps/backend/src/db/connection.js", () => {
  const mockDbFunction = jest.fn((table: string) => {
    if (!mockQueryBuilders[table]) {
      mockQueryBuilders[table] = createMockQueryBuilder();
    }
    return mockQueryBuilders[table];
  });

  return {
    db: mockDbFunction,
  };
});

const mockDsrService = jest.mocked(dsrService);

describe("Retention Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear query builders
    Object.keys(mockQueryBuilders).forEach((key) => delete mockQueryBuilders[key]);
  });

  describe("purgeStaleIdempotencyKeys", () => {
    it("should purge idempotency keys older than 24 hours", async () => {
      const mockDel = jest.fn().mockResolvedValue(5);
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.del = mockDel;
      mockQueryBuilders["idempotency_keys"] = mockQueryBuilder;

      const result = await purgeStaleIdempotencyKeys();

      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockDel).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it("should use custom date when provided", async () => {
      const customDate = new Date("2024-01-15T12:00:00Z");
      const mockDel = jest.fn().mockResolvedValue(3);
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.del = mockDel;
      mockQueryBuilders["idempotency_keys"] = mockQueryBuilder;

      await purgeStaleIdempotencyKeys(customDate);

      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });
  });

  describe("purgeExpiredAuthTokens", () => {
    it("should purge expired auth tokens", async () => {
      const mockDel = jest.fn().mockResolvedValue(10);
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.del = mockDel;
      mockQueryBuilders["auth_tokens"] = mockQueryBuilder;

      const result = await purgeExpiredAuthTokens();

      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockDel).toHaveBeenCalled();
      expect(result).toBe(10);
    });

    it("should use custom date when provided", async () => {
      const customDate = new Date("2024-01-15T12:00:00Z");
      const mockDel = jest.fn().mockResolvedValue(2);
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.del = mockDel;
      mockQueryBuilders["auth_tokens"] = mockQueryBuilder;

      await purgeExpiredAuthTokens(customDate);

      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });
  });

  describe("purgeExpiredRefreshTokens", () => {
    it("should purge expired refresh tokens", async () => {
      const mockDel = jest.fn().mockResolvedValue(8);
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.del = mockDel;
      mockQueryBuilders["refresh_tokens"] = mockQueryBuilder;

      const result = await purgeExpiredRefreshTokens();

      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.orWhere).toHaveBeenCalled();
      expect(mockDel).toHaveBeenCalled();
      expect(result).toBe(8);
    });

    it("should use custom date when provided", async () => {
      const customDate = new Date("2024-01-15T12:00:00Z");
      const mockDel = jest.fn().mockResolvedValue(4);
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.del = mockDel;
      mockQueryBuilders["refresh_tokens"] = mockQueryBuilder;

      await purgeExpiredRefreshTokens(customDate);

      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });
  });

  describe("purgeUnverifiedAccounts", () => {
    it("should purge unverified accounts older than 7 days", async () => {
      const mockDel = jest.fn().mockResolvedValue(2);
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.del = mockDel;
      mockQueryBuilders["users"] = mockQueryBuilder;

      const result = await purgeUnverifiedAccounts();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith("status", "pending_verification");
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      expect(mockDel).toHaveBeenCalled();
      expect(result).toBe(2);
    });

    it("should use custom date when provided", async () => {
      const customDate = new Date("2024-01-15T12:00:00Z");
      const mockDel = jest.fn().mockResolvedValue(1);
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.del = mockDel;
      mockQueryBuilders["users"] = mockQueryBuilder;

      await purgeUnverifiedAccounts(customDate);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith("status", "pending_verification");
    });
  });

  describe("runRetentionSweep", () => {
    it("should run all retention tasks and return summary", async () => {
      const mockDel = jest.fn().mockResolvedValue(1);
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.del = mockDel;
      mockQueryBuilders["idempotency_keys"] = mockQueryBuilder;
      mockQueryBuilders["auth_tokens"] = mockQueryBuilder;
      mockQueryBuilders["refresh_tokens"] = mockQueryBuilder;
      mockQueryBuilders["users"] = mockQueryBuilder;
      mockDsrService.processDueAccountDeletions.mockResolvedValue(3);

      const result = await runRetentionSweep();

      expect(result).toHaveProperty("purgedIdempotencyKeys");
      expect(result).toHaveProperty("purgedAuthTokens");
      expect(result).toHaveProperty("purgedRefreshTokens");
      expect(result).toHaveProperty("purgedUnverifiedAccounts");
      expect(result).toHaveProperty("processedDsrRequests");
      expect(result.processedDsrRequests).toBe(3);
    });

    it("should use custom date when provided", async () => {
      const customDate = new Date("2024-01-15T12:00:00Z");
      const mockDel = jest.fn().mockResolvedValue(0);
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.del = mockDel;
      mockQueryBuilders["idempotency_keys"] = mockQueryBuilder;
      mockQueryBuilders["auth_tokens"] = mockQueryBuilder;
      mockQueryBuilders["refresh_tokens"] = mockQueryBuilder;
      mockQueryBuilders["users"] = mockQueryBuilder;
      mockDsrService.processDueAccountDeletions.mockResolvedValue(0);

      const result = await runRetentionSweep(customDate);

      expect(result).toHaveProperty("purgedIdempotencyKeys");
      expect(result).toHaveProperty("purgedAuthTokens");
      expect(result).toHaveProperty("purgedRefreshTokens");
      expect(result).toHaveProperty("purgedUnverifiedAccounts");
      expect(result).toHaveProperty("processedDsrRequests");
    });
  });
});

