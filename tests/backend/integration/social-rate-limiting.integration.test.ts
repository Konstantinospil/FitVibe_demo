/**
 * Integration test for rate limiting on social features (HIGH-010)
 *
 * Tests that rate limiting is properly enforced on:
 * - Likes/unlikes
 * - Comments (create/delete)
 * - Follows/unfollows
 * - Bookmarks
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
import { clearRateLimiters } from "../../../apps/backend/src/middlewares/rate-limit.js";

describe("Integration: Social Features Rate Limiting", () => {
  let dbAvailable = false;
  let authToken: string;
  let userId: string;
  let otherUserToken: string;
  let otherUserId: string;
  let feedItemId: string;
  let sessionId: string;

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
      // Clear rate limiters to ensure fresh state
      clearRateLimiters();

      const { env } = await import("../../../apps/backend/src/config/env.js");
      (env as { readOnlyMode: boolean }).readOnlyMode = false;

      await truncateAll();
      await ensureRolesSeeded();

      // Create first user
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

      // Login to get auth token
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: testEmail,
        password: "SecureP@ssw0rd123!",
      });

      expect(loginResponse.status).toBe(200);
      authToken = loginResponse.body.tokens.accessToken;

      // Create second user
      const otherEmail = `other-${uuidv4()}@example.com`;
      const otherUsername = `otheruser-${uuidv4().substring(0, 8)}`;

      const otherUser = await createUser({
        id: uuidv4(),
        username: otherUsername,
        display_name: "Other User",
        password_hash: hashedPassword,
        primaryEmail: otherEmail,
        emailVerified: true,
        role_code: "athlete",
        locale: "en-US",
        preferred_lang: "en",
        status: "active",
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: getCurrentTermsVersion(),
      });

      otherUserId = otherUser.id;

      const otherLoginResponse = await request(app).post("/api/v1/auth/login").send({
        email: otherEmail,
        password: "SecureP@ssw0rd123!",
      });

      expect(otherLoginResponse.status).toBe(200);
      otherUserToken = otherLoginResponse.body.tokens.accessToken;

      // Create a session and feed item for testing
      sessionId = uuidv4();
      feedItemId = uuidv4();

      await db("sessions").insert({
        id: sessionId,
        user_id: userId,
        title: "Test Session",
        planned_at: new Date().toISOString(),
        status: "completed",
        visibility: "public",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await db("feed_items").insert({
        id: feedItemId,
        owner_id: userId,
        session_id: sessionId,
        kind: "session",
        visibility: "public",
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }, "beforeEach");
  });

  afterEach(async () => {
    if (!dbAvailable) {
      return;
    }
    clearRateLimiters();
    await truncateAll();
  });

  describe("Like/Unlike Rate Limiting", () => {
    it("should enforce rate limit on likes", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }

      // Feed like rate limit: 100 per 300 seconds
      // Make 101 requests to exceed limit
      const requests = Array.from({ length: 101 }, () =>
        request(app)
          .post(`/api/v1/feed/item/${feedItemId}/like`)
          .set("Authorization", `Bearer ${authToken}`),
      );

      const responses = await Promise.all(requests);

      // First 100 should succeed
      const successCount = responses.filter((r) => r.status === 200 || r.status === 201).length;
      expect(successCount).toBeGreaterThanOrEqual(100);

      // At least one should be rate limited
      const rateLimited = responses.find((r) => r.status === 429);
      expect(rateLimited).toBeDefined();
      if (rateLimited) {
        expect(rateLimited.headers["retry-after"]).toBeDefined();
        expect(rateLimited.body.error?.code).toBe("RATE_LIMITED");
      }
    });

    it("should include Retry-After header in rate limit response", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }

      // Exceed rate limit
      for (let i = 0; i < 101; i++) {
        await request(app)
          .post(`/api/v1/feed/item/${feedItemId}/like`)
          .set("Authorization", `Bearer ${authToken}`);
      }

      const response = await request(app)
        .post(`/api/v1/feed/item/${feedItemId}/like`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(429);
      expect(response.headers["retry-after"]).toBeDefined();
      expect(parseInt(response.headers["retry-after"])).toBeGreaterThan(0);
    });
  });

  describe("Comment Creation Rate Limiting", () => {
    it("should enforce rate limit on comment creation", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }

      // Comment creation rate limit: 20 per 3600 seconds (1 hour)
      // Make 21 requests to exceed limit
      const requests = Array.from({ length: 21 }, (_, i) =>
        request(app)
          .post(`/api/v1/feed/item/${feedItemId}/comments`)
          .set("Authorization", `Bearer ${authToken}`)
          .send({ body: `Comment ${i}` }),
      );

      const responses = await Promise.all(requests);

      // First 20 should succeed
      const successCount = responses.filter((r) => r.status === 201).length;
      expect(successCount).toBeGreaterThanOrEqual(20);

      // At least one should be rate limited
      const rateLimited = responses.find((r) => r.status === 429);
      expect(rateLimited).toBeDefined();
      if (rateLimited) {
        expect(rateLimited.body.error?.code).toBe("RATE_LIMITED");
      }
    });
  });

  describe("Follow Rate Limiting", () => {
    it("should enforce rate limit on follows", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }

      // Create multiple users to follow
      const usersToFollow: string[] = [];
      for (let i = 0; i < 60; i++) {
        const email = `follow${i}-${uuidv4()}@example.com`;
        const username = `followuser${i}-${uuidv4().substring(0, 8)}`;
        const hashedPassword = await bcrypt.hash("SecureP@ssw0rd123!", 10);

        const user = await createUser({
          id: uuidv4(),
          username,
          display_name: `Follow User ${i}`,
          password_hash: hashedPassword,
          primaryEmail: email,
          emailVerified: true,
          role_code: "athlete",
          locale: "en-US",
          preferred_lang: "en",
          status: "active",
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          terms_version: getCurrentTermsVersion(),
        });

        usersToFollow.push(user.username);
      }

      // Follow rate limit: 50 per 86400 seconds (1 day)
      // Make 51 requests to exceed limit
      const requests = usersToFollow
        .slice(0, 51)
        .map((username) =>
          request(app)
            .post(`/api/v1/feed/users/${username}/follow`)
            .set("Authorization", `Bearer ${authToken}`),
        );

      const responses = await Promise.all(requests);

      // First 50 should succeed (or 404 if user doesn't exist, but not 429)
      const successCount = responses.filter(
        (r) => r.status === 200 || r.status === 201 || r.status === 404,
      ).length;
      expect(successCount).toBeGreaterThanOrEqual(50);

      // At least one should be rate limited
      const rateLimited = responses.find((r) => r.status === 429);
      expect(rateLimited).toBeDefined();
      if (rateLimited) {
        expect(rateLimited.body.error?.code).toBe("RATE_LIMITED");
      }
    });
  });

  describe("Bookmark Rate Limiting", () => {
    it("should enforce rate limit on bookmarks", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }

      // Bookmark rate limit: 100 per 300 seconds
      // Make 101 requests to exceed limit
      const requests = Array.from({ length: 101 }, () =>
        request(app)
          .post(`/api/v1/feed/session/${sessionId}/bookmark`)
          .set("Authorization", `Bearer ${authToken}`),
      );

      const responses = await Promise.all(requests);

      // First 100 should succeed
      const successCount = responses.filter((r) => r.status === 200 || r.status === 201).length;
      expect(successCount).toBeGreaterThanOrEqual(100);

      // At least one should be rate limited
      const rateLimited = responses.find((r) => r.status === 429);
      expect(rateLimited).toBeDefined();
      if (rateLimited) {
        expect(rateLimited.body.error?.code).toBe("RATE_LIMITED");
      }
    });
  });

  describe("Rate Limit Error Response", () => {
    it("should return proper error structure when rate limited", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }

      // Exceed rate limit
      for (let i = 0; i < 101; i++) {
        await request(app)
          .post(`/api/v1/feed/item/${feedItemId}/like`)
          .set("Authorization", `Bearer ${authToken}`);
      }

      const response = await request(app)
        .post(`/api/v1/feed/item/${feedItemId}/like`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toHaveProperty("code", "RATE_LIMITED");
      expect(response.body.error).toHaveProperty("message", "Too many requests");
      expect(response.body.error).toHaveProperty("retryAfter");
      expect(typeof response.body.error.retryAfter).toBe("number");
      expect(response.body.error.retryAfter).toBeGreaterThan(0);
    });
  });
});
