import type { Request, Response } from "express";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";
import {
  setup,
  enable,
  disable,
  verify,
  regenerateBackups,
  status,
} from "../../../../apps/backend/src/modules/auth/two-factor.controller.js";

const createQueryBuilder = <T>(result: T | null) => ({
  where: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  first: jest.fn().mockResolvedValue(result),
});

const tableMocks: Record<string, ReturnType<typeof createQueryBuilder>> = {};

function createDbProxy() {
  const mockDb = Object.assign(
    jest.fn((table: string) => {
      const builder = tableMocks[table];
      if (!builder) {
        throw new Error(`No mock for table ${table}`);
      }
      return builder;
    }),
    {
      transaction: jest
        .fn()
        .mockImplementation(async (callback: (trx: unknown) => Promise<unknown>) => callback({})),
    },
  );

  return Object.assign((...args: Parameters<typeof mockDb>) => mockDb(...(args as [string])), {
    transaction: (...args: Parameters<typeof mockDb.transaction>) =>
      mockDb.transaction(...(args as [Parameters<typeof mockDb.transaction>[0]])),
  });
}

const dbProxy = createDbProxy();
const currentDbConnection = dbProxy;

jest.mock("../../../../apps/backend/src/db/connection.js", () => ({
  get db() {
    return currentDbConnection;
  },
}));

jest.mock("../../../../apps/backend/src/modules/auth/two-factor.service.js", () => ({
  initializeTwoFactorSetup: jest.fn(),
  enableTwoFactor: jest.fn(),
  disableTwoFactor: jest.fn(),
  regenerateBackupCodes: jest.fn(),
  getBackupCodeStats: jest.fn(),
  verifyTotpToken: jest.fn(),
  generateBackupCodes: jest.fn(),
  verifyTwoFactorToken: jest.fn(),
}));
const serviceMocks = jest.requireMock(
  "../../../../apps/backend/src/modules/auth/two-factor.service.js",
);

jest.mock("bcryptjs", () => ({
  compare: jest.fn().mockResolvedValue(true),
}));
const bcrypt = jest.requireMock("bcryptjs");

jest.mock("../../../../apps/backend/src/config/logger.js", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const createResponse = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  };
  return res as Response & { status: jest.Mock; json: jest.Mock; set: jest.Mock };
};

const createRequest = (overrides: Partial<Request> = {}): Request => {
  const req: Partial<Request> = {
    user: { sub: "user-123", role: "athlete" } as any,
    body: {},
    params: {},
    query: {},
    ip: "127.0.0.1",
    get: jest.fn().mockReturnValue("jest-agent"),
    ...overrides,
  };
  return req as Request;
};

