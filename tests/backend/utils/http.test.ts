import { HttpError, createHttpError } from "../../../apps/backend/src/utils/http.js";

describe("http utilities", () => {
  describe("HttpError class", () => {
    it("should create an HttpError with all properties", () => {
      const error = new HttpError(404, "NOT_FOUND", "Resource not found", {
        resource: "user",
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
      expect(error.status).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toBe("Resource not found");
      expect(error.details).toEqual({ resource: "user" });
      expect(error.name).toBe("HttpError");
    });

    it("should create an HttpError without details", () => {
      const error = new HttpError(401, "UNAUTHORIZED", "Not authorized");

      expect(error.status).toBe(401);
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.message).toBe("Not authorized");
      expect(error.details).toBeUndefined();
    });

    it("should inherit from Error", () => {
      const error = new HttpError(500, "ERROR", "Internal error");

      expect(error instanceof Error).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it("should have correct name property", () => {
      const error = new HttpError(400, "BAD_REQUEST", "Bad request");

      expect(error.name).toBe("HttpError");
    });

    it("should preserve error message in stack", () => {
      const error = new HttpError(500, "ERROR", "Stack test");

      expect(error.stack).toContain("Stack test");
    });

    describe("common HTTP status codes", () => {
      it("should handle 400 Bad Request", () => {
        const error = new HttpError(400, "BAD_REQUEST", "Invalid input");

        expect(error.status).toBe(400);
        expect(error.code).toBe("BAD_REQUEST");
      });

      it("should handle 401 Unauthorized", () => {
        const error = new HttpError(401, "UNAUTHORIZED", "No credentials");

        expect(error.status).toBe(401);
        expect(error.code).toBe("UNAUTHORIZED");
      });

      it("should handle 403 Forbidden", () => {
        const error = new HttpError(403, "FORBIDDEN", "Access denied");

        expect(error.status).toBe(403);
        expect(error.code).toBe("FORBIDDEN");
      });

      it("should handle 404 Not Found", () => {
        const error = new HttpError(404, "NOT_FOUND", "Not found");

        expect(error.status).toBe(404);
        expect(error.code).toBe("NOT_FOUND");
      });

      it("should handle 409 Conflict", () => {
        const error = new HttpError(409, "CONFLICT", "Resource exists");

        expect(error.status).toBe(409);
        expect(error.code).toBe("CONFLICT");
      });

      it("should handle 422 Unprocessable Entity", () => {
        const error = new HttpError(422, "VALIDATION_ERROR", "Invalid data");

        expect(error.status).toBe(422);
        expect(error.code).toBe("VALIDATION_ERROR");
      });

      it("should handle 429 Too Many Requests", () => {
        const error = new HttpError(429, "RATE_LIMITED", "Too many requests");

        expect(error.status).toBe(429);
        expect(error.code).toBe("RATE_LIMITED");
      });

      it("should handle 500 Internal Server Error", () => {
        const error = new HttpError(500, "INTERNAL_SERVER_ERROR", "Server error");

        expect(error.status).toBe(500);
        expect(error.code).toBe("INTERNAL_SERVER_ERROR");
      });

      it("should handle 503 Service Unavailable", () => {
        const error = new HttpError(503, "SERVICE_UNAVAILABLE", "Service down");

        expect(error.status).toBe(503);
        expect(error.code).toBe("SERVICE_UNAVAILABLE");
      });
    });

    describe("details field", () => {
      it("should handle object details", () => {
        const details = { field: "email", message: "Invalid format" };
        const error = new HttpError(400, "INVALID", "Bad field", details);

        expect(error.details).toEqual(details);
      });

      it("should handle array details", () => {
        const details = ["error1", "error2"];
        const error = new HttpError(400, "ERRORS", "Multiple errors", details);

        expect(error.details).toEqual(details);
      });

      it("should handle string details", () => {
        const error = new HttpError(400, "ERROR", "Message", "detail string");

        expect(error.details).toBe("detail string");
      });

      it("should handle null details", () => {
        const error = new HttpError(400, "ERROR", "Message", null);

        expect(error.details).toBeNull();
      });

      it("should handle complex nested details", () => {
        const details = {
          errors: [
            { field: "name", code: "REQUIRED" },
            { field: "email", code: "INVALID_FORMAT" },
          ],
          context: { userId: "123" },
        };
        const error = new HttpError(422, "VALIDATION", "Invalid", details);

        expect(error.details).toEqual(details);
      });
    });

    describe("error catching", () => {
      it("should be catchable with try-catch", () => {
        expect(() => {
          throw new HttpError(400, "ERROR", "Test");
        }).toThrow(HttpError);
      });

      it("should be catchable as Error", () => {
        expect(() => {
          throw new HttpError(400, "ERROR", "Test");
        }).toThrow(Error);
      });

      it("should preserve message when caught", () => {
        try {
          throw new HttpError(404, "NOT_FOUND", "User not found");
        } catch (error) {
          expect((error as HttpError).message).toBe("User not found");
        }
      });

      it("should preserve all properties when caught", () => {
        try {
          throw new HttpError(403, "FORBIDDEN", "No access", { userId: "123" });
        } catch (error) {
          const httpError = error as HttpError;
          expect(httpError.status).toBe(403);
          expect(httpError.code).toBe("FORBIDDEN");
          expect(httpError.message).toBe("No access");
          expect(httpError.details).toEqual({ userId: "123" });
        }
      });
    });
  });

  describe("createHttpError function", () => {
    it("should create an HttpError", () => {
      const error = createHttpError(404, "NOT_FOUND", "Not found");

      expect(error).toBeInstanceOf(HttpError);
      expect(error.status).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toBe("Not found");
    });

    it("should create an HttpError with details", () => {
      const error = createHttpError(400, "BAD", "Bad request", { field: "x" });

      expect(error.status).toBe(400);
      expect(error.details).toEqual({ field: "x" });
    });

    it("should create an HttpError without details", () => {
      const error = createHttpError(500, "ERROR", "Server error");

      expect(error.details).toBeUndefined();
    });

    it("should return same type as new HttpError", () => {
      const error1 = new HttpError(400, "CODE", "Message");
      const error2 = createHttpError(400, "CODE", "Message");

      expect(error1.constructor).toBe(error2.constructor);
    });

    it("should be functionally equivalent to new HttpError", () => {
      const error1 = new HttpError(404, "NOT_FOUND", "Missing", { id: "123" });
      const error2 = createHttpError(404, "NOT_FOUND", "Missing", {
        id: "123",
      });

      expect(error1.status).toBe(error2.status);
      expect(error1.code).toBe(error2.code);
      expect(error1.message).toBe(error2.message);
      expect(error1.details).toEqual(error2.details);
    });
  });
});
