import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../validation";
import { HttpError } from "../http";

describe("validation utilities", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
    };
    mockResponse = {};
    mockNext = jest.fn() as unknown as NextFunction;
  });

  describe("validate", () => {
    it("should validate body successfully and attach validated data", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockRequest.body = { name: "John", age: 30 };

      const middleware = validate(schema, "body");
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockRequest as any).validated).toEqual({ name: "John", age: 30 });
      expect(mockRequest.body).toEqual({ name: "John", age: 30 });
    });

    it("should validate query successfully", () => {
      const schema = z.object({
        page: z.string(),
        limit: z.string(),
      });

      mockRequest.query = { page: "1", limit: "10" };

      const middleware = validate(schema, "query");
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockRequest as any).validated).toEqual({ page: "1", limit: "10" });
    });

    it("should validate params successfully", () => {
      const schema = z.object({
        id: z.string().uuid(),
      });

      mockRequest.params = { id: "123e4567-e89b-12d3-a456-426614174000" };

      const middleware = validate(schema, "params");
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockRequest as any).validated).toEqual({
        id: "123e4567-e89b-12d3-a456-426614174000",
      });
    });

    it("should default to validating body when no target specified", () => {
      const schema = z.object({
        email: z.string().email(),
      });

      mockRequest.body = { email: "test@example.com" };

      const middleware = validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockRequest as any).validated).toEqual({ email: "test@example.com" });
    });

    it("should call next with HttpError when validation fails", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockRequest.body = { name: "John", age: "thirty" }; // Invalid age

      const middleware = validate(schema, "body");
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(HttpError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as HttpError;
      expect(error.status).toBe(400);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.message).toBe("Validation failed");
      expect(error.details).toBeDefined();
    });

    it("should include flattened error details on validation failure", () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      mockRequest.body = { email: "invalid-email", age: 15 };

      const middleware = validate(schema, "body");
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(HttpError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as HttpError;
      expect(error.details).toBeDefined();
      expect(error.details).toHaveProperty("fieldErrors");
    });

    it("should handle missing required fields", () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      mockRequest.body = { name: "John" }; // Missing email

      const middleware = validate(schema, "body");
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(HttpError));
    });

    it("should handle empty body", () => {
      const schema = z.object({
        name: z.string(),
      });

      mockRequest.body = {};

      const middleware = validate(schema, "body");
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(HttpError));
    });

    it("should handle complex nested schemas", () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
        metadata: z.object({
          createdAt: z.string(),
        }),
      });

      mockRequest.body = {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        metadata: {
          createdAt: "2023-01-01",
        },
      };

      const middleware = validate(schema, "body");
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockRequest as any).validated).toEqual(mockRequest.body);
    });

    it("should handle array schemas", () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      mockRequest.body = { tags: ["tag1", "tag2", "tag3"] };

      const middleware = validate(schema, "body");
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockRequest as any).validated).toEqual({ tags: ["tag1", "tag2", "tag3"] });
    });

    it("should handle optional fields", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().optional(),
      });

      mockRequest.body = { name: "John" }; // age is optional

      const middleware = validate(schema, "body");
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockRequest as any).validated).toEqual({ name: "John" });
    });

    it("should strip unknown fields with strict mode", () => {
      const schema = z
        .object({
          name: z.string(),
        })
        .strict();

      mockRequest.body = { name: "John", unknownField: "value" };

      const middleware = validate(schema, "body");
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Zod strict mode will cause validation to fail with unknown keys
      expect(mockNext).toHaveBeenCalledWith(expect.any(HttpError));
    });

    it("should transform data when schema includes transformations", () => {
      const schema = z.object({
        name: z.string().transform((val) => val.toUpperCase()),
      });

      mockRequest.body = { name: "john" };

      const middleware = validate(schema, "body");
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockRequest as any).validated).toEqual({ name: "JOHN" });
      expect(mockRequest.body).toEqual({ name: "JOHN" });
    });
  });
});
