import {
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  type DiagLogger,
  trace,
  context,
  propagation,
} from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from "@opentelemetry/semantic-conventions";
import { logger } from "../config/logger.js";

const consoleLogger: DiagLogger = new DiagConsoleLogger();

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry tracing with full SDK integration.
 *
 * Environment variables:
 * - OTEL_ENABLED: Enable/disable tracing (default: false)
 * - OTEL_LOG_LEVEL: Diagnostic log level (debug/info/warn/error)
 * - OTEL_EXPORTER_OTLP_ENDPOINT: OTLP collector endpoint (default: http://localhost:4318/v1/traces)
 * - NODE_ENV: Deployment environment (development/production/test)
 * - SERVICE_NAME: Service name for traces (default: fitvibe-backend)
 */
export function initializeTracing(): void {
  // Set diagnostic logger level based on environment
  const logLevel = process.env.OTEL_LOG_LEVEL === "debug" ? DiagLogLevel.DEBUG : DiagLogLevel.INFO;
  diag.setLogger(consoleLogger, logLevel);

  const otelEnabled = process.env.OTEL_ENABLED === "true";

  if (!otelEnabled) {
    logger.info(
      {
        otelEnabled: false,
        propagationAPI: propagation !== undefined,
        traceAPI: trace !== undefined,
        contextAPI: context !== undefined,
      },
      "[tracing] OpenTelemetry API initialized (SDK disabled via OTEL_ENABLED=false)",
    );
    return;
  }

  try {
    // Configure resource attributes
    const resource = resourceFromAttributes({
      [SEMRESATTRS_SERVICE_NAME]: process.env.SERVICE_NAME ?? "fitvibe-backend",
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV ?? "development",
    });

    // Configure OTLP trace exporter
    const traceExporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces",
    });

    // Initialize NodeSDK with auto-instrumentations
    sdk = new NodeSDK({
      resource,
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Auto-instrument HTTP, database, and external calls
          "@opentelemetry/instrumentation-http": {
            enabled: true,
          },
          "@opentelemetry/instrumentation-express": {
            enabled: true,
          },
          "@opentelemetry/instrumentation-pg": {
            enabled: true,
          },
          "@opentelemetry/instrumentation-dns": {
            enabled: false, // Disable DNS instrumentation to reduce noise
          },
          "@opentelemetry/instrumentation-net": {
            enabled: false, // Disable net instrumentation to reduce noise
          },
        }),
      ],
    });

    // Start the SDK
    sdk.start();

    logger.info(
      {
        otelEnabled: true,
        serviceName: process.env.SERVICE_NAME ?? "fitvibe-backend",
        environment: process.env.NODE_ENV ?? "development",
        otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces",
      },
      "[tracing] OpenTelemetry SDK initialized and started",
    );
  } catch (error) {
    logger.error({ error }, "[tracing] Failed to initialize OpenTelemetry SDK");
  }
}

/**
 * Gracefully shutdown OpenTelemetry SDK
 * Should be called before process termination
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    try {
      await sdk.shutdown();
      logger.info("[tracing] OpenTelemetry SDK shutdown complete");
    } catch (error) {
      logger.error({ error }, "[tracing] Error shutting down OpenTelemetry SDK");
    }
  }
}
