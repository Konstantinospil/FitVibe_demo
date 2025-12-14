/**
 * Integration tests for token refresh, logout, and session management
 *
 * Tests:
 * 1. Token refresh with rotation
 * 2. Logout and token invalidation
 * 3. Session listing
 * 4. Session revocation (single, all, others)
 * 5. Token reuse detection
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
import type { Cookie } from "supertest";

describe("Integration: Token Refresh, Logout, and Session Management", () => {
  let userId: string;
  let userEmail: string;
  let userPassword: string;
  let cookies: Cookie[];
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
      // Ensure read-only mode is disabled for tests
      const { env } = await import("../../../apps/backend/src/config/env.js");
      (env as { readOnlyMode: boolean }).readOnlyMode = false;

      // Clean up any existing test data
      await truncateAll();
      // Ensure roles are seeded before creating users
      await ensureRolesSeeded();

      // Create a verified user for testing
      userId = uuidv4();
      userEmail = `test-${uuidv4()}@example.com`;
      userPassword = "SecureP@ssw0rd123!";
      const passwordHash = await bcrypt.hash(userPassword, 12);
      const now = new Date().toISOString();

      await createUser({
        id: userId,
        username: `testuser-${uuidv4().substring(0, 8)}`,
        display_name: "Test User",
        status: "active",
        role_code: "athlete",
        password_hash: passwordHash,
        primaryEmail: userEmail,
        emailVerified: true,
        terms_accepted: true,
        terms_accepted_at: now,
        terms_version: "2024-06-01",
      });

      // Force transaction commit by doing a separate query that must see the committed data
      // This ensures the transaction is fully committed and visible to other connections
      await db.raw("SELECT 1"); // Simple query to ensure previous transaction is committed
    }, "beforeEach");
  });

  afterEach(async () => {
    if (!dbAvailable) {
      return;
    }
    // Ensure cleanup after each test
    await truncateAll();
  });

  /**
   * Helper function to login and get cookies
   */
  async function loginAndGetCookies(): Promise<Cookie[]> {
    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: userEmail,
      password: userPassword,
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.headers["set-cookie"]).toBeDefined();

    return loginResponse.headers["set-cookie"].map((cookie: string) => {
      const [nameValue, ...rest] = cookie.split(";");
      const [name, value] = nameValue.split("=");
      return { name, value, path: "/" };
    });
  }

  describe("Token Refresh", () => {
    it("should refresh access token and rotate refresh token", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }
      // Login to get initial tokens
      cookies = await loginAndGetCookies();
      expect(cookies.length).toBeGreaterThan(0);

      // Extract refresh token cookie
      const refreshCookie = cookies.find((c) => c.name === "rt");
      expect(refreshCookie).toBeDefined();

      // Wait a moment to ensure tokens are different
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Refresh tokens
      const refreshResponse = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", cookies.map((c) => `${c.name}=${c.value}`).join("; "));

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body).toHaveProperty("user");
      expect(refreshResponse.headers["set-cookie"]).toBeDefined();

      // Verify new cookies were set
      const newCookies = refreshResponse.headers["set-cookie"].map((cookie: string) => {
        const [nameValue] = cookie.split(";");
        const [name, value] = nameValue.split("=");
        return { name, value };
      });

      const newRefreshCookie = newCookies.find((c) => c.name === "rt");
      expect(newRefreshCookie).toBeDefined();
      // Refresh token should be rotated (different value)
      expect(newRefreshCookie?.value).not.toBe(refreshCookie?.value);
    });

    it("should reject invalid refresh token", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }
      const invalidResponse = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", "rt=invalid-token");

      expect(invalidResponse.status).toBe(401);
    });

    it("should detect and revoke reused refresh token", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }
      // Login to get initial tokens
      cookies = await loginAndGetCookies();
      const refreshCookie = cookies.find((c) => c.name === "rt");
      expect(refreshCookie).toBeDefined();

      const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

      // First refresh - should succeed
      const firstRefresh = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", cookieString);

      expect(firstRefresh.status).toBe(200);

      // Get new cookies from first refresh
      const newCookies = firstRefresh.headers["set-cookie"].map((cookie: string) => {
        const [nameValue] = cookie.split(";");
        const [name, value] = nameValue.split("=");
        return { name, value };
      });

      // Try to reuse the old refresh token - should fail and revoke session
      const reuseResponse = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", cookieString); // Using old cookie

      expect(reuseResponse.status).toBe(401);

      // Verify session was revoked
      const sessions = await db("auth_sessions").where({ user_id: userId, revoked_at: null });
      expect(sessions.length).toBe(0);
    });
  });

  describe("Logout", () => {
    it("should logout and invalidate tokens", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }
      // Login to get tokens
      cookies = await loginAndGetCookies();

      // Logout
      const logoutResponse = await request(app)
        .post("/api/v1/auth/logout")
        .set("Cookie", cookies.map((c) => `${c.name}=${c.value}`).join("; "));

      expect(logoutResponse.status).toBe(204);

      // Verify cookies are cleared
      const clearedCookies = logoutResponse.headers["set-cookie"];
      if (clearedCookies) {
        clearedCookies.forEach((cookie: string) => {
          expect(cookie).toContain("Max-Age=0");
        });
      }

      // Verify refresh token is revoked in database
      const refreshTokens = await db("refresh_tokens")
        .join("auth_sessions", "refresh_tokens.session_jti", "auth_sessions.jti")
        .where("auth_sessions.user_id", userId)
        .whereNull("refresh_tokens.revoked_at");

      expect(refreshTokens.length).toBe(0);
    });

    it("should handle logout without refresh token gracefully", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }
      const logoutResponse = await request(app).post("/api/v1/auth/logout");

      // Should still succeed (no-op)
      expect(logoutResponse.status).toBe(204);
    });
  });

  describe("Session Listing", () => {
    it("should list all active sessions for user", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }
      // Login to create a session
      cookies = await loginAndGetCookies();

      // Get access token from cookies
      const accessCookie = cookies.find((c) => c.name === "at");
      expect(accessCookie).toBeDefined();

      // List sessions
      const listResponse = await request(app)
        .get("/api/v1/auth/sessions")
        .set("Cookie", cookies.map((c) => `${c.name}=${c.value}`).join("; "));

      expect(listResponse.status).toBe(200);
      expect(listResponse.body).toHaveProperty("sessions");
      expect(Array.isArray(listResponse.body.sessions)).toBe(true);
      expect(listResponse.body.sessions.length).toBeGreaterThan(0);

      // Verify current session is marked
      const currentSession = listResponse.body.sessions.find(
        (s: { isCurrent: boolean }) => s.isCurrent,
      );
      expect(currentSession).toBeDefined();
      expect(currentSession).toHaveProperty("id");
      expect(currentSession).toHaveProperty("userAgent");
      expect(currentSession).toHaveProperty("createdAt");
      expect(currentSession).toHaveProperty("expiresAt");
    });

    it("should require authentication to list sessions", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }
      const listResponse = await request(app).get("/api/v1/auth/sessions");

      expect(listResponse.status).toBe(401);
    });
  });

  describe("Session Revocation", () => {
    it("should revoke a specific session", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }
      // Login to create a session
      cookies = await loginAndGetCookies();

      // List sessions to get session ID
      const listResponse = await request(app)
        .get("/api/v1/auth/sessions")
        .set("Cookie", cookies.map((c) => `${c.name}=${c.value}`).join("; "));

      expect(listResponse.status).toBe(200);
      const sessions = listResponse.body.sessions;
      expect(sessions.length).toBeGreaterThan(0);

      // Find a non-current session (if any) or use first session
      const sessionToRevoke =
        sessions.find(
          (s: { isCurrent: boolean; revokedAt: string | null }) => !s.isCurrent && !s.revokedAt,
        ) || sessions[0];

      // Revoke the session
      const revokeResponse = await request(app)
        .post("/api/v1/auth/sessions/revoke")
        .set("Cookie", cookies.map((c) => `${c.name}=${c.value}`).join("; "))
        .send({ sessionId: sessionToRevoke.id });

      // If revoking current session, returns 204; otherwise 200 with body
      if (revokeResponse.status === 204) {
        expect(revokeResponse.status).toBe(204);
      } else {
        expect(revokeResponse.status).toBe(200);
        expect(revokeResponse.body).toHaveProperty("revoked");
        expect(revokeResponse.body.revoked).toBe(1);
      }

      // Verify session is revoked in database
      const revokedSession = await db("auth_sessions").where({ jti: sessionToRevoke.id }).first();
      expect(revokedSession).toBeDefined();
      expect(revokedSession.revoked_at).not.toBeNull();
    });

    it("should revoke all other sessions except current", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }
      // Create multiple sessions by logging in multiple times
      const session1Cookies = await loginAndGetCookies();
      const session2Cookies = await loginAndGetCookies();
      const session3Cookies = await loginAndGetCookies();

      // Use session3 as current
      const listResponse = await request(app)
        .get("/api/v1/auth/sessions")
        .set("Cookie", session3Cookies.map((c) => `${c.name}=${c.value}`).join("; "));

      expect(listResponse.status).toBe(200);
      const sessionsBefore = listResponse.body.sessions.filter(
        (s: { revokedAt: string | null }) => !s.revokedAt,
      );
      expect(sessionsBefore.length).toBeGreaterThan(1);

      // Revoke all other sessions
      const revokeResponse = await request(app)
        .post("/api/v1/auth/sessions/revoke")
        .set("Cookie", session3Cookies.map((c) => `${c.name}=${c.value}`).join("; "))
        .send({ revokeOthers: true });

      expect(revokeResponse.status).toBe(200);
      expect(revokeResponse.body).toHaveProperty("revoked");
      expect(revokeResponse.body.revoked).toBeGreaterThan(0);

      // Verify current session is still active
      const listAfterResponse = await request(app)
        .get("/api/v1/auth/sessions")
        .set("Cookie", session3Cookies.map((c) => `${c.name}=${c.value}`).join("; "));

      const sessionsAfter = listAfterResponse.body.sessions;
      const currentSession = sessionsAfter.find((s: { isCurrent: boolean }) => s.isCurrent);
      expect(currentSession).toBeDefined();
      expect(currentSession.revokedAt).toBeNull();

      // Verify other sessions are revoked
      const otherSessions = sessionsAfter.filter((s: { isCurrent: boolean }) => !s.isCurrent);
      otherSessions.forEach((session: { revokedAt: string | null }) => {
        expect(session.revokedAt).not.toBeNull();
      });
    });

    it("should revoke all sessions including current", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }
      // Login to create a session
      cookies = await loginAndGetCookies();

      // Revoke all sessions
      const revokeResponse = await request(app)
        .post("/api/v1/auth/sessions/revoke")
        .set("Cookie", cookies.map((c) => `${c.name}=${c.value}`).join("; "))
        .send({ revokeAll: true });

      // When revoking all, it includes current session, so returns 204
      expect(revokeResponse.status).toBe(204);

      // Verify all sessions are revoked
      const activeSessions = await db("auth_sessions")
        .where({ user_id: userId })
        .whereNull("revoked_at");
      expect(activeSessions.length).toBe(0);
    });

    it("should require authentication to revoke sessions", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }
      const revokeResponse = await request(app)
        .post("/api/v1/auth/sessions/revoke")
        .send({ sessionId: "some-session-id" });

      expect(revokeResponse.status).toBe(401);
    });

    it("should reject invalid session ID", async () => {
      if (!dbAvailable) {
        console.warn("Skipping test: database unavailable");
        return;
      }
      cookies = await loginAndGetCookies();

      const revokeResponse = await request(app)
        .post("/api/v1/auth/sessions/revoke")
        .set("Cookie", cookies.map((c) => `${c.name}=${c.value}`).join("; "))
        .send({ sessionId: "non-existent-session-id" });

      // Invalid UUID format returns 400 (validation error), not 404
      expect(revokeResponse.status).toBe(400);
    });
  });
});
