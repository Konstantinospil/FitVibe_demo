import { logger } from "../../../apps/backend/src/config/logger.js";

// Mock OpenTelemetry modules
const mockSDKInstance = {
  start: jest.fn(),
  shutdown: jest.fn().mockResolvedValue(undefined),
};

jest.mock("@opentelemetry/api", () => {
  const mockDiag = {
    setLogger: jest.fn(),
  };
  return {
    diag: mockDiag,
    DiagConsoleLogger: jest.fn(),
    DiagLogLevel: {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
    },
    trace: {},
    context: {},
    propagation: {},
  };
});

jest.mock("@opentelemetry/sdk-node", () => ({
  NodeSDK: jest.fn().mockImplementation(() => mockSDKInstance),
}));

jest.mock("@opentelemetry/auto-instrumentations-node", () => ({
  getNodeAutoInstrumentations: jest.fn().mockReturnValue([]),
}));

jest.mock("@opentelemetry/exporter-trace-otlp-http", () => ({
  OTLPTraceExporter: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@opentelemetry/resources", () => ({
  resourceFromAttributes: jest.fn().mockReturnValue({}),
}));

// Mock logger
jest.mock("../../../apps/backend/src/config/logger.js", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockLogger = jest.mocked(logger);

describe("Tracing", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockSDKInstance.shutdown.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("initializeTracing", () => {
    it("should initialize with OTEL_ENABLED=false", async () => {
      process.env.OTEL_ENABLED = "false";
      const { initializeTracing } =
        await import("../../../apps/backend/src/observability/tracing.js");

      initializeTracing();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          otelEnabled: false,
        }),
        "[tracing] OpenTelemetry API initialized (SDK disabled via OTEL_ENABLED=false)",
      );
    });

    it("should initialize with OTEL_ENABLED=true", async () => {
      process.env.OTEL_ENABLED = "true";
      process.env.SERVICE_NAME = "test-service";
      process.env.NODE_ENV = "test";
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://test:4318/v1/traces";
      const { initializeTracing } =
        await import("../../../apps/backend/src/observability/tracing.js");

      initializeTracing();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          otelEnabled: true,
          serviceName: "test-service",
          environment: "test",
          otlpEndpoint: "http://test:4318/v1/traces",
        }),
        "[tracing] OpenTelemetry SDK initialized and started",
      );
      expect(mockSDKInstance.start).toHaveBeenCalled();
    });

    it("should use default values when env vars are not set", async () => {
      process.env.OTEL_ENABLED = "true";
      delete process.env.SERVICE_NAME;
      delete process.env.NODE_ENV;
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
      const { initializeTracing } =
        await import("../../../apps/backend/src/observability/tracing.js");

      initializeTracing();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceName: "fitvibe-backend",
          environment: "development",
          otlpEndpoint: "http://localhost:4318/v1/traces",
        }),
        "[tracing] OpenTelemetry SDK initialized and started",
      );
    });

    it("should set debug log level when OTEL_LOG_LEVEL=debug", async () => {
      process.env.OTEL_ENABLED = "false";
      process.env.OTEL_LOG_LEVEL = "debug";
      const { diag, DiagLogLevel } = await import("@opentelemetry/api");
      const { initializeTracing } =
        await import("../../../apps/backend/src/observability/tracing.js");

      initializeTracing();

      expect(diag.setLogger).toHaveBeenCalledWith(expect.any(Object), DiagLogLevel.DEBUG);
    });

    it("should handle initialization errors gracefully", async () => {
      process.env.OTEL_ENABLED = "true";
      const { NodeSDK } = await import("@opentelemetry/sdk-node");
      NodeSDK.mockImplementationOnce(() => {
        throw new Error("SDK initialization failed");
      });
      const { initializeTracing } =
        await import("../../../apps/backend/src/observability/tracing.js");

      initializeTracing();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
        }),
        "[tracing] Failed to initialize OpenTelemetry SDK",
      );
    });
  });

  describe("shutdownTracing", () => {
    it("should shutdown SDK if initialized", async () => {
      process.env.OTEL_ENABLED = "true";
      const { initializeTracing, shutdownTracing } =
        await import("../../../apps/backend/src/observability/tracing.js");

      initializeTracing();
      await shutdownTracing();

      expect(mockSDKInstance.shutdown).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith("[tracing] OpenTelemetry SDK shutdown complete");
    });

    it("should handle shutdown errors gracefully", async () => {
      process.env.OTEL_ENABLED = "true";
      mockSDKInstance.shutdown.mockRejectedValueOnce(new Error("Shutdown failed"));
      const { initializeTracing, shutdownTracing } =
        await import("../../../apps/backend/src/observability/tracing.js");

      initializeTracing();
      await shutdownTracing();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
        }),
        "[tracing] Error shutting down OpenTelemetry SDK",
      );
    });

    it("should not throw if SDK was not initialized", async () => {
      process.env.OTEL_ENABLED = "false";
      const { initializeTracing, shutdownTracing } =
        await import("../../../apps/backend/src/observability/tracing.js");

      initializeTracing();
      await expect(shutdownTracing()).resolves.toBeUndefined();
      // SDK might be created but not started when OTEL_ENABLED=false
      // The important thing is that shutdown doesn't throw
    });
  });
});
