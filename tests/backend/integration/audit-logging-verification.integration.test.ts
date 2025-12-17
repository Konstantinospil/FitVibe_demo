/**
 * Integration test for audit logging verification (HIGH-005)
 *
 * Tests that all profile changes are properly audit-logged.
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

describe("Integration: Audit Logging Verification", () => {
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

  it("should create audit log entry for alias change", async () => {
    if (!dbAvailable) {
      console.warn("Skipping test: database unavailable");
      return;
    }

    // Update alias
    await request(app).patch("/api/v1/users/me").set("Authorization", `Bearer ${authToken}`).send({
      alias: "testalias",
    });

    // Verify audit log entry was created
    const auditLogs = await db("audit_logs")
      .where({ actor_user_id: userId, entity: "users", action: "update" })
      .orderBy("created_at", "desc")
      .limit(1);

    expect(auditLogs.length).toBeGreaterThan(0);
    const auditLog = auditLogs[0];
    expect(auditLog.metadata).toBeDefined();

    const metadata = auditLog.metadata as { changes?: { alias?: { old?: string; next?: string } } };
    expect(metadata.changes?.alias).toBeDefined();
    expect(metadata.changes?.alias?.next).toBe("testalias");
  });

  it("should create audit log entry for weight change", async () => {
    if (!dbAvailable) {
      console.warn("Skipping test: database unavailable");
      return;
    }

    // Update weight
    await request(app).patch("/api/v1/users/me").set("Authorization", `Bearer ${authToken}`).send({
      weight: 75.5,
      weightUnit: "kg",
    });

    // Verify audit log entry was created
    const auditLogs = await db("audit_logs")
      .where({ actor_user_id: userId, entity: "users", action: "update" })
      .orderBy("created_at", "desc")
      .limit(1);

    expect(auditLogs.length).toBeGreaterThan(0);
    const auditLog = auditLogs[0];
    expect(auditLog.metadata).toBeDefined();

    const metadata = auditLog.metadata as {
      changes?: { weight?: { old?: number; next?: number } };
    };
    expect(metadata.changes?.weight).toBeDefined();
    expect(metadata.changes?.weight?.next).toBe(75.5);
  });

  it("should create state history entry for profile changes", async () => {
    if (!dbAvailable) {
      console.warn("Skipping test: database unavailable");
      return;
    }

    // Update alias
    await request(app).patch("/api/v1/users/me").set("Authorization", `Bearer ${authToken}`).send({
      alias: "newalias",
    });

    // Verify state history entry was created
    const stateHistory = await db("user_state_history")
      .where({ user_id: userId, field: "alias" })
      .orderBy("changed_at", "desc")
      .limit(1);

    expect(stateHistory.length).toBeGreaterThan(0);
    const historyEntry = stateHistory[0];
    expect(historyEntry.new_value).toBeDefined();
    expect(JSON.parse(historyEntry.new_value as string)).toBe("newalias");
  });

  it("should log all changed fields in audit log", async () => {
    if (!dbAvailable) {
      console.warn("Skipping test: database unavailable");
      return;
    }

    // Update multiple fields
    await request(app).patch("/api/v1/users/me").set("Authorization", `Bearer ${authToken}`).send({
      alias: "multialias",
      weight: 80,
      weightUnit: "kg",
      fitnessLevel: "intermediate",
    });

    // Verify audit log contains all changes
    const auditLogs = await db("audit_logs")
      .where({ actor_user_id: userId, entity: "users", action: "update" })
      .orderBy("created_at", "desc")
      .limit(1);

    expect(auditLogs.length).toBeGreaterThan(0);
    const auditLog = auditLogs[0];
    const metadata = auditLog.metadata as {
      changes?: {
        alias?: { old?: string; next?: string };
        weight?: { old?: number; next?: number };
        fitnessLevel?: { old?: string; next?: string };
      };
    };

    expect(metadata.changes?.alias).toBeDefined();
    expect(metadata.changes?.weight).toBeDefined();
    expect(metadata.changes?.fitnessLevel).toBeDefined();
  });
});
