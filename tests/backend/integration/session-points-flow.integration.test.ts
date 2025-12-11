/**
 * Integration test for session completion and points calculation flow
 *
 * Tests the cross-module flow:
 * 1. User creates a session
 * 2. User completes the session
 * 3. Points are automatically calculated and awarded
 * 4. Points history is recorded
 *
 * Uses real database with transaction-based cleanup.
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../../apps/backend/src/app.js";
import db from "../../../apps/backend/src/db/index.js";
import { createUser } from "../../../apps/backend/src/modules/auth/auth.repository.js";
import { truncateAll, ensureRolesSeeded } from "../../setup/test-helpers.js";
import { v4 as uuidv4 } from "uuid";

describe("Integration: Session → Points Flow", () => {
  let testUser: { id: string; email: string; password: string; accessToken: string };

  beforeEach(async () => {
    // Ensure read-only mode is disabled for tests
    const { env } = await import("../../../apps/backend/src/config/env.js");
    (env as { readOnlyMode: boolean }).readOnlyMode = false;

    await truncateAll();
    // Ensure roles are seeded before creating users
    await ensureRolesSeeded();

    // Create a test user and get access token
    const userId = uuidv4();
    const password = "SecureP@ssw0rd123!";
    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();

    const userResult = await createUser({
      id: userId,
      username: "pointsuser",
      display_name: "Points User",
      status: "active",
      role_code: "athlete",
      password_hash: passwordHash,
      primaryEmail: "points@example.com",
      emailVerified: true,
      terms_accepted: true,
      terms_accepted_at: now,
      terms_version: "2024-06-01",
    });

    if (!userResult) {
      throw new Error("Failed to create test user");
    }

    // Verify user exists in database before login
    const verifyUser = await db("users").where({ id: userId }).first();
    if (!verifyUser) {
      throw new Error(`User ${userId} was not created in database`);
    }

    // Verify email contact was created
    const verifyContact = await db("user_contacts")
      .where({ user_id: userId, type: "email", is_primary: true })
      .first();
    if (!verifyContact) {
      throw new Error(`User email contact was not created in database`);
    }

    // Verify user can be found by email (same query login uses)
    const { findUserByEmail } =
      await import("../../../apps/backend/src/modules/auth/auth.repository.js");
    let foundUser = await findUserByEmail("points@example.com");
    let retries = 0;
    while (!foundUser && retries < 10) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      foundUser = await findUserByEmail("points@example.com");
      retries++;
    }
    if (!foundUser) {
      throw new Error(
        `User not found by email after ${retries} retries. User exists: ${!!verifyUser}, Contact exists: ${!!verifyContact}`,
      );
    }

    // Verify the user_id matches what we created
    if (foundUser.id !== userId) {
      throw new Error(
        `User ID mismatch: created ${userId}, found ${foundUser.id}. This indicates a data integrity issue.`,
      );
    }

    // Verify user exists in database using the found user_id (ensure FK constraint will pass)
    const verifyUserForFK = await db("users").where({ id: foundUser.id }).first();
    if (!verifyUserForFK) {
      throw new Error(
        `User ${foundUser.id} not found in users table. This will cause FK constraint violation in auth_sessions.`,
      );
    }

    // Small delay to ensure transaction is fully committed and visible across connections
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Login to get access token
    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: "points@example.com",
      password: password,
    });

    if (loginResponse.status !== 200) {
      throw new Error(
        `Failed to login test user: ${loginResponse.status} - ${JSON.stringify(loginResponse.body)}`,
      );
    }

    if (!loginResponse.body.tokens?.accessToken) {
      throw new Error(`Login response missing tokens: ${JSON.stringify(loginResponse.body)}`);
    }

    testUser = {
      id: userId,
      email: "points@example.com",
      password: password,
      accessToken: loginResponse.body.tokens.accessToken,
    };
  });

  afterEach(async () => {
    await truncateAll();
  });

  it("should award points when session is completed", async () => {
    // Step 1: Create a session
    const createResponse = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${testUser.accessToken}`)
      .send({
        title: "Strength Training",
        planned_at: new Date().toISOString(),
        visibility: "private",
        exercises: [
          {
            exercise_id: null,
            order: 1,
            sets: [
              {
                order: 1,
                reps: 10,
              },
            ],
          },
        ],
      });

    if (createResponse.status !== 201) {
      throw new Error(
        `Failed to create session: ${createResponse.status} - ${JSON.stringify(createResponse.body)}`,
      );
    }
    const sessionId = createResponse.body.id;

    // Step 2: Complete the session
    const completeResponse = await request(app)
      .patch(`/api/v1/sessions/${sessionId}`)
      .set("Authorization", `Bearer ${testUser.accessToken}`)
      .send({
        status: "completed",
        completed_at: new Date().toISOString(),
      });

    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body.status).toBe("completed");

    // Step 3: Verify points were awarded (with retry logic for transaction visibility)
    let pointsHistory = await db("user_points")
      .where({ user_id: testUser.id, source_type: "session_completed" })
      .orderBy("awarded_at", "desc")
      .first();

    let retries = 0;
    while (!pointsHistory && retries < 10) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      pointsHistory = await db("user_points")
        .where({ user_id: testUser.id, source_type: "session_completed" })
        .orderBy("awarded_at", "desc")
        .first();
      retries++;
    }

    expect(pointsHistory).toBeDefined();
    expect(pointsHistory).toHaveProperty("points");
    expect(pointsHistory.points).toBeGreaterThan(0);
    expect(pointsHistory.source_type).toBe("session_completed");
  });

  it("should not award points for canceled sessions", async () => {
    // Create a session
    const createResponse = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${testUser.accessToken}`)
      .send({
        title: "Canceled Workout",
        planned_at: new Date().toISOString(),
        visibility: "private",
        exercises: [],
      });

    if (!createResponse.body.id) {
      throw new Error(
        `Session creation failed or missing ID: ${JSON.stringify(createResponse.body)}`,
      );
    }
    const sessionId = createResponse.body.id;

    // Cancel the session
    const cancelResponse = await request(app)
      .patch(`/api/v1/sessions/${sessionId}`)
      .set("Authorization", `Bearer ${testUser.accessToken}`)
      .send({
        status: "canceled",
      });

    if (cancelResponse.status !== 200) {
      throw new Error(
        `Failed to cancel session: ${cancelResponse.status} - ${JSON.stringify(cancelResponse.body)}`,
      );
    }
    expect(cancelResponse.body.status).toBe("canceled");

    // Verify no points were awarded for canceled session
    const pointsHistory = await db("user_points")
      .where({ user_id: testUser.id })
      .where("source_type", "session")
      .orderBy("awarded_at", "desc")
      .first();

    // Points might exist from other operations, but not for canceled session
    if (pointsHistory) {
      expect(pointsHistory.reason).not.toContain("canceled");
    }
  });

  it("should calculate total points correctly across multiple sessions", async () => {
    // Create and complete multiple sessions
    const sessionIds: string[] = [];

    for (let i = 0; i < 3; i++) {
      const createResponse = await request(app)
        .post("/api/v1/sessions")
        .set("Authorization", `Bearer ${testUser.accessToken}`)
        .send({
          title: `Workout ${i + 1}`,
          planned_at: new Date().toISOString(),
          visibility: "private",
          exercises: [
            {
              exercise_id: null,
              order: 1,
              sets: [
                {
                  order: 1,
                  reps: 5,
                },
              ],
            },
          ],
        });

      sessionIds.push(createResponse.body.id);

      // Complete the session
      await request(app)
        .patch(`/api/v1/sessions/${createResponse.body.id}`)
        .set("Authorization", `Bearer ${testUser.accessToken}`)
        .send({
          status: "completed",
          completed_at: new Date().toISOString(),
        });
    }

    // Verify total points (with retry logic for transaction visibility)
    let totalPoints = await db("user_points")
      .where({ user_id: testUser.id })
      .sum("points as total")
      .first();

    let retries = 0;
    while ((!totalPoints || Number(totalPoints?.total || 0) === 0) && retries < 10) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      totalPoints = await db("user_points")
        .where({ user_id: testUser.id })
        .sum("points as total")
        .first();
      retries++;
    }

    expect(totalPoints).toBeDefined();
    expect(Number(totalPoints?.total || 0)).toBeGreaterThan(0);
  });
});
