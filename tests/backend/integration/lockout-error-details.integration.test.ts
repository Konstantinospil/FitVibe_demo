/**
 * Integration tests for lockout error response details
 *
 * Tests that lockout error responses include structured details for frontend UI
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import app from "../../../apps/backend/src/app.js";
import { createUser } from "../../../apps/backend/src/modules/auth/auth.repository.js";
import {
  truncateAll,
  ensureRolesSeeded,
  withDatabaseErrorHandling,
  isDatabaseAvailable,
  ensureUsernameColumnExists,
} from "../../setup/test-helpers.js";
import { getCurrentTermsVersion } from "../../../apps/backend/src/config/terms.js";

describe("Integration: Lockout Error Details", () => {
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.warn("\n⚠️  Integration tests will be skipped (database unavailable)");
      console.warn("To enable these tests:");
      console.warn("  1. Start PostgreSQL locally, or");
      console.warn(
        "  2. Use Docker Compose: docker compose -f infra/docker/dev/docker-compose.dev.yml up -d db",
      );
      console.warn("  3. Set PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE environment variables");
      console.warn("");
      return;
    }
    // Ensure username column exists before tests run
    await ensureUsernameColumnExists();
  });

  beforeEach(async () => {
    if (!dbAvailable) {
      return;
    }
    await withDatabaseErrorHandling(async () => {
      const { env } = await import("../../../apps/backend/src/config/env.js");
      (env as { readOnlyMode: boolean }).readOnlyMode = false;

      await truncateAll();
      await ensureRolesSeeded();
    }, "beforeEach");
  });

  afterEach(async () => {
    if (!dbAvailable) {
      return;
    }
    await truncateAll();
  });

  describe("Account Lockout Error Details", () => {
    it("should include structured details in AUTH_ACCOUNT_LOCKED error", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }
      const email = "locked@example.com";
      const password = "ValidPassword123!";
      const ipAddress = "192.168.1.1";

      // Create a valid user
      const passwordHash = await bcrypt.hash(password, 12);
      await createUser({
        id: uuidv4(),
        username: "lockeduser",
        display_name: "Locked User",
        locale: "en-US",
        preferred_lang: "en",
        status: "active",
        role_code: "athlete",
        password_hash: passwordHash,
        primaryEmail: email,
        emailVerified: true,
        terms_version: getCurrentTermsVersion(),
      });

      // Make 5 failed attempts to trigger account lockout
      for (let i = 0; i < 5; i++) {
        await request(app).post("/api/v1/auth/login").set("X-Forwarded-For", ipAddress).send({
          email,
          password: "WrongPassword123!",
        });
      }

      // Next attempt should trigger lockout with structured details
      const response = await request(app)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", ipAddress)
        .send({
          email,
          password: "WrongPassword123!",
        });

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe("AUTH_ACCOUNT_LOCKED");
      expect(response.body.error.details).toBeDefined();
      expect(response.body.error.details.remainingSeconds).toBeGreaterThan(0);
      expect(response.body.error.details.lockoutType).toBe("account");
      expect(response.body.error.details.attemptCount).toBeGreaterThanOrEqual(5);
      expect(response.body.error.details.maxAttempts).toBe(5);
      expect(typeof response.body.error.details.remainingSeconds).toBe("number");
    });
  });

  describe("IP Lockout Error Details", () => {
    it("should include structured details in AUTH_IP_LOCKED error", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }
      const ipAddress = "192.168.1.200";

      // Make 4 failed attempts with different emails to approach the 5 distinct email limit
      // (IP lockout triggers at 10 attempts OR 5 distinct emails)
      // Stay within rate limit of 10 req/min - the 5th distinct email will trigger IP lockout
      for (let i = 1; i <= 4; i++) {
        await request(app)
          .post("/api/v1/auth/login")
          .set("X-Forwarded-For", ipAddress)
          .send({
            email: `iplockout${i}@example.com`,
            password: "WrongPassword123!",
          });
      }

      // 5th distinct email attempt should trigger IP lockout with structured details
      const response = await request(app)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", ipAddress)
        .send({
          email: "iplockout5@example.com",
          password: "WrongPassword123!",
        });

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe("AUTH_IP_LOCKED");
      expect(response.body.error.details).toBeDefined();
      expect(response.body.error.details.remainingSeconds).toBeGreaterThan(0);
      expect(response.body.error.details.lockoutType).toBe("ip");
      expect(response.body.error.details.totalAttemptCount).toBeGreaterThanOrEqual(5);
      expect(response.body.error.details.distinctEmailCount).toBeGreaterThanOrEqual(5);
      expect(response.body.error.details.maxAttempts).toBe(10);
      expect(response.body.error.details.maxDistinctEmails).toBe(5);
      expect(typeof response.body.error.details.remainingSeconds).toBe("number");
    });
  });

  describe("Pre-Lockout Warning Details", () => {
    it("should include warning details in AUTH_INVALID_CREDENTIALS when approaching lockout", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }
      const email = "warning@example.com";
      const ipAddress = "192.168.1.300";

      // Create a valid user
      const passwordHash = await bcrypt.hash("ValidPassword123!", 12);
      await createUser({
        id: uuidv4(),
        username: "warninguser",
        display_name: "Warning User",
        locale: "en-US",
        preferred_lang: "en",
        status: "active",
        role_code: "athlete",
        password_hash: passwordHash,
        primaryEmail: email,
        emailVerified: true,
        terms_version: getCurrentTermsVersion(),
      });

      // Make 2 failed attempts (3 remaining, should trigger warning)
      for (let i = 0; i < 2; i++) {
        await request(app).post("/api/v1/auth/login").set("X-Forwarded-For", ipAddress).send({
          email,
          password: "WrongPassword123!",
        });
      }

      // Next attempt should include warning details
      const response = await request(app)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", ipAddress)
        .send({
          email,
          password: "WrongPassword123!",
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("AUTH_INVALID_CREDENTIALS");
      expect(response.body.error.details).toBeDefined();
      expect(response.body.error.details.warning).toBe(true);
      expect(response.body.error.details.remainingAccountAttempts).toBeGreaterThanOrEqual(0);
      expect(response.body.error.details.remainingAccountAttempts).toBeLessThanOrEqual(3);
      expect(response.body.error.details.accountAttemptCount).toBeGreaterThanOrEqual(3);
    });

    it("should not include warning details when not approaching lockout", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }
      const email = "nowarning@example.com";
      const ipAddress = "192.168.1.400";

      // Create a valid user
      const passwordHash = await bcrypt.hash("ValidPassword123!", 12);
      await createUser({
        id: uuidv4(),
        username: "nowarninguser",
        display_name: "No Warning User",
        locale: "en-US",
        preferred_lang: "en",
        status: "active",
        role_code: "athlete",
        password_hash: passwordHash,
        primaryEmail: email,
        emailVerified: true,
        terms_version: getCurrentTermsVersion(),
      });

      // Make 0 failed attempts initially - first attempt won't trigger warning
      // (5 remaining attempts, warning threshold is <= 3 remaining)
      const response = await request(app)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", ipAddress)
        .send({
          email,
          password: "WrongPassword123!",
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("AUTH_INVALID_CREDENTIALS");
      // Should not have warning details when not approaching lockout (4 remaining attempts)
      // Warning is shown when <= 3 remaining, so with 4 remaining no warning should appear
      if (response.body.error.details) {
        expect(response.body.error.details.warning).not.toBe(true);
      }
    });
  });
});
