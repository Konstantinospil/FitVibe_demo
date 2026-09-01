/**
 * Unit tests for database configuration and SSL settings
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

// Mock dotenv to prevent it from loading .env files that might override test values
jest.mock("dotenv", () => ({
  default: {
    config: jest.fn(() => ({})),
  },
  config: jest.fn(() => ({})),
}));

describe("Database Configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment variables before each test
    for (const key in process.env) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    for (const key in originalEnv) {
      process.env[key] = originalEnv[key];
    }
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("SSL Configuration", () => {
    it("should not enable SSL when PGSSL is not set", async () => {
      delete process.env.PGSSL;
      delete process.env.NODE_ENV;

      // Dynamically import to get fresh config
      jest.resetModules();
      const { DB_CONFIG } = await import("../../../apps/backend/src/db/db.config.js");

      expect(DB_CONFIG.ssl).toBeUndefined();
    });

    it("should enable SSL with relaxed verification in development", async () => {
      process.env.PGSSL = "true";
      process.env.NODE_ENV = "development";

      jest.resetModules();
      const { DB_CONFIG } = await import("../../../apps/backend/src/db/db.config.js");

      expect(DB_CONFIG.ssl).toBeDefined();
      expect(DB_CONFIG.ssl?.rejectUnauthorized).toBe(false);
    });

    it("should use relaxed SSL in test environment", async () => {
      process.env.PGSSL = "true";
      process.env.NODE_ENV = "test";

      jest.resetModules();
      const { DB_CONFIG } = await import("../../../apps/backend/src/db/db.config.js");

      expect(DB_CONFIG.ssl).toBeDefined();
      expect(DB_CONFIG.ssl?.rejectUnauthorized).toBe(false);
    });

    it("should not enable SSL when PGSSL is false", async () => {
      process.env.PGSSL = "false";
      process.env.NODE_ENV = "production";

      jest.resetModules();
      const { DB_CONFIG } = await import("../../../apps/backend/src/db/db.config.js");

      expect(DB_CONFIG.ssl).toBeUndefined();
    });
  });

  describe("Database Connection Parameters", () => {
    it("should use default values when environment variables are not set", async () => {
      delete process.env.PGHOST;
      delete process.env.PGPORT;
      delete process.env.PGDATABASE;
      delete process.env.PGUSER;
      delete process.env.PGPASSWORD;

      jest.resetModules();
      const { DB_CONFIG } = await import("../../../apps/backend/src/db/db.config.js");

      expect(DB_CONFIG.host).toBe("localhost");
      expect(DB_CONFIG.port).toBe(5432);
      expect(DB_CONFIG.database).toBe("fitvibe");
      expect(DB_CONFIG.user).toBe("fitvibe");
      expect(DB_CONFIG.password).toBe("fitvibe");
    });

    it("should use environment variables when set", async () => {
      process.env.PGHOST = "db.example.com";
      process.env.PGPORT = "5433";
      process.env.PGDATABASE = "mydb";
      process.env.PGUSER = "myuser";
      process.env.PGPASSWORD = "mypassword";

      jest.resetModules();
      const { DB_CONFIG } = await import("../../../apps/backend/src/db/db.config.js");

      expect(DB_CONFIG.host).toBe("db.example.com");
      expect(DB_CONFIG.port).toBe(5433);
      expect(DB_CONFIG.database).toBe("mydb");
      expect(DB_CONFIG.user).toBe("myuser");
      expect(DB_CONFIG.password).toBe("mypassword");
    });
  });
});
