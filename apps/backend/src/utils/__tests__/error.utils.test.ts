import { toError, toErrorPayload } from "../error.utils";

describe("error.utils", () => {
  describe("toError", () => {
    it("should return Error instance as-is", () => {
      const error = new Error("Test error");
      const result = toError(error);

      expect(result).toBe(error);
      expect(result.message).toBe("Test error");
    });

    it("should convert TypeError instance", () => {
      const error = new TypeError("Type error");
      const result = toError(error);

      expect(result).toBe(error);
      expect(result).toBeInstanceOf(TypeError);
      expect(result.message).toBe("Type error");
    });

    it("should convert RangeError instance", () => {
      const error = new RangeError("Range error");
      const result = toError(error);

      expect(result).toBe(error);
      expect(result).toBeInstanceOf(RangeError);
      expect(result.message).toBe("Range error");
    });

    it("should convert string to Error", () => {
      const result = toError("String error message");

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("String error message");
    });

    it("should convert empty string to Error", () => {
      const result = toError("");

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("");
    });

    it("should convert object to Error with JSON message", () => {
      const obj = { code: "ERR_001", details: "Something failed" };
      const result = toError(obj);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe(JSON.stringify(obj));
      expect(result.message).toContain("ERR_001");
      expect(result.message).toContain("Something failed");
    });

    it("should convert number to Error", () => {
      const result = toError(404);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("404");
    });

    it("should convert zero to Error", () => {
      const result = toError(0);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("0");
    });

    it("should convert boolean to Error", () => {
      const result = toError(true);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("true");
    });

    it("should convert false to Error", () => {
      const result = toError(false);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("false");
    });

    it("should convert null to Error", () => {
      const result = toError(null);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("null");
    });

    it("should convert undefined to Error", () => {
      const result = toError(undefined);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("undefined");
    });

    it("should convert array to Error with JSON message", () => {
      const arr = [1, 2, 3];
      const result = toError(arr);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe(JSON.stringify(arr));
      expect(result.message).toBe("[1,2,3]");
    });

    it("should handle nested objects", () => {
      const obj = { error: { code: "ERR", nested: { level: 2 } } };
      const result = toError(obj);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe(JSON.stringify(obj));
    });

    it("should handle object with special characters in message", () => {
      const obj = { message: 'Quote: "test"', symbol: "@#$" };
      const result = toError(obj);

      expect(result).toBeInstanceOf(Error);
      // JSON.stringify escapes quotes, so we expect \" not just "
      expect(result.message).toContain('\\"test\\"');
      expect(result.message).toContain("@#$");
    });
  });

  describe("toErrorPayload", () => {
    it("should return payload with Error instance", () => {
      const error = new Error("Test error");
      const result = toErrorPayload(error);

      expect(result).toHaveProperty("err");
      expect(result.err).toBe(error);
      expect(result).not.toHaveProperty("raw");
    });

    it("should return payload with Error and no raw for Error instances", () => {
      const error = new TypeError("Type error");
      const result = toErrorPayload(error);

      expect(result.err).toBe(error);
      expect(Object.keys(result)).toEqual(["err"]);
    });

    it("should return payload with converted Error and raw value for strings", () => {
      const result = toErrorPayload("String error");

      expect(result).toHaveProperty("err");
      expect(result.err).toBeInstanceOf(Error);
      expect((result.err as Error).message).toBe("String error");
      expect(result).toHaveProperty("raw");
      expect(result.raw).toBe("String error");
    });

    it("should return payload with converted Error and raw value for objects", () => {
      const obj = { code: "ERR_001", details: "Failed" };
      const result = toErrorPayload(obj);

      expect(result).toHaveProperty("err");
      expect(result.err).toBeInstanceOf(Error);
      expect((result.err as Error).message).toBe(JSON.stringify(obj));
      expect(result).toHaveProperty("raw");
      expect(result.raw).toBe(obj);
    });

    it("should return payload with converted Error and raw value for numbers", () => {
      const result = toErrorPayload(404);

      expect(result.err).toBeInstanceOf(Error);
      expect((result.err as Error).message).toBe("404");
      expect(result.raw).toBe(404);
    });

    it("should return payload with converted Error and raw value for null", () => {
      const result = toErrorPayload(null);

      expect(result.err).toBeInstanceOf(Error);
      expect((result.err as Error).message).toBe("null");
      expect(result.raw).toBeNull();
    });

    it("should return payload with converted Error and raw value for undefined", () => {
      const result = toErrorPayload(undefined);

      expect(result.err).toBeInstanceOf(Error);
      expect((result.err as Error).message).toBe("undefined");
      expect(result.raw).toBeUndefined();
    });

    it("should return payload with converted Error and raw value for boolean", () => {
      const result = toErrorPayload(true);

      expect(result.err).toBeInstanceOf(Error);
      expect((result.err as Error).message).toBe("true");
      expect(result.raw).toBe(true);
    });

    it("should return payload with converted Error and raw value for arrays", () => {
      const arr = [1, 2, 3];
      const result = toErrorPayload(arr);

      expect(result.err).toBeInstanceOf(Error);
      expect((result.err as Error).message).toBe("[1,2,3]");
      expect(result.raw).toBe(arr);
    });

    it("should preserve original raw value reference for objects", () => {
      const obj = { message: "test" };
      const result = toErrorPayload(obj);

      expect(result.raw).toBe(obj);
      expect(result.raw).toEqual({ message: "test" });
    });

    it("should handle complex nested objects in payload", () => {
      const complex = {
        error: { code: "ERR", details: { nested: true } },
        timestamp: 12345,
      };
      const result = toErrorPayload(complex);

      expect(result.err).toBeInstanceOf(Error);
      expect(result.raw).toBe(complex);
      expect((result.err as Error).message).toContain("ERR");
      expect((result.err as Error).message).toContain("12345");
    });
  });
});
