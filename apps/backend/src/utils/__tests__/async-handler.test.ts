import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../async-handler";

describe("asyncHandler utility", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe("successful async operations", () => {
    it("should handle async function that resolves", async () => {
      const handler = asyncHandler(async (req, res) => {
        await Promise.resolve();
        res.json({ success: true });
      });

      handler(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle sync function", () => {
      const handler = asyncHandler((req, res) => {
        res.json({ message: "sync" });
      });

      void handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({ message: "sync" });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle void async function", async () => {
      const handler = asyncHandler(async () => {
        await Promise.resolve();
      });

      handler(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should pass request and response to handler", async () => {
      const handlerFn = jest.fn().mockResolvedValue(undefined);
      const handler = asyncHandler(handlerFn);

      handler(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise((resolve) => setImmediate(resolve));

      expect(handlerFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
    });
  });

  describe("error handling", () => {
    it("should catch async errors and pass to next", async () => {
      const error = new Error("Async error");
      const handler = asyncHandler(async () => {
        await Promise.resolve();
        throw error;
      });

      handler(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it("should catch promise rejections", async () => {
      const error = new Error("Promise rejection");
      const handler = asyncHandler(() => Promise.reject(error));

      handler(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it("should not call next multiple times on error", async () => {
      const error = new Error("Single error");
      const handler = asyncHandler(async () => {
        await Promise.resolve();
        throw error;
      });

      handler(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe("edge cases", () => {
    it("should handle undefined return value", async () => {
      const handler = asyncHandler(async () => {
        await Promise.resolve();
        return undefined;
      });

      handler(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle null return value", async () => {
      const handler = asyncHandler(async () => {
        await Promise.resolve();
        return null as unknown as void;
      });

      handler(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle custom error objects", async () => {
      const customError = {
        status: 404,
        message: "Not found",
        custom: true,
      };
      const handler = asyncHandler(async () => {
        await Promise.resolve();
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw customError;
      });

      handler(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockNext).toHaveBeenCalledWith(customError);
    });

    it("should handle Error rejections", async () => {
      const error = new Error("Standard error");
      const handler = asyncHandler(async () => {
        await Promise.resolve();
        throw error;
      });

      handler(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
