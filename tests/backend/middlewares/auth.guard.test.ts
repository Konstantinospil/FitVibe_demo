import type { NextFunction, Request, Response } from "express";
import { authenticate } from "../../../apps/backend/src/middlewares/auth.guard.js";
import * as tokens from "../../../apps/backend/src/services/tokens.js";
import type { JwtPayload } from "../../../apps/backend/src/modules/auth/auth.types.js";

jest.mock("../../../apps/backend/src/services/tokens");

describe("authenticate middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  const mockRequestId = "test-request-id-123";

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      locals: { requestId: mockRequestId },
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe("when Authorization header is missing", () => {
    it("should return 401 with UNAUTHENTICATED error", () => {
      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "UNAUTHENTICATED",
          message: "Missing Authorization header",
          requestId: mockRequestId,
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should not call next() when header is missing", () => {
      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("when Authorization header is present but token is invalid", () => {
    beforeEach(() => {
      mockRequest.headers = {
        authorization: "Bearer invalid-token",
      };
    });

    it("should return 401 when token verification fails", () => {
      (tokens.verifyAccess as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(tokens.verifyAccess).toHaveBeenCalledWith("invalid-token");
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "UNAUTHENTICATED",
          message: "Invalid or expired token",
          requestId: mockRequestId,
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle JWT expiration errors", () => {
      const expiredError = new Error("jwt expired");
      expiredError.name = "TokenExpiredError";
      (tokens.verifyAccess as jest.Mock).mockImplementation(() => {
        throw expiredError;
      });

      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "UNAUTHENTICATED",
          message: "Invalid or expired token",
          requestId: mockRequestId,
        },
      });
    });

    it("should handle malformed JWT errors", () => {
      const malformedError = new Error("jwt malformed");
      malformedError.name = "JsonWebTokenError";
      (tokens.verifyAccess as jest.Mock).mockImplementation(() => {
        throw malformedError;
      });

      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "UNAUTHENTICATED",
          message: "Invalid or expired token",
          requestId: mockRequestId,
        },
      });
    });
  });

  describe("when Authorization header contains valid token", () => {
    const validPayload: JwtPayload = {
      sub: "user-123",
      role: "athlete",
      sid: "session-456",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
    };

    beforeEach(() => {
      mockRequest.headers = {
        authorization: "Bearer valid-token",
      };
      (tokens.verifyAccess as jest.Mock).mockReturnValue(validPayload);
    });

    it("should attach user payload to request and call next()", () => {
      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(tokens.verifyAccess).toHaveBeenCalledWith("valid-token");
      expect(mockRequest.user).toEqual(validPayload);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should parse token correctly from Bearer scheme", () => {
      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(tokens.verifyAccess).toHaveBeenCalledWith("valid-token");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle different user roles", () => {
      const adminPayload: JwtPayload = {
        ...validPayload,
        role: "admin",
      };
      (tokens.verifyAccess as jest.Mock).mockReturnValue(adminPayload);

      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(adminPayload);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle coach role", () => {
      const coachPayload: JwtPayload = {
        ...validPayload,
        role: "coach",
      };
      (tokens.verifyAccess as jest.Mock).mockReturnValue(coachPayload);

      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(coachPayload);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle authorization header with extra whitespace", () => {
      mockRequest.headers = {
        authorization: "Bearer   token-with-spaces   ",
      };

      const validPayload: JwtPayload = {
        sub: "user-123",
        role: "athlete",
        sid: "session-456",
      };
      (tokens.verifyAccess as jest.Mock).mockReturnValue(validPayload);

      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // The implementation splits by space and takes [1], which with multiple spaces gives empty string
      expect(tokens.verifyAccess).toHaveBeenCalledWith("");
    });

    it("should handle lowercase 'bearer' scheme", () => {
      mockRequest.headers = {
        authorization: "bearer lowercase-token",
      };

      const validPayload: JwtPayload = {
        sub: "user-123",
        role: "athlete",
        sid: "session-456",
      };
      (tokens.verifyAccess as jest.Mock).mockReturnValue(validPayload);

      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(tokens.verifyAccess).toHaveBeenCalledWith("lowercase-token");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle authorization without Bearer scheme", () => {
      mockRequest.headers = {
        authorization: "JustAToken",
      };

      const validPayload: JwtPayload = {
        sub: "user-123",
        role: "athlete",
        sid: "session-456",
      };
      (tokens.verifyAccess as jest.Mock).mockReturnValue(validPayload);

      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // split(" ")[1] will be undefined if there's no space
      expect(tokens.verifyAccess).toHaveBeenCalledWith(undefined);
    });

    it("should include requestId in error responses", () => {
      mockRequest.headers = {
        authorization: "Bearer invalid",
      };
      (tokens.verifyAccess as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid");
      });

      const customRequestId = "custom-req-id-789";
      mockResponse.locals = { requestId: customRequestId };

      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          requestId: customRequestId,
        }),
      });
    });
  });

  describe("security considerations", () => {
    it("should not expose token verification error details", () => {
      mockRequest.headers = {
        authorization: "Bearer malicious-token",
      };

      const sensitiveError = new Error("Signature verification failed at line 42");
      (tokens.verifyAccess as jest.Mock).mockImplementation(() => {
        throw sensitiveError;
      });

      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "UNAUTHENTICATED",
          message: "Invalid or expired token",
          requestId: mockRequestId,
        },
      });
      // Ensure sensitive error details are not leaked
      expect(mockResponse.json).not.toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.stringContaining("line 42"),
          }),
        }),
      );
    });

    it("should treat missing authorization header same as invalid token", () => {
      // Test 1: Missing header
      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      const missingHeaderResponse = (mockResponse.json as jest.Mock).mock.calls[0][0];

      // Test 2: Invalid token
      jest.clearAllMocks();
      mockRequest.headers = { authorization: "Bearer invalid" };
      (tokens.verifyAccess as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid");
      });

      authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      const invalidTokenResponse = (mockResponse.json as jest.Mock).mock.calls[0][0];

      // Both should return 401 (but potentially different messages)

      expect(missingHeaderResponse.error.code).toBe("UNAUTHENTICATED");

      expect(invalidTokenResponse.error.code).toBe("UNAUTHENTICATED");
    });
  });
});
