import type { Request, Response, NextFunction } from "express";
import * as authController from "../auth.controller.js";
import * as authService from "../auth.service.js";
import { HttpError } from "../../../utils/http.js";

// Mock dependencies
jest.mock("../auth.service.js");
jest.mock("../../../services/tokens.js");

const mockAuthService = jest.mocked(authService);

describe("Auth Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      headers: {},
      cookies: {},
      ip: "127.0.0.1",
      get: jest.fn((header: string) => {
        if (header === "user-agent") {
          return "test-user-agent";
        }
        return undefined;
      }),
      user: undefined,
      requestId: "test-request-id",
      baseUrl: "",
      route: { path: "/" },
      method: "POST",
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      locals: {},
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new user and return access token", async () => {
      const registerData = {
        email: "test@example.com",
        username: "testuser",
        password: "SecureP@ssw0rd123",
        terms_accepted: true,
      };

      mockRequest.body = registerData;

      mockAuthService.register.mockResolvedValue({
        verificationToken: "verification-token-123",
      });

      await authController.register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.register).toHaveBeenCalledWith(registerData);
      expect(mockResponse.status).toHaveBeenCalledWith(202);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
        }),
      );
    });

    it("should handle registration errors", async () => {
      mockRequest.body = {
        email: "test@example.com",
        username: "testuser",
        password: "weak",
      };

      await authController.register(mockRequest as Request, mockResponse as Response, mockNext);

      // Should be called with ZodError due to password policy violation
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("login", () => {
    it("should login user, set cookies, and return user session info", async () => {
      const loginData = {
        email: "test@example.com",
        password: "SecureP@ssw0rd123",
      };

      mockRequest.body = loginData;

      mockAuthService.login.mockResolvedValue({
        requires2FA: false,
        user: { id: "user-123", email: "test@example.com" },
        tokens: {
          accessToken: "access-token",
          refreshToken: "refresh-token",
        },
        session: { id: "session-123" },
      });

      await authController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.login).toHaveBeenCalledWith(
        loginData,
        expect.objectContaining({
          userAgent: "test-user-agent",
          ip: "127.0.0.1",
          requestId: "test-request-id",
        }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2); // access and refresh cookies
      expect(mockResponse.json).toHaveBeenCalledWith({
        requires2FA: false,
        user: expect.any(Object),
        session: expect.any(Object),
      });
    });

    it("should handle invalid credentials", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const error = new HttpError(401, "INVALID_CREDENTIALS", "Invalid credentials");
      mockAuthService.login.mockRejectedValue(error);

      await authController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe("refresh", () => {
    it("should refresh access token using refresh token", async () => {
      mockRequest.cookies = {
        fitvibe_refresh: "valid-refresh-token",
      };

      mockAuthService.refresh.mockResolvedValue({
        user: { id: "user-123" },
        accessToken: "new-access-token",
        newRefresh: "new-refresh-token",
      });

      await authController.refresh(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(
        "valid-refresh-token",
        expect.objectContaining({
          userAgent: "test-user-agent",
          ip: "127.0.0.1",
          requestId: "test-request-id",
        }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2); // access and refresh cookies
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.any(Object),
        }),
      );
    });

    it("should handle missing refresh token", async () => {
      mockRequest.cookies = {};

      await authController.refresh(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();

      const error = mockNext.mock.calls[0][0] as HttpError;
      expect(error.status).toBe(401);
      expect(error.code).toBe("UNAUTHENTICATED");
    });

    it("should handle invalid refresh token", async () => {
      mockRequest.cookies = {
        fitvibe_refresh: "invalid-token",
      };

      const error = new HttpError(401, "INVALID_TOKEN", "Invalid refresh token");
      mockAuthService.refresh.mockRejectedValue(error);

      await authController.refresh(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();

      const receivedError = mockNext.mock.calls[0][0] as HttpError;
      expect(receivedError.status).toBe(401);
      expect(receivedError.code).toBe("INVALID_TOKEN");
    });
  });

  describe("logout", () => {
    it("should logout user and clear cookies", async () => {
      mockRequest.cookies = {
        fitvibe_refresh: "valid-refresh-token",
      };

      mockAuthService.logout.mockResolvedValue();

      await authController.logout(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.logout).toHaveBeenCalledWith(
        "valid-refresh-token",
        expect.objectContaining({
          userAgent: "test-user-agent",
          ip: "127.0.0.1",
          requestId: "test-request-id",
        }),
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2); // access and refresh cookies
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should handle logout without refresh token", async () => {
      mockRequest.cookies = {};

      mockAuthService.logout.mockResolvedValue();

      await authController.logout(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.logout).toHaveBeenCalledWith(undefined, expect.any(Object));
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });

  describe("verifyEmail", () => {
    it("should verify email with valid token", async () => {
      mockRequest.query = {
        token: "valid-verification-token",
      };

      mockAuthService.verifyEmail.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
      });

      await authController.verifyEmail(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith("valid-verification-token");
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.any(Object),
        }),
      );
    });

    it("should handle missing token", async () => {
      mockRequest.query = {};

      await authController.verifyEmail(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();

      const error = mockNext.mock.calls[0][0] as HttpError;
      expect(error.status).toBe(400);
      expect(error.code).toBe("AUTH_INVALID_TOKEN");
    });

    it("should handle invalid token", async () => {
      mockRequest.query = {
        token: "invalid-token",
      };

      const error = new HttpError(400, "INVALID_TOKEN", "Invalid verification token");
      mockAuthService.verifyEmail.mockRejectedValue(error);

      await authController.verifyEmail(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe("forgotPassword", () => {
    it("should send password reset email", async () => {
      mockRequest.body = {
        email: "test@example.com",
      };

      mockAuthService.requestPasswordReset.mockResolvedValue({
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      } as never);

      await authController.forgotPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith("test@example.com");
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
        }),
      );
    });

    it("should handle missing email", async () => {
      mockRequest.body = {};

      await authController.forgotPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    it("should reset password with valid token", async () => {
      mockRequest.body = {
        token: "valid-reset-token",
        newPassword: "NewP@ssw0rd123",
      };

      mockAuthService.resetPassword.mockResolvedValue();

      await authController.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        "valid-reset-token",
        "NewP@ssw0rd123",
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should handle invalid reset token", async () => {
      mockRequest.body = {
        token: "invalid-token",
        newPassword: "weak",
      };

      await authController.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Should fail Zod validation due to weak password
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("listSessions", () => {
    it("should list user sessions", async () => {
      mockRequest.user = {
        sub: "user-123",
        sid: "session-123",
      };

      const mockSessions = [
        {
          id: "session-1",
          deviceInfo: "Chrome",
          createdAt: "2024-01-01T00:00:00Z",
          isCurrent: true,
        },
        {
          id: "session-2",
          deviceInfo: "Firefox",
          createdAt: "2024-01-02T00:00:00Z",
          isCurrent: false,
        },
      ];

      mockAuthService.listSessions.mockResolvedValue(mockSessions as never);

      await authController.listSessions(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.listSessions).toHaveBeenCalledWith("user-123", "session-123");
      expect(mockResponse.json).toHaveBeenCalledWith({ sessions: mockSessions });
    });

    it("should handle unauthenticated request", async () => {
      mockRequest.user = undefined;

      await authController.listSessions(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();

      const error = mockNext.mock.calls[0][0] as HttpError;
      expect(error.status).toBe(401);
      expect(error.code).toBe("UNAUTHENTICATED");
    });
  });

  describe("revokeSessions", () => {
    it("should revoke sessions excluding current", async () => {
      const targetSessionId = "550e8400-e29b-41d4-a716-446655440001";
      const currentSessionId = "550e8400-e29b-41d4-a716-446655440002";

      mockRequest.user = {
        sub: "user-123",
        sid: currentSessionId,
      };
      mockRequest.body = {
        sessionId: targetSessionId,
      };

      mockAuthService.revokeSessions.mockResolvedValue({ revoked: 1 } as never);

      await authController.revokeSessions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockAuthService.revokeSessions).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          sessionId: targetSessionId,
          revokeAll: false,
          revokeOthers: false,
          currentSessionId: currentSessionId,
          context: expect.objectContaining({
            userAgent: "test-user-agent",
            ip: "127.0.0.1",
            requestId: "test-request-id",
          }),
        }),
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ revoked: 1 });
    });

    it("should handle unauthenticated revoke request", async () => {
      mockRequest.user = undefined;
      mockRequest.body = {
        revokeOthers: true,
      };

      await authController.revokeSessions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();

      const error = mockNext.mock.calls[0][0] as HttpError;
      expect(error.status).toBe(401);
      expect(error.code).toBe("UNAUTHENTICATED");
    });
  });

  describe("jwksHandler", () => {
    it("should return JWKS public keys", () => {
      authController.jwksHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          keys: expect.any(Array),
        }),
      );
    });
  });
});
