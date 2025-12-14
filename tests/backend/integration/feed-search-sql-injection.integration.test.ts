/**
 * Integration test for feed search SQL injection protection (CRITICAL-005)
 *
 * Tests that feed search properly parameterizes queries to prevent SQL injection.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../../apps/backend/src/app.js";
import db from "../../../apps/backend/src/db/index.js";
import { createUser } from "../../../apps/backend/src/modules/auth/auth.repository.js";
import {
  truncateAll,
  ensureRolesSeeded,
  withDatabaseErrorHandling,
  isDatabaseAvailable,
  ensureUsernameColumnExists,
} from "../../setup/test-helpers.js";
import { v4 as uuidv4 } from "uuid";

describe("Integration: Feed Search SQL Injection Protection", () => {
  let dbAvailable = false;
  let authCookie: string;
  let userId: string;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.warn("\n⚠️  Integration tests will be skipped (database unavailable)");
      return;
    }
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

      // Create and login a test user
      const testEmail = `test-${uuidv4()}@example.com`;
      const testUsername = `testuser-${uuidv4().substring(0, 8)}`;
      const hashedPassword = await bcrypt.hash("SecureP@ssw0rd123!", 10);

      const user = await createUser({
        id: uuidv4(),
        email: testEmail,
        username: testUsername,
        passwordHash: hashedPassword,
        displayName: "Test User",
        roleCode: "user",
        locale: "en",
        preferredLang: "en",
        status: "active",
      });

      userId = user.id;

      // Login to get auth cookie
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: testEmail,
        password: "SecureP@ssw0rd123!",
      });

      expect(loginResponse.status).toBe(200);
      authCookie = loginResponse.headers["set-cookie"]?.[0] || "";
      expect(authCookie).toBeTruthy();
    }, "beforeEach");
  });

  afterEach(async () => {
    if (!dbAvailable) {
      return;
    }
    await truncateAll();
  });

  it("should safely handle SQL injection attempts in search query", async () => {
    if (!dbAvailable) {
      console.warn("Skipping test: database unavailable");
      return;
    }

    // Test various SQL injection patterns
    const sqlInjectionAttempts = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; DELETE FROM sessions; --",
      "1' OR '1'='1",
      "admin'--",
      "' OR 1=1--",
      "'; INSERT INTO users VALUES ('hacker', 'hacker@evil.com'); --",
    ];

    for (const maliciousQuery of sqlInjectionAttempts) {
      const response = await request(app)
        .get("/api/v1/feed")
        .set("Cookie", authCookie)
        .query({ q: maliciousQuery });

      // Should return 200 (not crash) and return empty results or handle gracefully
      expect([200, 400]).toContain(response.status);

      // Verify no data was corrupted
      const userCount = await db("users").count("* as count").first();
      expect(Number(userCount?.count ?? 0)).toBeGreaterThan(0);
    }
  });

  it("should properly escape special characters in search query", async () => {
    if (!dbAvailable) {
      console.warn("Skipping test: database unavailable");
      return;
    }

    const specialChars = ["%", "_", "'", '"', "\\", "`"];

    for (const char of specialChars) {
      const response = await request(app)
        .get("/api/v1/feed")
        .set("Cookie", authCookie)
        .query({ q: `test${char}query` });

      // Should return 200 (not crash)
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("items");
      expect(Array.isArray(response.body.items)).toBe(true);
    }
  });

  it("should handle empty and null search queries safely", async () => {
    if (!dbAvailable) {
      console.warn("Skipping test: database unavailable");
      return;
    }

    const emptyQueries = ["", "   ", null, undefined];

    for (const query of emptyQueries) {
      const response = await request(app)
        .get("/api/v1/feed")
        .set("Cookie", authCookie)
        .query(query !== null && query !== undefined ? { q: query } : {});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("items");
      expect(Array.isArray(response.body.items)).toBe(true);
    }
  });
});
