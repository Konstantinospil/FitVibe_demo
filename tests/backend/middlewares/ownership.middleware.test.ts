import type { Request, Response, NextFunction } from "express";
import { db } from "../../../apps/backend/src/db/connection.js";
import { ownerGuard } from "../../../apps/backend/src/modules/common/ownership.middleware.js";

// Mock db
jest.mock("../../../apps/backend/src/db/connection.js", () => {
  const createQueryBuilder = (defaultValue: unknown = null) => {
    const builder = Object.assign(Promise.resolve(defaultValue), {
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(defaultValue),
    });
    return builder;
  };

  const mockDbFunction = jest.fn(createQueryBuilder) as jest.Mock;

  return {
    db: mockDbFunction,
  };
});

// Mock logger
jest.mock("../../../apps/backend/src/config/logger.js", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

const mockDb = jest.mocked(db);

describe("Ownership Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  const userId = "user-123";
  const resourceId = "resource-123";

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      user: { sub: userId, role: "athlete" },
      params: { id: resourceId },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe("ownerGuard", () => {
    it("should allow access when user owns resource (owner_id)", async () => {
      const mockResource = {
        id: resourceId,
        owner_id: userId,
      };

      const mockBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockResource),
      };

      mockDb.mockReturnValue(mockBuilder as never);

      const middleware = ownerGuard("sessions");

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should allow access when user owns resource (user_id)", async () => {
      const mockResource = {
        id: resourceId,
        user_id: userId,
      };

      const mockBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockResource),
      };

      mockDb.mockReturnValue(mockBuilder as never);

      const middleware = ownerGuard("sessions");

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should deny access when user does not own resource", async () => {
      const mockResource = {
        id: resourceId,
        owner_id: "other-user",
      };

      const mockBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockResource),
      };

      mockDb.mockReturnValue(mockBuilder as never);

      const middleware = ownerGuard("sessions");

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 404 when resource not found", async () => {
      const mockBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      };

      mockDb.mockReturnValue(mockBuilder as never);

      const middleware = ownerGuard("sessions");

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      const middleware = ownerGuard("sessions");

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
