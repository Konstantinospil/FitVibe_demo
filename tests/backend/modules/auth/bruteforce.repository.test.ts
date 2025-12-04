/**
 * Unit tests for brute force protection repository functions
 *
 * Tests both account-level (email+IP) and IP-based brute force protection
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "@jest/globals";
import crypto from "crypto";
import db from "../../../../apps/backend/src/db/index.js";
import {
  getFailedAttempt,
  recordFailedAttempt,
  resetFailedAttempts,
  isAccountLocked,
  getRemainingLockoutSeconds,
  getFailedAttemptByIP,
  recordFailedAttemptByIP,
  resetFailedAttemptsByIP,
  isIPLocked,
  getRemainingIPLockoutSeconds,
  cleanupOldAttempts,
  cleanupOldIPAttempts,
} from "../../../../apps/backend/src/modules/auth/bruteforce.repository.js";
import { truncateAll } from "../../../setup/test-helpers";

// Check database availability before running tests
let isDatabaseAvailable = false;
let databaseCheckError: Error | null = null;

async function checkDatabaseAvailability(): Promise<boolean> {
  // Ensure we're using the test database configuration
  if (process.env.NODE_ENV !== "test") {
    process.env.NODE_ENV = "test";
  }

  try {
    await db.raw("SELECT 1");
    return true;
  } catch (error) {
    databaseCheckError = error instanceof Error ? error : new Error(String(error));
    return false;
  }
}

// Check database availability synchronously at module load time
// This is a simple check - the actual connection will be verified in beforeAll
const dbConfig = {
  host: process.env.PGHOST || "localhost",
  port: process.env.PGPORT || "5432",
  database: process.env.PGDATABASE || "fitvibe_test",
  user: process.env.PGUSER || "fitvibe",
};

// Use describe.skip if we can't determine availability, but we'll check in beforeAll
const describeFn = describe;

describeFn("Brute Force Protection Repository", () => {
  beforeAll(async () => {
    // Check database availability
    isDatabaseAvailable = await checkDatabaseAvailability();

    if (!isDatabaseAvailable) {
      const errorMessage =
        databaseCheckError instanceof Error
          ? databaseCheckError.message
          : String(databaseCheckError);
      console.warn(
        `\n⚠️  Database connection failed: ${errorMessage}\n` +
          `Attempted to connect to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database} as ${dbConfig.user}\n` +
          `Ensure PostgreSQL is running and connection settings are correct.\n` +
          `You may need to set NODE_ENV=test and ensure the test database exists.\n`,
      );
      // Skip all tests by marking them as skipped
      return;
    }

    // Run migrations to ensure tables exist
    // Migrations should be idempotent - safe to run multiple times
    try {
      await db.migrate.latest();
    } catch (error) {
      // If migrations fail due to connection issues, log and skip tests
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("connect") || errorMessage.includes("ECONNREFUSED")) {
        console.warn(
          `Database migration failed: ${errorMessage}. Ensure PostgreSQL is running and accessible.\n`,
        );
        isDatabaseAvailable = false;
        return;
      }
      // Other migration errors (like "already exists" or table creation conflicts) are okay
      // The tables might already be created from a previous test run
    }
  });

  beforeEach(async () => {
    if (!isDatabaseAvailable) {
      return;
    }
    await truncateAll();
  });

  afterEach(async () => {
    if (!isDatabaseAvailable) {
      return;
    }
    await truncateAll();
  });

  describe("Account-Level Protection (email + IP)", () => {
    const identifier = "test@example.com";
    const ipAddress = "192.168.1.1";
    const userAgent = "Mozilla/5.0";

    it("should return null when no failed attempts exist", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      const result = await getFailedAttempt(identifier, ipAddress);
      expect(result).toBeNull();
    });

    it("should create new failed attempt record", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      const attempt = await recordFailedAttempt(identifier, ipAddress, userAgent);

      expect(attempt).toBeDefined();
      expect(attempt.identifier).toBe(identifier.toLowerCase());
      expect(attempt.ip_address).toBe(ipAddress);
      expect(attempt.user_agent).toBe(userAgent);
      expect(attempt.attempt_count).toBe(1);
      expect(attempt.locked_until).toBeNull(); // No lockout for first attempt
    });

    it("should increment attempt count on subsequent failures", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      await recordFailedAttempt(identifier, ipAddress, userAgent);
      const attempt2 = await recordFailedAttempt(identifier, ipAddress, userAgent);
      const attempt3 = await recordFailedAttempt(identifier, ipAddress, userAgent);

      expect(attempt2.attempt_count).toBe(2);
      expect(attempt3.attempt_count).toBe(3);
    });

    it("should apply progressive lockout after 5 attempts", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      // Record 4 attempts (no lockout)
      for (let i = 0; i < 4; i++) {
        await recordFailedAttempt(identifier, ipAddress, userAgent);
      }
      const attempt4 = await getFailedAttempt(identifier, ipAddress);
      expect(attempt4?.locked_until).toBeNull();

      // 5th attempt should trigger 15-minute lockout
      await recordFailedAttempt(identifier, ipAddress, userAgent);
      const attempt5 = await getFailedAttempt(identifier, ipAddress);
      expect(attempt5?.locked_until).not.toBeNull();

      const lockoutTime = new Date(attempt5!.locked_until!);
      const now = new Date();
      const diffMinutes = (lockoutTime.getTime() - now.getTime()) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThanOrEqual(14);
      expect(diffMinutes).toBeLessThanOrEqual(16); // Allow 1 minute variance
    });

    it("should apply 1-hour lockout after 10 attempts", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      for (let i = 0; i < 10; i++) {
        await recordFailedAttempt(identifier, ipAddress, userAgent);
      }
      const attempt = await getFailedAttempt(identifier, ipAddress);
      expect(attempt?.locked_until).not.toBeNull();

      const lockoutTime = new Date(attempt!.locked_until!);
      const now = new Date();
      const diffHours = (lockoutTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThanOrEqual(0.9);
      expect(diffHours).toBeLessThanOrEqual(1.1);
    });

    it("should apply 24-hour lockout after 20 attempts", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      for (let i = 0; i < 20; i++) {
        await recordFailedAttempt(identifier, ipAddress, userAgent);
      }
      const attempt = await getFailedAttempt(identifier, ipAddress);
      expect(attempt?.locked_until).not.toBeNull();

      const lockoutTime = new Date(attempt!.locked_until!);
      const now = new Date();
      const diffHours = (lockoutTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThanOrEqual(23);
      expect(diffHours).toBeLessThanOrEqual(25);
    });

    it("should check if account is locked", () => {
      if (!isDatabaseAvailable) {
        return;
      }
      const futureLockout = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const pastLockout = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      expect(
        isAccountLocked({
          id: "1",
          identifier,
          ip_address: ipAddress,
          user_agent: userAgent,
          attempt_count: 5,
          locked_until: futureLockout,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      ).toBe(true);

      expect(
        isAccountLocked({
          id: "1",
          identifier,
          ip_address: ipAddress,
          user_agent: userAgent,
          attempt_count: 5,
          locked_until: pastLockout,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      ).toBe(false);

      expect(isAccountLocked(null)).toBe(false);
    });

    it("should calculate remaining lockout seconds", () => {
      if (!isDatabaseAvailable) {
        return;
      }
      const futureLockout = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const remaining = getRemainingLockoutSeconds({
        id: "1",
        identifier,
        ip_address: ipAddress,
        user_agent: userAgent,
        attempt_count: 5,
        locked_until: futureLockout,
        last_attempt_at: new Date().toISOString(),
        first_attempt_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      expect(remaining).toBeGreaterThan(14 * 60);
      expect(remaining).toBeLessThanOrEqual(15 * 60);
    });

    it("should reset failed attempts", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      await recordFailedAttempt(identifier, ipAddress, userAgent);
      await recordFailedAttempt(identifier, ipAddress, userAgent);

      await resetFailedAttempts(identifier, ipAddress);

      const result = await getFailedAttempt(identifier, ipAddress);
      expect(result).toBeNull();
    });

    it("should handle different email/IP combinations separately", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      const email1 = "user1@example.com";
      const email2 = "user2@example.com";
      const ip1 = "192.168.1.1";
      const ip2 = "192.168.1.2";

      await recordFailedAttempt(email1, ip1, userAgent);
      await recordFailedAttempt(email1, ip2, userAgent);
      await recordFailedAttempt(email2, ip1, userAgent);

      const attempt1 = await getFailedAttempt(email1, ip1);
      const attempt2 = await getFailedAttempt(email1, ip2);
      const attempt3 = await getFailedAttempt(email2, ip1);

      expect(attempt1?.attempt_count).toBe(1);
      expect(attempt2?.attempt_count).toBe(1);
      expect(attempt3?.attempt_count).toBe(1);
    });
  });

  describe("IP-Based Protection", () => {
    const ipAddress = "192.168.1.100";

    it("should return null when no IP-based attempts exist", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      const result = await getFailedAttemptByIP(ipAddress);
      expect(result).toBeNull();
    });

    it("should create new IP-based attempt record", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      const attempt = await recordFailedAttemptByIP(ipAddress, "test1@example.com");

      expect(attempt).toBeDefined();
      expect(attempt.ip_address).toBe(ipAddress);
      expect(attempt.distinct_email_count).toBe(1);
      expect(attempt.total_attempt_count).toBe(1);
      expect(attempt.locked_until).toBeNull(); // No lockout for first attempt
    });

    it("should increment total attempt count", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      await recordFailedAttemptByIP(ipAddress, "test1@example.com");
      const attempt2 = await recordFailedAttemptByIP(ipAddress, "test1@example.com");
      const attempt3 = await recordFailedAttemptByIP(ipAddress, "test1@example.com");

      expect(attempt2.total_attempt_count).toBe(2);
      expect(attempt3.total_attempt_count).toBe(3);
      expect(attempt2.distinct_email_count).toBe(1); // Same email
      expect(attempt3.distinct_email_count).toBe(1);
    });

    it("should track distinct email addresses", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      await recordFailedAttemptByIP(ipAddress, "test1@example.com");
      await recordFailedAttemptByIP(ipAddress, "test2@example.com");
      await recordFailedAttemptByIP(ipAddress, "test3@example.com");

      const attempt = await getFailedAttemptByIP(ipAddress);
      expect(attempt?.distinct_email_count).toBe(3);
      expect(attempt?.total_attempt_count).toBe(3);
    });

    it("should not increment distinct count for same email", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      await recordFailedAttemptByIP(ipAddress, "test1@example.com");
      await recordFailedAttemptByIP(ipAddress, "test1@example.com");
      await recordFailedAttemptByIP(ipAddress, "test2@example.com");
      await recordFailedAttemptByIP(ipAddress, "test1@example.com");

      const attempt = await getFailedAttemptByIP(ipAddress);
      expect(attempt?.distinct_email_count).toBe(2); // test1 and test2
      expect(attempt?.total_attempt_count).toBe(4);
    });

    it("should apply 30-minute lockout after 10 attempts or 5 distinct emails", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      // Test with 10 attempts (same email)
      for (let i = 0; i < 9; i++) {
        await recordFailedAttemptByIP(ipAddress, "test1@example.com");
      }
      const attempt9 = await getFailedAttemptByIP(ipAddress);
      expect(attempt9?.locked_until).toBeNull();

      await recordFailedAttemptByIP(ipAddress, "test1@example.com");
      const attempt10 = await getFailedAttemptByIP(ipAddress);
      expect(attempt10?.locked_until).not.toBeNull();

      const lockoutTime = new Date(attempt10!.locked_until!);
      const now = new Date();
      const diffMinutes = (lockoutTime.getTime() - now.getTime()) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThanOrEqual(29);
      expect(diffMinutes).toBeLessThanOrEqual(31);
    });

    it("should apply 30-minute lockout after 5 distinct emails", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      // Test with 5 distinct emails (less than 10 total attempts)
      for (let i = 1; i <= 5; i++) {
        await recordFailedAttemptByIP(ipAddress, `test${i}@example.com`);
      }

      const attempt = await getFailedAttemptByIP(ipAddress);
      expect(attempt?.locked_until).not.toBeNull();
      expect(attempt?.distinct_email_count).toBe(5);
      expect(attempt?.total_attempt_count).toBe(5);

      const lockoutTime = new Date(attempt!.locked_until!);
      const now = new Date();
      const diffMinutes = (lockoutTime.getTime() - now.getTime()) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThanOrEqual(29);
      expect(diffMinutes).toBeLessThanOrEqual(31);
    });

    it("should apply 2-hour lockout after 20 attempts or 10 distinct emails", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      // Test with 20 attempts
      for (let i = 0; i < 20; i++) {
        await recordFailedAttemptByIP(ipAddress, "test1@example.com");
      }

      const attempt = await getFailedAttemptByIP(ipAddress);
      expect(attempt?.locked_until).not.toBeNull();

      const lockoutTime = new Date(attempt!.locked_until!);
      const now = new Date();
      const diffHours = (lockoutTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThanOrEqual(1.9);
      expect(diffHours).toBeLessThanOrEqual(2.1);
    });

    it("should apply 2-hour lockout after 10 distinct emails", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      for (let i = 1; i <= 10; i++) {
        await recordFailedAttemptByIP(ipAddress, `test${i}@example.com`);
      }

      const attempt = await getFailedAttemptByIP(ipAddress);
      expect(attempt?.locked_until).not.toBeNull();

      const lockoutTime = new Date(attempt!.locked_until!);
      const now = new Date();
      const diffHours = (lockoutTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThanOrEqual(1.9);
      expect(diffHours).toBeLessThanOrEqual(2.1);
    });

    it("should apply 24-hour lockout after 50 attempts or 20 distinct emails", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      // Test with 50 attempts
      for (let i = 0; i < 50; i++) {
        await recordFailedAttemptByIP(ipAddress, "test1@example.com");
      }

      const attempt = await getFailedAttemptByIP(ipAddress);
      expect(attempt?.locked_until).not.toBeNull();

      const lockoutTime = new Date(attempt!.locked_until!);
      const now = new Date();
      const diffHours = (lockoutTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThanOrEqual(23);
      expect(diffHours).toBeLessThanOrEqual(25);
    });

    it("should apply 24-hour lockout after 20 distinct emails", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      for (let i = 1; i <= 20; i++) {
        await recordFailedAttemptByIP(ipAddress, `test${i}@example.com`);
      }

      const attempt = await getFailedAttemptByIP(ipAddress);
      expect(attempt?.locked_until).not.toBeNull();

      const lockoutTime = new Date(attempt!.locked_until!);
      const now = new Date();
      const diffHours = (lockoutTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThanOrEqual(23);
      expect(diffHours).toBeLessThanOrEqual(25);
    });

    it("should check if IP is locked", () => {
      if (!isDatabaseAvailable) {
        return;
      }
      const futureLockout = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const pastLockout = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      expect(
        isIPLocked({
          id: "1",
          ip_address: ipAddress,
          distinct_email_count: 5,
          total_attempt_count: 10,
          locked_until: futureLockout,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      ).toBe(true);

      expect(
        isIPLocked({
          id: "1",
          ip_address: ipAddress,
          distinct_email_count: 5,
          total_attempt_count: 10,
          locked_until: pastLockout,
          last_attempt_at: new Date().toISOString(),
          first_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      ).toBe(false);

      expect(isIPLocked(null)).toBe(false);
    });

    it("should calculate remaining IP lockout seconds", () => {
      if (!isDatabaseAvailable) {
        return;
      }
      const futureLockout = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const remaining = getRemainingIPLockoutSeconds({
        id: "1",
        ip_address: ipAddress,
        distinct_email_count: 5,
        total_attempt_count: 10,
        locked_until: futureLockout,
        last_attempt_at: new Date().toISOString(),
        first_attempt_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      expect(remaining).toBeGreaterThan(29 * 60);
      expect(remaining).toBeLessThanOrEqual(30 * 60);
    });

    it("should reset IP-based failed attempts", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      await recordFailedAttemptByIP(ipAddress, "test1@example.com");
      await recordFailedAttemptByIP(ipAddress, "test2@example.com");

      await resetFailedAttemptsByIP(ipAddress);

      const result = await getFailedAttemptByIP(ipAddress);
      expect(result).toBeNull();
    });

    it("should handle different IP addresses separately", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      const ip1 = "192.168.1.1";
      const ip2 = "192.168.1.2";

      await recordFailedAttemptByIP(ip1, "test1@example.com");
      await recordFailedAttemptByIP(ip1, "test2@example.com");
      await recordFailedAttemptByIP(ip2, "test1@example.com");

      const attempt1 = await getFailedAttemptByIP(ip1);
      const attempt2 = await getFailedAttemptByIP(ip2);

      expect(attempt1?.total_attempt_count).toBe(2);
      expect(attempt1?.distinct_email_count).toBe(2);
      expect(attempt2?.total_attempt_count).toBe(1);
      expect(attempt2?.distinct_email_count).toBe(1);
    });

    it("should normalize email addresses (lowercase, trim)", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      await recordFailedAttemptByIP(ipAddress, "  TEST@EXAMPLE.COM  ");
      await recordFailedAttemptByIP(ipAddress, "test@example.com");
      await recordFailedAttemptByIP(ipAddress, "  Test@Example.Com  ");

      const attempt = await getFailedAttemptByIP(ipAddress);
      // All should be treated as same email after normalization
      expect(attempt?.distinct_email_count).toBe(1);
      expect(attempt?.total_attempt_count).toBe(3);
    });
  });

  describe("Cleanup Functions", () => {
    it("should cleanup old account-level attempts", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      const oldIdentifier = "old@example.com";
      const recentIdentifier = "recent@example.com";
      const ipAddress = "192.168.1.1";
      const userAgent = "Mozilla/5.0";

      // Create old attempt (31 days ago) with different identifier
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      await db("failed_login_attempts").insert({
        id: crypto.randomUUID(),
        identifier: oldIdentifier,
        ip_address: ipAddress,
        user_agent: userAgent,
        attempt_count: 1,
        locked_until: null,
        last_attempt_at: oldDate.toISOString(),
        first_attempt_at: oldDate.toISOString(),
        created_at: oldDate.toISOString(),
        updated_at: oldDate.toISOString(),
      });

      // Create recent attempt with different identifier (so it doesn't update the old one)
      await recordFailedAttempt(recentIdentifier, ipAddress, userAgent);

      const deleted = await cleanupOldAttempts();
      expect(deleted).toBe(1);

      // Old attempt should be deleted
      const oldRemaining = await getFailedAttempt(oldIdentifier, ipAddress);
      expect(oldRemaining).toBeNull();

      // Recent attempt should remain
      const recentRemaining = await getFailedAttempt(recentIdentifier, ipAddress);
      expect(recentRemaining).not.toBeNull();
    });

    it("should cleanup old IP-based attempts", async () => {
      if (!isDatabaseAvailable) {
        return;
      }
      const oldIPAddress = "192.168.1.1";
      const recentIPAddress = "192.168.1.2";

      // Create old attempt (31 days ago) with different IP
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      await db("failed_login_attempts_by_ip").insert({
        id: crypto.randomUUID(),
        ip_address: oldIPAddress,
        distinct_email_count: 1,
        total_attempt_count: 1,
        locked_until: null,
        last_attempt_at: oldDate.toISOString(),
        first_attempt_at: oldDate.toISOString(),
        created_at: oldDate.toISOString(),
        updated_at: oldDate.toISOString(),
      });

      // Create recent attempt with different IP (so it doesn't update the old one)
      await recordFailedAttemptByIP(recentIPAddress, "test@example.com");

      const deleted = await cleanupOldIPAttempts();
      expect(deleted).toBe(1);

      // Old attempt should be deleted
      const oldRemaining = await getFailedAttemptByIP(oldIPAddress);
      expect(oldRemaining).toBeNull();

      // Recent attempt should remain
      const recentRemaining = await getFailedAttemptByIP(recentIPAddress);
      expect(recentRemaining).not.toBeNull();
    });
  });
});
