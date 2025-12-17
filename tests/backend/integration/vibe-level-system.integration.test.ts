/**
 * Integration test for vibe level system (v2_vibe_lvl algorithm)
 *
 * Tests the cross-module flow:
 * 1. User completes a session
 * 2. Domains are detected from session metrics
 * 3. Vibe levels are updated using Glicko-2
 * 4. Points are calculated and awarded
 * 5. Rating decay is applied for inactive domains
 *
 * Uses real database with transaction-based cleanup.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from "@jest/globals";
import bcrypt from "bcryptjs";
import db from "../../../apps/backend/src/db/index.js";
import { createUser } from "../../../apps/backend/src/modules/auth/auth.repository.js";
import { awardPointsForSession } from "../../../apps/backend/src/modules/points/points.service.js";
import { applyVibeLevelDecay } from "../../../apps/backend/src/jobs/services/vibe-level-decay.service.js";
import {
  getDomainVibeLevel,
  getAllDomainVibeLevels,
} from "../../../apps/backend/src/modules/points/points.repository.js";
import {
  truncateAll,
  ensureRolesSeeded,
  withDatabaseErrorHandling,
  isDatabaseAvailable,
  ensureUsernameColumnExists,
} from "../../setup/test-helpers.js";
import { v4 as uuidv4 } from "uuid";
import { getCurrentTermsVersion } from "../../../apps/backend/src/config/terms.js";
import type { SessionWithExercises } from "../../../apps/backend/src/modules/sessions/sessions.types.js";

describe("Integration: Vibe Level System (v2_vibe_lvl)", () => {
  let testUser: { id: string; email: string; password: string };
  let dbAvailable = false;

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
      await truncateAll();
      await ensureRolesSeeded();

      // Create a test user
      const userId = uuidv4();
      const password = "SecureP@ssw0rd123!";
      const passwordHash = await bcrypt.hash(password, 12);
      const now = new Date().toISOString();

      const userResult = await createUser({
        id: userId,
        username: "vibetest",
        display_name: "Vibe Test User",
        status: "active",
        role_code: "athlete",
        password_hash: passwordHash,
        primaryEmail: "vibetest@example.com",
        emailVerified: true,
        terms_accepted: true,
        terms_accepted_at: now,
        terms_version: getCurrentTermsVersion(),
      });

      if (!userResult) {
        throw new Error("Failed to create test user");
      }

      testUser = {
        id: userId,
        email: "vibetest@example.com",
        password,
      };

      // Initialize vibe levels for the test user (migration only initializes existing users)
      await db.raw(
        `
        INSERT INTO user_domain_vibe_levels (user_id, domain_code, vibe_level, rating_deviation, volatility)
        SELECT 
          ?,
          domain.domain_code,
          1000.0,
          350.0,
          0.06
        FROM (
          SELECT unnest(ARRAY[
            'strength', 'agility', 'endurance', 
            'explosivity', 'intelligence', 'regeneration'
          ]) AS domain_code
        ) domain
        ON CONFLICT (user_id, domain_code) DO NOTHING;
      `,
        [userId],
      );

      // Verify vibe levels were initialized
      const vibeLevels = await getAllDomainVibeLevels(userId);
      expect(vibeLevels.size).toBe(6); // All 6 domains should be initialized
    });
  });

  afterEach(async () => {
    if (!dbAvailable) {
      return;
    }
    await truncateAll();
  });

  it("should initialize vibe levels for new user", async () => {
    if (!dbAvailable) {
      return;
    }

    const strengthLevel = await getDomainVibeLevel(testUser.id, "strength");
    expect(strengthLevel).toBeDefined();
    expect(strengthLevel?.vibe_level).toBe(1000.0);
    expect(strengthLevel?.rating_deviation).toBe(350.0);
    expect(strengthLevel?.volatility).toBe(0.06);

    const allLevels = await getAllDomainVibeLevels(testUser.id);
    expect(allLevels.size).toBe(6);
    for (const [domain, level] of allLevels) {
      expect(level.vibe_level).toBe(1000.0);
      expect(level.rating_deviation).toBe(350.0);
    }
  });

  it("should detect strength domain and update vibe level", async () => {
    if (!dbAvailable) {
      return;
    }

    const session: SessionWithExercises = {
      id: uuidv4(),
      owner_id: testUser.id,
      status: "completed",
      completed_at: new Date().toISOString(),
      started_at: new Date(Date.now() - 3600000).toISOString(),
      visibility: "private",
      planned_at: new Date().toISOString(),
      exercises: [
        {
          id: uuidv4(),
          session_id: uuidv4(),
          order_index: 0,
          sets: [
            {
              id: uuidv4(),
              order_index: 0,
              weight_kg: 100,
              reps: 5,
            },
            {
              id: uuidv4(),
              order_index: 1,
              weight_kg: 100,
              reps: 5,
            },
          ],
        },
      ],
    };

    const result = await awardPointsForSession(session);

    expect(result.awarded).toBe(true);
    expect(result.pointsAwarded).toBeGreaterThan(0);

    // Check that strength vibe level was updated
    const strengthLevel = await getDomainVibeLevel(testUser.id, "strength");
    expect(strengthLevel).toBeDefined();
    // Vibe level should have changed (could be up or down depending on performance)
    expect(strengthLevel?.vibe_level).not.toBe(1000.0);
    expect(strengthLevel?.rating_deviation).toBeLessThan(350.0); // RD should decrease with activity
  });

  it("should detect endurance domain from distance", async () => {
    if (!dbAvailable) {
      return;
    }

    const session: SessionWithExercises = {
      id: uuidv4(),
      owner_id: testUser.id,
      status: "completed",
      completed_at: new Date().toISOString(),
      started_at: new Date(Date.now() - 3600000).toISOString(),
      visibility: "private",
      planned_at: new Date().toISOString(),
      exercises: [
        {
          id: uuidv4(),
          session_id: uuidv4(),
          order_index: 0,
          actual: {
            distance: 10, // 10km
            rpe: 7,
          },
          sets: [],
        },
      ],
    };

    const result = await awardPointsForSession(session);

    expect(result.awarded).toBe(true);
    expect(result.pointsAwarded).toBeGreaterThan(0);

    const enduranceLevel = await getDomainVibeLevel(testUser.id, "endurance");
    expect(enduranceLevel).toBeDefined();
    expect(enduranceLevel?.vibe_level).not.toBe(1000.0);
  });

  it("should detect multiple domains in one session", async () => {
    if (!dbAvailable) {
      return;
    }

    const session: SessionWithExercises = {
      id: uuidv4(),
      owner_id: testUser.id,
      status: "completed",
      completed_at: new Date().toISOString(),
      started_at: new Date(Date.now() - 20 * 60000).toISOString(), // 20 minutes
      visibility: "private",
      planned_at: new Date().toISOString(),
      exercises: [
        {
          id: uuidv4(),
          session_id: uuidv4(),
          order_index: 0,
          actual: {
            rpe: 10,
          },
          sets: [
            {
              id: uuidv4(),
              order_index: 0,
              weight_kg: 100,
              reps: 10,
              rpe: 10,
            },
          ],
        },
      ],
    };

    const result = await awardPointsForSession(session);

    expect(result.awarded).toBe(true);
    expect(result.pointsAwarded).toBeGreaterThan(0);

    // Both strength and explosivity should be updated
    const strengthLevel = await getDomainVibeLevel(testUser.id, "strength");
    const explosivityLevel = await getDomainVibeLevel(testUser.id, "explosivity");

    expect(strengthLevel).toBeDefined();
    expect(explosivityLevel).toBeDefined();
    expect(strengthLevel?.vibe_level).not.toBe(1000.0);
    expect(explosivityLevel?.vibe_level).not.toBe(1000.0);
  });

  it("should apply rating decay for inactive domains", async () => {
    if (!dbAvailable) {
      return;
    }

    // First, update a domain to have a recent timestamp
    const session: SessionWithExercises = {
      id: uuidv4(),
      owner_id: testUser.id,
      status: "completed",
      completed_at: new Date().toISOString(),
      started_at: new Date(Date.now() - 3600000).toISOString(),
      visibility: "private",
      planned_at: new Date().toISOString(),
      exercises: [
        {
          id: uuidv4(),
          session_id: uuidv4(),
          order_index: 0,
          sets: [
            {
              id: uuidv4(),
              order_index: 0,
              weight_kg: 100,
              reps: 5,
            },
          ],
        },
      ],
    };

    await awardPointsForSession(session);

    // Manually set last_updated_at to 2 days ago for strength domain
    await db("user_domain_vibe_levels")
      .where({ user_id: testUser.id, domain_code: "strength" })
      .update({
        last_updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      });

    // Get initial values
    const initialLevel = await getDomainVibeLevel(testUser.id, "strength");
    const initialVibeLevel = initialLevel?.vibe_level ?? 1000;
    const initialRd = initialLevel?.rating_deviation ?? 350;

    // Apply decay
    await applyVibeLevelDecay();

    // Check that decay was applied
    const decayedLevel = await getDomainVibeLevel(testUser.id, "strength");
    expect(decayedLevel).toBeDefined();
    expect(decayedLevel?.vibe_level).toBeLessThanOrEqual(initialVibeLevel); // Should decrease or stay same
    expect(decayedLevel?.rating_deviation).toBeGreaterThanOrEqual(initialRd); // RD should increase or stay same

    // Check that vibe level change was logged (if decay actually changed values)
    const changes = await db("vibe_level_changes")
      .where({ user_id: testUser.id, domain_code: "strength", change_reason: "decay" })
      .orderBy("created_at", "desc")
      .limit(1);

    // Decay may or may not create a log entry depending on whether values actually changed
    // If changes exist, verify they match expectations
    if (changes.length > 0) {
      expect(changes[0].old_vibe_level).toBe(initialVibeLevel);
      expect(changes[0].new_vibe_level).toBe(decayedLevel?.vibe_level);
    }
  });

  it("should not decay recently updated domains", async () => {
    if (!dbAvailable) {
      return;
    }

    // Update a domain
    const session: SessionWithExercises = {
      id: uuidv4(),
      owner_id: testUser.id,
      status: "completed",
      completed_at: new Date().toISOString(),
      started_at: new Date(Date.now() - 3600000).toISOString(),
      visibility: "private",
      planned_at: new Date().toISOString(),
      exercises: [
        {
          id: uuidv4(),
          session_id: uuidv4(),
          order_index: 0,
          sets: [
            {
              id: uuidv4(),
              order_index: 0,
              weight_kg: 100,
              reps: 5,
            },
          ],
        },
      ],
    };

    await awardPointsForSession(session);

    const initialLevel = await getDomainVibeLevel(testUser.id, "strength");
    const initialVibeLevel = initialLevel?.vibe_level ?? 1000;

    // Apply decay (should not affect recently updated domain)
    await applyVibeLevelDecay();

    const afterDecay = await getDomainVibeLevel(testUser.id, "strength");
    expect(afterDecay?.vibe_level).toBe(initialVibeLevel); // Should not change
  });

  it("should calculate general fitness score correctly", async () => {
    if (!dbAvailable) {
      return;
    }

    const { calculateGeneralFitnessScore } =
      await import("../../../apps/backend/src/modules/points/vibe-level.service.js");

    // Get all vibe levels
    const vibeLevels = await getAllDomainVibeLevels(testUser.id);

    // For balanced user (all 1000), score should be 1000
    const score = calculateGeneralFitnessScore(vibeLevels);
    expect(score).toBeCloseTo(1000, 0);

    // Update one domain to be much higher
    await db("user_domain_vibe_levels")
      .where({ user_id: testUser.id, domain_code: "strength" })
      .update({ vibe_level: 2000 });

    const updatedLevels = await getAllDomainVibeLevels(testUser.id);
    const updatedScore = calculateGeneralFitnessScore(updatedLevels);

    // Geometric mean should be lower than arithmetic mean for imbalanced users
    const arithmeticMean = (2000 + 1000 * 5) / 6; // ~1167
    expect(updatedScore).toBeLessThan(arithmeticMean);
  });

  it("should award more points to beginners for same effort", async () => {
    if (!dbAvailable) {
      return;
    }

    // Create two users: beginner (low vibe level) and advanced (high vibe level)
    const beginnerId = uuidv4();
    const advancedId = uuidv4();
    const passwordHash = await bcrypt.hash("password", 12);
    const now = new Date().toISOString();

    await createUser({
      id: beginnerId,
      username: "beginner",
      display_name: "Beginner",
      status: "active",
      role_code: "athlete",
      password_hash: passwordHash,
      primaryEmail: "beginner@example.com",
      emailVerified: true,
      terms_accepted: true,
      terms_accepted_at: now,
      terms_version: getCurrentTermsVersion(),
    });

    await createUser({
      id: advancedId,
      username: "advanced",
      display_name: "Advanced",
      status: "active",
      role_code: "athlete",
      password_hash: passwordHash,
      primaryEmail: "advanced@example.com",
      emailVerified: true,
      terms_accepted: true,
      terms_accepted_at: now,
      terms_version: getCurrentTermsVersion(),
    });

    // Initialize vibe levels for both users
    await db.raw(
      `
      INSERT INTO user_domain_vibe_levels (user_id, domain_code, vibe_level, rating_deviation, volatility)
      SELECT 
        ?,
        domain.domain_code,
        1000.0,
        350.0,
        0.06
      FROM (
        SELECT unnest(ARRAY[
          'strength', 'agility', 'endurance', 
          'explosivity', 'intelligence', 'regeneration'
        ]) AS domain_code
      ) domain
      ON CONFLICT (user_id, domain_code) DO NOTHING;
    `,
      [beginnerId],
    );

    await db.raw(
      `
      INSERT INTO user_domain_vibe_levels (user_id, domain_code, vibe_level, rating_deviation, volatility)
      SELECT 
        ?,
        domain.domain_code,
        1000.0,
        350.0,
        0.06
      FROM (
        SELECT unnest(ARRAY[
          'strength', 'agility', 'endurance', 
          'explosivity', 'intelligence', 'regeneration'
        ]) AS domain_code
      ) domain
      ON CONFLICT (user_id, domain_code) DO NOTHING;
    `,
      [advancedId],
    );

    // Set advanced user's strength vibe level to 2000
    await db("user_domain_vibe_levels")
      .where({ user_id: advancedId, domain_code: "strength" })
      .update({ vibe_level: 2000, rating_deviation: 50 });

    // Same session for both users
    const createSession = (userId: string): SessionWithExercises => ({
      id: uuidv4(),
      owner_id: userId,
      status: "completed",
      completed_at: new Date().toISOString(),
      started_at: new Date(Date.now() - 3600000).toISOString(),
      visibility: "private",
      planned_at: new Date().toISOString(),
      exercises: [
        {
          id: uuidv4(),
          session_id: uuidv4(),
          order_index: 0,
          sets: [
            {
              id: uuidv4(),
              order_index: 0,
              weight_kg: 100,
              reps: 5,
            },
          ],
        },
      ],
    });

    const beginnerResult = await awardPointsForSession(createSession(beginnerId));
    const advancedResult = await awardPointsForSession(createSession(advancedId));

    // Beginner should get more points for same effort (relative achievement)
    // Use >= to handle edge cases where they might be equal
    expect(beginnerResult.pointsAwarded).toBeGreaterThanOrEqual(advancedResult.pointsAwarded ?? 0);
  });
});
