import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../../apps/backend/src/utils/async-handler.js";

describe("asyncHandler", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe("successful async handlers", () => {
    it("should handle async function that resolves", async () => {
      const handler = asyncHandler(async (_req, res) => {
        res.status(200).json({ success: true });
      });

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle async function that returns void", async () => {
      const handler = asyncHandler(async () => {
        // No return value
      });

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle async function that returns Response", async () => {
      const handler = asyncHandler(async (_req, res) => {
        return res.status(201).send("Created");
      });

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.send).toHaveBeenCalledWith("Created");
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle synchronous function", async () => {
      const handler = asyncHandler((_req, res) => {
        res.status(200).json({ sync: true });
      });

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ sync: true });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should catch and forward async errors to next", async () => {
      const error = new Error("Async error");
      const handler = asyncHandler(async () => {
        throw error;
      });

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should catch and forward promise rejections to next", async () => {
      const error = new Error("Promise rejection");
      const handler = asyncHandler(async () => {
        return Promise.reject(error);
      });

      handler(mockRequest as Request, mockResponse as Response, mockNext);

      // Wait for promise rejection to be handled asynchronously
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it("should handle non-Error rejections", async () => {
      const rejection = "String rejection";
      const handler = asyncHandler(async () => {
        throw rejection;
      });

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(rejection);
    });

    it("should handle null/undefined rejections", async () => {
      const handler = asyncHandler(async () => {
        throw null;
      });

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(null);
    });
  });

  describe("request/response forwarding", () => {
    it("should forward request object to handler", async () => {
      const handler = asyncHandler(async (req, res) => {
        expect(req).toBe(mockRequest);
        res.status(200).json({ received: true });
      });

      await handler(mockRequest as Request, mockResponse as Response, mockNext);
    });

    it("should forward response object to handler", async () => {
      const handler = asyncHandler(async (req, res) => {
        expect(res).toBe(mockResponse);
        res.status(200).json({ received: true });
      });

      await handler(mockRequest as Request, mockResponse as Response, mockNext);
    });

    it("should forward next function to handler if needed", async () => {
      const handler = asyncHandler(async (req, res, next) => {
        expect(next).toBe(mockNext);
        res.status(200).json({ received: true });
      });

      await handler(mockRequest as Request, mockResponse as Response, mockNext);
    });
  });

  describe("edge cases", () => {
    it("should handle handler that throws synchronously", async () => {
      const error = new Error("Sync error");
      const handler = asyncHandler(() => {
        throw error;
      });

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it("should handle handler that returns a rejected promise", async () => {
      const error = new Error("Rejected promise");
      const handler = asyncHandler(() => {
        return Promise.reject(error);
      });

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it("should not call next when handler succeeds", async () => {
      const handler = asyncHandler(async (_req, res) => {
        res.status(200).json({ success: true });
      });

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
