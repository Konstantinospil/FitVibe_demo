/**
 * Unit tests for OpenTelemetry tracing initialization
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { initializeTracing, shutdownTracing } from "../tracing.js";
import { logger } from "../../config/logger.js";
import { diag } from "@opentelemetry/api";

// Mock dependencies
jest.mock("../../config/logger.js", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

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
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("initializeTracing", () => {
    it("should skip SDK initialization when OTEL_ENABLED is not 'true'", () => {
      process.env.OTEL_ENABLED = "false";

      initializeTracing();

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          otelEnabled: false,
        }),
        expect.stringContaining("[tracing] OpenTelemetry API initialized"),
      );
      expect(mockStart).not.toHaveBeenCalled();
    });

    it("should skip SDK initialization when OTEL_ENABLED is undefined", () => {
      delete process.env.OTEL_ENABLED;

      initializeTracing();

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          otelEnabled: false,
        }),
        expect.stringContaining("[tracing] OpenTelemetry API initialized"),
      );
      expect(mockStart).not.toHaveBeenCalled();
    });

    it("should initialize SDK when OTEL_ENABLED is 'true'", () => {
      process.env.OTEL_ENABLED = "true";
      process.env.SERVICE_NAME = "test-service";
      process.env.NODE_ENV = "test";
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4318/v1/traces";

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

    it("should use default values when environment variables are not set", () => {
      process.env.OTEL_ENABLED = "true";
      delete process.env.SERVICE_NAME;
      delete process.env.NODE_ENV;
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

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

    it("should handle initialization errors gracefully", () => {
      process.env.OTEL_ENABLED = "true";
      const mockError = new Error("SDK initialization failed");
      mockStart.mockImplementation(() => {
        throw mockError;
      });

      initializeTracing();

      expect(logger.error).toHaveBeenCalledWith(
        { error: mockError },
        "[tracing] Failed to initialize OpenTelemetry SDK",
      );
    });

    it("should set debug log level when OTEL_LOG_LEVEL is 'debug'", () => {
      process.env.OTEL_ENABLED = "true";
      process.env.OTEL_LOG_LEVEL = "debug";

      initializeTracing();

      expect(diag.setLogger).toHaveBeenCalled();
    });
  });

  describe("shutdownTracing", () => {
    it("should do nothing if SDK was not initialized", async () => {
      // Clear any previous state
      jest.resetModules();
      mockShutdown.mockClear();

      // Re-import after clearing modules to ensure fresh state
      const { shutdownTracing: freshShutdown } = await import("../tracing.js");

      await freshShutdown();

      expect(mockShutdown).not.toHaveBeenCalled();
    });

    it("should shutdown SDK if it was initialized", async () => {
      process.env.OTEL_ENABLED = "true";
      initializeTracing();

      await shutdownTracing();

      expect(mockShutdown).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith("[tracing] OpenTelemetry SDK shutdown complete");
    });

    it("should handle shutdown errors gracefully", async () => {
      process.env.OTEL_ENABLED = "true";
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
