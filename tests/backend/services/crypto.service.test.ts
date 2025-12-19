import { CryptoService } from "../../../apps/backend/src/services/crypto.service.js";

describe("Crypto Service", () => {
  let cryptoService: CryptoService;

  beforeEach(() => {
    cryptoService = new CryptoService();
  });

  describe("generateToken", () => {
    it("should generate a token", () => {
      const token = cryptoService.generateToken();

      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should generate tokens of different lengths", () => {
      const token16 = cryptoService.generateToken(16);
      const token32 = cryptoService.generateToken(32);

      expect(token16.length).toBe(32); // 16 bytes = 32 hex chars
      expect(token32.length).toBe(64); // 32 bytes = 64 hex chars
    });
  });

  describe("hash", () => {
    it("should hash a value", () => {
      const value = "test-value";
      const hash = cryptoService.hash(value);

      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex chars
    });

    it("should produce consistent hashes", () => {
      const value = "test-value";
      const hash1 = cryptoService.hash(value);
      const hash2 = cryptoService.hash(value);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different values", () => {
      const hash1 = cryptoService.hash("value1");
      const hash2 = cryptoService.hash("value2");

      expect(hash1).not.toBe(hash2);
    });
  });
});

