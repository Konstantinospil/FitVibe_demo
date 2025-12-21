/**
 * Tests for Antivirus Scanning Service (B-USR-5)
 *
 * Uses EICAR test file - a standard antivirus test file that is NOT actual malware.
 * All antivirus software recognizes it as a test virus.
 *
 * @see https://www.eicar.org/download-anti-malware-testfile/
 */

import { scanBuffer, checkHealth } from "../../../apps/backend/src/services/antivirus.service.js";
import { env } from "../../../apps/backend/src/config/env.js";

type Mutable<T> = { -readonly [P in keyof T]: Mutable<T[P]> };
const mutableEnv = env as Mutable<typeof env>;

function setClamavConfig(config: typeof env.clamav) {
  mutableEnv.clamav = config;
}

// EICAR test string - recognized by all AV software as a test virus
// This is NOT real malware, it's a standard test file
const EICAR_TEST_STRING = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

const DISABLED_CLAMAV_CONFIG = {
  enabled: false as const,
  host: "localhost",
  port: 3310,
  timeout: 60000,
};

const ENABLED_CLAMAV_CONFIG = {
  enabled: true as const,
  host: "localhost",
  port: 3310,
  timeout: 60000,
};

describe("Antivirus Service (B-USR-5)", () => {
  describe("when ClamAV is disabled", () => {
    beforeEach(() => {
      // Mock env to disable ClamAV
      setClamavConfig(DISABLED_CLAMAV_CONFIG);
    });

    it("should return clean result without scanning", async () => {
      const cleanFile = Buffer.from("This is a clean file");

      const result = await scanBuffer(cleanFile, "test.txt");

      expect(result.isInfected).toBe(false);
      expect(result.viruses).toEqual([]);
      expect(result.scannedAt).toBeInstanceOf(Date);
    });

    it("should skip EICAR test file when scanning is disabled", async () => {
      const eicarFile = Buffer.from(EICAR_TEST_STRING);

      const result = await scanBuffer(eicarFile, "eicar.txt");

      // When disabled, it should NOT detect malware (dev mode)
      expect(result.isInfected).toBe(false);
    });
  });

  describe("when ClamAV is enabled", () => {
    let clamavAvailable = false;

    beforeAll(async () => {
      // Check if ClamAV is running
      setClamavConfig(ENABLED_CLAMAV_CONFIG);
      clamavAvailable = await checkHealth();
    });

    beforeEach(() => {
      if (!clamavAvailable) {
        return;
      }
      setClamavConfig(ENABLED_CLAMAV_CONFIG);
    });

    // Note: These tests require ClamAV to be running
    // Skip in CI if ClamAV is not available

    it("should detect EICAR test file as malware", async () => {
      if (!clamavAvailable) {
        return;
      }

      const eicarFile = Buffer.from(EICAR_TEST_STRING);

      const result = await scanBuffer(eicarFile, "eicar.txt");

      expect(result.isInfected).toBe(true);
      expect(result.viruses.some((signature) => /eicar/i.test(signature))).toBe(true);
    }, 10000); // 10 second timeout

    it("should pass clean files", async () => {
      if (!clamavAvailable) {
        return;
      }

      const cleanFile = Buffer.from("This is a clean text file");

      const result = await scanBuffer(cleanFile, "clean.txt");

      expect(result.isInfected).toBe(false);
      expect(result.viruses).toEqual([]);
    }, 10000);

    it("should include scan timestamp", async () => {
      if (!clamavAvailable) {
        return;
      }

      const testFile = Buffer.from("test data");
      const beforeScan = new Date();

      const result = await scanBuffer(testFile, "test.txt");

      const afterScan = new Date();
      expect(result.scannedAt.getTime()).toBeGreaterThanOrEqual(beforeScan.getTime());
      expect(result.scannedAt.getTime()).toBeLessThanOrEqual(afterScan.getTime());
    });
  });

  describe("checkHealth", () => {
    it("should return true when ClamAV is disabled", async () => {
      setClamavConfig(DISABLED_CLAMAV_CONFIG);

      const isHealthy = await checkHealth();

      expect(isHealthy).toBe(true);
    });

    it("should check ClamAV connectivity when enabled", async () => {
      setClamavConfig(ENABLED_CLAMAV_CONFIG);

      try {
        const isHealthy = await checkHealth();
        // If ClamAV is running, should be true
        // If not running, will be false (not an error)
        expect(typeof isHealthy).toBe("boolean");
      } catch {
        // Connection error is acceptable in tests
        console.warn("[test] ClamAV health check failed - service may not be running");
      }
    }, 10000);
  });

  describe("error handling", () => {
    it("should handle scan errors gracefully", async () => {
      setClamavConfig({
        enabled: true,
        host: "invalid-host",
        port: 9999,
        timeout: 1000,
      });

      const testFile = Buffer.from("test");

      const result = await scanBuffer(testFile, "test.txt");

      // In non-production, should fail-open
      // In production, should fail-closed (treated as infected)
      expect(result).toHaveProperty("isInfected");
      expect(result).toHaveProperty("viruses");
      expect(result).toHaveProperty("scannedAt");
    }, 5000);
  });
});
