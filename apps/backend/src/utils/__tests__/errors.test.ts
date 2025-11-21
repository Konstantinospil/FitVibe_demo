import { normalizeError } from "../errors";

describe("errors utilities", () => {
  describe("normalizeError", () => {
    it("should normalize Error instances with all properties", () => {
      const error = new Error("Test error message");
      error.name = "TestError";

      const result = normalizeError(error);

      expect(result.message).toBe("Test error message");
      expect(result.name).toBe("TestError");
      expect(result.stack).toBeDefined();
    });

    it("should normalize Error instances without custom name", () => {
      const error = new Error("Simple error");

      const result = normalizeError(error);

      expect(result.message).toBe("Simple error");
      expect(result.name).toBe("Error");
      expect(result.stack).toBeDefined();
    });

    it("should normalize string errors", () => {
      const result = normalizeError("String error message");

      expect(result.message).toBe("String error message");
      expect(result.name).toBeUndefined();
      expect(result.stack).toBeUndefined();
    });

    it("should normalize empty string errors", () => {
      const result = normalizeError("");

      expect(result.message).toBe("");
      expect(result.name).toBeUndefined();
      expect(result.stack).toBeUndefined();
    });

    it("should normalize object errors by stringifying", () => {
      const errorObj = { code: "ERR_001", details: "Something went wrong" };

      const result = normalizeError(errorObj);

      expect(result.message).toBe(JSON.stringify(errorObj));
      expect(result.name).toBeUndefined();
      expect(result.stack).toBeUndefined();
    });

    it("should normalize number errors", () => {
      const result = normalizeError(404);

      expect(result.message).toBe("404");
      expect(result.name).toBeUndefined();
      expect(result.stack).toBeUndefined();
    });

    it("should normalize boolean errors", () => {
      const result = normalizeError(true);

      expect(result.message).toBe("true");
      expect(result.name).toBeUndefined();
      expect(result.stack).toBeUndefined();
    });

    it("should normalize null errors", () => {
      const result = normalizeError(null);

      expect(result.message).toBe("null");
      expect(result.name).toBeUndefined();
      expect(result.stack).toBeUndefined();
    });

    it("should normalize undefined errors", () => {
      const result = normalizeError(undefined);

      // JSON.stringify(undefined) returns undefined, which is then used as the message
      expect(result.message).toBeUndefined();
      expect(result.name).toBeUndefined();
      expect(result.stack).toBeUndefined();
    });

    it("should normalize circular object errors by using String fallback", () => {
      const circular: any = { name: "circular" };

      circular.self = circular;

      const result = normalizeError(circular);

      // When JSON.stringify fails on circular reference, it falls back to String(err)
      expect(result.message).toBe("[object Object]");
      expect(result.name).toBeUndefined();
      expect(result.stack).toBeUndefined();
    });

    it("should normalize array errors", () => {
      const result = normalizeError([1, 2, 3]);

      expect(result.message).toBe("[1,2,3]");
      expect(result.name).toBeUndefined();
      expect(result.stack).toBeUndefined();
    });

    it("should handle TypeError instances", () => {
      const error = new TypeError("Type error occurred");

      const result = normalizeError(error);

      expect(result.message).toBe("Type error occurred");
      expect(result.name).toBe("TypeError");
      expect(result.stack).toBeDefined();
    });

    it("should handle RangeError instances", () => {
      const error = new RangeError("Range error occurred");

      const result = normalizeError(error);

      expect(result.message).toBe("Range error occurred");
      expect(result.name).toBe("RangeError");
      expect(result.stack).toBeDefined();
    });

    it("should preserve custom error properties in message", () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }

      const error = new CustomError("Custom error occurred");
      const result = normalizeError(error);

      expect(result.message).toBe("Custom error occurred");
      expect(result.name).toBe("CustomError");
      expect(result.stack).toBeDefined();
    });
  });
});
