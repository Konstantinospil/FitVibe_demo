import type { Request, Response, NextFunction } from "express";
import {
  rateLimit,
  rateLimitByUser,
  clearRateLimiters,
} from "../../../apps/backend/src/middlewares/rate-limit.js";
import { extractClientIpForRateLimit } from "../../../apps/backend/src/utils/ip-extractor.js";

// Mock dependencies
jest.mock("../../../apps/backend/src/utils/ip-extractor.js", () => ({
  extractClientIpForRateLimit: jest.fn().mockReturnValue("127.0.0.1"),
}));

jest.mock("rate-limiter-flexible", () => ({
  RateLimiterMemory: jest.fn().mockImplementation(() => ({
    consume: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe("Rate Limiter Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    clearRateLimiters();
    jest.clearAllMocks();

    mockRequest = {
      user: undefined,
      headers: {},
      ip: "127.0.0.1",
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      locals: {},
    };

    mockNext = jest.fn();
  });

  describe("rateLimit", () => {
    it("should allow request when under limit", async () => {
      const middleware = rateLimit("test", 10, 60);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe("rateLimitByUser", () => {
    it("should use user ID when authenticated", async () => {
      mockRequest.user = { sub: "user-123", role: "athlete" };
      const middleware = rateLimitByUser("test", 10, 60);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should fall back to IP when not authenticated", async () => {
      const middleware = rateLimitByUser("test", 10, 60);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(extractClientIpForRateLimit).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});

