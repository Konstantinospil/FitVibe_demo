import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import * as twoFactorService from "../../../../apps/backend/src/modules/auth/two-factor.service.js";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "../../../../apps/backend/src/db/connection.js";
import type { Knex } from "knex";

jest.mock("otplib", () => ({
  authenticator: {
    generateSecret: jest.fn(),
    keyuri: jest.fn(),
    verify: jest.fn(),
    options: {},
  },
}));

jest.mock("qrcode", () => ({
  toDataURL: jest.fn(),
}));

jest.mock("crypto", () => ({
  randomBytes: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("../../../../apps/backend/src/db/connection.js", () => {
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    first: jest.fn(),
    raw: jest.fn(),
  };
  const mockDb = jest.fn(() => mockQueryBuilder);
  (mockDb as { raw: jest.Mock }).raw = jest.fn((sql: string) => sql);
  return { db: mockDb };
});

jest.mock("../../../../apps/backend/src/config/index.js", () => ({
  env: {
    appName: "FitVibe",
  },
}));

jest.mock("../../../../apps/backend/src/config/logger.js", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockedAuthenticator = authenticator as jest.Mocked<typeof authenticator>;
const mockedQRCode = QRCode as jest.Mocked<typeof QRCode>;
const mockedRandomBytes = randomBytes as jest.MockedFunction<typeof randomBytes>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedDb = db as jest.MockedFunction<typeof db>;

describe("two-factor.service", () => {
  let mockQueryBuilder: {
    where: jest.Mock;
    select: jest.Mock;
    update: jest.Mock;
    insert: jest.Mock;
    delete: jest.Mock;
    first: jest.Mock;
    raw: jest.Mock;
  };
  const mockedDbWithRaw = mockedDb as jest.MockedFunction<typeof db> & { raw: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockImplementation((columns: unknown) => {
        // If select is called with "*", it returns a promise (for backup codes)
        // Otherwise, it returns the query builder for chaining (for user query with .first())
        if (columns === "*") {
          return Promise.resolve([]);
        }
        return mockQueryBuilder;
      }),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      first: jest.fn(),
      raw: jest.fn().mockReturnThis(),
    };

    mockedDb.mockReturnValue(mockQueryBuilder as never);
    mockedDbWithRaw.raw.mockImplementation((sql: string) => sql);
  });

  describe("generateTotpSecret", () => {
    it("should generate a TOTP secret", () => {
      const mockSecret = "JBSWY3DPEHPK3PXP";
      mockedAuthenticator.generateSecret.mockReturnValue(mockSecret);

      const result = twoFactorService.generateTotpSecret();

      expect(result).toBe(mockSecret);
      expect(mockedAuthenticator.generateSecret).toHaveBeenCalled();
    });
  });

  describe("generateQRCodeUrl", () => {
    it("should generate QR code URL", async () => {
      const userEmail = "test@example.com";
      const secret = "JBSWY3DPEHPK3PXP";
      const otpauthUrl = "otpauth://totp/FitVibe:test@example.com?secret=JBSWY3DPEHPK3PXP";
      const qrCodeDataUrl =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      mockedAuthenticator.keyuri.mockReturnValue(otpauthUrl);
      mockedQRCode.toDataURL.mockResolvedValue(qrCodeDataUrl);

      const result = await twoFactorService.generateQRCodeUrl(userEmail, secret);

      expect(result).toBe(qrCodeDataUrl);
      expect(mockedAuthenticator.keyuri).toHaveBeenCalledWith(userEmail, "FitVibe", secret);
      expect(mockedQRCode.toDataURL).toHaveBeenCalledWith(otpauthUrl);
    });

    it("should handle QR code generation errors", async () => {
      const userEmail = "test@example.com";
      const secret = "JBSWY3DPEHPK3PXP";
      const error = new Error("QR code generation failed");

      mockedAuthenticator.keyuri.mockReturnValue("otpauth://totp/...");
      mockedQRCode.toDataURL.mockRejectedValue(error);

      await expect(twoFactorService.generateQRCodeUrl(userEmail, secret)).rejects.toThrow(
        "Failed to generate QR code",
      );
    });
  });

  describe("generateBackupCodes", () => {
    it("should generate 10 backup codes", () => {
      // Mock randomBytes to return base64-encodable values
      mockedRandomBytes.mockReturnValue(Buffer.from("ABCD1234"));

      const result = twoFactorService.generateBackupCodes();

      expect(result).toHaveLength(10);
      expect(mockedRandomBytes).toHaveBeenCalledTimes(10);
      result.forEach((code) => {
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
      });
    });

    it("should generate codes with correct format", () => {
      // The function converts to base64, filters non-alphanumeric, takes first 8, uppercases
      // So "ABCD1234" becomes base64 "QUJDRDEyMzQ=" -> "QUJDRDEy" (first 8 alphanumeric, uppercased)
      mockedRandomBytes.mockReturnValue(Buffer.from("ABCD1234"));

      const result = twoFactorService.generateBackupCodes();

      // The actual result will be the processed base64 string
      expect(result[0]).toMatch(/^[A-Z0-9]{8}$/);
      expect(result).toHaveLength(10);
    });
  });

  describe("hashBackupCodes", () => {
    it("should hash backup codes", async () => {
      const codes = ["CODE1", "CODE2", "CODE3"];
      const hashedCodes = ["$2a$10$hash1", "$2a$10$hash2", "$2a$10$hash3"];

      mockedBcrypt.hash
        .mockResolvedValueOnce(hashedCodes[0] as never)
        .mockResolvedValueOnce(hashedCodes[1] as never)
        .mockResolvedValueOnce(hashedCodes[2] as never);

      const result = await twoFactorService.hashBackupCodes(codes);

      expect(result).toEqual(hashedCodes);
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(3);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(codes[0], 10);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(codes[1], 10);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(codes[2], 10);
    });
  });

  describe("verifyTotpToken", () => {
    it("should verify valid TOTP token", () => {
      const token = "123456";
      const secret = "JBSWY3DPEHPK3PXP";

      mockedAuthenticator.verify.mockReturnValue(true);

      const result = twoFactorService.verifyTotpToken(token, secret);

      expect(result).toBe(true);
      expect(mockedAuthenticator.verify).toHaveBeenCalledWith({ token, secret });
      expect(mockedAuthenticator.options).toEqual({ window: 1 });
    });

    it("should reject invalid TOTP token", () => {
      const token = "123456";
      const secret = "JBSWY3DPEHPK3PXP";

      mockedAuthenticator.verify.mockReturnValue(false);

      const result = twoFactorService.verifyTotpToken(token, secret);

      expect(result).toBe(false);
    });

    it("should handle verification errors", () => {
      const token = "123456";
      const secret = "JBSWY3DPEHPK3PXP";

      mockedAuthenticator.verify.mockImplementation(() => {
        throw new Error("Verification error");
      });

      const result = twoFactorService.verifyTotpToken(token, secret);

      expect(result).toBe(false);
    });
  });

  describe("verifyBackupCode", () => {
    it("should verify valid backup code", async () => {
      const code = "CODE1234";
      const codeHash = "$2a$10$hash";

      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await twoFactorService.verifyBackupCode(code, codeHash);

      expect(result).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(code, codeHash);
    });

    it("should reject invalid backup code", async () => {
      const code = "CODE1234";
      const codeHash = "$2a$10$hash";

      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await twoFactorService.verifyBackupCode(code, codeHash);

      expect(result).toBe(false);
    });

    it("should handle verification errors", async () => {
      const code = "CODE1234";
      const codeHash = "$2a$10$hash";

      mockedBcrypt.compare.mockRejectedValue(new Error("Comparison error"));

      const result = await twoFactorService.verifyBackupCode(code, codeHash);

      expect(result).toBe(false);
    });
  });

  describe("initializeTwoFactorSetup", () => {
    it("should initialize 2FA setup", async () => {
      const userEmail = "test@example.com";
      const secret = "JBSWY3DPEHPK3PXP";
      const qrCodeUrl = "data:image/png;base64,...";
      const backupCodes = ["CODE1", "CODE2", "CODE3"];

      mockedAuthenticator.generateSecret.mockReturnValue(secret);
      mockedAuthenticator.keyuri.mockReturnValue("otpauth://totp/...");
      mockedQRCode.toDataURL.mockResolvedValue(qrCodeUrl);
      mockedRandomBytes.mockReturnValue(Buffer.from("CODE"));

      const result = await twoFactorService.initializeTwoFactorSetup(userEmail);

      expect(result.secret).toBe(secret);
      expect(result.qrCodeUrl).toBe(qrCodeUrl);
      expect(result.backupCodes).toHaveLength(10);
    });
  });

  describe("enableTwoFactor", () => {
    it("should enable 2FA for a user", async () => {
      const userId = "user-123";
      const secret = "JBSWY3DPEHPK3PXP";
      const backupCodes = ["CODE1", "CODE2"];
      const ipAddress = "192.168.1.1";
      const userAgent = "Mozilla/5.0";

      const hashedCodes = ["$2a$10$hash1", "$2a$10$hash2"];
      mockedBcrypt.hash
        .mockResolvedValueOnce(hashedCodes[0] as never)
        .mockResolvedValueOnce(hashedCodes[1] as never);

      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.insert.mockResolvedValue([{ id: "code-1" }, { id: "code-2" }]);

      await twoFactorService.enableTwoFactor(userId, secret, backupCodes, ipAddress, userAgent);

      expect(mockedDb).toHaveBeenCalledWith("users");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: userId });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          two_factor_enabled: true,
          two_factor_secret: secret,
        }),
      );
      expect(mockedDb).toHaveBeenCalledWith("two_factor_backup_codes");
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            user_id: userId,
            code_hash: hashedCodes[0],
            used: false,
          }),
        ]),
      );
      expect(mockedDb).toHaveBeenCalledWith("two_factor_audit_log");
    });

    it("should work with transaction", async () => {
      const userId = "user-123";
      const secret = "JBSWY3DPEHPK3PXP";
      const backupCodes = ["CODE1"];
      const mockTrxQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        first: jest.fn(),
      };
      const mockTrx = ((_table: string) => mockTrxQueryBuilder) as unknown as Knex.Transaction;

      const hashedCodes = ["$2a$10$hash1"];
      mockedBcrypt.hash.mockResolvedValueOnce(hashedCodes[0] as never);

      mockTrxQueryBuilder.update.mockResolvedValue(1);
      mockTrxQueryBuilder.insert.mockResolvedValue([{ id: "code-1" }]);

      await twoFactorService.enableTwoFactor(userId, secret, backupCodes, null, null, mockTrx);

      expect(mockTrxQueryBuilder.update).toHaveBeenCalled();
    });
  });

  describe("disableTwoFactor", () => {
    it("should disable 2FA for a user", async () => {
      const userId = "user-123";
      const ipAddress = "192.168.1.1";
      const userAgent = "Mozilla/5.0";

      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.delete.mockResolvedValue(5);
      mockQueryBuilder.insert.mockResolvedValue([{ id: "log-1" }]);

      await twoFactorService.disableTwoFactor(userId, ipAddress, userAgent);

      expect(mockedDb).toHaveBeenCalledWith("users");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: userId });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          two_factor_enabled: false,
          two_factor_secret: null,
        }),
      );
      expect(mockedDb).toHaveBeenCalledWith("two_factor_backup_codes");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: userId });
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockedDb).toHaveBeenCalledWith("two_factor_audit_log");
    });

    it("should work with transaction", async () => {
      const userId = "user-123";
      const mockTrxQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        first: jest.fn(),
      };
      const mockTrx = ((_table: string) => mockTrxQueryBuilder) as unknown as Knex.Transaction;

      mockTrxQueryBuilder.update.mockResolvedValue(1);
      mockTrxQueryBuilder.delete.mockResolvedValue(5);
      mockTrxQueryBuilder.insert.mockResolvedValue([{ id: "log-1" }]);

      await twoFactorService.disableTwoFactor(userId, null, null, mockTrx);

      expect(mockTrxQueryBuilder.update).toHaveBeenCalled();
    });
  });

  describe("verifyTwoFactorToken", () => {
    it("should verify TOTP token successfully", async () => {
      const userId = "user-123";
      const token = "123456";
      const secret = "JBSWY3DPEHPK3PXP";
      const ipAddress = "192.168.1.1";
      const userAgent = "Mozilla/5.0";

      mockQueryBuilder.first.mockResolvedValue({
        two_factor_secret: secret,
        two_factor_enabled: true,
      });

      mockedAuthenticator.verify.mockReturnValue(true);
      mockQueryBuilder.insert.mockResolvedValue([{ id: "log-1" }]);

      const result = await twoFactorService.verifyTwoFactorToken(
        userId,
        token,
        ipAddress,
        userAgent,
      );

      expect(result).toBe(true);
      expect(mockedAuthenticator.verify).toHaveBeenCalledWith({ token, secret });
      expect(mockedDb).toHaveBeenCalledWith("two_factor_audit_log");
    });

    it("should verify backup code successfully", async () => {
      const userId = "user-123";
      const token = "BACKUP1";
      const secret = "JBSWY3DPEHPK3PXP";
      const ipAddress = "192.168.1.1";
      const userAgent = "Mozilla/5.0";

      // First call: get user 2FA info (uses .first())
      mockQueryBuilder.first.mockResolvedValueOnce({
        two_factor_secret: secret,
        two_factor_enabled: true,
      });

      // Override select to handle backup codes query
      // First call: select with columns (for user query) - returns query builder
      // Second call: select with "*" (for backup codes) - returns promise with array
      let selectCallCount = 0;
      mockQueryBuilder.select.mockImplementation((columns: unknown) => {
        selectCallCount++;
        if (columns === "*") {
          // This is the backup codes query
          return Promise.resolve([
            {
              id: "code-1",
              code_hash: "$2a$10$hash1",
              used: false,
              used_at: null,
              created_at: new Date().toISOString(),
            },
          ]);
        }
        // This is the user query - return query builder for chaining
        return mockQueryBuilder;
      });

      mockedAuthenticator.verify.mockReturnValue(false);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.insert.mockResolvedValue([{ id: "log-1" }]);

      const result = await twoFactorService.verifyTwoFactorToken(
        userId,
        token,
        ipAddress,
        userAgent,
      );

      expect(result).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(token, "$2a$10$hash1");
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          used: true,
        }),
      );
    });

    it("should return false if user does not have 2FA enabled", async () => {
      const userId = "user-123";
      const token = "123456";

      mockQueryBuilder.first.mockResolvedValue({
        two_factor_secret: null,
        two_factor_enabled: false,
      });

      const result = await twoFactorService.verifyTwoFactorToken(userId, token, null, null);

      expect(result).toBe(false);
    });

    it("should return false if user not found", async () => {
      const userId = "user-123";
      const token = "123456";

      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await twoFactorService.verifyTwoFactorToken(userId, token, null, null);

      expect(result).toBe(false);
    });

    it("should return false if verification fails", async () => {
      const userId = "user-123";
      const token = "123456";
      const secret = "JBSWY3DPEHPK3PXP";

      mockQueryBuilder.first.mockResolvedValueOnce({
        two_factor_secret: secret,
        two_factor_enabled: true,
      });

      // Backup codes query returns empty array (select with "*" returns promise)
      // The default implementation already handles this, but we can override if needed
      mockQueryBuilder.select.mockImplementationOnce((columns: unknown) => {
        if (columns === "*") {
          return Promise.resolve([]);
        }
        return mockQueryBuilder;
      });

      mockedAuthenticator.verify.mockReturnValue(false);
      mockQueryBuilder.insert.mockResolvedValue([{ id: "log-1" }]);

      const result = await twoFactorService.verifyTwoFactorToken(userId, token, null, null);

      expect(result).toBe(false);
      expect(mockedDb).toHaveBeenCalledWith("two_factor_audit_log");
    });

    it("should work with transaction", async () => {
      const userId = "user-123";
      const token = "123456";
      const secret = "JBSWY3DPEHPK3PXP";
      const mockTrxQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        first: jest.fn(),
      };
      const mockTrx = ((_table: string) => mockTrxQueryBuilder) as unknown as Knex.Transaction;

      mockTrxQueryBuilder.first.mockResolvedValue({
        two_factor_secret: secret,
        two_factor_enabled: true,
      });

      mockedAuthenticator.verify.mockReturnValue(true);
      mockTrxQueryBuilder.insert.mockResolvedValue([{ id: "log-1" }]);

      const result = await twoFactorService.verifyTwoFactorToken(
        userId,
        token,
        null,
        null,
        mockTrx,
      );

      expect(result).toBe(true);
    });
  });

  describe("regenerateBackupCodes", () => {
    it("should regenerate backup codes", async () => {
      const userId = "user-123";
      const ipAddress = "192.168.1.1";
      const userAgent = "Mozilla/5.0";

      mockedRandomBytes.mockReturnValue(Buffer.from("CODE"));
      const hashedCodes = ["$2a$10$hash1"];
      mockedBcrypt.hash.mockResolvedValue(hashedCodes[0] as never);

      mockQueryBuilder.delete.mockResolvedValue(5);
      mockQueryBuilder.insert.mockResolvedValue([{ id: "code-1" }]);

      const result = await twoFactorService.regenerateBackupCodes(userId, ipAddress, userAgent);

      expect(result).toHaveLength(10);
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      expect(mockedDb).toHaveBeenCalledWith("two_factor_audit_log");
    });

    it("should work with transaction", async () => {
      const userId = "user-123";
      const mockTrxQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        first: jest.fn(),
      };
      const mockTrx = ((_table: string) => mockTrxQueryBuilder) as unknown as Knex.Transaction;

      mockedRandomBytes.mockReturnValue(Buffer.from("CODE"));
      const hashedCodes = ["$2a$10$hash1"];
      mockedBcrypt.hash.mockResolvedValue(hashedCodes[0] as never);

      mockTrxQueryBuilder.delete.mockResolvedValue(5);
      mockTrxQueryBuilder.insert.mockResolvedValue([{ id: "code-1" }]);

      const result = await twoFactorService.regenerateBackupCodes(userId, null, null, mockTrx);

      expect(result).toHaveLength(10);
    });
  });

  describe("getBackupCodeStats", () => {
    it("should get backup code statistics", async () => {
      const userId = "user-123";

      // The service calls exec.raw() which returns SQL, then passes it to select()
      // We need to mock select to accept the raw SQL and return the query builder
      mockQueryBuilder.select.mockImplementation((rawSql: unknown) => {
        // rawSql will be the result of exec.raw()
        return mockQueryBuilder;
      });
      mockQueryBuilder.first.mockResolvedValue({
        total: "10",
        used: "3",
      });

      const result = await twoFactorService.getBackupCodeStats(userId);

      expect(result).toEqual({
        total: 10,
        used: 3,
        remaining: 7,
      });
      expect(mockedDb).toHaveBeenCalledWith("two_factor_backup_codes");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: userId });
    });

    it("should handle null results", async () => {
      const userId = "user-123";

      mockQueryBuilder.select.mockImplementation(() => mockQueryBuilder);
      mockQueryBuilder.first.mockResolvedValue(null);

      const result = await twoFactorService.getBackupCodeStats(userId);

      expect(result).toEqual({
        total: 0,
        used: 0,
        remaining: 0,
      });
    });

    it("should work with transaction", async () => {
      const userId = "user-123";
      const mockTrxQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        first: jest.fn(),
      };
      const mockTrx = ((_table: string) => mockTrxQueryBuilder) as unknown as Knex.Transaction;
      (mockTrx as { raw: jest.Mock }).raw = jest.fn((sql: string) => sql);

      mockTrxQueryBuilder.select.mockImplementation(() => mockTrxQueryBuilder);
      mockTrxQueryBuilder.first.mockResolvedValue({
        total: "5",
        used: "2",
      });

      const result = await twoFactorService.getBackupCodeStats(userId, mockTrx);

      expect(result).toEqual({
        total: 5,
        used: 2,
        remaining: 3,
      });
    });
  });
});
