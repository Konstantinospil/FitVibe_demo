import type { Request, Response, NextFunction } from "express";
import { requireRole } from "../../../apps/backend/src/modules/common/rbac.middleware.js";

describe("RBAC Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      user: { sub: "user-123", role: "athlete" },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe("requireRole", () => {
    it("should allow access when user has required role", () => {
      const middleware = requireRole("athlete");

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should deny access when user lacks required role", () => {
      const middleware = requireRole("admin");

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when user is not authenticated", () => {
      mockRequest.user = undefined;
      const middleware = requireRole("athlete");

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should allow access when user has one of multiple roles", () => {
      const middleware = requireRole(["admin", "athlete"]);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
