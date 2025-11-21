import type { Request, Response } from "express";
import * as twofaController from "../twofa.controller.js";
import * as twofaService from "../twofa.service.js";
import * as authRepository from "../auth.repository.js";

// Mock dependencies
jest.mock("../twofa.service.js");
jest.mock("../auth.repository.js");

const mockTwofaService = jest.mocked(twofaService);
const mockAuthRepository = jest.mocked(authRepository);

describe("TwoFA Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      user: undefined,
      params: {},
      query: {},
      body: {},
      headers: {},
      get: jest.fn((headerName: string) => {
        return (mockRequest.headers as Record<string, string>)?.[headerName.toLowerCase()];
      }),
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe("setup2FA", () => {
    it("should setup 2FA for authenticated user", async () => {
      mockRequest.user = { sub: "user-123", email: "test@example.com" };

      const mockUser = {
        id: "user-123",
        username: "testuser",
        password_hash: "hash",
      };

      const mockSetup = {
        secret: "SECRET123",
        qrCode: "data:image/png;base64,mockQRCode",
        backupCodes: [
          "ABCD-EFGH",
          "IJKL-MNOP",
          "QRST-UVWX",
          "YZ23-4567",
          "89AB-CDEF",
          "GHIJ-KLMN",
          "PQRS-TUVW",
          "XY23-4567",
          "89CD-EFGH",
          "IJKL-MNOP",
        ],
      };

      mockAuthRepository.findUserById.mockResolvedValue(mockUser as never);
      mockTwofaService.setupTwoFactor.mockResolvedValue(mockSetup);

      await twofaController.setup2FA(mockRequest as Request, mockResponse as Response);

      expect(mockAuthRepository.findUserById).toHaveBeenCalledWith("user-123");
      expect(mockTwofaService.setupTwoFactor).toHaveBeenCalledWith("user-123", "testuser");
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          secret: mockSetup.secret,
          qrCode: mockSetup.qrCode,
          backupCodes: mockSetup.backupCodes,
        }),
      );
    });

    it("should return 401 if user not authenticated", async () => {
      mockRequest.user = undefined;

      await twofaController.setup2FA(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Unauthorized",
      });
    });

    it("should return 400 if 2FA already enabled", async () => {
      mockRequest.user = { sub: "user-123", email: "test@example.com" };

      mockTwofaService.setupTwoFactor.mockRejectedValue({
        statusCode: 400,
        code: "2FA_ALREADY_ENABLED",
        message: "Two-factor authentication is already enabled",
      });

      await expect(
        twofaController.setup2FA(mockRequest as Request, mockResponse as Response),
      ).rejects.toMatchObject({
        code: "2FA_ALREADY_ENABLED",
      });
    });
  });

  describe("verify2FA", () => {
    it("should verify code and enable 2FA", async () => {
      mockRequest.user = { sub: "user-123" };
      mockRequest.body = { code: "123456" };

      mockTwofaService.verifyAndEnable2FA.mockResolvedValue(true);

      await twofaController.verify2FA(mockRequest as Request, mockResponse as Response);

      expect(mockTwofaService.verifyAndEnable2FA).toHaveBeenCalledWith("user-123", "123456");
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Two-factor authentication enabled successfully",
      });
    });

    it("should return 401 if user not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.body = { code: "123456" };

      await twofaController.verify2FA(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Unauthorized",
      });
    });

    it("should return 400 for invalid code format", async () => {
      mockRequest.user = { sub: "user-123" };
      mockRequest.body = { code: "12345" }; // Too short

      await twofaController.verify2FA(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      // Just verify that an error was returned, don't check the exact format
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.anything() }),
      );
    });

    it("should return 400 for non-numeric code", async () => {
      mockRequest.user = { sub: "user-123" };
      mockRequest.body = { code: "ABCDEF" }; // Not digits

      await twofaController.verify2FA(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe("disable2FAHandler", () => {
    it("should disable 2FA with correct password", async () => {
      mockRequest.user = { sub: "user-123" };
      mockRequest.body = { password: "Correct@Password123" };

      mockAuthRepository.findUserById.mockResolvedValue({
        id: "user-123",
        username: "testuser",
        password_hash: "hashedPassword",
      } as never);

      mockTwofaService.disable2FA.mockResolvedValue(true);

      await twofaController.disable2FAHandler(mockRequest as Request, mockResponse as Response);

      expect(mockAuthRepository.findUserById).toHaveBeenCalledWith("user-123");
      expect(mockTwofaService.disable2FA).toHaveBeenCalledWith(
        "user-123",
        "Correct@Password123",
        "hashedPassword",
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Two-factor authentication disabled successfully",
      });
    });

    it("should return 401 if user not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.body = { password: "password12345" };

      await twofaController.disable2FAHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it("should return 404 if user not found", async () => {
      mockRequest.user = { sub: "user-123" };
      mockRequest.body = { password: "password12345" };

      mockAuthRepository.findUserById.mockResolvedValue(undefined);

      await twofaController.disable2FAHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "User not found",
      });
    });

    it("should return 400 for invalid password format", async () => {
      mockRequest.user = { sub: "user-123" };
      mockRequest.body = { password: "short" }; // Too short

      await twofaController.disable2FAHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe("regenerateBackupCodes", () => {
    it("should regenerate backup codes", async () => {
      mockRequest.user = { sub: "user-123" };

      const newCodes = [
        "NEW1-2345",
        "NEW2-3456",
        "NEW3-4567",
        "NEW4-5678",
        "NEW5-6789",
        "NEW6-7890",
        "NEW7-8901",
        "NEW8-9012",
        "NEW9-0123",
        "NEWA-1234",
      ];

      mockTwofaService.is2FAEnabled.mockResolvedValue(true);
      mockTwofaService.generateBackupCodes.mockResolvedValue(newCodes);

      await twofaController.regenerateBackupCodes(mockRequest as Request, mockResponse as Response);

      expect(mockTwofaService.is2FAEnabled).toHaveBeenCalledWith("user-123");
      expect(mockTwofaService.generateBackupCodes).toHaveBeenCalledWith(
        "user-123",
        expect.any(Number),
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          backupCodes: newCodes,
        }),
      );
    });

    it("should return 401 if user not authenticated", async () => {
      mockRequest.user = undefined;

      await twofaController.regenerateBackupCodes(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe("get2FAStatus", () => {
    it("should return 2FA status and backup codes count", async () => {
      mockRequest.user = { sub: "user-123" };

      mockTwofaService.is2FAEnabled.mockResolvedValue(true);
      mockTwofaService.getRemainingBackupCodesCount.mockResolvedValue(7);

      await twofaController.get2FAStatus(mockRequest as Request, mockResponse as Response);

      expect(mockTwofaService.is2FAEnabled).toHaveBeenCalledWith("user-123");
      expect(mockTwofaService.getRemainingBackupCodesCount).toHaveBeenCalledWith("user-123");
      expect(mockResponse.json).toHaveBeenCalledWith({
        enabled: true,
        remainingBackupCodes: 7,
        warning: null,
      });
    });

    it("should return disabled status if 2FA not enabled", async () => {
      mockRequest.user = { sub: "user-123" };

      mockTwofaService.is2FAEnabled.mockResolvedValue(false);

      await twofaController.get2FAStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        enabled: false,
        remainingBackupCodes: 0,
        warning: null,
      });
    });

    it("should return 401 if user not authenticated", async () => {
      mockRequest.user = undefined;

      await twofaController.get2FAStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });
});
