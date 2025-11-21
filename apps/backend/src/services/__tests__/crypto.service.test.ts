import { CryptoService } from "../crypto.service";

describe("CryptoService", () => {
  let cryptoService: CryptoService;

  beforeEach(() => {
    cryptoService = new CryptoService();
  });

  describe("generateToken", () => {
    it("creates a hexadecimal token of the expected default length", () => {
      const token = cryptoService.generateToken();

      expect(token).toHaveLength(64); // 32 bytes * 2 hex chars per byte
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it("allows customizing the number of bytes", () => {
      const token = cryptoService.generateToken(48);

      expect(token).toHaveLength(96);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe("hash", () => {
    it("returns the SHA-256 hex digest for a given string", () => {
      expect(cryptoService.hash("fitvibe")).toBe(
        "e8f5cc7526224491076c704294ca04aa1a700edc3f5ca11fb36f3fdfc175d098",
      );
    });

    it("produces different digests for different inputs", () => {
      expect(cryptoService.hash("alpha")).not.toBe(cryptoService.hash("beta"));
    });
  });
});
