/**
 * Unit tests for OpenTelemetry tracing initialization
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { diag } from "@opentelemetry/api";

// Mock dependencies - must be before any imports that use them
jest.mock("../../../apps/backend/src/config/logger.js", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Don't import logger or tracing functions here - import them dynamically in each test after resetModules

jest.mock("@opentelemetry/api", () => ({
  diag: {
    setLogger: jest.fn(),
  },
  DiagConsoleLogger: jest.fn(),
  DiagLogLevel: {
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
  },
  trace: {},
  context: {},
  propagation: {},
}));

// Mock NodeSDK
const mockShutdown = jest.fn().mockResolvedValue(undefined);
const mockStart = jest.fn();

jest.mock("@opentelemetry/sdk-node", () => ({
  NodeSDK: jest.fn().mockImplementation(() => ({
    start: mockStart,
    shutdown: mockShutdown,
  })),
}));

jest.mock("@opentelemetry/resources", () => ({
  Resource: jest.fn().mockImplementation((attrs: Record<string, unknown>) => attrs),
  resourceFromAttributes: jest.fn().mockImplementation((attrs: Record<string, unknown>) => attrs),
}));

jest.mock("@opentelemetry/exporter-trace-otlp-http", () => ({
  OTLPTraceExporter: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@opentelemetry/auto-instrumentations-node", () => ({
  getNodeAutoInstrumentations: jest.fn().mockReturnValue([]),
}));

describe("tracing", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockStart.mockClear();
    mockShutdown.mockClear();
    // Reset the sdk variable by re-importing the module
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("initializeTracing", () => {
    it("should skip SDK initialization when OTEL_ENABLED is not 'true'", async () => {
      process.env.OTEL_ENABLED = "false";
      const { logger } = await import("../../../apps/backend/src/config/logger.js");
      const { initializeTracing } =
        await import("../../../apps/backend/src/observability/tracing.js");

      initializeTracing();

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          otelEnabled: false,
        }),
        expect.stringContaining("[tracing] OpenTelemetry API initialized"),
      );
      expect(mockStart).not.toHaveBeenCalled();
    });

    it("should skip SDK initialization when OTEL_ENABLED is undefined", async () => {
      delete process.env.OTEL_ENABLED;
      const { logger } = await import("../../../apps/backend/src/config/logger.js");
      const { initializeTracing } =
        await import("../../../apps/backend/src/observability/tracing.js");

      initializeTracing();

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          otelEnabled: false,
        }),
        expect.stringContaining("[tracing] OpenTelemetry API initialized"),
      );
      expect(mockStart).not.toHaveBeenCalled();
    });

    it("should initialize SDK when OTEL_ENABLED is 'true'", async () => {
      process.env.OTEL_ENABLED = "true";
      process.env.SERVICE_NAME = "test-service";
      process.env.NODE_ENV = "test";
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4318/v1/traces";
      const { logger } = await import("../../../apps/backend/src/config/logger.js");
      const { initializeTracing } =
        await import("../../../apps/backend/src/observability/tracing.js");

      initializeTracing();

      expect(mockStart).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          otelEnabled: true,
          serviceName: "test-service",
          environment: "test",
        }),
        expect.stringContaining("[tracing] OpenTelemetry SDK initialized"),
      );
    });

    it("should use default values when environment variables are not set", async () => {
      process.env.OTEL_ENABLED = "true";
      delete process.env.SERVICE_NAME;
      delete process.env.NODE_ENV;
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
      const { logger } = await import("../../../apps/backend/src/config/logger.js");
      const { initializeTracing } =
        await import("../../../apps/backend/src/observability/tracing.js");

      initializeTracing();

      expect(mockStart).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceName: "fitvibe-backend",
          environment: "development",
          otlpEndpoint: "http://localhost:4318/v1/traces",
        }),
        expect.stringContaining("[tracing] OpenTelemetry SDK initialized"),
      );
    });

    it("should handle initialization errors gracefully", async () => {
      process.env.OTEL_ENABLED = "true";
      const mockError = new Error("SDK initialization failed");
      mockStart.mockImplementation(() => {
        throw mockError;
      });
      const { logger } = await import("../../../apps/backend/src/config/logger.js");
      const { initializeTracing } =
        await import("../../../apps/backend/src/observability/tracing.js");

      initializeTracing();

      expect(logger.error).toHaveBeenCalledWith(
        { error: mockError },
        "[tracing] Failed to initialize OpenTelemetry SDK",
      );
    });

    it("should set debug log level when OTEL_LOG_LEVEL is 'debug'", async () => {
      process.env.OTEL_ENABLED = "true";
      process.env.OTEL_LOG_LEVEL = "debug";
      const { diag: diagMock } = await import("@opentelemetry/api");
      const { initializeTracing } =
        await import("../../../apps/backend/src/observability/tracing.js");

      initializeTracing();

      expect(diagMock.setLogger).toHaveBeenCalled();
    });
  });

  describe("shutdownTracing", () => {
    it("should do nothing if SDK was not initialized", async () => {
      // Clear any previous state
      jest.resetModules();
      mockShutdown.mockClear();

      // Re-import after clearing modules to ensure fresh state
      const { shutdownTracing: freshShutdown } =
        await import("../../../apps/backend/src/observability/tracing.js");

      await freshShutdown();

      expect(mockShutdown).not.toHaveBeenCalled();
    });

    it("should shutdown SDK if it was initialized", async () => {
      process.env.OTEL_ENABLED = "true";
      const { logger } = await import("../../../apps/backend/src/config/logger.js");
      const { initializeTracing, shutdownTracing } =
        await import("../../../apps/backend/src/observability/tracing.js");
      initializeTracing();

      await shutdownTracing();

      expect(mockShutdown).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith("[tracing] OpenTelemetry SDK shutdown complete");
    });

    it("should handle shutdown errors gracefully", async () => {
      process.env.OTEL_ENABLED = "true";
      const { logger } = await import("../../../apps/backend/src/config/logger.js");
      const { initializeTracing, shutdownTracing } =
        await import("../../../apps/backend/src/observability/tracing.js");
      initializeTracing();

      const mockError = new Error("Shutdown failed");
      mockShutdown.mockRejectedValueOnce(mockError);

      await shutdownTracing();

      expect(logger.error).toHaveBeenCalledWith(
        { error: mockError },
        "[tracing] Error shutting down OpenTelemetry SDK",
      );
    });
  });
});
