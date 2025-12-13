import type { NextFunction, Request, Response } from "express";
import { requireAuth } from "../../../../apps/backend/src/modules/users/users.middleware.js";
import * as tokensService from "../../../../apps/backend/src/services/tokens.js";

// Mock dependencies
jest.mock("../../../../apps/backend/src/services/tokens.js");

const mockTokensService = jest.mocked(tokensService);

describe("Users Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      headers: {},
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe("requireAuth", () => {
    it("should call next() when token is valid", () => {
      const token = "valid-token";
      const decoded = {
        sub: "user-123",
        role: "user",
        username: "testuser",
      };

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };
      mockTokensService.verifyAccess.mockReturnValue(decoded);

      requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensService.verifyAccess).toHaveBeenCalledWith(token);
      expect(mockRequest.user).toEqual(decoded);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should return 401 when authorization header is missing", () => {
      mockRequest.headers = {};

      requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Missing token" });
      expect(mockTokensService.verifyAccess).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when authorization header doesn't start with Bearer", () => {
      mockRequest.headers = {
        authorization: "Invalid token",
      };

      requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Missing token" });
      expect(mockTokensService.verifyAccess).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when token is invalid", () => {
      const token = "invalid-token";

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };
      mockTokensService.verifyAccess.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensService.verifyAccess).toHaveBeenCalledWith(token);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Invalid token" });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should extract token correctly from Bearer header", () => {
      const token = "extracted-token";
      const decoded = {
        sub: "user-123",
        role: "user",
        username: "testuser",
      };

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };
      mockTokensService.verifyAccess.mockReturnValue(decoded);

      requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTokensService.verifyAccess).toHaveBeenCalledWith(token);
      expect(mockRequest.user).toEqual(decoded);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle token with spaces correctly", () => {
      const token = "token with spaces";
      const decoded = {
        sub: "user-123",
        role: "user",
        username: "testuser",
      };

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };
      mockTokensService.verifyAccess.mockReturnValue(decoded);

      requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Should extract only the first part after "Bearer "
      expect(mockTokensService.verifyAccess).toHaveBeenCalledWith("token");
      expect(mockRequest.user).toEqual(decoded);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
