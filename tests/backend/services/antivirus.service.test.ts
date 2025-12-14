import NodeClam from "clamscan";

// Create mutable mock objects that persist across module resets
const mockEnv = {
  clamav: {
    enabled: true,
    host: "localhost",
    port: 3310,
    timeout: 5000,
  },
  isProduction: false,
  NODE_ENV: "test" as const,
};

const mockLoggerImpl = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Mock dependencies
jest.mock("clamscan");
jest.mock("../../../apps/backend/src/config/env.js", () => ({
  env: mockEnv,
}));

jest.mock("../../../apps/backend/src/config/logger.js", () => ({
  logger: mockLoggerImpl,
}));

describe("Antivirus Service", () => {
  let mockScanner: {
    scanStream: jest.Mock;
    getVersion: jest.Mock;
  };
  let scanBuffer: typeof import("../../../apps/backend/src/services/antivirus.service.js").scanBuffer;
  let checkHealth: typeof import("../../../apps/backend/src/services/antivirus.service.js").checkHealth;
  let getVersion: typeof import("../../../apps/backend/src/services/antivirus.service.js").getVersion;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset env to defaults
    mockEnv.clamav.enabled = true;
    mockEnv.isProduction = false;
    mockEnv.NODE_ENV = "test";

    // Create fresh mock scanner for this test
    mockScanner = {
      scanStream: jest.fn(),
      getVersion: jest.fn(),
    };

    // Reset modules to clear singleton state
    jest.resetModules();

    // Re-mock NodeClam after resetModules
    // Get the mocked module and set up the implementation
    const MockedNodeClam = jest.requireMock("clamscan");
    const mockInit = jest.fn().mockResolvedValue(mockScanner);
    MockedNodeClam.mockImplementation(() => ({
      init: mockInit,
    }));

    // Import after mocks are set up
    const antivirusModule = await import("../../../apps/backend/src/services/antivirus.service.js");
    scanBuffer = antivirusModule.scanBuffer;
    checkHealth = antivirusModule.checkHealth;
    getVersion = antivirusModule.getVersion;
  });

  describe("scanBuffer", () => {
    it("should return clean result when scanning is disabled", async () => {
      const originalEnabled = mockEnv.clamav.enabled;
      mockEnv.clamav.enabled = false;

      try {
        const buffer = Buffer.from("test content");
        const result = await scanBuffer(buffer, "test.jpg");

        expect(result.isInfected).toBe(false);
        expect(result.viruses).toEqual([]);
        expect(result.scannedAt).toBeInstanceOf(Date);
        expect(mockLoggerImpl.warn).toHaveBeenCalledWith(
          { filename: "test.jpg" },
          "[antivirus] Scanning disabled - skipping malware check (DEVELOPMENT ONLY)",
        );
      } finally {
        mockEnv.clamav.enabled = originalEnabled;
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
      expect(mockLoggerImpl.debug).toHaveBeenCalled();
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
      expect(mockLoggerImpl.warn).toHaveBeenCalledWith(
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
      expect(mockLoggerImpl.error).toHaveBeenCalled();
      expect(mockLoggerImpl.warn).toHaveBeenCalledWith(
        "[antivirus] Scan error in development - allowing upload",
      );
    });

    it("should fail-closed in production mode", async () => {
      const originalIsProduction = mockEnv.isProduction;
      mockEnv.isProduction = true;

      try {
        const buffer = Buffer.from("test content");
        const scanError = new Error("Scan failed");
        mockScanner.scanStream.mockRejectedValue(scanError);

        const result = await scanBuffer(buffer, "test.jpg");

        expect(result.isInfected).toBe(true); // Fail-closed in production
        expect(result.viruses).toEqual(["SCAN_ERROR"]);
        expect(mockLoggerImpl.error).toHaveBeenCalled();
      } finally {
        mockEnv.isProduction = originalIsProduction;
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
      const originalEnabled = mockEnv.clamav.enabled;
      mockEnv.clamav.enabled = false;

      try {
        const result = await checkHealth();
        expect(result).toBe(true);
      } finally {
        mockEnv.clamav.enabled = originalEnabled;
      }
    });

    it("should return true when health check succeeds", async () => {
      mockScanner.getVersion.mockResolvedValue("ClamAV 1.0.0");

      const result = await checkHealth();

      expect(result).toBe(true);
      expect(mockScanner.getVersion).toHaveBeenCalled();
      expect(mockLoggerImpl.debug).toHaveBeenCalled();
    });

    it("should return false when health check fails", async () => {
      const error = new Error("Connection failed");
      mockScanner.getVersion.mockRejectedValue(error);

      const result = await checkHealth();

      expect(result).toBe(false);
      expect(mockLoggerImpl.error).toHaveBeenCalledWith(
        { err: error },
        "[antivirus] Health check failed",
      );
    });
  });

  describe("getVersion", () => {
    it("should return null when scanning is disabled", async () => {
      const originalEnabled = mockEnv.clamav.enabled;
      mockEnv.clamav.enabled = false;

      try {
        const result = await getVersion();
        expect(result).toBeNull();
      } finally {
        mockEnv.clamav.enabled = originalEnabled;
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
      expect(mockLoggerImpl.error).toHaveBeenCalledWith(
        { err: error },
        "[antivirus] Failed to get version",
      );
    });
  });
});
