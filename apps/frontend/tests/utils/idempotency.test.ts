import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateIdempotencyKey,
  getIdempotencyKey,
  clearIdempotencyKey,
  clearAllIdempotencyKeys,
  useIdempotencyKey,
  withIdempotency,
  useIdempotentForm,
} from "../../src/utils/idempotency";

describe("idempotency utils", () => {
  beforeEach(() => {
    clearAllIdempotencyKeys();
  });

  describe("generateIdempotencyKey", () => {
    it("should generate a UUID string", () => {
      const key = generateIdempotencyKey();
      expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it("should generate unique keys", () => {
      const key1 = generateIdempotencyKey();
      const key2 = generateIdempotencyKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe("getIdempotencyKey", () => {
    it("should return the same key for the same operation", () => {
      const key1 = getIdempotencyKey("POST", "/sessions");
      const key2 = getIdempotencyKey("POST", "/sessions");
      expect(key1).toBe(key2);
    });

    it("should return different keys for different operations", () => {
      const key1 = getIdempotencyKey("POST", "/sessions");
      const key2 = getIdempotencyKey("PUT", "/sessions");
      expect(key1).not.toBe(key2);
    });

    it("should return different keys for different paths", () => {
      const key1 = getIdempotencyKey("POST", "/sessions");
      const key2 = getIdempotencyKey("POST", "/exercises");
      expect(key1).not.toBe(key2);
    });

    it("should normalize method to uppercase", () => {
      const key1 = getIdempotencyKey("post", "/sessions");
      const key2 = getIdempotencyKey("POST", "/sessions");
      expect(key1).toBe(key2);
    });
  });

  describe("clearIdempotencyKey", () => {
    it("should clear key for specific operation", () => {
      const key1 = getIdempotencyKey("POST", "/sessions");
      clearIdempotencyKey("POST", "/sessions");
      const key2 = getIdempotencyKey("POST", "/sessions");
      expect(key2).not.toBe(key1);
    });

    it("should not affect other operations", () => {
      const key1 = getIdempotencyKey("POST", "/sessions");
      const key2 = getIdempotencyKey("PUT", "/sessions");
      clearIdempotencyKey("POST", "/sessions");
      const key3 = getIdempotencyKey("PUT", "/sessions");
      expect(key3).toBe(key2);
    });
  });

  describe("clearAllIdempotencyKeys", () => {
    it("should clear all stored keys", () => {
      const key1 = getIdempotencyKey("POST", "/sessions");
      const key2 = getIdempotencyKey("PUT", "/exercises");
      clearAllIdempotencyKeys();
      const key3 = getIdempotencyKey("POST", "/sessions");
      const key4 = getIdempotencyKey("PUT", "/exercises");
      expect(key3).not.toBe(key1);
      expect(key4).not.toBe(key2);
    });
  });

  describe("useIdempotencyKey", () => {
    it("should return key and reset function", () => {
      const { key, reset } = useIdempotencyKey("POST", "/sessions");
      expect(key).toBeDefined();
      expect(typeof reset).toBe("function");
    });

    it("should reset key when reset is called", () => {
      const { key: key1, reset } = useIdempotencyKey("POST", "/sessions");
      reset();
      const { key: key2 } = useIdempotencyKey("POST", "/sessions");
      expect(key2).not.toBe(key1);
    });
  });

  describe("withIdempotency", () => {
    it("should attach idempotency key to async function", async () => {
      const mockFn = vi.fn(async (data: any, key: string) => {
        await Promise.resolve();
        expect(key).toBeDefined();
        return { success: true };
      });

      const wrappedFn = withIdempotency(mockFn, "POST", "/sessions");
      await wrappedFn({ data: "test" });

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn.mock.calls[0][1]).toMatch(/^[0-9a-f-]+$/i);
    });

    it("should clear key after successful execution", async () => {
      const mockFn = vi.fn(async () => {
        await Promise.resolve();
        return { success: true };
      });

      const wrappedFn = withIdempotency(mockFn, "POST", "/sessions");
      const key1 = getIdempotencyKey("POST", "/sessions");
      await wrappedFn({ data: "test" });
      const key2 = getIdempotencyKey("POST", "/sessions");

      expect(key2).not.toBe(key1);
    });

    it("should use same key for retry on error", async () => {
      const mockFn = vi.fn(async () => {
        await Promise.resolve();
        throw new Error("Network error");
      });

      const wrappedFn = withIdempotency(mockFn, "POST", "/sessions");
      const key1 = getIdempotencyKey("POST", "/sessions");

      try {
        await wrappedFn({ data: "test" });
      } catch (error) {
        // Expected error
      }

      const key2 = getIdempotencyKey("POST", "/sessions");
      // Key should still be the same after error
      expect(key2).toBe(key1);
    });
  });

  describe("useIdempotentForm", () => {
    it("should return key, withKey, and reset", () => {
      const { key, withKey, reset } = useIdempotentForm("POST", "/sessions");
      expect(key).toBeDefined();
      expect(typeof withKey).toBe("function");
      expect(typeof reset).toBe("function");
    });

    it("should execute callback with key", async () => {
      const { withKey } = useIdempotentForm("POST", "/sessions");
      const mockFn = vi.fn(async (key: string) => {
        await Promise.resolve();
        expect(key).toBeDefined();
        return { success: true };
      });

      await withKey(mockFn);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should clear key after successful execution", async () => {
      const { withKey } = useIdempotentForm("POST", "/sessions");
      const key1 = getIdempotencyKey("POST", "/sessions");
      const mockFn = vi.fn(async () => {
        await Promise.resolve();
        return { success: true };
      });

      await withKey(mockFn);
      const key2 = getIdempotencyKey("POST", "/sessions");

      expect(key2).not.toBe(key1);
    });
  });
});
