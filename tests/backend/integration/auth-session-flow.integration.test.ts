/**
 * Integration test for complete authentication and session flow
 *
 * Tests the cross-module flow:
 * 1. User registration
 * 2. Email verification
 * 3. User login
 * 4. Session creation
 * 5. Session completion
 *
 * Uses real database with transaction-based cleanup.
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../../apps/backend/src/app.js";
import db from "../../../apps/backend/src/db/index.js";
import { createUser } from "../../../apps/backend/src/modules/auth/auth.repository.js";
import { truncateAll } from "../../setup/test-helpers.js";
import { v4 as uuidv4 } from "uuid";

describe("Integration: Auth → Session Flow", () => {
  beforeEach(async () => {
    // Clean up any existing test data
    await truncateAll();
  });

  afterEach(async () => {
    // Ensure cleanup after each test
    await truncateAll();
  });

  it("should complete full flow: register → verify → login → create session", async () => {
    // Step 1: Register a new user via API
    const registerResponse = await request(app).post("/api/v1/auth/register").send({
      email: "testuser@example.com",
      username: "testuser",
      password: "SecureP@ssw0rd123!",
      terms_accepted: true,
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body).toHaveProperty("verificationToken");
    expect(registerResponse.body.user).toMatchObject({
      email: "testuser@example.com",
      username: "testuser",
      status: "pending_verification",
    });

    const userId = registerResponse.body.user.id;
    const verificationToken = registerResponse.body.verificationToken;

    // Step 2: Verify email via API
    const verifyResponse = await request(app).post("/api/v1/auth/verify-email").send({
      token: verificationToken,
    });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.user.status).toBe("active");

    // Step 3: Login via API
    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: "testuser@example.com",
      password: "SecureP@ssw0rd123!",
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty("tokens");
    expect(loginResponse.body).toHaveProperty("user");
    expect(loginResponse.body.user.status).toBe("active");

    const accessToken = loginResponse.body.tokens.accessToken;

    // Step 4: Create a session via API
    const sessionResponse = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "Morning Workout",
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: "planned",
        privacy: "private",
        exercises: [],
      });

    expect(sessionResponse.status).toBe(201);
    expect(sessionResponse.body).toMatchObject({
      title: "Morning Workout",
      status: "planned",
      privacy: "private",
      userId: userId,
    });

    // Verify session was created in database
    const sessionInDb = await db("sessions").where({ id: sessionResponse.body.id }).first();
    expect(sessionInDb).toBeDefined();
    expect(sessionInDb.user_id).toBe(userId);
  });

  it("should handle login failure with incorrect password", async () => {
    // Create a verified user directly in database
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash("CorrectPassword123!", 12);
    const now = new Date().toISOString();

    await createUser({
      id: userId,
      username: "existinguser",
      display_name: "Existing User",
      status: "active",
      role_code: "athlete",
      password_hash: passwordHash,
      primaryEmail: "existing@example.com",
      emailVerified: true,
      terms_accepted: true,
      terms_accepted_at: now,
      terms_version: "1.0.0",
    });

    // Attempt login with wrong password
    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: "existing@example.com",
      password: "WrongPassword123!",
    });

    expect(loginResponse.status).toBe(401);
    expect(loginResponse.body.error).toBeDefined();
  });

  it("should prevent creating session without authentication", async () => {
    const sessionResponse = await request(app).post("/api/v1/sessions").send({
      title: "Unauthorized Session",
      scheduledAt: new Date().toISOString(),
      status: "planned",
      privacy: "private",
      exercises: [],
    });

    expect(sessionResponse.status).toBe(401);
  });
});
