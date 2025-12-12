/**
 * SSR Performance Metrics
 * Tracks SSR render times and performance metrics
 */

interface SSRMetrics {
  renderTime: number;
  url: string;
  timestamp: number;
  cacheHit: boolean;
  error?: string;
}

// In-memory metrics store (in production, this would be sent to a monitoring service)
const metrics: SSRMetrics[] = [];
const MAX_METRICS = 1000; // Keep last 1000 metrics in memory

/**
 * Records SSR render metrics
 */
export function recordSSRMetric(metric: SSRMetrics): void {
  metrics.push(metric);
  // Keep only the last MAX_METRICS entries
  if (metrics.length > MAX_METRICS) {
    metrics.shift();
  }

  // Log metrics in development
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[SSR Metrics] ${metric.url}: ${metric.renderTime}ms (cache: ${metric.cacheHit ? "HIT" : "MISS"})`,
    );
  }
}

/**
 * Gets recent SSR metrics
 */
export function getSSRMetrics(): SSRMetrics[] {
  return [...metrics];
}

/**
 * Gets SSR performance statistics
 */
export function getSSRStats(): {
  total: number;
  averageRenderTime: number;
  cacheHitRate: number;
  errorRate: number;
} {
  if (metrics.length === 0) {
    return {
      total: 0,
      averageRenderTime: 0,
      cacheHitRate: 0,
      errorRate: 0,
    };
  }

  const total = metrics.length;
  const totalRenderTime = metrics.reduce((sum, m) => sum + m.renderTime, 0);
  const cacheHits = metrics.filter((m) => m.cacheHit).length;
  const errors = metrics.filter((m) => m.error).length;

  return {
    total,
    averageRenderTime: totalRenderTime / total,
    cacheHitRate: (cacheHits / total) * 100,
    errorRate: (errors / total) * 100,
  };
}

/**
 * Clears all metrics
 */
export function clearMetrics(): void {
  metrics.length = 0;
}
