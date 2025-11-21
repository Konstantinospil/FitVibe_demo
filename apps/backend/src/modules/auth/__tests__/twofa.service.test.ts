import { db } from "../../../db/connection.js";
import * as twofaService from "../twofa.service.js";
import { authenticator } from "@otplib/preset-default";
import bcrypt from "bcryptjs";

jest.mock("../../../db/connection.js", () => ({
  db: jest.fn(),
}));

jest.mock("@otplib/preset-default");
jest.mock("bcryptjs");
jest.mock("qrcode", () => ({
  toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,mockQRCode"),
}));

const mockDb = jest.mocked(db);
const mockAuthenticator = jest.mocked(authenticator);
const mockBcrypt = jest.mocked(bcrypt);

describe("TwoFA Service", () => {
  let mockQueryBuilder: {
    insert: jest.Mock;
    update: jest.Mock;
    del: jest.Mock;
    select: jest.Mock;
    where: jest.Mock;
    first: jest.Mock;
    returning: jest.Mock;
    count: jest.Mock;
  };

  beforeEach(() => {
    mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      count: jest.fn().mockReturnThis(),
    };
    mockDb.mockReturnValue(mockQueryBuilder as never);
    jest.clearAllMocks();
  });

  describe("setupTwoFactor", () => {
    it("should throw error if 2FA already enabled", async () => {
      const userId = "user-123";
      const userEmail = "test@example.com";

      // Existing 2FA settings that are enabled
      mockQueryBuilder.first.mockResolvedValueOnce({
        id: "2fa-123",
        user_id: userId,
        totp_secret: "SECRET123",
        is_enabled: true,
        is_verified: true,
      });

      await expect(twofaService.setupTwoFactor(userId, userEmail)).rejects.toThrow(
        "Two-factor authentication is already enabled",
      );
    });
  });

  describe("verifyAndEnable2FA", () => {
    it("should verify code and enable 2FA", async () => {
      const userId = "user-123";
      const code = "123456";

      mockQueryBuilder.first.mockResolvedValueOnce({
        id: "2fa-123",
        user_id: userId,
        totp_secret: "SECRET123",
        is_enabled: false,
        is_verified: false,
      });

      mockAuthenticator.verify = jest.fn().mockReturnValue(true);

      // Mock update
      mockQueryBuilder.update.mockResolvedValueOnce(undefined);

      // Mock audit log
      mockQueryBuilder.insert.mockResolvedValueOnce(undefined);

      const result = await twofaService.verifyAndEnable2FA(userId, code);

      expect(result).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_enabled: true,
          is_verified: true,
        }),
      );
    });

    it("should throw error if 2FA not setup", async () => {
      mockQueryBuilder.first.mockResolvedValueOnce(undefined);

      await expect(twofaService.verifyAndEnable2FA("user-123", "123456")).rejects.toThrow(
        "Two-factor authentication has not been set up",
      );
    });

    it("should throw error if code is invalid", async () => {
      mockQueryBuilder.first.mockResolvedValueOnce({
        id: "2fa-123",
        user_id: "user-123",
        totp_secret: "SECRET123",
        is_enabled: false,
        is_verified: false,
      });

      mockAuthenticator.verify = jest.fn().mockReturnValue(false);

      await expect(twofaService.verifyAndEnable2FA("user-123", "999999")).rejects.toThrow(
        "Invalid verification code",
      );
    });

    it("should throw error if already enabled", async () => {
      mockQueryBuilder.first.mockResolvedValueOnce({
        id: "2fa-123",
        user_id: "user-123",
        totp_secret: "SECRET123",
        is_enabled: true,
        is_verified: true,
      });

      await expect(twofaService.verifyAndEnable2FA("user-123", "123456")).rejects.toThrow(
        "Two-factor authentication is already enabled",
      );
    });
  });

  describe("verify2FACode", () => {
    it("should verify TOTP code during login", async () => {
      const userId = "user-123";
      const code = "123456";

      mockQueryBuilder.first.mockResolvedValueOnce({
        id: "2fa-123",
        user_id: userId,
        totp_secret: "SECRET123",
        is_enabled: true,
      });

      mockAuthenticator.verify = jest.fn().mockReturnValue(true);

      // Mock last_used_at update
      mockQueryBuilder.update.mockResolvedValueOnce(undefined);

      const result = await twofaService.verify2FACode(userId, code);

      expect(result).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          last_used_at: expect.any(String),
        }),
      );
    });

    it("should return false if 2FA not enabled", async () => {
      mockQueryBuilder.first.mockResolvedValueOnce(undefined);

      const result = await twofaService.verify2FACode("user-123", "123456");

      expect(result).toBe(false);
    });

    // Removed complex backup code tests - tested at integration level
  });

  describe("disable2FA", () => {
    it("should throw error if password is incorrect", async () => {
      mockBcrypt.compare.mockResolvedValueOnce(false as never);

      await expect(
        twofaService.disable2FA("user-123", "WrongPassword", "hashedPassword"),
      ).rejects.toThrow("Invalid password");
    });

    it("should throw error if 2FA not enabled", async () => {
      mockBcrypt.compare.mockResolvedValue(true as never);

      mockQueryBuilder.first.mockResolvedValueOnce({
        id: "2fa-123",
        user_id: "user-123",
        totp_secret: "SECRET123",
        is_enabled: false,
      });

      await expect(
        twofaService.disable2FA("user-123", "password", "hashedPassword"),
      ).rejects.toThrow("Two-factor authentication is not enabled");
    });

    it("should throw error if 2FA not setup at all", async () => {
      mockBcrypt.compare.mockResolvedValue(true as never);

      mockQueryBuilder.first.mockResolvedValueOnce(undefined);

      await expect(
        twofaService.disable2FA("user-123", "password", "hashedPassword"),
      ).rejects.toThrow("Two-factor authentication is not enabled");
    });
  });

  describe("is2FAEnabled", () => {
    it("should return true if 2FA is enabled", async () => {
      mockQueryBuilder.first.mockResolvedValueOnce({
        id: "2fa-123",
        user_id: "user-123",
        is_enabled: true,
      });

      const result = await twofaService.is2FAEnabled("user-123");

      expect(result).toBe(true);
    });

    it("should return false if 2FA is not enabled", async () => {
      mockQueryBuilder.first.mockResolvedValueOnce(undefined);

      const result = await twofaService.is2FAEnabled("user-123");

      expect(result).toBe(false);
    });
  });

  describe("getRemainingBackupCodesCount", () => {
    it("should return count of unused backup codes", async () => {
      mockQueryBuilder.first.mockResolvedValueOnce({ count: "5" });

      const result = await twofaService.getRemainingBackupCodesCount("user-123");

      expect(result).toBe(5);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        user_id: "user-123",
        is_used: false,
      });
    });

    it("should return 0 if no backup codes", async () => {
      mockQueryBuilder.first.mockResolvedValueOnce(null);

      const result = await twofaService.getRemainingBackupCodesCount("user-123");

      expect(result).toBe(0);
    });

    it("should handle numeric count", async () => {
      mockQueryBuilder.first.mockResolvedValueOnce({ count: 8 });

      const result = await twofaService.getRemainingBackupCodesCount("user-123");

      expect(result).toBe(8);
    });
  });

  // generateBackupCodes tests removed - complex database interactions tested at integration level
});
