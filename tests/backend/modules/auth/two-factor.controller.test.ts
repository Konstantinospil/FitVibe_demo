import type { Request, Response } from "express";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";
import {
  disable,
  enable,
  regenerateBackups,
  setup,
  status,
  verify,
} from "../../../../apps/backend/src/modules/auth/two-factor.controller.js";

const createQueryBuilder = <T>(result: T | null) => ({
  where: jest.fn().mockReturnThis(),
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
  setupTwoFactor: jest.fn(),
  verifyAndEnable2FA: jest.fn(),
  disable2FA: jest.fn(),
  regenerateBackupCodes: jest.fn(),
  getTwoFactorStatus: jest.fn(),
}));

const serviceMocks = jest.requireMock(
  "../../../../apps/backend/src/modules/auth/two-factor.service.js",
);

const createResponse = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response & { status: jest.Mock; json: jest.Mock };
};

const createRequest = (overrides: Partial<Request> = {}): Request => {
  const req: Partial<Request> = {
    user: { sub: "user-123", role: "athlete" } as never,
    body: {},
    params: {},
    query: {},
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
      expect(serviceMocks.setupTwoFactor).not.toHaveBeenCalled();
    });

    it("requires a primary email", async () => {
      tableMocks.user_contacts = createQueryBuilder(null);
      const req = createRequest();
      const res = createResponse();
      const next = jest.fn();

      await setup(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
      expect(serviceMocks.setupTwoFactor).not.toHaveBeenCalled();
    });

    it("starts setup using the primary email and transaction", async () => {
      tableMocks.user_contacts = createQueryBuilder({ value: "test@example.com" });
      serviceMocks.setupTwoFactor.mockResolvedValue({
        secret: "secret",
        qrCode: "qr",
        backupCodes: ["backup-1", "backup-2"],
      });
      const req = createRequest();
      const res = createResponse();
      const next = jest.fn();

      await setup(req, res, next);

      expect(serviceMocks.setupTwoFactor).toHaveBeenCalledWith(
        "user-123",
        "test@example.com",
        expect.anything(),
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          secret: "secret",
          qrCode: "qr",
          backupCodes: ["backup-1", "backup-2"],
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("verify", () => {
    it("validates the six-digit setup code", async () => {
      const req = createRequest({ body: { code: "123" } });
      const res = createResponse();
      const next = jest.fn();

      await verify(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
      expect(serviceMocks.verifyAndEnable2FA).not.toHaveBeenCalled();
    });

    it("verifies the stored secret and enables 2FA", async () => {
      serviceMocks.verifyAndEnable2FA.mockResolvedValue(true);
      const req = createRequest({ body: { code: "123456" } });
      const res = createResponse();
      const next = jest.fn();

      await verify(req, res, next);

      expect(serviceMocks.verifyAndEnable2FA).toHaveBeenCalledWith(
        "user-123",
        "123456",
        expect.anything(),
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Two-factor authentication enabled successfully",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("enable compatibility route", () => {
    it("accepts the legacy token field but uses the canonical enable flow", async () => {
      serviceMocks.verifyAndEnable2FA.mockResolvedValue(true);
      const req = createRequest({ body: { token: "654321" } });
      const res = createResponse();
      const next = jest.fn();

      await enable(req, res, next);

      expect(serviceMocks.verifyAndEnable2FA).toHaveBeenCalledWith(
        "user-123",
        "654321",
        expect.anything(),
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  describe("disable", () => {
    it("requires the current password and delegates verification to the service", async () => {
      tableMocks.users = createQueryBuilder({ password_hash: "hash" });
      serviceMocks.disable2FA.mockResolvedValue(true);
      const req = createRequest({ body: { password: "StrongPassword123!" } });
      const res = createResponse();
      const next = jest.fn();

      await disable(req, res, next);

      expect(serviceMocks.disable2FA).toHaveBeenCalledWith(
        "user-123",
        "StrongPassword123!",
        "hash",
        expect.anything(),
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Two-factor authentication disabled successfully",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("fails when the user no longer exists", async () => {
      tableMocks.users = createQueryBuilder(null);
      const req = createRequest({ body: { password: "StrongPassword123!" } });
      const res = createResponse();
      const next = jest.fn();

      await disable(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(HttpError));
      expect(serviceMocks.disable2FA).not.toHaveBeenCalled();
    });
  });

  describe("backup codes", () => {
    it("regenerates backup codes through the canonical service", async () => {
      serviceMocks.regenerateBackupCodes.mockResolvedValue(["code-1", "code-2"]);
      const req = createRequest();
      const res = createResponse();
      const next = jest.fn();

      await regenerateBackups(req, res, next);

      expect(serviceMocks.regenerateBackupCodes).toHaveBeenCalledWith(
        "user-123",
        expect.anything(),
      );
      expect(res.json).toHaveBeenCalledWith({
        message: "Backup codes regenerated successfully",
        backupCodes: ["code-1", "code-2"],
      });
    });
  });

  describe("status", () => {
    it("returns the persisted 2FA status contract", async () => {
      serviceMocks.getTwoFactorStatus.mockResolvedValue({
        enabled: true,
        enabledAt: "2026-09-20T10:00:00.000Z",
        backupCodesRemaining: 5,
      });
      const req = createRequest();
      const res = createResponse();
      const next = jest.fn();

      await status(req, res, next);

      expect(serviceMocks.getTwoFactorStatus).toHaveBeenCalledWith("user-123");
      expect(res.json).toHaveBeenCalledWith({
        enabled: true,
        enabledAt: "2026-09-20T10:00:00.000Z",
        backupCodesRemaining: 5,
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
