import { beforeEach, describe, expect, it, vi } from "vitest";
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
    // Clear all keys before each test
    clearAllIdempotencyKeys();
  });

  describe("generateIdempotencyKey", () => {
    it("should generate a valid UUID format", () => {
      const key = generateIdempotencyKey();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(key).toMatch(uuidRegex);
    });

    it("should generate unique keys on each call", () => {
      const key1 = generateIdempotencyKey();
      const key2 = generateIdempotencyKey();
      const key3 = generateIdempotencyKey();

      expect(key1).not.toBe(key2);
      expect(key2).not.toBe(key3);
      expect(key1).not.toBe(key3);
    });

    it("should use crypto.randomUUID when available", () => {
      // Mock crypto.randomUUID
      const mockRandomUUID = vi.fn(() => "test-uuid-from-crypto");
      vi.stubGlobal("crypto", {
        randomUUID: mockRandomUUID,
      });

      const key = generateIdempotencyKey();

      expect(mockRandomUUID).toHaveBeenCalled();
      expect(key).toBe("test-uuid-from-crypto");

      // Restore original crypto
      vi.unstubAllGlobals();
    });

    it("should use fallback when crypto is not available", () => {
      // Remove crypto temporarily
      vi.stubGlobal("crypto", undefined);

      const key = generateIdempotencyKey();

      // Should still generate a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(key).toMatch(uuidRegex);

      // Restore crypto
      vi.unstubAllGlobals();
      vi.unstubAllGlobals();
    });
  });

  describe("getIdempotencyKey", () => {
    it("should return the same key for the same operation", () => {
      const key1 = getIdempotencyKey("POST", "/sessions");
      const key2 = getIdempotencyKey("POST", "/sessions");

      expect(key1).toBe(key2);
    });

    it("should return different keys for different methods", () => {
      const postKey = getIdempotencyKey("POST", "/sessions");
      const putKey = getIdempotencyKey("PUT", "/sessions");

      expect(postKey).not.toBe(putKey);
    });

    it("should return different keys for different paths", () => {
      const sessionsKey = getIdempotencyKey("POST", "/sessions");
      const plansKey = getIdempotencyKey("POST", "/plans");

      expect(sessionsKey).not.toBe(plansKey);
    });

    it("should normalize method to uppercase", () => {
      const key1 = getIdempotencyKey("post", "/sessions");
      const key2 = getIdempotencyKey("POST", "/sessions");

      expect(key1).toBe(key2);
    });

    it("should handle different HTTP methods", () => {
      const postKey = getIdempotencyKey("POST", "/sessions");
      const putKey = getIdempotencyKey("PUT", "/sessions/123");
      const patchKey = getIdempotencyKey("PATCH", "/sessions/123");
      const deleteKey = getIdempotencyKey("DELETE", "/sessions/123");

      expect(postKey).not.toBe(putKey);
      expect(putKey).not.toBe(patchKey);
      expect(patchKey).not.toBe(deleteKey);
    });
  });

  describe("clearIdempotencyKey", () => {
    it("should clear a specific idempotency key", () => {
      const key1 = getIdempotencyKey("POST", "/sessions");

      clearIdempotencyKey("POST", "/sessions");

      const key2 = getIdempotencyKey("POST", "/sessions");

      expect(key1).not.toBe(key2);
    });

    it("should not affect other keys", () => {
      const sessionsKey = getIdempotencyKey("POST", "/sessions");
      const plansKey = getIdempotencyKey("POST", "/plans");

      clearIdempotencyKey("POST", "/sessions");

      const newSessionsKey = getIdempotencyKey("POST", "/sessions");
      const samePlansKey = getIdempotencyKey("POST", "/plans");

      expect(newSessionsKey).not.toBe(sessionsKey);
      expect(samePlansKey).toBe(plansKey);
    });

    it("should normalize method to uppercase", () => {
      getIdempotencyKey("POST", "/sessions");

      clearIdempotencyKey("post", "/sessions");

      const key = getIdempotencyKey("POST", "/sessions");

      // Should be a new key since we cleared it
      expect(key).toBeDefined();
    });
  });

  describe("clearAllIdempotencyKeys", () => {
    it("should clear all stored keys", () => {
      const key1 = getIdempotencyKey("POST", "/sessions");
      const key2 = getIdempotencyKey("POST", "/plans");
      const key3 = getIdempotencyKey("PUT", "/sessions/123");

      clearAllIdempotencyKeys();

      const newKey1 = getIdempotencyKey("POST", "/sessions");
      const newKey2 = getIdempotencyKey("POST", "/plans");
      const newKey3 = getIdempotencyKey("PUT", "/sessions/123");

      expect(newKey1).not.toBe(key1);
      expect(newKey2).not.toBe(key2);
      expect(newKey3).not.toBe(key3);
    });

    it("should allow new keys to be generated after clearing", () => {
      getIdempotencyKey("POST", "/sessions");

      clearAllIdempotencyKeys();

      const newKey = getIdempotencyKey("POST", "/sessions");

      expect(newKey).toBeDefined();
      expect(typeof newKey).toBe("string");
    });
  });

  describe("useIdempotencyKey", () => {
    it("should return a key and reset function", () => {
      const result = useIdempotencyKey("POST", "/sessions");

      expect(result).toHaveProperty("key");
      expect(result).toHaveProperty("reset");
      expect(typeof result.key).toBe("string");
      expect(typeof result.reset).toBe("function");
    });

    it("should return the same key for the same operation", () => {
      const { key: key1 } = useIdempotencyKey("POST", "/sessions");
      const { key: key2 } = useIdempotencyKey("POST", "/sessions");

      expect(key1).toBe(key2);
    });

    it("should clear key when reset is called", () => {
      const { key: originalKey, reset } = useIdempotencyKey("POST", "/sessions");

      reset();

      const { key: newKey } = useIdempotencyKey("POST", "/sessions");

      expect(newKey).not.toBe(originalKey);
    });
  });

  describe("withIdempotency", () => {
    it("should call onSubmit with data and idempotency key", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const wrappedSubmit = withIdempotency(mockOnSubmit, "POST", "/sessions");

      const testData = { name: "Test Session" };
      await wrappedSubmit(testData);

      expect(mockOnSubmit).toHaveBeenCalledWith(testData, expect.any(String));
    });

    it("should clear key after successful submission", async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const wrappedSubmit = withIdempotency(mockOnSubmit, "POST", "/sessions");

      const key1 = getIdempotencyKey("POST", "/sessions");
      await wrappedSubmit({ name: "Test Session" });
      const key2 = getIdempotencyKey("POST", "/sessions");

      expect(key1).not.toBe(key2);
    });

    it("should not clear key on error", async () => {
      const mockOnSubmit = vi.fn().mockRejectedValue(new Error("API Error"));
      const wrappedSubmit = withIdempotency(mockOnSubmit, "POST", "/sessions");

      const key1 = getIdempotencyKey("POST", "/sessions");

      await expect(wrappedSubmit({ name: "Test Session" })).rejects.toThrow("API Error");

      const key2 = getIdempotencyKey("POST", "/sessions");

      expect(key1).toBe(key2);
    });

    it("should use the same key for retries after error", async () => {
      let callCount = 0;
      const mockOnSubmit = vi.fn().mockImplementation((data, key) => {
        callCount++;
        if (callCount === 1) {
          throw new Error("First attempt failed");
        }
        return key;
      });

      const wrappedSubmit = withIdempotency(mockOnSubmit, "POST", "/sessions");

      let firstKey: string | undefined;
      try {
        await wrappedSubmit({ name: "Test Session" });
      } catch {
        firstKey = mockOnSubmit.mock.calls[0][1];
      }

      // Second attempt should succeed
      await wrappedSubmit({ name: "Test Session" });
      const secondKey = mockOnSubmit.mock.calls[1][1];

      expect(firstKey).toBe(secondKey);
      expect(mockOnSubmit).toHaveBeenCalledTimes(2);
    });
  });

  describe("useIdempotentForm", () => {
    it("should return key, withKey, and reset functions", () => {
      const result = useIdempotentForm("POST", "/sessions");

      expect(result).toHaveProperty("key");
      expect(result).toHaveProperty("withKey");
      expect(result).toHaveProperty("reset");
      expect(typeof result.key).toBe("string");
      expect(typeof result.withKey).toBe("function");
      expect(typeof result.reset).toBe("function");
    });

    it("should pass key to withKey callback", async () => {
      const { key, withKey } = useIdempotentForm("POST", "/sessions");

      const mockFn = vi.fn().mockResolvedValue("success");

      await withKey(mockFn);

      expect(mockFn).toHaveBeenCalledWith(key);
    });

    it("should clear key after successful withKey execution", async () => {
      const { withKey } = useIdempotentForm("POST", "/sessions");

      const key1 = getIdempotencyKey("POST", "/sessions");

      await withKey(() => {
        return Promise.resolve("success");
      });

      const key2 = getIdempotencyKey("POST", "/sessions");

      expect(key1).not.toBe(key2);
    });

    it("should return the result from withKey callback", async () => {
      const { withKey } = useIdempotentForm("POST", "/sessions");

      const result = await withKey(() => {
        return Promise.resolve({ id: "123", name: "Test Session" });
      });

      expect(result).toEqual({ id: "123", name: "Test Session" });
    });

    it("should not clear key on error in withKey", async () => {
      const { withKey } = useIdempotentForm("POST", "/sessions");

      const key1 = getIdempotencyKey("POST", "/sessions");

      await expect(
        withKey(() => {
          throw new Error("API Error");
        }),
      ).rejects.toThrow("API Error");

      const key2 = getIdempotencyKey("POST", "/sessions");

      expect(key1).toBe(key2);
    });

    it("should allow manual reset", () => {
      const { key: originalKey, reset } = useIdempotentForm("POST", "/sessions");

      reset();

      const { key: newKey } = useIdempotentForm("POST", "/sessions");

      expect(newKey).not.toBe(originalKey);
    });
  });
});
