import {
  getCurrentTermsVersion,
  isTermsVersionOutdated,
  CURRENT_TERMS_VERSION,
} from "../../../apps/backend/src/config/terms.js";

describe("Terms Configuration", () => {
  describe("getCurrentTermsVersion", () => {
    it("should return the current terms version", () => {
      const version = getCurrentTermsVersion();
      expect(version).toBe(CURRENT_TERMS_VERSION);
      expect(typeof version).toBe("string");
      expect(version.length).toBeGreaterThan(0);
    });
  });

  describe("isTermsVersionOutdated", () => {
    it("should return true when user version is null", () => {
      expect(isTermsVersionOutdated(null)).toBe(true);
    });

    it("should return true when user version is undefined", () => {
      expect(isTermsVersionOutdated(undefined)).toBe(true);
    });

    it("should return true when user version is different from current", () => {
      expect(isTermsVersionOutdated("2024-01-01")).toBe(true);
      expect(isTermsVersionOutdated("old-version")).toBe(true);
    });

    it("should return false when user version matches current", () => {
      expect(isTermsVersionOutdated(CURRENT_TERMS_VERSION)).toBe(false);
    });

    it("should return false when user version is empty string", () => {
      // Empty string is treated as a version, so it should be considered outdated
      expect(isTermsVersionOutdated("")).toBe(true);
    });
  });
});
