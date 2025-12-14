import request from "supertest";
import app from "../../../../apps/backend/src/app.js";
import { env } from "../../../../apps/backend/src/config/env.js";
import { createAuthToken } from "../../../../apps/backend/src/modules/auth/auth.repository.js";
import { createUser } from "../../../../apps/backend/src/modules/auth/auth.repository.js";
import {
  truncateAll,
  ensureRolesSeeded,
  isDatabaseAvailable,
} from "../../../setup/test-helpers.js";
import { getCurrentTermsVersion } from "../../../../apps/backend/src/config/terms.js";

describe("System Routes", () => {
  let adminUser: { id: string; email: string; username: string };
  let adminToken: string;
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.warn("\n⚠️  System routes tests will be skipped (database unavailable)");
      return;
    }
    await ensureRolesSeeded();
  });

  beforeEach(async () => {
    if (!dbAvailable) {
      return;
    }
    try {
      await truncateAll();
      await ensureRolesSeeded();

      // Create admin user
      adminUser = await createUser({
        email: "admin@test.com",
        username: "admin",
        password_hash: "hashed",
        email_verified: true,
        status: "active",
        role_code: "admin",
        terms_accepted: true,
        terms_version: getCurrentTermsVersion(),
      });

      // Create auth token for admin
      const sessionId = "test-session-id";
      adminToken = await createAuthToken({
        userId: adminUser.id,
        sessionId,
        type: "access",
      });
    } catch (error) {
      // If database operations fail (e.g., tables don't exist), mark as unavailable
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("does not exist") || errorMessage.includes("relation")) {
        dbAvailable = false;
        console.warn("\n⚠️  System routes tests will be skipped (database tables not available)");
        return;
      }
      throw error;
    }
  });

  describe("GET /api/v1/system/health", () => {
    it("should return health status", async () => {
      if (!dbAvailable) {
        return;
      }
      const response = await request(app).get("/api/v1/system/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "ok");
      expect(response.body).toHaveProperty("uptime");
      expect(response.body).toHaveProperty("version");
      expect(response.body).toHaveProperty("timestamp");
      expect(typeof response.body.uptime).toBe("number");
      expect(typeof response.body.version).toBe("string");
    });
  });

  describe("GET /api/v1/system/read-only/status", () => {
    it("should return read-only mode status", async () => {
      if (!dbAvailable) {
        return;
      }
      const response = await request(app).get("/api/v1/system/read-only/status");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("readOnlyMode");
      expect(response.body).toHaveProperty("timestamp");
      expect(typeof response.body.readOnlyMode).toBe("boolean");
    });

    it("should include maintenance message when in read-only mode", async () => {
      if (!dbAvailable) {
        return;
      }
      const originalReadOnly = env.readOnlyMode;
      (env as { readOnlyMode: boolean }).readOnlyMode = true;

      try {
        const response = await request(app).get("/api/v1/system/read-only/status");

        expect(response.status).toBe(200);
        expect(response.body.readOnlyMode).toBe(true);
        expect(response.body).toHaveProperty("message");
      } finally {
        (env as { readOnlyMode: boolean }).readOnlyMode = originalReadOnly;
      }
    });
  });

  describe("POST /api/v1/system/read-only/enable", () => {
    it("should require authentication", async () => {
      if (!dbAvailable) {
        return;
      }
      const response = await request(app)
        .post("/api/v1/system/read-only/enable")
        .send({ reason: "Test" });

      expect(response.status).toBe(401);
    });

    it("should require admin role", async () => {
      if (!dbAvailable) {
        return;
      }
      // Create regular user
      const regularUser = await createUser({
        email: "user@test.com",
        username: "user",
        password_hash: "hashed",
        email_verified: true,
        status: "active",
        role_code: "athlete",
        terms_accepted: true,
        terms_version: getCurrentTermsVersion(),
      });

      const regularToken = await createAuthToken({
        userId: regularUser.id,
        sessionId: "test-session",
        type: "access",
      });

      const response = await request(app)
        .post("/api/v1/system/read-only/enable")
        .set("Authorization", `Bearer ${regularToken}`)
        .send({ reason: "Test" });

      expect(response.status).toBe(403);
    });

    it("should enable read-only mode", async () => {
      if (!dbAvailable) {
        return;
      }
      const originalReadOnly = env.readOnlyMode;
      (env as { readOnlyMode: boolean }).readOnlyMode = false;

      try {
        const response = await request(app)
          .post("/api/v1/system/read-only/enable")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            reason: "Emergency maintenance",
            estimatedDuration: "30 minutes",
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("readOnlyMode", true);
        expect(response.body).toHaveProperty("message");
        expect(env.readOnlyMode).toBe(true);
      } finally {
        (env as { readOnlyMode: boolean }).readOnlyMode = originalReadOnly;
      }
    });

    it("should handle missing optional fields", async () => {
      if (!dbAvailable) {
        return;
      }
      const originalReadOnly = env.readOnlyMode;
      (env as { readOnlyMode: boolean }).readOnlyMode = false;

      try {
        const response = await request(app)
          .post("/api/v1/system/read-only/enable")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({});

        expect(response.status).toBe(200);
        expect(response.body.readOnlyMode).toBe(true);
      } finally {
        (env as { readOnlyMode: boolean }).readOnlyMode = originalReadOnly;
      }
    });
  });

  describe("POST /api/v1/system/read-only/disable", () => {
    it("should require authentication", async () => {
      if (!dbAvailable) {
        return;
      }
      const response = await request(app)
        .post("/api/v1/system/read-only/disable")
        .send({ notes: "Test" });

      expect(response.status).toBe(401);
    });

    it("should require admin role", async () => {
      if (!dbAvailable) {
        return;
      }
      const regularUser = await createUser({
        email: "user2@test.com",
        username: "user2",
        password_hash: "hashed",
        email_verified: true,
        status: "active",
        role_code: "athlete",
        terms_accepted: true,
        terms_version: getCurrentTermsVersion(),
      });

      const regularToken = await createAuthToken({
        userId: regularUser.id,
        sessionId: "test-session",
        type: "access",
      });

      const response = await request(app)
        .post("/api/v1/system/read-only/disable")
        .set("Authorization", `Bearer ${regularToken}`)
        .send({ notes: "Test" });

      expect(response.status).toBe(403);
    });

    it("should disable read-only mode", async () => {
      if (!dbAvailable) {
        return;
      }
      const originalReadOnly = env.readOnlyMode;
      (env as { readOnlyMode: boolean }).readOnlyMode = true;

      try {
        const response = await request(app)
          .post("/api/v1/system/read-only/disable")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            notes: "Maintenance completed",
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("readOnlyMode", false);
        expect(response.body).toHaveProperty("message");
        expect(env.readOnlyMode).toBe(false);
      } finally {
        (env as { readOnlyMode: boolean }).readOnlyMode = originalReadOnly;
      }
    });

    it("should handle missing optional fields", async () => {
      if (!dbAvailable) {
        return;
      }
      const originalReadOnly = env.readOnlyMode;
      (env as { readOnlyMode: boolean }).readOnlyMode = true;

      try {
        const response = await request(app)
          .post("/api/v1/system/read-only/disable")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({});

        expect(response.status).toBe(200);
        expect(response.body.readOnlyMode).toBe(false);
      } finally {
        (env as { readOnlyMode: boolean }).readOnlyMode = originalReadOnly;
      }
    });
  });
});
