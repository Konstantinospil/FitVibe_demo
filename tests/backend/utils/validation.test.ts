import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validate } from "../../../apps/backend/src/utils/validation.js";
import { HttpError } from "../../../apps/backend/src/utils/http.js";

// Mock logger
jest.mock("../../../apps/backend/src/config/logger.js", () => ({
  logger: {
    warn: jest.fn(),
  },
}));

describe("Validation Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      body: {},
      query: {},
      params: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe("validate body", () => {
    it("should pass validation for valid body", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockRequest.body = { name: "John", age: 30 };
      const middleware = validate(schema, "body");

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body).toEqual({ name: "John", age: 30 });
      expect((mockRequest as Request & { validated?: unknown }).validated).toEqual({
        name: "John",
        age: 30,
      });
    });

    it("should fail validation for invalid body", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockRequest.body = { name: "John", age: "invalid" };
      const middleware = validate(schema, "body");

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const errorCall = mockNext.mock.calls.find((call) => call[0] !== undefined);
      expect(errorCall).toBeDefined();
      const error = errorCall![0];
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(400);
      expect((error as HttpError).code).toBe("VALIDATION_ERROR");
    });

    it("should fail validation for missing required fields", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockRequest.body = { name: "John" };
      const middleware = validate(schema, "body");

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const errorCall = mockNext.mock.calls.find((call) => call[0] !== undefined);
      expect(errorCall).toBeDefined();
      const error = errorCall![0];
      expect(error).toBeInstanceOf(HttpError);
    });
  });

  describe("validate query", () => {
    it("should pass validation for valid query", () => {
      const schema = z.object({
        page: z.string().transform((val) => parseInt(val, 10)),
        limit: z.string().transform((val) => parseInt(val, 10)),
      });

      mockRequest.query = { page: "1", limit: "10" };
      const middleware = validate(schema, "query");

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockRequest as Request & { validated?: unknown }).validated).toEqual({
        page: 1,
        limit: 10,
      });
    });

    it("should fail validation for invalid query", () => {
      const schema = z.object({
        page: z.string().regex(/^\d+$/),
      });

      mockRequest.query = { page: "invalid" };
      const middleware = validate(schema, "query");

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const errorCall = mockNext.mock.calls.find((call) => call[0] !== undefined);
      expect(errorCall).toBeDefined();
      const error = errorCall![0];
      expect(error).toBeInstanceOf(HttpError);
    });
  });

  describe("validate params", () => {
    it("should pass validation for valid params", () => {
      const schema = z.object({
        id: z.string().uuid(),
      });

      mockRequest.params = { id: "123e4567-e89b-12d3-a456-426614174000" };
      const middleware = validate(schema, "params");

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockRequest as Request & { validated?: unknown }).validated).toEqual({
        id: "123e4567-e89b-12d3-a456-426614174000",
      });
    });

    it("should fail validation for invalid params", () => {
      const schema = z.object({
        id: z.string().uuid(),
      });

      mockRequest.params = { id: "invalid-uuid" };
      const middleware = validate(schema, "params");

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const errorCall = mockNext.mock.calls.find((call) => call[0] !== undefined);
      expect(errorCall).toBeDefined();
      const error = errorCall![0];
      expect(error).toBeInstanceOf(HttpError);
    });
  });

  describe("default target (body)", () => {
    it("should default to body when target is not specified", () => {
      const schema = z.object({
        name: z.string(),
      });

      mockRequest.body = { name: "John" };
      const middleware = validate(schema);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockRequest as Request & { validated?: unknown }).validated).toEqual({
        name: "John",
      });
    });
  });

  describe("complex schemas", () => {
    it("should handle nested objects", () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      });

      mockRequest.body = {
        user: {
          name: "John",
          email: "john@example.com",
        },
      };
      const middleware = validate(schema, "body");

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should handle arrays", () => {
      const schema = z.object({
        items: z.array(z.string()),
      });

      mockRequest.body = { items: ["item1", "item2"] };
      const middleware = validate(schema, "body");

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should handle optional fields", () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email().optional(),
      });

      mockRequest.body = { name: "John" };
      const middleware = validate(schema, "body");

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
