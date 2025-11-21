import { db } from "../../../db/connection.js";
import * as bruteforceRepository from "../bruteforce.repository.js";

jest.mock("../../../db/connection.js", () => ({
  db: jest.fn(),
}));

const mockDb = jest.mocked(db);

describe("Bruteforce Repository", () => {
  let mockQueryBuilder: {
    insert: jest.Mock;
    update: jest.Mock;
    del: jest.Mock;
    select: jest.Mock;
    where: jest.Mock;
    first: jest.Mock;
    returning: jest.Mock;
  };

  beforeEach(() => {
    mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockReturnThis(),
      returning: jest.fn(),
    };
    mockDb.mockReturnValue(mockQueryBuilder as never);
    jest.clearAllMocks();
  });

  describe("getFailedAttempt", () => {
    it("should return failed attempt record", async () => {
      const mockAttempt = {
        id: "attempt-123",
        identifier: "test@example.com",
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
        attempt_count: 3,
        locked_until: null,
        last_attempt_at: new Date("2024-01-01T10:00:00Z"),
        first_attempt_at: new Date("2024-01-01T09:00:00Z"),
        created_at: new Date("2024-01-01T09:00:00Z"),
        updated_at: new Date("2024-01-01T10:00:00Z"),
      };

      mockQueryBuilder.first.mockResolvedValue(mockAttempt);

      const result = await bruteforceRepository.getFailedAttempt("test@example.com", "192.168.1.1");

      expect(mockDb).toHaveBeenCalledWith("failed_login_attempts");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        identifier: "test@example.com",
        ip_address: "192.168.1.1",
      });
      expect(result).toMatchObject({
        identifier: "test@example.com",
        ip_address: "192.168.1.1",
        attempt_count: 3,
        locked_until: null,
      });
    });

    it("should return null if no record found", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await bruteforceRepository.getFailedAttempt(
        "nonexistent@example.com",
        "192.168.1.1",
      );

      expect(result).toBeNull();
    });

    it("should handle locked_until timestamp", async () => {
      const lockedUntil = new Date("2024-01-01T11:00:00Z");
      const mockAttempt = {
        id: "attempt-456",
        identifier: "locked@example.com",
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
        attempt_count: 10,
        locked_until: lockedUntil,
        last_attempt_at: new Date("2024-01-01T10:00:00Z"),
        first_attempt_at: new Date("2024-01-01T09:00:00Z"),
        created_at: new Date("2024-01-01T09:00:00Z"),
        updated_at: new Date("2024-01-01T10:00:00Z"),
      };

      mockQueryBuilder.first.mockResolvedValue(mockAttempt);

      const result = await bruteforceRepository.getFailedAttempt(
        "locked@example.com",
        "192.168.1.1",
      );

      expect(result?.locked_until).toBeTruthy();
    });
  });

  describe("recordFailedAttempt", () => {
    it("should create new failed attempt record if none exists", async () => {
      const now = new Date("2024-01-01T10:00:00Z");
      jest.useFakeTimers();
      jest.setSystemTime(now);

      // First query returns no existing record
      mockQueryBuilder.first.mockResolvedValueOnce(undefined);

      // Insert doesn't return anything (we return a constructed object)
      mockQueryBuilder.insert.mockResolvedValue(undefined);

      const result = await bruteforceRepository.recordFailedAttempt(
        "new@example.com",
        "192.168.1.1",
        "Mozilla/5.0",
      );

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: "new@example.com",
          ip_address: "192.168.1.1",
          attempt_count: 1,
          locked_until: null,
        }),
      );
      expect(result.attempt_count).toBe(1);
      expect(result.locked_until).toBeNull();

      jest.useRealTimers();
    });

    it("should increment attempt count for existing record", async () => {
      const now = new Date("2024-01-01T10:00:00Z");
      jest.useFakeTimers();
      jest.setSystemTime(now);

      // Existing record with 4 attempts (not locked yet)
      const existingRecord = {
        id: "attempt-123",
        identifier: "repeat@example.com",
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
        attempt_count: 4,
        locked_until: null,
        last_attempt_at: new Date("2024-01-01T09:00:00Z").toISOString(),
        first_attempt_at: new Date("2024-01-01T08:00:00Z").toISOString(),
        created_at: new Date("2024-01-01T08:00:00Z").toISOString(),
        updated_at: new Date("2024-01-01T09:00:00Z").toISOString(),
      };
      mockQueryBuilder.first.mockResolvedValueOnce(existingRecord);

      // Update doesn't return anything
      mockQueryBuilder.update.mockResolvedValueOnce(undefined);

      const result = await bruteforceRepository.recordFailedAttempt(
        "repeat@example.com",
        "192.168.1.1",
        "Mozilla/5.0",
      );

      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(result.attempt_count).toBe(5);

      jest.useRealTimers();
    });

    it("should apply 15 minute lockout for 5-9 attempts", async () => {
      const now = new Date("2024-01-01T10:00:00Z");
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const existingRecord = {
        id: "attempt-456",
        identifier: "locked15@example.com",
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
        attempt_count: 4,
        locked_until: null,
        last_attempt_at: new Date("2024-01-01T09:00:00Z").toISOString(),
        first_attempt_at: new Date("2024-01-01T08:00:00Z").toISOString(),
        created_at: new Date("2024-01-01T08:00:00Z").toISOString(),
        updated_at: new Date("2024-01-01T09:00:00Z").toISOString(),
      };
      mockQueryBuilder.first.mockResolvedValueOnce(existingRecord);
      mockQueryBuilder.update.mockResolvedValueOnce(undefined);

      const result = await bruteforceRepository.recordFailedAttempt(
        "locked15@example.com",
        "192.168.1.1",
        "Mozilla/5.0",
      );

      expect(result.attempt_count).toBe(5);
      expect(result.locked_until).toBeTruthy();

      jest.useRealTimers();
    });

    it("should apply 1 hour lockout for 10-19 attempts", async () => {
      const now = new Date("2024-01-01T10:00:00Z");
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const existingRecord = {
        id: "attempt-789",
        identifier: "locked1h@example.com",
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
        attempt_count: 9,
        locked_until: null,
        last_attempt_at: new Date("2024-01-01T09:00:00Z").toISOString(),
        first_attempt_at: new Date("2024-01-01T08:00:00Z").toISOString(),
        created_at: new Date("2024-01-01T08:00:00Z").toISOString(),
        updated_at: new Date("2024-01-01T09:00:00Z").toISOString(),
      };
      mockQueryBuilder.first.mockResolvedValueOnce(existingRecord);
      mockQueryBuilder.update.mockResolvedValueOnce(undefined);

      const result = await bruteforceRepository.recordFailedAttempt(
        "locked1h@example.com",
        "192.168.1.1",
        "Mozilla/5.0",
      );

      expect(result.attempt_count).toBe(10);
      expect(result.locked_until).toBeTruthy();

      jest.useRealTimers();
    });

    it("should apply 24 hour lockout for 20+ attempts", async () => {
      const now = new Date("2024-01-01T10:00:00Z");
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const existingRecord = {
        id: "attempt-012",
        identifier: "locked24h@example.com",
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
        attempt_count: 19,
        locked_until: null,
        last_attempt_at: new Date("2024-01-01T09:00:00Z").toISOString(),
        first_attempt_at: new Date("2024-01-01T08:00:00Z").toISOString(),
        created_at: new Date("2024-01-01T08:00:00Z").toISOString(),
        updated_at: new Date("2024-01-01T09:00:00Z").toISOString(),
      };
      mockQueryBuilder.first.mockResolvedValueOnce(existingRecord);
      mockQueryBuilder.update.mockResolvedValueOnce(undefined);

      const result = await bruteforceRepository.recordFailedAttempt(
        "locked24h@example.com",
        "192.168.1.1",
        "Mozilla/5.0",
      );

      expect(result.attempt_count).toBe(20);
      expect(result.locked_until).toBeTruthy();

      jest.useRealTimers();
    });
  });

  describe("resetFailedAttempts", () => {
    it("should delete failed attempt record on successful login", async () => {
      await bruteforceRepository.resetFailedAttempts("success@example.com", "192.168.1.1");

      expect(mockDb).toHaveBeenCalledWith("failed_login_attempts");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        identifier: "success@example.com",
        ip_address: "192.168.1.1",
      });
      expect(mockQueryBuilder.del).toHaveBeenCalled();
    });

    it("should work with transaction", async () => {
      const mockTrx = jest.fn().mockReturnValue(mockQueryBuilder) as never;

      await bruteforceRepository.resetFailedAttempts("success@example.com", "192.168.1.1", mockTrx);

      expect(mockTrx).toHaveBeenCalledWith("failed_login_attempts");
      expect(mockQueryBuilder.del).toHaveBeenCalled();
    });
  });

  describe("isAccountLocked", () => {
    it("should return false if no attempt record", () => {
      const result = bruteforceRepository.isAccountLocked(null);
      expect(result).toBe(false);
    });

    it("should return false if not locked", () => {
      const attempt = {
        id: "attempt-123",
        identifier: "test@example.com",
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
        attempt_count: 3,
        locked_until: null,
        last_attempt_at: new Date().toISOString(),
        first_attempt_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = bruteforceRepository.isAccountLocked(attempt);
      expect(result).toBe(false);
    });

    it("should return true if locked and not expired", () => {
      const futureDate = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes from now
      const attempt = {
        id: "attempt-456",
        identifier: "test@example.com",
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
        attempt_count: 5,
        locked_until: futureDate,
        last_attempt_at: new Date().toISOString(),
        first_attempt_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = bruteforceRepository.isAccountLocked(attempt);
      expect(result).toBe(true);
    });

    it("should return false if lockout expired", () => {
      const pastDate = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 minutes ago
      const attempt = {
        id: "attempt-789",
        identifier: "test@example.com",
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
        attempt_count: 5,
        locked_until: pastDate,
        last_attempt_at: new Date().toISOString(),
        first_attempt_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = bruteforceRepository.isAccountLocked(attempt);
      expect(result).toBe(false);
    });
  });

  describe("getRemainingLockoutSeconds", () => {
    it("should return 0 if no attempt record", () => {
      const result = bruteforceRepository.getRemainingLockoutSeconds(null);
      expect(result).toBe(0);
    });

    it("should return 0 if not locked", () => {
      const attempt = {
        id: "attempt-123",
        identifier: "test@example.com",
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
        attempt_count: 3,
        locked_until: null,
        last_attempt_at: new Date().toISOString(),
        first_attempt_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = bruteforceRepository.getRemainingLockoutSeconds(attempt);
      expect(result).toBe(0);
    });

    it("should return remaining seconds if locked", () => {
      const now = Date.now();
      const futureDate = new Date(now + 10 * 60 * 1000).toISOString(); // 10 minutes from now
      const attempt = {
        id: "attempt-456",
        identifier: "test@example.com",
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
        attempt_count: 5,
        locked_until: futureDate,
        last_attempt_at: new Date().toISOString(),
        first_attempt_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = bruteforceRepository.getRemainingLockoutSeconds(attempt);
      expect(result).toBeGreaterThan(590); // ~10 minutes
      expect(result).toBeLessThanOrEqual(600);
    });

    it("should return 0 if lockout expired", () => {
      const pastDate = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 minutes ago
      const attempt = {
        id: "attempt-789",
        identifier: "test@example.com",
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
        attempt_count: 5,
        locked_until: pastDate,
        last_attempt_at: new Date().toISOString(),
        first_attempt_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = bruteforceRepository.getRemainingLockoutSeconds(attempt);
      expect(result).toBe(0);
    });
  });
});
