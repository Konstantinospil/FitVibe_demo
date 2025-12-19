/**
 * Integration test for alias change rate limiting (HIGH-001)
 *
 * Tests that users can only change their alias once per 30 days.
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
import { getCurrentTermsVersion } from "../../../apps/backend/src/config/terms.js";

describe("Integration: Alias Change Rate Limiting", () => {
  let dbAvailable = false;
  let authToken: string;
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

        username: testUsername,

        display_name: "Test User",

        password_hash: hashedPassword,

        primaryEmail: testEmail,

        emailVerified: true,

        role_code: "athlete",

        locale: "en-US",

        preferred_lang: "en",

        status: "active",

        terms_accepted: true,

        terms_accepted_at: new Date().toISOString(),

        terms_version: getCurrentTermsVersion(),
      });

      userId = user.id;

      // Login to get auth cookie
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: testEmail,
        password: "SecureP@ssw0rd123!",
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.tokens).toBeDefined();
      authToken = loginResponse.body.tokens.accessToken;
      expect(authToken).toBeTruthy();
    }, "beforeEach");
  });

  afterEach(async () => {
    if (!dbAvailable) {
      return;
    }
    await truncateAll();
  });

  it("should allow first alias change", async () => {
    if (!dbAvailable) {
      console.warn("Skipping test: database unavailable");
      return;
    }

    const response = await request(app)
      .patch("/api/v1/users/me")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        alias: "firstalias",
      });

    expect(response.status).toBe(200);
    expect(response.body.profile?.alias).toBe("firstalias");
  });

  it("should prevent alias change within 30 days", async () => {
    if (!dbAvailable) {
      console.warn("Skipping test: database unavailable");
      return;
    }

    // Set initial alias
    await request(app).patch("/api/v1/users/me").set("Authorization", `Bearer ${authToken}`).send({
      alias: "firstalias",
    });

    // Try to change alias immediately (should fail)
    const response = await request(app)
      .patch("/api/v1/users/me")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        alias: "secondalias",
      });

    expect(response.status).toBe(429);
    expect(response.body.error?.code || response.body.error).toBe("E.ALIAS_CHANGE_RATE_LIMITED");
    const message = response.body.error?.message || response.body.message || "";
    expect(message).toContain("30 days");
  });

  it("should allow alias change after 30 days", async () => {
    if (!dbAvailable) {
      console.warn("Skipping test: database unavailable");
      return;
    }

    // Set initial alias
    await request(app).patch("/api/v1/users/me").set("Authorization", `Bearer ${authToken}`).send({
      alias: "firstalias",
    });

    // Manually set alias_changed_at to 31 days ago
    const thirtyOneDaysAgo = new Date();
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
    await db("profiles")
      .where({ user_id: userId })
      .update({ alias_changed_at: thirtyOneDaysAgo.toISOString() });

    // Try to change alias (should succeed)
    const response = await request(app)
      .patch("/api/v1/users/me")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        alias: "secondalias",
      });

    expect(response.status).toBe(200);
    expect(response.body.profile?.alias).toBe("secondalias");
  });

  it("should allow changing to the same alias", async () => {
    if (!dbAvailable) {
      console.warn("Skipping test: database unavailable");
      return;
    }

    // Set initial alias
    await request(app).patch("/api/v1/users/me").set("Authorization", `Bearer ${authToken}`).send({
      alias: "myalias",
    });

    // Try to set the same alias again (should succeed - no change)
    const response = await request(app)
      .patch("/api/v1/users/me")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        alias: "myalias",
      });

    expect(response.status).toBe(200);
    expect(response.body.profile?.alias).toBe("myalias");
  });
});

