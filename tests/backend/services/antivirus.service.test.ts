import {
  scanBuffer,
  checkHealth,
  getVersion,
} from "../../../apps/backend/src/services/antivirus.service.js";
import { env } from "../../../apps/backend/src/config/env.js";
import { logger } from "../../../apps/backend/src/config/logger.js";
import NodeClam from "clamscan";

// Mock dependencies
jest.mock("clamscan");
jest.mock("../../../apps/backend/src/config/env.js", () => ({
  env: {
    clamav: {
      enabled: true,
      host: "localhost",
      port: 3310,
      timeout: 5000,
    },
    isProduction: false,
    NODE_ENV: "test",
  },
}));

jest.mock("../../../apps/backend/src/config/logger.js", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockNodeClam = jest.mocked(NodeClam);

describe("Antivirus Service", () => {
  let mockScanner: {
    scanStream: jest.Mock;
    getVersion: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockScanner = {
      scanStream: jest.fn(),
      getVersion: jest.fn(),
    };

    // Mock NodeClam constructor and init
    (NodeClam as jest.Mock).mockImplementation(() => ({
      init: jest.fn().mockResolvedValue(mockScanner),
    }));
  });

  describe("scanBuffer", () => {
    it("should return clean result when scanning is disabled", async () => {
      const originalEnabled = env.clamav.enabled;
      (env.clamav as { enabled: boolean }).enabled = false;

      try {
        const buffer = Buffer.from("test content");
        const result = await scanBuffer(buffer, "test.jpg");

        expect(result.isInfected).toBe(false);
        expect(result.viruses).toEqual([]);
        expect(result.scannedAt).toBeInstanceOf(Date);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          { filename: "test.jpg" },
          "[antivirus] Scanning disabled - skipping malware check (DEVELOPMENT ONLY)",
        );
      } finally {
        (env.clamav as { enabled: boolean }).enabled = originalEnabled;
      }
    });

    it("should scan buffer and return clean result", async () => {
      const buffer = Buffer.from("clean content");
      mockScanner.scanStream.mockResolvedValue({
        isInfected: false,
        viruses: null,
      });

      const result = await scanBuffer(buffer, "test.jpg");

      expect(result.isInfected).toBe(false);
      expect(result.viruses).toEqual([]);
      expect(mockScanner.scanStream).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it("should detect malware and return infected result", async () => {
      const buffer = Buffer.from("infected content");
      mockScanner.scanStream.mockResolvedValue({
        isInfected: true,
        viruses: ["Test.Virus"],
      });

      const result = await scanBuffer(buffer, "malware.jpg");

      expect(result.isInfected).toBe(true);
      expect(result.viruses).toEqual(["Test.Virus"]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: "malware.jpg",
          viruses: ["Test.Virus"],
        }),
        "[antivirus] MALWARE DETECTED",
      );
    });

    it("should handle scan errors in development mode", async () => {
      const buffer = Buffer.from("test content");
      const scanError = new Error("Scan failed");
      mockScanner.scanStream.mockRejectedValue(scanError);

      const result = await scanBuffer(buffer, "test.jpg");

      expect(result.isInfected).toBe(false); // Fail-open in development
      expect(result.viruses).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "[antivirus] Scan error in development - allowing upload",
      );
    });

    it("should fail-closed in production mode", async () => {
      const originalIsProduction = env.isProduction;
      (env as { isProduction: boolean }).isProduction = true;

      try {
        const buffer = Buffer.from("test content");
        const scanError = new Error("Scan failed");
        mockScanner.scanStream.mockRejectedValue(scanError);

        const result = await scanBuffer(buffer, "test.jpg");

        expect(result.isInfected).toBe(true); // Fail-closed in production
        expect(result.viruses).toEqual(["SCAN_ERROR"]);
        expect(mockLogger.error).toHaveBeenCalled();
      } finally {
        (env as { isProduction: boolean }).isProduction = originalIsProduction;
      }
    });

    it("should handle empty viruses array", async () => {
      const buffer = Buffer.from("test content");
      mockScanner.scanStream.mockResolvedValue({
        isInfected: false,
        viruses: [],
      });

      const result = await scanBuffer(buffer, "test.jpg");

      expect(result.isInfected).toBe(false);
      expect(result.viruses).toEqual([]);
    });
  });

  describe("checkHealth", () => {
    it("should return true when scanning is disabled", async () => {
      const originalEnabled = env.clamav.enabled;
      (env.clamav as { enabled: boolean }).enabled = false;

      try {
        const result = await checkHealth();
        expect(result).toBe(true);
      } finally {
        (env.clamav as { enabled: boolean }).enabled = originalEnabled;
      }
    });

    it("should return true when health check succeeds", async () => {
      mockScanner.getVersion.mockResolvedValue("ClamAV 1.0.0");

      const result = await checkHealth();

      expect(result).toBe(true);
      expect(mockScanner.getVersion).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it("should return false when health check fails", async () => {
      const error = new Error("Connection failed");
      mockScanner.getVersion.mockRejectedValue(error);

      const result = await checkHealth();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        { err: error },
        "[antivirus] Health check failed",
      );
    });
  });

  describe("getVersion", () => {
    it("should return null when scanning is disabled", async () => {
      const originalEnabled = env.clamav.enabled;
      (env.clamav as { enabled: boolean }).enabled = false;

      try {
        const result = await getVersion();
        expect(result).toBeNull();
      } finally {
        (env.clamav as { enabled: boolean }).enabled = originalEnabled;
      }
    });

    it("should return version when available", async () => {
      mockScanner.getVersion.mockResolvedValue("ClamAV 1.0.0");

      const result = await getVersion();

      expect(result).toBe("ClamAV 1.0.0");
      expect(mockScanner.getVersion).toHaveBeenCalled();
    });

    it("should return null when version check fails", async () => {
      const error = new Error("Version check failed");
      mockScanner.getVersion.mockRejectedValue(error);

      const result = await getVersion();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        { err: error },
        "[antivirus] Failed to get version",
      );
    });
  });
});
