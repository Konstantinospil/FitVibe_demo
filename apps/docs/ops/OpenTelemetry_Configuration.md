# OpenTelemetry Configuration Guide

**Version:** 1.0
**Last Updated:** 2025-11-11
**Owner:** Observability Team

This document provides guidance for implementing and configuring OpenTelemetry distributed tracing in FitVibe.

---

## Table of Contents

- [Overview](#overview)
- [Current Status](#current-status)
- [Architecture](#architecture)
- [Implementation Steps](#implementation-steps)
- [Sampling Configuration](#sampling-configuration)
- [Dashboard Usage](#dashboard-usage)
- [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose

OpenTelemetry provides distributed tracing capabilities to:

- Track request flow across services
- Identify performance bottlenecks
- Measure span durations and dependencies
- Correlate traces with logs and metrics

### Stack Components

- **Tempo**: Trace storage backend (Grafana)
- **OpenTelemetry SDK**: Instrumentation library
- **Prometheus**: Metrics generated from traces (span metrics)
- **Grafana**: Visualization and correlation

---

## Current Status

**Implementation Status**: Partial

### Completed

- ✅ Tempo deployed in docker-compose.dev.yml
- ✅ Grafana datasource configured with Tempo
- ✅ OTel tracing dashboard created
- ✅ Metrics generator configured (span metrics → Prometheus)
- ✅ Trace correlation with logs (Loki) and metrics (Prometheus)

### Pending

- ⏳ OpenTelemetry SDK implementation in backend (`apps/backend/src/observability/tracing.ts`)
- ⏳ Auto-instrumentation for Express routes
- ⏳ Custom span creation for database queries
- ⏳ Context propagation across async operations

---

## Architecture

### Trace Flow

```
HTTP Request
    ↓
Express Middleware (OTel auto-instrument)
    ↓
Route Handler
    ↓
Service Layer (custom spans)
    ↓
Repository Layer (DB spans)
    ↓
Database Query
    ↓
Tempo (trace storage)
    ↓
Prometheus (span metrics)
    ↓
Grafana (visualization)
```

### Trace Attributes

Standard attributes to include:

- `http.method` - HTTP method (GET, POST, etc.)
- `http.route` - Route template (/api/v1/users/:id)
- `http.status_code` - Response status code
- `http.user_agent` - Client user agent
- `db.system` - Database type (postgresql)
- `db.statement` - SQL query (sanitized)
- `user.id` - Authenticated user ID (if available)
- `error` - Error flag (boolean)
- `error.message` - Error message (if error occurred)

---

## Implementation Steps

### Step 1: Install OpenTelemetry SDK

```bash
cd apps/backend
npm install --save \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

### Step 2: Implement Tracing Initialization

Update `apps/backend/src/observability/tracing.ts`:

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";

const consoleLogger = new DiagConsoleLogger();
diag.setLogger(consoleLogger, DiagLogLevel.INFO);

export function initializeTracing(): NodeSDK | null {
  // Skip tracing in test environment
  if (process.env.NODE_ENV === "test") {
    return null;
  }

  const tempoUrl = process.env.TEMPO_ENDPOINT || "http://localhost:4318/v1/traces";

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: "fitvibe-backend",
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || "1.0.0",
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || "development",
    }),
    traceExporter: new OTLPTraceExporter({
      url: tempoUrl,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable file system instrumentation (too noisy)
        "@opentelemetry/instrumentation-fs": {
          enabled: false,
        },
        // Configure HTTP instrumentation
        "@opentelemetry/instrumentation-http": {
          ignoreIncomingRequestHook: (req) => {
            // Ignore health checks and metrics
            const url = req.url || "";
            return url === "/health" || url === "/metrics";
          },
          requestHook: (span, request) => {
            // Add custom attributes
            span.setAttribute("http.client_ip", request.socket.remoteAddress || "unknown");
          },
        },
        // Configure Express instrumentation
        "@opentelemetry/instrumentation-express": {
          enabled: true,
        },
        // Configure PostgreSQL instrumentation
        "@opentelemetry/instrumentation-pg": {
          enabled: true,
          enhancedDatabaseReporting: true,
        },
      }),
    ],
  });

  sdk.start();

  // Graceful shutdown
  process.on("SIGTERM", () => {
    sdk
      .shutdown()
      .then(() => console.log("Tracing terminated"))
      .catch((error) => console.error("Error terminating tracing", error));
  });

  return sdk;
}
```

### Step 3: Initialize in Server Entry Point

Update `apps/backend/src/server.ts`:

```typescript
import { initializeTracing } from "./observability/tracing.js";

// Initialize tracing BEFORE importing the app
const tracingSdk = initializeTracing();

import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

// ... rest of server setup
```

### Step 4: Add Custom Spans (Optional)

For critical operations, add custom spans:

```typescript
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("fitvibe-backend");

async function processComplexOperation(userId: string) {
  const span = tracer.startSpan("process-complex-operation", {
    attributes: {
      "user.id": userId,
      "operation.type": "complex",
    },
  });

  try {
    // Your operation logic
    const result = await doSomething();

    span.setAttribute("operation.result", "success");
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setAttribute("error", true);
    throw error;
  } finally {
    span.end();
  }
}
```

### Step 5: Environment Configuration

Add to `.env`:

```bash
# OpenTelemetry configuration
TEMPO_ENDPOINT=http://tempo:4318/v1/traces
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # 10% sampling rate
```

---

## Sampling Configuration

### Sampling Strategies

**1. Always On (Development)**

```bash
OTEL_TRACES_SAMPLER=always_on
```

- Traces 100% of requests
- Use only in development/staging
- High overhead in production

**2. Trace ID Ratio (Production)**

```bash
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # 10%
```

- Samples a percentage of traces
- Recommended for production
- Adjust based on traffic volume

**3. Parent-Based Trace ID Ratio (Recommended)**

```bash
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # 10%
```

- Respects parent span sampling decisions
- Good for distributed systems
- Default recommendation

### Adaptive Sampling (Future)

For high-traffic production:

- Sample 100% of errors
- Sample 100% of slow requests (p99)
- Sample 1-10% of successful requests
- Requires custom sampler implementation

---

## Dashboard Usage

### Accessing the OTel Tracing Dashboard

1. Open Grafana: http://localhost:3000
2. Navigate to Dashboards → FitVibe OpenTelemetry Tracing
3. Default time range: Last 6 hours

### Key Panels

**1. Trace Rate by Route**

- Shows request volume per endpoint
- Helps identify hotspots
- Useful for capacity planning

**2. Span Duration (p95, p99)**

- Latency percentiles by route
- Identifies slow endpoints
- Triggers for optimization

**3. Slowest Spans (30m window)**

- Table of slowest operations
- Ranked by p95 duration
- Priority for performance work

**4. Error Rate by Trace**

- Errors as percentage of traces
- Broken down by span/route
- Alerts on degradation

**5. Trace Volume by Service**

- Pie chart of trace distribution
- Useful for microservices
- Single service for now (backend)

**6. Trace Sampling Rate**

- Current sampling percentage
- Gauge showing sample rate
- Verify sampling config

### Trace Exploration

**View Individual Trace:**

1. Click on any panel data point
2. Select "View Trace" from context menu
3. Explore span timeline and attributes

**Correlate with Logs:**

1. From trace view, click "Logs for this span"
2. Tempo automatically filters Loki logs by trace ID
3. See correlated log entries

**Correlate with Metrics:**

1. From trace view, click "Metrics for this span"
2. View Prometheus metrics for same time range
3. See request rate, error rate, latency

---

## Troubleshooting

### Issue: No Traces Appearing

**Symptoms:**

- Grafana shows no traces
- OTel dashboard panels empty

**Diagnosis:**

```bash
# Check Tempo is running
docker ps | grep tempo

# Check Tempo logs
docker logs fitvibe_tempo

# Verify backend is sending traces
curl http://localhost:4318/v1/traces
```

**Resolution:**

1. Verify `TEMPO_ENDPOINT` environment variable is set
2. Check Tempo configuration in `tempo-config.yml`
3. Ensure OpenTelemetry SDK is initialized before Express app
4. Check network connectivity between backend and Tempo

### Issue: High Cardinality Warning

**Symptoms:**

- Prometheus warns about high cardinality
- Slow dashboard queries
- High memory usage

**Diagnosis:**

```bash
# Check span metric cardinality
curl -s http://localhost:9090/api/v1/label/__name__/values | grep traces_spanmetrics
```

**Resolution:**

1. Reduce sampling rate (lower `OTEL_TRACES_SAMPLER_ARG`)
2. Limit span attribute cardinality (avoid UUIDs in labels)
3. Use exemplars instead of full trace metrics
4. Aggregate spans by route template, not full URL

### Issue: Missing Database Spans

**Symptoms:**

- HTTP spans appear, but no database query spans
- Incomplete trace waterfalls

**Diagnosis:**

- Check PostgreSQL instrumentation is enabled
- Verify `pg` package is being auto-instrumented

**Resolution:**

```typescript
// Ensure pg instrumentation is enabled
'@opentelemetry/instrumentation-pg': {
  enabled: true,
  enhancedDatabaseReporting: true,
},
```

### Issue: Sampling Rate Too Low

**Symptoms:**

- Few traces captured
- Missing important requests
- Dashboard shows < 1% sampling

**Resolution:**
Increase sampling rate (adjust for traffic):

```bash
# Development: 100%
OTEL_TRACES_SAMPLER_ARG=1.0

# Staging: 50%
OTEL_TRACES_SAMPLER_ARG=0.5

# Production low traffic: 10%
OTEL_TRACES_SAMPLER_ARG=0.1

# Production high traffic: 1%
OTEL_TRACES_SAMPLER_ARG=0.01
```

---

## Performance Considerations

### Overhead

OpenTelemetry adds minimal overhead when configured correctly:

| Component            | Overhead | Notes                        |
| -------------------- | -------- | ---------------------------- |
| Auto-instrumentation | 1-3%     | CPU overhead                 |
| Span creation        | < 1ms    | Per span                     |
| Exporter             | 2-5%     | Network + serialization      |
| **Total**            | **3-8%** | Acceptable for observability |

### Optimization Tips

1. **Use appropriate sampling**: Don't trace 100% in production
2. **Batch export**: Configure batch span processor (default: every 5s or 512 spans)
3. **Limit span attributes**: Only add essential attributes
4. **Avoid synchronous export**: Use async OTLP exporter
5. **Monitor exporter queue**: Alert on dropped spans

---

## References

- [OpenTelemetry JavaScript Documentation](https://opentelemetry.io/docs/instrumentation/js/)
- [Tempo Documentation](https://grafana.com/docs/tempo/latest/)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/reference/specification/trace/semantic_conventions/)
- [Grafana Tempo Best Practices](https://grafana.com/docs/tempo/latest/operations/best-practices/)
