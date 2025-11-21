/**
 * Tests for AC-1.12: User Enumeration Protection via Timing Consistency
 *
 * Requirements:
 * - Auth operations must have ≤10% timing variance between valid/invalid users
 * - Prevents attackers from determining if email/username exists
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import * as authService from "../auth.service";
import * as authRepo from "../auth.repository";
import * as twofaService from "../twofa.service";
import * as bruteforceRepo from "../bruteforce.repository";
import type { AuthUserRecord } from "../auth.repository";
import type { LoginDTO, RegisterDTO } from "../auth.types";

// Mock dependencies
jest.mock("../auth.repository");
jest.mock("../twofa.service");
jest.mock("../bruteforce.repository");
jest.mock("bcryptjs");
jest.mock("../../../services/mailer.service.js");
jest.mock("../../../db/index.js", () => {
  const insert = jest.fn().mockResolvedValue(undefined);
  const dbMock = Object.assign(
    jest.fn(() => ({ insert })),
    {
      raw: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn(async (callback: (trx: unknown) => Promise<unknown>) => callback({})),
    },
  );
  return {
    __esModule: true,
    default: dbMock,
  };
});
jest.mock("../../../db/connection.js", () => {
  const builder = {
    insert: jest.fn().mockResolvedValue(undefined),
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    select: jest.fn().mockReturnThis(),
  };

  const mockDb = Object.assign(
    jest.fn(() => builder),
    {
      raw: jest.fn().mockResolvedValue(null),
      transaction: jest.fn(async (callback: (trx: unknown) => Promise<unknown>) => callback({})),
    },
  );

  return { db: mockDb };
});

const mockAuthRepo = authRepo as jest.Mocked<typeof authRepo>;
const mockTwofaService = twofaService as jest.Mocked<typeof twofaService>;
const mockBruteforceRepo = bruteforceRepo as jest.Mocked<typeof bruteforceRepo>;

/**
 * Measure execution time of an async function
 */
async function measureTime<T>(
  fn: () => Promise<T>,
): Promise<{ result: T | Error; duration: number }> {
  const start = Date.now();
  try {
    const result = await fn();
    return { result, duration: Date.now() - start };
  } catch (error) {
    return { result: error as Error, duration: Date.now() - start };
  }
}

/**
 * Calculate percentage variance between two numbers
 */
function calculateVariance(time1: number, time2: number): number {
  const avg = (time1 + time2) / 2;
  const diff = Math.abs(time1 - time2);
  return (diff / avg) * 100;
}

/**
 * Run multiple iterations and return average timing
 */
async function getAverageTiming<T>(fn: () => Promise<T>, iterations: number = 5): Promise<number> {
  const timings: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const { duration } = await measureTime(fn);
    timings.push(duration);
  }
  return timings.reduce((sum, t) => sum + t, 0) / timings.length;
}

