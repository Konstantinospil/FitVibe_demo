import type { NextFunction, Request, Response } from "express";
import * as authMiddleware from "../../../../apps/backend/src/modules/auth/auth.middleware.js";
import * as tokensService from "../../../../apps/backend/src/services/tokens.js";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";

// Mock dependencies
jest.mock("../../../../apps/backend/src/services/tokens.js");
jest.mock("../../../../apps/backend/src/config/env.js", () => ({
  env: {
    ACCESS_COOKIE_NAME: "access_token",
  },
}));

const mockTokensService = jest.mocked(tokensService);

describe("Auth Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      headers: {},
      cookies: {},
      user: undefined,
    };

    mockResponse = {};

    mockNext = jest.fn();
  });

  describe("requireAccessToken", () => {
    it("should authenticate user with token from cookie", () => {
      const token = "access-token";
      const payload = {
        sub: "user-123",
        role: "athlete",
        sid: "session-123",
      };

      mockRequest.cookies = { access_token: token };
      mockTokensService.verifyAccess.mockReturnValue(payload as never);

      authMiddleware.requireAccessToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensService.verifyAccess).toHaveBeenCalledWith(token);
      expect(mockRequest.user).toEqual(payload);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should authenticate user with token from Authorization header", () => {
      const token = "access-token";
      const payload = {
        sub: "user-123",
        role: "athlete",
        sid: "session-123",
      };

      mockRequest.headers = { authorization: "Bearer access-token" };
      mockTokensService.verifyAccess.mockReturnValue(payload as never);

      authMiddleware.requireAccessToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensService.verifyAccess).toHaveBeenCalledWith(token);
      expect(mockRequest.user).toEqual(payload);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should prefer cookie token over Authorization header", () => {
      const cookieToken = "cookie-token";
      const headerToken = "header-token";
      const payload = {
        sub: "user-123",
        role: "athlete",
        sid: "session-123",
      };

      mockRequest.cookies = { access_token: cookieToken };
      mockRequest.headers = { authorization: `Bearer ${headerToken}` };
      mockTokensService.verifyAccess.mockReturnValue(payload as never);

      authMiddleware.requireAccessToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensService.verifyAccess).toHaveBeenCalledWith(cookieToken);
      expect(mockTokensService.verifyAccess).not.toHaveBeenCalledWith(headerToken);
    });

    it("should return error when no token is provided", () => {
      mockRequest.cookies = {};
      mockRequest.headers = {};

      authMiddleware.requireAccessToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensService.verifyAccess).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "UNAUTHENTICATED",
          message: "Access token required",
        }),
      );
    });

    it("should return error when token is invalid", () => {
      const token = "invalid-token";
      mockRequest.cookies = { access_token: token };
      mockTokensService.verifyAccess.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      authMiddleware.requireAccessToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensService.verifyAccess).toHaveBeenCalledWith(token);
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "UNAUTHENTICATED",
          message: "Invalid or expired access token",
        }),
      );
    });

    it("should handle Authorization header with lowercase bearer", () => {
      const token = "access-token";
      const payload = {
        sub: "user-123",
        role: "athlete",
        sid: "session-123",
      };

      mockRequest.headers = { authorization: "bearer access-token" };
      mockTokensService.verifyAccess.mockReturnValue(payload as never);

      authMiddleware.requireAccessToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensService.verifyAccess).toHaveBeenCalledWith(token);
      expect(mockRequest.user).toEqual(payload);
    });

    it("should return null when Authorization header has invalid format", () => {
      mockRequest.headers = { authorization: "InvalidFormat token" };
      mockRequest.cookies = {};

      authMiddleware.requireAccessToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensService.verifyAccess).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "UNAUTHENTICATED",
        }),
      );
    });

    it("should return null when Authorization header is missing value", () => {
      mockRequest.headers = { authorization: "Bearer" };
      mockRequest.cookies = {};

      authMiddleware.requireAccessToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensService.verifyAccess).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "UNAUTHENTICATED",
        }),
      );
    });
  });
});

