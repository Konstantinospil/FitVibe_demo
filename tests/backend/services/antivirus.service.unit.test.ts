jest.mock("../../../apps/backend/src/config/logger.js", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const loadModule = (overrides: { enabled: boolean; production?: boolean; initFails?: boolean }) => {
  jest.resetModules();

  jest.doMock("../../../apps/backend/src/config/env.js", () => ({
    env: {
      NODE_ENV: overrides.production ? "production" : "test",
      isProduction: overrides.production ?? false,
      clamav: {
        enabled: overrides.enabled,
        devScan: false,
        host: "localhost",
        port: 3310,
        timeout: 1000,
      },
    },
  }));

  jest.doMock("clamscan", () => {
    return jest.fn().mockImplementation(() => ({
      init: jest.fn(() => {
        if (overrides.initFails) {
          throw new Error("init failed");
        }
        return Promise.resolve({
          scanStream: jest.fn().mockResolvedValue({ isInfected: false, viruses: [] }),
          getVersion: jest.fn().mockResolvedValue("ClamAV 1.2.3"),
        });
      }),
    }));
  });

  return import("../../../apps/backend/src/services/antivirus.service.js");
};

describe("antivirus.service (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null version when disabled", async () => {
    const { getVersion } = await loadModule({ enabled: false });

    const version = await getVersion();

    expect(version).toBeNull();
  });

  it("fails closed in production when scan errors occur", async () => {
    const { scanBuffer } = await loadModule({ enabled: true, production: true, initFails: true });
    const { logger } = await import("../../../apps/backend/src/config/logger.js");

    const result = await scanBuffer(Buffer.from("data"), "file.txt");

    expect(result.isInfected).toBe(true);
    expect(result.viruses).toEqual(["SCAN_ERROR"]);
    expect(logger.error).toHaveBeenCalled();
  });

  it("returns false for health check when init fails", async () => {
    const { checkHealth } = await loadModule({ enabled: true, initFails: true });
    const { logger } = await import("../../../apps/backend/src/config/logger.js");

    const result = await checkHealth();

    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalled();
  });

  it("reports version when enabled and healthy", async () => {
    const { getVersion } = await loadModule({ enabled: true });

    const version = await getVersion();

    expect(version).toBe("ClamAV 1.2.3");
  });
});
