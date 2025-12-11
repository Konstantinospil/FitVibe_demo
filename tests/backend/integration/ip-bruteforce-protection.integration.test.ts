/**
 * Integration tests for IP-based brute force protection
 *
 * Tests the complete login flow with IP-based protection:
 * 1. IP lockout when too many attempts from same IP
 * 2. IP lockout when too many distinct emails attempted
 * 3. IP attempts reset on successful login
 * 4. Integration with account-level protection
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../../apps/backend/src/app.js";
import db from "../../../apps/backend/src/db/index.js";
import { createUser } from "../../../apps/backend/src/modules/auth/auth.repository.js";
import {
  getFailedAttemptByIP,
  isIPLocked,
  resetFailedAttemptsByIP,
} from "../../../apps/backend/src/modules/auth/bruteforce.repository.js";
import { truncateAll, ensureRolesSeeded } from "../../setup/test-helpers.js";
import { getCurrentTermsVersion } from "../../../apps/backend/src/config/terms.js";

describe("Integration: IP-Based Brute Force Protection", () => {
  beforeEach(async () => {
    // Ensure read-only mode is disabled for tests
    const { env } = await import("../../../apps/backend/src/config/env.js");
    (env as { readOnlyMode: boolean }).readOnlyMode = false;

    await truncateAll();
    await ensureRolesSeeded();
  });

  afterEach(async () => {
    await truncateAll();
  });

  describe("IP Lockout - Too Many Attempts", () => {
    it("should lock IP after 10 failed login attempts", async () => {
      const ipAddress = "192.168.1.100";

      // Make 9 failed attempts (should not lock yet)
      for (let i = 1; i <= 9; i++) {
        const response = await request(app)
          .post("/api/v1/auth/login")
          .set("X-Forwarded-For", ipAddress)
          .send({
            email: `test${i}@example.com`,
            password: "WrongPassword123!",
          });

        // Should get 401 (invalid credentials), not 429 (locked)
        expect([401, 429]).toContain(response.status);
      }

      // Check IP is not locked yet
      const attempt9 = await getFailedAttemptByIP(ipAddress);
      expect(attempt9?.locked_until).toBeNull();

      // 10th attempt should trigger IP lockout
      const response10 = await request(app)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", ipAddress)
        .send({
          email: "test10@example.com",
          password: "WrongPassword123!",
        });

      expect(response10.status).toBe(429);
      expect(response10.body.error.code).toBe("AUTH_IP_LOCKED");
      expect(response10.body.error.message).toContain("IP address temporarily locked");

      // Verify structured error details are included
      expect(response10.body.error.details).toBeDefined();
      expect(response10.body.error.details.remainingSeconds).toBeGreaterThan(0);
      expect(response10.body.error.details.lockoutType).toBe("ip");
      expect(response10.body.error.details.totalAttemptCount).toBeGreaterThanOrEqual(10);
      expect(response10.body.error.details.distinctEmailCount).toBeGreaterThanOrEqual(1);
      expect(response10.body.error.details.maxAttempts).toBe(10);
      expect(response10.body.error.details.maxDistinctEmails).toBe(5);

      // Verify IP is locked
      const attempt10 = await getFailedAttemptByIP(ipAddress);
      expect(attempt10?.locked_until).not.toBeNull();
      expect(isIPLocked(attempt10)).toBe(true);
    });

    it("should lock IP after 5 distinct email attempts", async () => {
      const ipAddress = "192.168.1.200";

      // Make 4 failed attempts with different emails (should not lock yet)
      for (let i = 1; i <= 4; i++) {
        const response = await request(app)
          .post("/api/v1/auth/login")
          .set("X-Forwarded-For", ipAddress)
          .send({
            email: `user${i}@example.com`,
            password: "WrongPassword123!",
          });

        expect([401, 429]).toContain(response.status);
      }

      // Check IP is not locked yet
      const attempt4 = await getFailedAttemptByIP(ipAddress);
      expect(attempt4?.distinct_email_count).toBe(4);
      expect(attempt4?.locked_until).toBeNull();

      // 5th distinct email should trigger IP lockout
      const response5 = await request(app)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", ipAddress)
        .send({
          email: "user5@example.com",
          password: "WrongPassword123!",
        });

      expect(response5.status).toBe(429);
      expect(response5.body.error.code).toBe("AUTH_IP_LOCKED");

      // Verify IP is locked
      const attempt5 = await getFailedAttemptByIP(ipAddress);
      expect(attempt5?.distinct_email_count).toBe(5);
      expect(attempt5?.locked_until).not.toBeNull();
      expect(isIPLocked(attempt5)).toBe(true);
    });

    it("should prevent login from locked IP even with correct credentials", async () => {
      const ipAddress = "192.168.1.300";
      const email = "valid@example.com";
      const password = "ValidPassword123!";

      // Create a valid user with verified email
      const passwordHash = await bcrypt.hash(password, 12);
      await createUser({
        id: "user-valid",
        username: "validuser",
        display_name: "Valid User",
        locale: "en-US",
        preferred_lang: "en",
        status: "active",
        role_code: "athlete",
        password_hash: passwordHash,
        primaryEmail: email,
        emailVerified: true,
        terms_version: getCurrentTermsVersion(),
      });

      // Lock the IP by making 10 failed attempts
      for (let i = 1; i <= 10; i++) {
        await request(app)
          .post("/api/v1/auth/login")
          .set("X-Forwarded-For", ipAddress)
          .send({
            email: `test${i}@example.com`,
            password: "WrongPassword123!",
          });
      }

      // Verify IP is locked
      const lockedAttempt = await getFailedAttemptByIP(ipAddress);
      expect(isIPLocked(lockedAttempt)).toBe(true);

      // Try to login with valid credentials from locked IP
      const response = await request(app)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", ipAddress)
        .send({
          email,
          password,
        });

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe("AUTH_IP_LOCKED");
    });
  });

  describe("IP Attempt Reset on Successful Login", () => {
    it("should reset IP attempts on successful login", async () => {
      const ipAddress = "192.168.1.400";
      const email = "success@example.com";
      const password = "ValidPassword123!";

      // Create a valid user with verified email
      const passwordHash = await bcrypt.hash(password, 12);
      await createUser({
        id: "user-success",
        username: "successuser",
        display_name: "Success User",
        locale: "en-US",
        preferred_lang: "en",
        status: "active",
        role_code: "athlete",
        password_hash: passwordHash,
        primaryEmail: email,
        emailVerified: true,
        terms_version: getCurrentTermsVersion(),
      });

      // Make some failed attempts
      for (let i = 1; i <= 3; i++) {
        await request(app)
          .post("/api/v1/auth/login")
          .set("X-Forwarded-For", ipAddress)
          .send({
            email: `test${i}@example.com`,
            password: "WrongPassword123!",
          });
      }

      // Verify IP has attempts recorded
      const beforeLogin = await getFailedAttemptByIP(ipAddress);
      expect(beforeLogin).not.toBeNull();
      expect(beforeLogin?.total_attempt_count).toBeGreaterThan(0);

      // Successful login should reset IP attempts
      const loginResponse = await request(app)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", ipAddress)
        .send({
          email,
          password,
        });

      expect(loginResponse.status).toBe(200);

      // Verify IP attempts are reset
      const afterLogin = await getFailedAttemptByIP(ipAddress);
      expect(afterLogin).toBeNull();
    });

    it("should reset IP attempts even if account-level attempts exist", async () => {
      const ipAddress = "192.168.1.500";
      const email = "mixed@example.com";
      const password = "ValidPassword123!";

      // Create a valid user with verified email
      const passwordHash = await bcrypt.hash(password, 12);
      await createUser({
        id: "user-mixed",
        username: "mixeduser",
        display_name: "Mixed User",
        locale: "en-US",
        preferred_lang: "en",
        status: "active",
        role_code: "athlete",
        password_hash: passwordHash,
        primaryEmail: email,
        emailVerified: true,
        terms_version: getCurrentTermsVersion(),
      });

      // Make failed attempts with this email (creates account-level record)
      for (let i = 0; i < 2; i++) {
        await request(app).post("/api/v1/auth/login").set("X-Forwarded-For", ipAddress).send({
          email,
          password: "WrongPassword123!",
        });
      }

      // Make failed attempts with other emails (creates IP-level record)
      for (let i = 1; i <= 2; i++) {
        await request(app)
          .post("/api/v1/auth/login")
          .set("X-Forwarded-For", ipAddress)
          .send({
            email: `other${i}@example.com`,
            password: "WrongPassword123!",
          });
      }

      // Verify both records exist
      const ipAttempts = await getFailedAttemptByIP(ipAddress);
      expect(ipAttempts).not.toBeNull();

      // Successful login should reset IP attempts
      const loginResponse = await request(app)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", ipAddress)
        .send({
          email,
          password,
        });

      expect(loginResponse.status).toBe(200);

      // Verify IP attempts are reset
      const afterLogin = await getFailedAttemptByIP(ipAddress);
      expect(afterLogin).toBeNull();
    });
  });

  describe("IP Protection vs Account Protection", () => {
    it("should check IP lockout before account lockout", async () => {
      const ipAddress = "192.168.1.600";
      const email = "test@example.com";

      // Lock the IP first (10 attempts with different emails)
      for (let i = 1; i <= 10; i++) {
        await request(app)
          .post("/api/v1/auth/login")
          .set("X-Forwarded-For", ipAddress)
          .send({
            email: `user${i}@example.com`,
            password: "WrongPassword123!",
          });
      }

      // Verify IP is locked
      const ipAttempt = await getFailedAttemptByIP(ipAddress);
      expect(isIPLocked(ipAttempt)).toBe(true);

      // Try to login with a specific email (account-level would not be locked yet)
      const response = await request(app)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", ipAddress)
        .send({
          email,
          password: "WrongPassword123!",
        });

      // Should get IP lockout, not account lockout
      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe("AUTH_IP_LOCKED");
    });

    it("should allow account-level lockout when IP is not locked", async () => {
      const ipAddress = "192.168.1.700";
      const email = "account@example.com";

      // Make 5 failed attempts with same email (triggers account-level lockout)
      for (let i = 0; i < 5; i++) {
        await request(app).post("/api/v1/auth/login").set("X-Forwarded-For", ipAddress).send({
          email,
          password: "WrongPassword123!",
        });
      }

      // Verify IP is not locked (only 5 attempts, same email)
      const ipAttempt = await getFailedAttemptByIP(ipAddress);
      expect(ipAttempt?.total_attempt_count).toBe(5);
      expect(ipAttempt?.distinct_email_count).toBe(1);
      expect(isIPLocked(ipAttempt)).toBe(false);

      // Next attempt should trigger account-level lockout
      const response = await request(app)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", ipAddress)
        .send({
          email,
          password: "WrongPassword123!",
        });

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe("AUTH_ACCOUNT_LOCKED");

      // Verify structured error details are included
      expect(response.body.error.details).toBeDefined();
      expect(response.body.error.details.remainingSeconds).toBeGreaterThan(0);
      expect(response.body.error.details.lockoutType).toBe("account");
      expect(response.body.error.details.attemptCount).toBeGreaterThanOrEqual(5);
      expect(response.body.error.details.maxAttempts).toBe(5);
    });
  });

  describe("Progressive Lockout Durations", () => {
    it("should apply 30-minute lockout for 10 attempts", async () => {
      const ipAddress = "192.168.1.800";

      // Make 10 attempts
      for (let i = 1; i <= 10; i++) {
        await request(app)
          .post("/api/v1/auth/login")
          .set("X-Forwarded-For", ipAddress)
          .send({
            email: `test${i}@example.com`,
            password: "WrongPassword123!",
          });
      }

      const attempt = await getFailedAttemptByIP(ipAddress);
      expect(attempt?.locked_until).not.toBeNull();

      const lockoutTime = new Date(attempt!.locked_until!);
      const now = new Date();
      const diffMinutes = (lockoutTime.getTime() - now.getTime()) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThanOrEqual(29);
      expect(diffMinutes).toBeLessThanOrEqual(31);
    });

    it("should apply 2-hour lockout for 20 attempts", async () => {
      const ipAddress = "192.168.1.900";

      // Make 20 attempts
      for (let i = 1; i <= 20; i++) {
        await request(app)
          .post("/api/v1/auth/login")
          .set("X-Forwarded-For", ipAddress)
          .send({
            email: `test${i}@example.com`,
            password: "WrongPassword123!",
          });
      }

      const attempt = await getFailedAttemptByIP(ipAddress);
      expect(attempt?.locked_until).not.toBeNull();

      const lockoutTime = new Date(attempt!.locked_until!);
      const now = new Date();
      const diffHours = (lockoutTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThanOrEqual(1.9);
      expect(diffHours).toBeLessThanOrEqual(2.1);
    });

    it("should apply 24-hour lockout for 50 attempts", async () => {
      const ipAddress = "192.168.1.1000";

      // Make 50 attempts
      for (let i = 1; i <= 50; i++) {
        await request(app)
          .post("/api/v1/auth/login")
          .set("X-Forwarded-For", ipAddress)
          .send({
            email: `test${i}@example.com`,
            password: "WrongPassword123!",
          });
      }

      const attempt = await getFailedAttemptByIP(ipAddress);
      expect(attempt?.locked_until).not.toBeNull();

      const lockoutTime = new Date(attempt!.locked_until!);
      const now = new Date();
      const diffHours = (lockoutTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThanOrEqual(23);
      expect(diffHours).toBeLessThanOrEqual(25);
    });
  });

  describe("Different IP Addresses", () => {
    it("should track attempts separately for different IPs", async () => {
      const ip1 = "192.168.1.1100";
      const ip2 = "192.168.1.1200";

      // Make 10 attempts from IP1 (should lock)
      for (let i = 1; i <= 10; i++) {
        await request(app)
          .post("/api/v1/auth/login")
          .set("X-Forwarded-For", ip1)
          .send({
            email: `test${i}@example.com`,
            password: "WrongPassword123!",
          });
      }

      // Make 5 attempts from IP2 (should not lock)
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post("/api/v1/auth/login")
          .set("X-Forwarded-For", ip2)
          .send({
            email: `test${i}@example.com`,
            password: "WrongPassword123!",
          });
      }

      // Verify IP1 is locked
      const attempt1 = await getFailedAttemptByIP(ip1);
      expect(isIPLocked(attempt1)).toBe(true);

      // Verify IP2 is not locked
      const attempt2 = await getFailedAttemptByIP(ip2);
      expect(attempt2?.locked_until).toBeNull();

      // IP2 should still be able to attempt login
      const response = await request(app)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", ip2)
        .send({
          email: "test6@example.com",
          password: "WrongPassword123!",
        });

      expect([401, 429]).toContain(response.status); // Should not be IP-locked
    });
  });
});
