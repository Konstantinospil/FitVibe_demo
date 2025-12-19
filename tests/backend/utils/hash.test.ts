import { sha256, newJti } from "../../../apps/backend/src/utils/hash.js";

describe("Hash Utilities", () => {
  describe("sha256", () => {
    it("should hash a string using SHA-256", () => {
      const input = "test string";
      const hash = sha256(input);

      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
      expect(hash).toMatch(/^[a-f0-9]{64}$/); // Hex string
    });

    it("should produce consistent hashes for the same input", () => {
      const input = "consistent input";
      const hash1 = sha256(input);
      const hash2 = sha256(input);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", () => {
      const hash1 = sha256("input 1");
      const hash2 = sha256("input 2");

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty strings", () => {
      const hash = sha256("");

      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(64);
    });

    it("should handle special characters", () => {
      const input = "!@#$%^&*()_+-=[]{}|;:,.<>?";
      const hash = sha256(input);

      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(64);
    });

    it("should handle unicode characters", () => {
      const input = "Hello 世界 🌍";
      const hash = sha256(input);

      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(64);
    });
  });

  describe("newJti", () => {
    it("should generate a UUID", () => {
      const jti = newJti();

      expect(typeof jti).toBe("string");
      expect(jti.length).toBe(36); // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      expect(jti).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("should generate unique UUIDs", () => {
      const jti1 = newJti();
      const jti2 = newJti();
      const jti3 = newJti();

      expect(jti1).not.toBe(jti2);
      expect(jti2).not.toBe(jti3);
      expect(jti1).not.toBe(jti3);
    });

    it("should generate valid UUID v4 format", () => {
      const jti = newJti();
      const parts = jti.split("-");

      expect(parts.length).toBe(5);
      expect(parts[0].length).toBe(8);
      expect(parts[1].length).toBe(4);
      expect(parts[2].length).toBe(4);
      expect(parts[3].length).toBe(4);
      expect(parts[4].length).toBe(12);
    });
  });
});

