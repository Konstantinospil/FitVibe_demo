jest.mock("../../../apps/backend/src/config/logger.js", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const setEnv = (vars: Record<string, string | undefined>) => {
  Object.entries(vars).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
      return;
    }
    process.env[key] = value;
  });
};

describe("tracing", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("logs when OTEL is disabled", async () => {
    setEnv({ OTEL_ENABLED: "false" });

    const { initializeTracing } =
      await import("../../../apps/backend/src/observability/tracing.js");
    const { logger } = await import("../../../apps/backend/src/config/logger.js");

    initializeTracing();

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ otelEnabled: false }),
      "[tracing] OpenTelemetry API initialized (SDK disabled via OTEL_ENABLED=false)",
    );
  });

  it("starts SDK when OTEL is enabled", async () => {
    jest.doMock("@opentelemetry/api", () => ({
      diag: { setLogger: jest.fn() },
      DiagConsoleLogger: jest.fn(),
      DiagLogLevel: { DEBUG: 1, INFO: 2 },
      trace: {},
      context: {},
      propagation: {},
    }));
    const startMock = jest.fn();
    const shutdownMock = jest.fn().mockResolvedValue(undefined);
    jest.doMock("@opentelemetry/sdk-node", () => ({
      NodeSDK: jest.fn().mockImplementation(() => ({
        start: startMock,
        shutdown: shutdownMock,
      })),
    }));
    jest.doMock("@opentelemetry/auto-instrumentations-node", () => ({
      getNodeAutoInstrumentations: jest.fn().mockReturnValue([]),
    }));
    jest.doMock("@opentelemetry/exporter-trace-otlp-http", () => ({
      OTLPTraceExporter: jest.fn(),
    }));
    jest.doMock("@opentelemetry/resources", () => ({
      resourceFromAttributes: jest.fn().mockReturnValue({}),
    }));

    setEnv({ OTEL_ENABLED: "true", SERVICE_NAME: "fitvibe-backend" });

    const { initializeTracing, shutdownTracing } =
      await import("../../../apps/backend/src/observability/tracing.js");
    const { logger } = await import("../../../apps/backend/src/config/logger.js");

    initializeTracing();
    expect(startMock).toHaveBeenCalled();

    await shutdownTracing();
    expect(shutdownMock).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
  });

  it("logs shutdown errors", async () => {
    jest.doMock("@opentelemetry/api", () => ({
      diag: { setLogger: jest.fn() },
      DiagConsoleLogger: jest.fn(),
      DiagLogLevel: { DEBUG: 1, INFO: 2 },
      trace: {},
      context: {},
      propagation: {},
    }));
    const shutdownMock = jest.fn().mockRejectedValue(new Error("boom"));
    jest.doMock("@opentelemetry/sdk-node", () => ({
      NodeSDK: jest.fn().mockImplementation(() => ({
        start: jest.fn(),
        shutdown: shutdownMock,
      })),
    }));
    jest.doMock("@opentelemetry/auto-instrumentations-node", () => ({
      getNodeAutoInstrumentations: jest.fn().mockReturnValue([]),
    }));
    jest.doMock("@opentelemetry/exporter-trace-otlp-http", () => ({
      OTLPTraceExporter: jest.fn(),
    }));
    jest.doMock("@opentelemetry/resources", () => ({
      resourceFromAttributes: jest.fn().mockReturnValue({}),
    }));

    setEnv({ OTEL_ENABLED: "true" });

    const { initializeTracing, shutdownTracing } =
      await import("../../../apps/backend/src/observability/tracing.js");
    const { logger } = await import("../../../apps/backend/src/config/logger.js");

    initializeTracing();
    await shutdownTracing();

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Error) }),
      "[tracing] Error shutting down OpenTelemetry SDK",
    );
  });
});