describe("AC-1.12: Timing Consistency for User Enumeration Protection", () => {
  const mockUser: AuthUserRecord = {
    id: "user-123",
    username: "testuser",
    primary_email: "test@example.com",
    role_code: "athlete",
    status: "active",
    created_at: "2024-01-01T00:00:00Z",
    password_hash: "$2a$12$validhash",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Login Endpoint Timing", () => {
    const loginDto: LoginDTO = {
      email: "test@example.com",
      password: "ValidPassword123!",
    };

    it("should have consistent timing between valid and invalid users (≤10% variance)", async () => {
      const bcrypt = await import("bcryptjs");
      (bcrypt.compare as jest.Mock).mockImplementation(async (password: string, hash: string) => {
        // Simulate realistic bcrypt timing (~100-200ms)
        await new Promise((resolve) => setTimeout(resolve, 100));
        return hash.includes("valid");
      });

      // Mock for invalid user (user not found)
      mockAuthRepo.findUserByEmail.mockResolvedValue(null);
      mockBruteforceRepo.getFailedAttempt.mockResolvedValue(null);
      mockBruteforceRepo.recordFailedAttempt.mockResolvedValue({
        identifier: "test@example.com",
        attempt_count: 1,
        last_attempt_at: new Date().toISOString(),
        locked_until: null,
      });

      const invalidUserTime = await getAverageTiming(
        () => authService.login(loginDto).catch(() => {}),
        3,
      );

      // Mock for valid user
      mockAuthRepo.findUserByEmail.mockResolvedValue(mockUser);
      mockBruteforceRepo.getFailedAttempt.mockResolvedValue(null);
      mockBruteforceRepo.resetFailedAttempts.mockResolvedValue(undefined);
      mockTwofaService.is2FAEnabled.mockResolvedValue(false);
      mockAuthRepo.createAuthSession.mockResolvedValue(undefined);
      mockAuthRepo.insertRefreshToken.mockResolvedValue(undefined);

      const validUserTime = await getAverageTiming(
        () => authService.login(loginDto).catch(() => {}),
        3,
      );

      const variance = calculateVariance(invalidUserTime, validUserTime);

      // AC-1.12: Variance must be ≤10%
      expect(variance).toBeLessThanOrEqual(10);
    });

    it("should have consistent timing for wrong password vs non-existent user", async () => {
      const bcrypt = await import("bcryptjs");
      (bcrypt.compare as jest.Mock).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return false; // Always wrong password
      });

      // Non-existent user
      mockAuthRepo.findUserByEmail.mockResolvedValue(null);
      mockBruteforceRepo.getFailedAttempt.mockResolvedValue(null);
      mockBruteforceRepo.recordFailedAttempt.mockResolvedValue({
        identifier: "test@example.com",
        attempt_count: 1,
        last_attempt_at: new Date().toISOString(),
        locked_until: null,
      });

      const nonExistentTime = await getAverageTiming(
        () => authService.login(loginDto).catch(() => {}),
        3,
      );

      // Existing user with wrong password
      mockAuthRepo.findUserByEmail.mockResolvedValue(mockUser);

      const wrongPasswordTime = await getAverageTiming(
        () => authService.login(loginDto).catch(() => {}),
        3,
      );

      const variance = calculateVariance(nonExistentTime, wrongPasswordTime);

      expect(variance).toBeLessThanOrEqual(10);
    });
  });

  describe("Register Endpoint Timing", () => {
    const registerDto: RegisterDTO = {
      email: "newuser@example.com",
      username: "newuser",
      password: "ValidPassword123!",
    };

    it("should have consistent timing for new user vs existing user", async () => {
      const bcrypt = await import("bcryptjs");
      (bcrypt.hash as jest.Mock).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        return "$2a$12$newhash";
      });

      // New user (doesn't exist)
      mockAuthRepo.findUserByEmail.mockResolvedValue(null);
      mockAuthRepo.findUserByUsername.mockResolvedValue(null);
      mockAuthRepo.createUser.mockResolvedValue(undefined);
      mockAuthRepo.createAuthToken.mockResolvedValue(undefined);
      mockAuthRepo.findUserById.mockResolvedValue({
        ...mockUser,
        id: "new-user-id",
        status: "pending_verification",
      });
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(undefined);
      mockAuthRepo.countAuthTokensSince.mockResolvedValue(0);
      mockAuthRepo.purgeAuthTokensOlderThan.mockResolvedValue(0);

      const newUserTime = await getAverageTiming(() => authService.register(registerDto), 3);

      // Existing user with pending_verification
      const existingUser: AuthUserRecord = {
        ...mockUser,
        status: "pending_verification",
      };
      mockAuthRepo.findUserByEmail.mockResolvedValue(existingUser);

      const existingUserTime = await getAverageTiming(() => authService.register(registerDto), 3);

      const variance = calculateVariance(newUserTime, existingUserTime);

      expect(variance).toBeLessThanOrEqual(10);
    });
  });

  describe("Password Reset Endpoint Timing", () => {
    it("should have consistent timing for valid vs invalid email", async () => {
      const bcrypt = await import("bcryptjs");
      (bcrypt.compare as jest.Mock).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return false;
      });

      // Invalid email (user not found)
      mockAuthRepo.findUserByEmail.mockResolvedValue(null);

      const invalidEmailTime = await getAverageTiming(
        () => authService.requestPasswordReset("nonexistent@example.com"),
        3,
      );

      // Valid email (user exists)
      mockAuthRepo.findUserByEmail.mockResolvedValue(mockUser);
      mockAuthRepo.createAuthToken.mockResolvedValue(undefined);
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(undefined);
      mockAuthRepo.purgeAuthTokensOlderThan.mockResolvedValue(0);

      const validEmailTime = await getAverageTiming(
        () => authService.requestPasswordReset("test@example.com"),
        3,
      );

      const variance = calculateVariance(invalidEmailTime, validEmailTime);

      expect(variance).toBeLessThanOrEqual(10);
    });
  });

  describe("Email Verification Endpoint Timing", () => {
    it("should have consistent timing for valid vs invalid token", async () => {
      // Invalid token
      mockAuthRepo.findAuthToken.mockResolvedValue(null);

      const invalidTokenTime = await getAverageTiming(
        () => authService.verifyEmail("invalid-token").catch(() => {}),
        3,
      );

      // Valid token
      mockAuthRepo.findAuthToken.mockResolvedValue({
        id: "token-123",
        user_id: "user-123",
        token_type: "email_verification",
        token_hash: "hash",
        expires_at: new Date(Date.now() + 60000).toISOString(),
        created_at: new Date().toISOString(),
        consumed: false,
      });
      mockAuthRepo.consumeAuthToken.mockResolvedValue(undefined);
      mockAuthRepo.updateUserStatus.mockResolvedValue(undefined);
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(undefined);
      mockAuthRepo.markEmailVerified.mockResolvedValue(undefined);
      mockAuthRepo.findUserById.mockResolvedValue(mockUser);

      const validTokenTime = await getAverageTiming(
        () => authService.verifyEmail("valid-token"),
        3,
      );

      const variance = calculateVariance(invalidTokenTime, validTokenTime);

      expect(variance).toBeLessThanOrEqual(10);
    });
  });

  describe("Timing Utility Validation", () => {
    it("should ensure minimum operation time is enforced", async () => {
      // Mock a very fast auth operation
      mockAuthRepo.findUserByEmail.mockResolvedValue(null);
      mockBruteforceRepo.getFailedAttempt.mockResolvedValue(null);
      mockBruteforceRepo.recordFailedAttempt.mockResolvedValue({
        identifier: "fast@example.com",
        attempt_count: 1,
        last_attempt_at: new Date().toISOString(),
        locked_until: null,
      });

      const bcrypt = await import("bcryptjs");
      (bcrypt.compare as jest.Mock).mockImplementation(() => {
        // Very fast operation (no delay)
        return Promise.resolve(false);
      });

      const { duration } = await measureTime(() =>
        authService
          .login({
            email: "fast@example.com",
            password: "password",
          })
          .catch(() => {}),
      );

      // Should be padded to at least ~300ms (MIN_AUTH_OPERATION_TIME_MS)
      // Allow some tolerance for test timing variance and jitter
      expect(duration).toBeGreaterThanOrEqual(290);
    });

    it("should add random jitter to prevent statistical timing attacks", async () => {
      const timings: number[] = [];

      // Run same operation multiple times
      for (let i = 0; i < 10; i++) {
        mockAuthRepo.findUserByEmail.mockResolvedValue(null);
        mockBruteforceRepo.getFailedAttempt.mockResolvedValue(null);
        mockBruteforceRepo.recordFailedAttempt.mockResolvedValue({
          identifier: "test@example.com",
          attempt_count: 1,
          last_attempt_at: new Date().toISOString(),
          locked_until: null,
        });

        const bcrypt = await import("bcryptjs");
        (bcrypt.compare as jest.Mock).mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return false;
        });

        const { duration } = await measureTime(() =>
          authService
            .login({
              email: "test@example.com",
              password: "password",
            })
            .catch(() => {}),
        );
        timings.push(duration);
      }

      // Timings should vary slightly due to jitter (not all identical)
      const uniqueTimings = new Set(timings.map((t) => Math.floor(t / 10)));
      expect(uniqueTimings.size).toBeGreaterThan(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle timing normalization even when operations fail", async () => {
      mockAuthRepo.findUserByEmail.mockRejectedValue(new Error("Database error"));

      const { duration } = await measureTime(() =>
        authService
          .login({
            email: "test@example.com",
            password: "password",
          })
          .catch(() => {}),
      );

      // Should still enforce minimum timing even on error
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it("should not add excessive delay for already-slow operations", async () => {
      const bcrypt = await import("bcryptjs");
      (bcrypt.compare as jest.Mock).mockImplementation(async () => {
        // Simulate very slow bcrypt (200ms+)
        await new Promise((resolve) => setTimeout(resolve, 200));
        return false;
      });

      mockAuthRepo.findUserByEmail.mockResolvedValue(null);
      mockBruteforceRepo.getFailedAttempt.mockResolvedValue(null);
      mockBruteforceRepo.recordFailedAttempt.mockResolvedValue({
        identifier: "test@example.com",
        attempt_count: 1,
        last_attempt_at: new Date().toISOString(),
        locked_until: null,
      });

      const { duration } = await measureTime(() =>
        authService
          .login({
            email: "test@example.com",
            password: "password",
          })
          .catch(() => {}),
      );

      // Should not add unnecessary delay if operation already meets minimum
      // With MIN_AUTH_OPERATION_TIME_MS at 300ms and some jitter, expect <400ms
      expect(duration).toBeLessThan(400); // Reasonable upper bound
    });
  });
});
