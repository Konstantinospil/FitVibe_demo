/**
 * Integration tests for resend verification email endpoint
 *
 * Tests:
 * 1. Successful resend for pending_verification user
 * 2. Rate limiting (3 per hour)
 * 3. Generic success message (prevents user enumeration)
 * 4. Non-existent email returns success (enumeration protection)
 * 5. Already verified user returns success (enumeration protection)
 * 6. Invalid email format validation
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import request from "supertest";
import app from "../../../apps/backend/src/app.js";
import db from "../../../apps/backend/src/db/index.js";
import { createUser } from "../../../apps/backend/src/modules/auth/auth.repository.js";
import { truncateAll, ensureRolesSeeded } from "../../setup/test-helpers.js";
import { v4 as uuidv4 } from "uuid";

describe("Integration: Resend Verification Email", () => {
  beforeEach(async () => {
    // Ensure read-only mode is disabled for tests
    const { env } = await import("../../../apps/backend/src/config/env.js");
    (env as { readOnlyMode: boolean }).readOnlyMode = false;

    // Clean up any existing test data
    await truncateAll();
    // Ensure roles are seeded before creating users
    await ensureRolesSeeded();
  });

  afterEach(async () => {
    // Ensure cleanup after each test
    await truncateAll();
  });

  it("should resend verification email for pending_verification user", async () => {
    // Create a pending_verification user
    const userId = uuidv4();
    const email = "pending@example.com";

    await createUser({
      id: userId,
      username: "pendinguser",
      display_name: "Pending User",
      status: "pending_verification",
      role_code: "athlete",
      password_hash: "dummy_hash",
      primaryEmail: email,
      emailVerified: false,
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
      terms_version: "2024-06-01",
    });

    // Request resend
    const response = await request(app).post("/api/v1/auth/verify/resend").send({
      email,
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toContain("verification link will be sent");

    // Verify a new token was created
    const tokens = await db("auth_tokens")
      .where({ user_id: userId, type: "email_verification" })
      .orderBy("created_at", "desc")
      .limit(1);

    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0].expires_at).toBeDefined();
  });

  it("should return success for non-existent email (enumeration protection)", async () => {
    const response = await request(app).post("/api/v1/auth/verify/resend").send({
      email: "nonexistent@example.com",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toContain("verification link will be sent");
  });

  it("should return success for already verified user (enumeration protection)", async () => {
    // Create an active (verified) user
    const userId = uuidv4();
    const email = "verified@example.com";

    await createUser({
      id: userId,
      username: "verifieduser",
      display_name: "Verified User",
      status: "active",
      role_code: "athlete",
      password_hash: "dummy_hash",
      primaryEmail: email,
      emailVerified: true,
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
      terms_version: "2024-06-01",
    });

    const response = await request(app).post("/api/v1/auth/verify/resend").send({
      email,
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toContain("verification link will be sent");
  });

  it("should enforce rate limiting (3 requests per hour)", async () => {
    const userId = uuidv4();
    const email = "ratelimit@example.com";

    await createUser({
      id: userId,
      username: "ratelimituser",
      display_name: "Rate Limit User",
      status: "pending_verification",
      role_code: "athlete",
      password_hash: "dummy_hash",
      primaryEmail: email,
      emailVerified: false,
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
      terms_version: "2024-06-01",
    });

    // Make 3 successful requests
    for (let i = 0; i < 3; i++) {
      const response = await request(app).post("/api/v1/auth/verify/resend").send({
        email,
      });
      expect(response.status).toBe(200);
    }

    // 4th request should be rate limited
    const rateLimitedResponse = await request(app).post("/api/v1/auth/verify/resend").send({
      email,
    });

    expect(rateLimitedResponse.status).toBe(429);
    expect(rateLimitedResponse.body.error).toBeDefined();
  });

  it("should validate email format", async () => {
    const response = await request(app).post("/api/v1/auth/verify/resend").send({
      email: "invalid-email",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  it("should require email field", async () => {
    const response = await request(app).post("/api/v1/auth/verify/resend").send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  it("should handle multiple resends for same user", async () => {
    const userId = uuidv4();
    const email = "multiresend@example.com";

    await createUser({
      id: userId,
      username: "multiresenduser",
      display_name: "Multi Resend User",
      status: "pending_verification",
      role_code: "athlete",
      password_hash: "dummy_hash",
      primaryEmail: email,
      emailVerified: false,
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
      terms_version: "2024-06-01",
    });

    // First resend
    const response1 = await request(app).post("/api/v1/auth/verify/resend").send({
      email,
    });
    expect(response1.status).toBe(200);

    // Wait a bit to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Second resend
    const response2 = await request(app).post("/api/v1/auth/verify/resend").send({
      email,
    });
    expect(response2.status).toBe(200);

    // Verify both tokens exist
    const tokens = await db("auth_tokens")
      .where({ user_id: userId, type: "email_verification" })
      .orderBy("created_at", "desc");

    expect(tokens.length).toBeGreaterThanOrEqual(2);
  });
});