describe("two-factor controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(tableMocks).forEach((key) => delete tableMocks[key]);
  });

  describe("setup", () => {
    it("requires authentication", async () => {
      const req = createRequest({ user: undefined });
      const res = createResponse();
      const next = jest.fn();

      await setup(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    });

    it("handles missing users", async () => {
      tableMocks.users = createQueryBuilder(null);
      const req = createRequest();
      const res = createResponse();
      const next = jest.fn();

      await setup(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    });

    it("returns setup payload when available", async () => {
      tableMocks.users = createQueryBuilder({
        email: "test@example.com",
        two_factor_enabled: false,
      });
      serviceMocks.initializeTwoFactorSetup.mockResolvedValue({
        secret: "secret",
        qrCodeUrl: "qr",
        backupCodes: ["code-1", "code-2"],
      });
      const req = createRequest();
      const res = createResponse();
      const next = jest.fn();

      await setup(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ secret: "secret", backupCodes: ["code-1", "code-2"] }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("rejects requests when 2FA already enabled", async () => {
      tableMocks.users = createQueryBuilder({
        email: "test@example.com",
        two_factor_enabled: true,
      });
      const req = createRequest();
      const res = createResponse();
      const next = jest.fn();

      await setup(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    });
  });

  describe("enable", () => {
    it("requires authentication", async () => {
      const req = createRequest({
        user: undefined,
        body: { secret: "x".repeat(16), token: "123456" },
      });
      const res = createResponse();
      const next = jest.fn();

      await enable(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    });

    it("validates input", async () => {
      const req = createRequest();
      const res = createResponse();
      const next = jest.fn();

      await enable(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    });

    it("rejects invalid tokens", async () => {
      const req = createRequest({ body: { secret: "a".repeat(16), token: "123456" } });
      const res = createResponse();
      const next = jest.fn();
      serviceMocks.verifyTotpToken.mockReturnValue(false);

      await enable(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    });

    it("enables 2FA when token is valid", async () => {
      const req = createRequest({ body: { secret: "a".repeat(16), token: "123456" } });
      const res = createResponse();
      const next = jest.fn();
      serviceMocks.verifyTotpToken.mockReturnValue(true);
      serviceMocks.generateBackupCodes.mockReturnValue(["backup-1", "backup-2"]);

      await enable(req, res, next);
      expect(serviceMocks.enableTwoFactor).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ backupCodes: ["backup-1", "backup-2"] }),
      );
    });
  });

  describe("disable", () => {
    it("verifies password and token before disabling", async () => {
      const req = createRequest({
        body: { password: "StrongPassword123!", token: "654321" },
      });
      tableMocks.users = createQueryBuilder({
        password_hash: "hash",
        two_factor_enabled: true,
        two_factor_secret: "secret",
      });
      serviceMocks.verifyTotpToken.mockReturnValue(true);
      const res = createResponse();
      const next = jest.fn();

      await disable(req, res, next);
      expect(serviceMocks.disableTwoFactor).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("disabled") }),
      );
    });

    it("rejects missing users", async () => {
      tableMocks.users = createQueryBuilder(null);
      const req = createRequest({ body: { password: "StrongPassword123!", token: "654321" } });
      const res = createResponse();
      const next = jest.fn();

      await disable(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    });

    it("requires 2FA to be enabled", async () => {
      tableMocks.users = createQueryBuilder({
        password_hash: "hash",
        two_factor_enabled: false,
        two_factor_secret: "secret",
      });
      const req = createRequest({ body: { password: "StrongPassword123!", token: "654321" } });
      const res = createResponse();
      const next = jest.fn();

      await disable(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    });

    it("validates password and tokens", async () => {
      tableMocks.users = createQueryBuilder({
        password_hash: "hash",
        two_factor_enabled: true,
        two_factor_secret: "secret",
      });
      bcrypt.compare.mockResolvedValueOnce(false);
      const req = createRequest({ body: { password: "wrong", token: "654321" } });
      const res = createResponse();
      const next = jest.fn();

      await disable(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpError));

      // Restore for next tests
      bcrypt.compare.mockResolvedValue(true);
      serviceMocks.verifyTotpToken.mockReturnValueOnce(false);
      await disable(
        createRequest({ body: { password: "StrongPassword123!", token: "654321" } }),
        res,
        next,
      );
      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    });
  });

  describe("verify", () => {
    it("rejects invalid payloads", async () => {
      const req = createRequest({ body: {} });
      const res = createResponse();
      const next = jest.fn();

      await verify(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    });

    it("validates provided token", async () => {
      const req = createRequest({ body: { token: "654321" } });
      const res = createResponse();
      const next = jest.fn();
      serviceMocks.verifyTwoFactorToken.mockResolvedValue(false);

      await verify(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    });

    it("accepts valid tokens", async () => {
      const req = createRequest({ body: { token: "654321" } });
      const res = createResponse();
      const next = jest.fn();
      serviceMocks.verifyTwoFactorToken.mockResolvedValue(true);

      await verify(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("successful") }),
      );
    });
  });

  describe("regenerateBackups", () => {
    it("requires authentication", async () => {
      const req = createRequest({ user: undefined });
      const res = createResponse();
      const next = jest.fn();

      await regenerateBackups(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    });

    it("requires 2FA to be enabled", async () => {
      tableMocks.users = createQueryBuilder({ two_factor_enabled: false });
      const req = createRequest();
      const res = createResponse();
      const next = jest.fn();

      await regenerateBackups(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    });

    it("returns new backup codes", async () => {
      tableMocks.users = createQueryBuilder({ two_factor_enabled: true });
      serviceMocks.regenerateBackupCodes.mockResolvedValue(["a", "b"]);
      const req = createRequest();
      const res = createResponse();
      const next = jest.fn();

      await regenerateBackups(req, res, next);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ backupCodes: ["a", "b"] }));
    });
  });

  describe("status", () => {
    it("requires authentication", async () => {
      const req = createRequest({ user: undefined });
      const res = createResponse();
      const next = jest.fn();

      await status(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    });

    it("handles missing user records", async () => {
      tableMocks.users = createQueryBuilder(null);
      const req = createRequest();
      const res = createResponse();
      const next = jest.fn();

      await status(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    });

    it("returns status and backup code stats when enabled", async () => {
      tableMocks.users = createQueryBuilder({
        two_factor_enabled: true,
        two_factor_enabled_at: new Date("2024-01-01T00:00:00Z"),
      });
      serviceMocks.getBackupCodeStats.mockResolvedValue({ remaining: 5 });
      const req = createRequest();
      const res = createResponse();
      const next = jest.fn();

      await status(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          backupCodes: { remaining: 5 },
        }),
      );
    });

    it("omits backup stats when 2FA disabled", async () => {
      tableMocks.users = createQueryBuilder({
        two_factor_enabled: false,
        two_factor_enabled_at: null,
      });
      const req = createRequest();
      const res = createResponse();
      const next = jest.fn();

      await status(req, res, next);
      expect(serviceMocks.getBackupCodeStats).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false, backupCodes: null }),
      );
    });
  });
});
