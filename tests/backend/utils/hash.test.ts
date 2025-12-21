import { sha256, newJti } from "../../../apps/backend/src/utils/hash.js";

describe("hash utilities", () => {
  describe("sha256", () => {
    it("should hash a string consistently", () => {
      const input = "test string";
      const hash1 = sha256(input);
      const hash2 = sha256(input);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it("should produce different hashes for different inputs", () => {
      const hash1 = sha256("input1");
      const hash2 = sha256("input2");

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty string", () => {
      const hash = sha256("");

      expect(hash).toHaveLength(64);
      expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    });

    it("should handle special characters", () => {
      const hash = sha256("!@#$%^&*()_+-=[]{}|;:',.<>?/~`");

      expect(hash).toHaveLength(64);
      expect(typeof hash).toBe("string");
    });

    it("should handle unicode characters", () => {
      const hash = sha256("你好世界🌍");

      expect(hash).toHaveLength(64);
      expect(typeof hash).toBe("string");
    });

    it("should produce hex output", () => {
      const hash = sha256("test");

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should handle long strings", () => {
      const longString = "a".repeat(10000);
      const hash = sha256(longString);

      expect(hash).toHaveLength(64);
    });

    it("should be case sensitive", () => {
      const hash1 = sha256("Test");
      const hash2 = sha256("test");

      expect(hash1).not.toBe(hash2);
    });

    it("should handle numeric strings", () => {
      const hash = sha256("123456");

      expect(hash).toHaveLength(64);
      expect(hash).toBe("8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92");
    });

    it("should handle whitespace", () => {
      const hash1 = sha256(" ");
      const hash2 = sha256("  ");

      expect(hash1).not.toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(hash2).toHaveLength(64);
    });
  });

  describe("newJti", () => {
    it("should generate a UUID v4", () => {
      const jti = newJti();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(jti).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it("should generate unique values", () => {
      const jti1 = newJti();
      const jti2 = newJti();
      const jti3 = newJti();

      expect(jti1).not.toBe(jti2);
      expect(jti2).not.toBe(jti3);
      expect(jti1).not.toBe(jti3);
    });

    it("should always include dashes", () => {
      const jti = newJti();

      expect(jti.split("-")).toHaveLength(5);
    });

    it("should be lowercase", () => {
      const jti = newJti();

      expect(jti).toBe(jti.toLowerCase());
    });

    it("should generate 100 unique values", () => {
      const jtis = new Set<string>();

      for (let i = 0; i < 100; i++) {
        jtis.add(newJti());
      }

      expect(jtis.size).toBe(100);
    });

    it("should have correct length (36 characters with dashes)", () => {
      const jti = newJti();

      expect(jti).toHaveLength(36);
    });
  });
});
