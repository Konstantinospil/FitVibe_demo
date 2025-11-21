import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";
import { z } from "zod";
import { errorHandler } from "../error.handler";
import { HttpError } from "../../utils/http";
import { logger } from "../../config/logger";

jest.mock("../../config/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("errorHandler middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  const mockRequestId = "test-req-123";

  beforeEach(() => {
    mockRequest = {
      method: "GET",
      originalUrl: "/api/v1/test",
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      locals: { requestId: mockRequestId },
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe("HttpError handling", () => {
    it("should handle HttpError with all fields", () => {
      const error = new HttpError(404, "NOT_FOUND", "Resource not found", {
        resource: "user",
        id: "123",
      });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
          details: { resource: "user", id: "123" },
          requestId: mockRequestId,
        },
      });
    });

    it("should handle HttpError without details", () => {
      const error = new HttpError(401, "UNAUTHENTICATED", "Invalid token");

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "UNAUTHENTICATED",
          message: "Invalid token",
          requestId: mockRequestId,
        },
      });
    });

    it("should log error with request context", () => {
      const error = new HttpError(500, "INTERNAL_ERROR", "Something failed");

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        {
          err: error,
          status: 500,
          code: "INTERNAL_ERROR",
          requestId: mockRequestId,
          path: "/api/v1/test",
          method: "GET",
        },
        "Request failed",
      );
    });
  });

  describe("ZodError handling", () => {
    it("should convert ZodError to validation error", () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      let zodError: ZodError;
      try {
        schema.parse({ email: "invalid", age: 10 });
      } catch (err) {
        zodError = err as ZodError;
      }

      errorHandler(zodError!, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "VALIDATION_ERROR",
          message: "VALIDATION_ERROR",
          details: zodError!.flatten(),
          requestId: mockRequestId,
        },
      });
    });

    it("should log ZodError details", () => {
      const schema = z.object({ name: z.string().min(1) });
      let zodError: ZodError;
      try {
        schema.parse({ name: "" });
      } catch (err) {
        zodError = err as ZodError;
      }

      errorHandler(zodError!, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: zodError,
          status: 400,
          code: "VALIDATION_ERROR",
        }),
        "Request failed",
      );
    });
  });

  describe("Generic Error handling", () => {
    it("should handle Error with status and code", () => {
      const error = new Error("Bad request") as Error & {
        status: number;
        code: string;
      };
      error.status = 400;
      error.code = "INVALID_INPUT";

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "INVALID_INPUT",
          message: "Bad request",
          requestId: mockRequestId,
        },
      });
    });

    it("should handle Error with status but no code (400)", () => {
      const error = new Error("Validation failed") as Error & {
        status: number;
      };
      error.status = 400;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "BAD_REQUEST",
          message: "Validation failed",
          requestId: mockRequestId,
        },
      });
    });

    it("should handle Error with status but no code (401)", () => {
      const error = new Error("Unauthorized") as Error & { status: number };
      error.status = 401;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "UNAUTHENTICATED",
          }),
        }),
      );
    });

    it("should handle Error with status but no code (403)", () => {
      const error = new Error("Forbidden") as Error & { status: number };
      error.status = 403;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "FORBIDDEN",
          }),
        }),
      );
    });

    it("should handle Error with status but no code (404)", () => {
      const error = new Error("Not found") as Error & { status: number };
      error.status = 404;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "NOT_FOUND",
          }),
        }),
      );
    });

    it("should handle Error with status but no code (429)", () => {
      const error = new Error("Too many requests") as Error & {
        status: number;
      };
      error.status = 429;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "RATE_LIMITED",
          }),
        }),
      );
    });

    it("should handle Error without status (default to 500)", () => {
      const error = new Error("Unexpected error");

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unexpected error",
          requestId: mockRequestId,
        },
      });
    });

    it("should include details when present on generic error", () => {
      const error = new Error("Error with details") as Error & {
        details: Record<string, unknown>;
      };
      error.details = { field: "email", reason: "invalid format" };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Error with details",
          details: { field: "email", reason: "invalid format" },
          requestId: mockRequestId,
        },
      });
    });

    it("should handle Error with empty message", () => {
      const error = new Error("");
      error.message = "";

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: "INTERNAL_SERVER_ERROR",
          }),
        }),
      );
    });
  });

  describe("Unknown error types", () => {
    it("should handle string error", () => {
      errorHandler(
        "Something went wrong",
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "INTERNAL_SERVER_ERROR",
          requestId: mockRequestId,
        },
      });
    });

    it("should handle null error", () => {
      errorHandler(null, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "INTERNAL_SERVER_ERROR",
          requestId: mockRequestId,
        },
      });
    });

    it("should handle undefined error", () => {
      errorHandler(undefined, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "INTERNAL_SERVER_ERROR",
          requestId: mockRequestId,
        },
      });
    });

    it("should handle object error", () => {
      errorHandler(
        { custom: "error object" },
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "INTERNAL_SERVER_ERROR",
          requestId: mockRequestId,
        },
      });
    });
  });

  describe("Request ID handling", () => {
    it("should include requestId when available", () => {
      const error = new HttpError(404, "NOT_FOUND", "Not found");
      mockResponse.locals = { requestId: "custom-request-id-456" };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: "custom-request-id-456",
          }),
        }),
      );
    });

    it("should handle missing requestId gracefully", () => {
      const error = new HttpError(404, "NOT_FOUND", "Not found");
      mockResponse.locals = {};

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "NOT_FOUND",
          message: "Not found",
          requestId: undefined,
        },
      });
    });

    it("should handle non-string requestId", () => {
      const error = new HttpError(404, "NOT_FOUND", "Not found");
      mockResponse.locals = { requestId: 12345 };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "NOT_FOUND",
          message: "Not found",
          requestId: undefined,
        },
      });
    });
  });

  describe("Logging", () => {
    it("should log with path and method", () => {
      const error = new HttpError(500, "ERROR", "Failed");
      mockRequest.method = "POST";
      mockRequest.originalUrl = "/api/v1/users";

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/api/v1/users",
          method: "POST",
        }),
        "Request failed",
      );
    });

    it("should log original error object", () => {
      const originalError = new Error("Original");

      errorHandler(originalError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: originalError,
        }),
        "Request failed",
      );
    });
  });
});
