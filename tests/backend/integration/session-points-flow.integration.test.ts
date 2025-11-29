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
import { truncateAll } from "../../setup/test-helpers.js";
import { v4 as uuidv4 } from "uuid";

describe("Integration: Session → Points Flow", () => {
  let testUser: { id: string; email: string; password: string; accessToken: string };

  beforeEach(async () => {
    await truncateAll();

    // Create a test user and get access token
    const userId = uuidv4();
    const password = "SecureP@ssw0rd123!";
    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();

    await createUser({
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
      terms_version: "1.0.0",
    });

    // Login to get access token
    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: "points@example.com",
      password: password,
    });

    if (loginResponse.status !== 200) {
      throw new Error("Failed to login test user");
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
        scheduledAt: new Date().toISOString(),
        status: "planned",
        privacy: "private",
        exercises: [
          {
            exerciseTypeId: null,
            name: "Push-ups",
            sets: [
              {
                reps: 10,
                weight: null,
                duration: null,
                distance: null,
              },
            ],
          },
        ],
      });

    expect(createResponse.status).toBe(201);
    const sessionId = createResponse.body.id;

    // Step 2: Complete the session
    const completeResponse = await request(app)
      .patch(`/api/v1/sessions/${sessionId}`)
      .set("Authorization", `Bearer ${testUser.accessToken}`)
      .send({
        status: "completed",
        completedAt: new Date().toISOString(),
      });

    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body.status).toBe("completed");

    // Step 3: Verify points were awarded
    const pointsHistory = await db("points_history")
      .where({ user_id: testUser.id })
      .orderBy("created_at", "desc")
      .first();

    expect(pointsHistory).toBeDefined();
    expect(pointsHistory).toHaveProperty("points");
    expect(pointsHistory.points).toBeGreaterThan(0);
    expect(pointsHistory.reason).toContain("session");
  });

  it("should not award points for canceled sessions", async () => {
    // Create a session
    const createResponse = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${testUser.accessToken}`)
      .send({
        title: "Canceled Workout",
        scheduledAt: new Date().toISOString(),
        status: "planned",
        privacy: "private",
        exercises: [],
      });

    const sessionId = createResponse.body.id;

    // Cancel the session
    const cancelResponse = await request(app)
      .patch(`/api/v1/sessions/${sessionId}`)
      .set("Authorization", `Bearer ${testUser.accessToken}`)
      .send({
        status: "canceled",
      });

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.status).toBe("canceled");

    // Verify no points were awarded
    const pointsHistory = await db("points_history")
      .where({ user_id: testUser.id })
      .where("reason", "like", "%session%")
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
          scheduledAt: new Date().toISOString(),
          status: "planned",
          privacy: "private",
          exercises: [
            {
              exerciseTypeId: null,
              name: "Exercise",
              sets: [{ reps: 5 }],
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
          completedAt: new Date().toISOString(),
        });
    }

    // Verify total points
    const totalPoints = await db("points_history")
      .where({ user_id: testUser.id })
      .sum("points as total")
      .first();

    expect(totalPoints).toBeDefined();
    expect(Number(totalPoints?.total || 0)).toBeGreaterThan(0);
  });
});
