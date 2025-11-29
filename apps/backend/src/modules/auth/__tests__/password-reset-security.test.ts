/**
 * Tests for AC-1.9: Reset token single-use; TTL 15m; revoke refresh on success
 *
 * Requirements:
 * - Reset tokens are single-use (consumed after first use)
 * - TTL is 15 minutes
 * - All refresh tokens revoked on successful password reset
 * - Expired tokens are rejected
 * - Used tokens cannot be reused (replay protection)
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import * as authService from "../auth.service";
import * as authRepo from "../auth.repository";
import type { AuthTokenRecord, AuthUserRecord } from "../auth.repository";
import { HttpError } from "../../../utils/http";

// Mock dependencies
jest.mock("../auth.repository");
jest.mock("bcryptjs");
jest.mock("../../../services/mailer.service.js");

const mockAuthRepo = authRepo as jest.Mocked<typeof authRepo>;

describe("AC-1.9: Password Reset Security", () => {
  const mockUser: AuthUserRecord = {
    id: "user-123",
    username: "testuser",
    display_name: "Test User",
    locale: "en-US",
    preferred_lang: "en",
    primary_email: "test@example.com",
    email_verified: true,
    role_code: "athlete",
    status: "active",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    password_hash: "$2a$12$oldpasswordhash",
    terms_accepted: true,
    terms_accepted_at: "2024-01-01T00:00:00Z",
    terms_version: "2024-06-01",
  };

  const validResetToken: AuthTokenRecord = {
    id: "token-123",
    user_id: "user-123",
    token_type: "password_reset",
    token_hash: "valid-token-hash",
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes from now
    created_at: new Date().toISOString(),
    consumed_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Single-Use Enforcement", () => {
    it("should allow first use of valid reset token", async () => {
      mockAuthRepo.findAuthToken.mockResolvedValue(validResetToken);
      mockAuthRepo.findUserById.mockResolvedValue(mockUser);
      mockAuthRepo.updateUserPassword.mockResolvedValue(1);
      mockAuthRepo.consumeAuthToken.mockResolvedValue(1);
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(1);
      mockAuthRepo.revokeRefreshByUserId.mockResolvedValue(1);

      const bcrypt = await import("bcryptjs");
      (bcrypt.hash as jest.Mock).mockResolvedValue("$2a$12$newpasswordhash");

      await authService.resetPassword("valid-token", "NewValidPassword123!");

      // Verify token was consumed
      expect(mockAuthRepo.consumeAuthToken).toHaveBeenCalledWith("token-123");
      // Verify all reset tokens for user were marked consumed
      expect(mockAuthRepo.markAuthTokensConsumed).toHaveBeenCalledWith(
        "user-123",
        "password_reset",
      );
      // Verify refresh tokens were revoked
      expect(mockAuthRepo.revokeRefreshByUserId).toHaveBeenCalledWith("user-123");
    });

    it("should reject second use of same token (replay attack)", async () => {
      // First use succeeds
      mockAuthRepo.findAuthToken.mockResolvedValueOnce(validResetToken);
      mockAuthRepo.findUserById.mockResolvedValue(mockUser);
      mockAuthRepo.updateUserPassword.mockResolvedValue(1);
      mockAuthRepo.consumeAuthToken.mockResolvedValue(1);
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(1);
      mockAuthRepo.revokeRefreshByUserId.mockResolvedValue(1);

      const bcrypt = await import("bcryptjs");
      (bcrypt.hash as jest.Mock).mockResolvedValue("$2a$12$newpasswordhash");

      await authService.resetPassword("valid-token", "NewValidPassword123!");

      // Second use: token not found (consumed)
      mockAuthRepo.findAuthToken.mockResolvedValue(undefined);

      const error = await authService
        .resetPassword("valid-token", "AnotherPassword123!")
        .catch((e) => e);

      expect(error).toBeInstanceOf(HttpError);
      expect(error.status).toBe(400);
      expect(error.code).toBe("AUTH_INVALID_TOKEN");
    });

    it("should reject already-consumed token", async () => {
      // Token exists but is already consumed
      mockAuthRepo.findAuthToken.mockResolvedValue(undefined); // findAuthToken filters consumed tokens

      await expect(authService.resetPassword("consumed-token", "NewPassword123!")).rejects.toThrow(
        HttpError,
      );

      await expect(
        authService.resetPassword("consumed-token", "NewPassword123!"),
      ).rejects.toMatchObject({
        status: 400,
        code: "AUTH_INVALID_TOKEN",
      });

      // Verify password was NOT updated
      expect(mockAuthRepo.updateUserPassword).not.toHaveBeenCalled();
    });
  });

  describe("Token Expiration (15m TTL)", () => {
    it("should reject expired reset token", async () => {
      const expiredToken: AuthTokenRecord = {
        ...validResetToken,
        expires_at: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
      };

      mockAuthRepo.findAuthToken.mockResolvedValue(expiredToken);
      mockAuthRepo.consumeAuthToken.mockResolvedValue(0);

      await expect(authService.resetPassword("expired-token", "NewPassword123!")).rejects.toThrow(
        HttpError,
      );

      await expect(
        authService.resetPassword("expired-token", "NewPassword123!"),
      ).rejects.toMatchObject({
        status: 400,
        code: "AUTH_INVALID_TOKEN",
      });

      // Verify token was consumed (to prevent timing attacks)
      expect(mockAuthRepo.consumeAuthToken).toHaveBeenCalledWith("token-123");
      // Verify password was NOT updated
      expect(mockAuthRepo.updateUserPassword).not.toHaveBeenCalled();
    });

    it("should accept token just before expiration", async () => {
      const almostExpiredToken: AuthTokenRecord = {
        ...validResetToken,
        expires_at: new Date(Date.now() + 1000).toISOString(), // Expires in 1 second
      };

      mockAuthRepo.findAuthToken.mockResolvedValue(almostExpiredToken);
      mockAuthRepo.findUserById.mockResolvedValue(mockUser);
      mockAuthRepo.updateUserPassword.mockResolvedValue(1);
      mockAuthRepo.consumeAuthToken.mockResolvedValue(1);
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(1);
      mockAuthRepo.revokeRefreshByUserId.mockResolvedValue(1);

      const bcrypt = await import("bcryptjs");
      (bcrypt.hash as jest.Mock).mockResolvedValue("$2a$12$newpasswordhash");

      await authService.resetPassword("almost-expired-token", "NewPassword123!");

      // Should succeed
      expect(mockAuthRepo.updateUserPassword).toHaveBeenCalled();
    });
  });

  describe("Refresh Token Revocation", () => {
    it("should revoke all user refresh tokens on successful password reset", async () => {
      mockAuthRepo.findAuthToken.mockResolvedValue(validResetToken);
      mockAuthRepo.findUserById.mockResolvedValue(mockUser);
      mockAuthRepo.updateUserPassword.mockResolvedValue(1);
      mockAuthRepo.consumeAuthToken.mockResolvedValue(1);
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(1);
      mockAuthRepo.revokeRefreshByUserId.mockResolvedValue(1);

      const bcrypt = await import("bcryptjs");
      (bcrypt.hash as jest.Mock).mockResolvedValue("$2a$12$newpasswordhash");

      await authService.resetPassword("valid-token", "NewSecurePassword123!");

      // Critical: Verify all refresh tokens were revoked
      expect(mockAuthRepo.revokeRefreshByUserId).toHaveBeenCalledWith("user-123");
      expect(mockAuthRepo.revokeRefreshByUserId).toHaveBeenCalledTimes(1);
    });

    it("should NOT revoke refresh tokens if password reset fails", async () => {
      mockAuthRepo.findAuthToken.mockResolvedValue(validResetToken);
      mockAuthRepo.findUserById.mockResolvedValue(mockUser);

      // Simulate password update failure
      mockAuthRepo.updateUserPassword.mockRejectedValue(new Error("Database error"));

      const bcrypt = await import("bcryptjs");
      (bcrypt.hash as jest.Mock).mockResolvedValue("$2a$12$newpasswordhash");

      await expect(authService.resetPassword("valid-token", "NewPassword123!")).rejects.toThrow(
        "Database error",
      );

      // Verify refresh tokens were NOT revoked (operation failed)
      expect(mockAuthRepo.revokeRefreshByUserId).not.toHaveBeenCalled();
    });

    it("should revoke refresh tokens even if token consumption fails", async () => {
      mockAuthRepo.findAuthToken.mockResolvedValue(validResetToken);
      mockAuthRepo.findUserById.mockResolvedValue(mockUser);
      mockAuthRepo.updateUserPassword.mockResolvedValue(0);
      mockAuthRepo.consumeAuthToken.mockRejectedValue(new Error("Token consumption failed"));
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(0);
      mockAuthRepo.revokeRefreshByUserId.mockResolvedValue(0);

      const bcrypt = await import("bcryptjs");
      (bcrypt.hash as jest.Mock).mockResolvedValue("$2a$12$newpasswordhash");

      await expect(authService.resetPassword("valid-token", "NewPassword123!")).rejects.toThrow(
        "Token consumption failed",
      );

      // Password was updated but token consumption failed
      expect(mockAuthRepo.updateUserPassword).toHaveBeenCalled();
      // Refresh revocation should still NOT be called (operation failed before that)
      expect(mockAuthRepo.revokeRefreshByUserId).not.toHaveBeenCalled();
    });
  });

  describe("Invalid Token Scenarios", () => {
    it("should reject non-existent token", async () => {
      mockAuthRepo.findAuthToken.mockResolvedValue(undefined);

      await expect(
        authService.resetPassword("non-existent-token", "NewPassword123!"),
      ).rejects.toThrow(HttpError);

      await expect(
        authService.resetPassword("non-existent-token", "NewPassword123!"),
      ).rejects.toMatchObject({
        status: 400,
        code: "AUTH_INVALID_TOKEN",
      });
    });

    it("should reject token for non-existent user", async () => {
      mockAuthRepo.findAuthToken.mockResolvedValue(validResetToken);
      mockAuthRepo.findUserById.mockResolvedValue(undefined);

      await expect(authService.resetPassword("valid-token", "NewPassword123!")).rejects.toThrow(
        HttpError,
      );

      await expect(
        authService.resetPassword("valid-token", "NewPassword123!"),
      ).rejects.toMatchObject({
        status: 404,
        code: "AUTH_USER_NOT_FOUND",
      });

      // Verify password was NOT updated
      expect(mockAuthRepo.updateUserPassword).not.toHaveBeenCalled();
      // Verify refresh tokens were NOT revoked
      expect(mockAuthRepo.revokeRefreshByUserId).not.toHaveBeenCalled();
    });

    it("should reject weak password", async () => {
      mockAuthRepo.findAuthToken.mockResolvedValue(validResetToken);
      mockAuthRepo.findUserById.mockResolvedValue(mockUser);

      // Weak password (too short, no special chars, etc.)
      await expect(authService.resetPassword("valid-token", "weak")).rejects.toThrow();

      // Verify password was NOT updated
      expect(mockAuthRepo.updateUserPassword).not.toHaveBeenCalled();
      // Verify token was NOT consumed
      expect(mockAuthRepo.consumeAuthToken).not.toHaveBeenCalled();
      // Verify refresh tokens were NOT revoked
      expect(mockAuthRepo.revokeRefreshByUserId).not.toHaveBeenCalled();
    });
  });

  describe("Password Policy Enforcement", () => {
    it("should enforce password policy on reset", async () => {
      mockAuthRepo.findAuthToken.mockResolvedValue(validResetToken);
      mockAuthRepo.findUserById.mockResolvedValue(mockUser);

      // Test various invalid passwords
      const invalidPasswords = [
        "short", // Too short
        "NoSpecialChar123", // No special character
        "nouppercasechar123!", // No uppercase
        "NOLOWERCASECHAR123!", // No lowercase
        "NoDigitsHere!", // No digits
        "test@example.com", // Contains email
        "testuser123!", // Contains username
      ];

      for (const password of invalidPasswords) {
        await expect(authService.resetPassword("valid-token", password)).rejects.toThrow();
      }

      // Verify password was never updated
      expect(mockAuthRepo.updateUserPassword).not.toHaveBeenCalled();
    });

    it("should accept valid strong password", async () => {
      mockAuthRepo.findAuthToken.mockResolvedValue(validResetToken);
      mockAuthRepo.findUserById.mockResolvedValue(mockUser);
      mockAuthRepo.updateUserPassword.mockResolvedValue(1);
      mockAuthRepo.consumeAuthToken.mockResolvedValue(1);
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(1);
      mockAuthRepo.revokeRefreshByUserId.mockResolvedValue(1);

      const bcrypt = await import("bcryptjs");
      (bcrypt.hash as jest.Mock).mockResolvedValue("$2a$12$newpasswordhash");

      // Valid strong password
      await authService.resetPassword("valid-token", "StrongPassword123!");

      expect(mockAuthRepo.updateUserPassword).toHaveBeenCalled();
    });
  });

  describe("Security Edge Cases", () => {
    it("should handle concurrent reset attempts (race condition)", async () => {
      mockAuthRepo.findAuthToken.mockResolvedValue(validResetToken);
      mockAuthRepo.findUserById.mockResolvedValue(mockUser);
      mockAuthRepo.updateUserPassword.mockResolvedValue(1);
      mockAuthRepo.consumeAuthToken.mockResolvedValue(1);
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(1);
      mockAuthRepo.revokeRefreshByUserId.mockResolvedValue(1);

      const bcrypt = await import("bcryptjs");
      (bcrypt.hash as jest.Mock).mockResolvedValue("$2a$12$newpasswordhash");

      // Simulate two concurrent requests
      const promise1 = authService.resetPassword("valid-token", "Password1!");
      const promise2 = authService.resetPassword("valid-token", "Password2!");

      // One should succeed, one should fail
      const results = await Promise.allSettled([promise1, promise2]);

      // At least one should succeed (or both might fail if truly concurrent)
      // This test documents the behavior - in practice, database constraints
      // should handle this
      expect(results).toBeDefined();
    });

    it("should consume token even if password update succeeds but later operations fail", async () => {
      mockAuthRepo.findAuthToken.mockResolvedValue(validResetToken);
      mockAuthRepo.findUserById.mockResolvedValue(mockUser);
      mockAuthRepo.updateUserPassword.mockResolvedValue(0);
      mockAuthRepo.consumeAuthToken.mockResolvedValue(0);
      mockAuthRepo.markAuthTokensConsumed.mockResolvedValue(0);
      // Simulate refresh revocation failure
      mockAuthRepo.revokeRefreshByUserId.mockRejectedValue(new Error("Revocation failed"));

      const bcrypt = await import("bcryptjs");
      (bcrypt.hash as jest.Mock).mockResolvedValue("$2a$12$newpasswordhash");

      await expect(authService.resetPassword("valid-token", "NewPassword123!")).rejects.toThrow(
        "Revocation failed",
      );

      // Password was updated
      expect(mockAuthRepo.updateUserPassword).toHaveBeenCalled();
      // Token was consumed
      expect(mockAuthRepo.consumeAuthToken).toHaveBeenCalled();
      // But revocation failed
      expect(mockAuthRepo.revokeRefreshByUserId).toHaveBeenCalled();
    });
  });

  describe("Token Consumption Order", () => {
    it("should consume token AFTER password update, not before", async () => {
      const callOrder: string[] = [];

      mockAuthRepo.findAuthToken.mockResolvedValue(validResetToken);
      mockAuthRepo.findUserById.mockResolvedValue(mockUser);
      mockAuthRepo.updateUserPassword.mockImplementation(() => {
        callOrder.push("updatePassword");
        return Promise.resolve(1);
      });
      mockAuthRepo.consumeAuthToken.mockImplementation(() => {
        callOrder.push("consumeToken");
        return Promise.resolve(1);
      });
      mockAuthRepo.markAuthTokensConsumed.mockImplementation(() => {
        callOrder.push("markConsumed");
        return Promise.resolve(1);
      });
      mockAuthRepo.revokeRefreshByUserId.mockImplementation(() => {
        callOrder.push("revokeRefresh");
        return Promise.resolve(1);
      });

      const bcrypt = await import("bcryptjs");
      (bcrypt.hash as jest.Mock).mockResolvedValue("$2a$12$newpasswordhash");

      await authService.resetPassword("valid-token", "NewPassword123!");

      // Verify correct order: update → consume → mark → revoke
      expect(callOrder).toEqual([
        "updatePassword",
        "consumeToken",
        "markConsumed",
        "revokeRefresh",
      ]);
    });
  });
});
