/**
 * SSR Metrics tests
 * Tests SSR performance metrics tracking functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  recordSSRMetric,
  getSSRMetrics,
  getSSRStats,
  clearMetrics,
  type SSRMetrics,
} from "../../src/ssr/metrics.js";

describe("SSR Metrics", () => {
  beforeEach(() => {
    clearMetrics();
    vi.clearAllMocks();
    // Mock console.warn to avoid test output noise
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    clearMetrics();
    vi.restoreAllMocks();
  });

  describe("recordSSRMetric", () => {
    it("should record a metric", () => {
      const metric: SSRMetrics = {
        renderTime: 100,
        url: "/login",
        timestamp: Date.now(),
        cacheHit: false,
      };

      recordSSRMetric(metric);

      const metrics = getSSRMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(metric);
    });

    it("should record multiple metrics", () => {
      const metric1: SSRMetrics = {
        renderTime: 100,
        url: "/login",
        timestamp: Date.now(),
        cacheHit: false,
      };
      const metric2: SSRMetrics = {
        renderTime: 150,
        url: "/register",
        timestamp: Date.now(),
        cacheHit: true,
      };

      recordSSRMetric(metric1);
      recordSSRMetric(metric2);

      const metrics = getSSRMetrics();
      expect(metrics).toHaveLength(2);
      expect(metrics[0]).toEqual(metric1);
      expect(metrics[1]).toEqual(metric2);
    });

    it("should record metrics with errors", () => {
      const metric: SSRMetrics = {
        renderTime: 200,
        url: "/error",
        timestamp: Date.now(),
        cacheHit: false,
        error: "Render failed",
      };

      recordSSRMetric(metric);

      const metrics = getSSRMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].error).toBe("Render failed");
    });

    it("should log metrics in development mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const metric: SSRMetrics = {
        renderTime: 100,
        url: "/login",
        timestamp: Date.now(),
        cacheHit: true,
      };

      recordSSRMetric(metric);

      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("[SSR Metrics]"));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("/login"));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("100ms"));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("cache: HIT"));

      process.env.NODE_ENV = originalEnv;
    });

    it("should not log metrics in production mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const metric: SSRMetrics = {
        renderTime: 100,
        url: "/login",
        timestamp: Date.now(),
        cacheHit: false,
      };

      recordSSRMetric(metric);

      expect(console.warn).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it("should limit metrics to MAX_METRICS (1000)", () => {
      // Record 1001 metrics
      for (let i = 0; i < 1001; i++) {
        recordSSRMetric({
          renderTime: i,
          url: `/test-${i}`,
          timestamp: Date.now(),
          cacheHit: false,
        });
      }

      const metrics = getSSRMetrics();
      expect(metrics).toHaveLength(1000);
      // First metric should be removed
      expect(metrics[0].url).toBe("/test-1");
      // Last metric should be the newest
      expect(metrics[metrics.length - 1].url).toBe("/test-1000");
    });
  });

  describe("getSSRMetrics", () => {
    it("should return empty array when no metrics recorded", () => {
      const metrics = getSSRMetrics();
      expect(metrics).toEqual([]);
    });

    it("should return a copy of metrics array", () => {
      const metric: SSRMetrics = {
        renderTime: 100,
        url: "/login",
        timestamp: Date.now(),
        cacheHit: false,
      };

      recordSSRMetric(metric);

      const metrics1 = getSSRMetrics();
      const metrics2 = getSSRMetrics();

      // Should be different array instances
      expect(metrics1).not.toBe(metrics2);
      // But should have same content
      expect(metrics1).toEqual(metrics2);
    });

    it("should return all recorded metrics", () => {
      const metricsToRecord: SSRMetrics[] = [
        {
          renderTime: 100,
          url: "/login",
          timestamp: Date.now(),
          cacheHit: false,
        },
        {
          renderTime: 150,
          url: "/register",
          timestamp: Date.now(),
          cacheHit: true,
        },
        {
          renderTime: 200,
          url: "/dashboard",
          timestamp: Date.now(),
          cacheHit: false,
          error: "Timeout",
        },
      ];

      metricsToRecord.forEach((metric) => recordSSRMetric(metric));

      const metrics = getSSRMetrics();
      expect(metrics).toHaveLength(3);
      expect(metrics).toEqual(metricsToRecord);
    });
  });

  describe("getSSRStats", () => {
    it("should return zero stats when no metrics recorded", () => {
      const stats = getSSRStats();

      expect(stats).toEqual({
        total: 0,
        averageRenderTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
      });
    });

    it("should calculate average render time correctly", () => {
      recordSSRMetric({
        renderTime: 100,
        url: "/login",
        timestamp: Date.now(),
        cacheHit: false,
      });
      recordSSRMetric({
        renderTime: 200,
        url: "/register",
        timestamp: Date.now(),
        cacheHit: false,
      });
      recordSSRMetric({
        renderTime: 300,
        url: "/dashboard",
        timestamp: Date.now(),
        cacheHit: false,
      });

      const stats = getSSRStats();

      expect(stats.total).toBe(3);
      expect(stats.averageRenderTime).toBe(200); // (100 + 200 + 300) / 3
    });

    it("should calculate cache hit rate correctly", () => {
      recordSSRMetric({
        renderTime: 100,
        url: "/login",
        timestamp: Date.now(),
        cacheHit: true,
      });
      recordSSRMetric({
        renderTime: 200,
        url: "/register",
        timestamp: Date.now(),
        cacheHit: true,
      });
      recordSSRMetric({
        renderTime: 300,
        url: "/dashboard",
        timestamp: Date.now(),
        cacheHit: false,
      });

      const stats = getSSRStats();

      expect(stats.total).toBe(3);
      expect(stats.cacheHitRate).toBeCloseTo(66.67, 1); // 2/3 * 100
    });

    it("should calculate error rate correctly", () => {
      recordSSRMetric({
        renderTime: 100,
        url: "/login",
        timestamp: Date.now(),
        cacheHit: false,
        error: "Timeout",
      });
      recordSSRMetric({
        renderTime: 200,
        url: "/register",
        timestamp: Date.now(),
        cacheHit: false,
        error: "Network error",
      });
      recordSSRMetric({
        renderTime: 300,
        url: "/dashboard",
        timestamp: Date.now(),
        cacheHit: false,
      });

      const stats = getSSRStats();

      expect(stats.total).toBe(3);
      expect(stats.errorRate).toBeCloseTo(66.67, 1); // 2/3 * 100
    });

    it("should calculate all stats correctly with mixed metrics", () => {
      recordSSRMetric({
        renderTime: 100,
        url: "/login",
        timestamp: Date.now(),
        cacheHit: true,
      });
      recordSSRMetric({
        renderTime: 200,
        url: "/register",
        timestamp: Date.now(),
        cacheHit: false,
        error: "Timeout",
      });
      recordSSRMetric({
        renderTime: 300,
        url: "/dashboard",
        timestamp: Date.now(),
        cacheHit: true,
      });
      recordSSRMetric({
        renderTime: 400,
        url: "/profile",
        timestamp: Date.now(),
        cacheHit: false,
      });

      const stats = getSSRStats();

      expect(stats.total).toBe(4);
      expect(stats.averageRenderTime).toBe(250); // (100 + 200 + 300 + 400) / 4
      expect(stats.cacheHitRate).toBe(50); // 2/4 * 100
      expect(stats.errorRate).toBe(25); // 1/4 * 100
    });
  });

  describe("clearMetrics", () => {
    it("should clear all metrics", () => {
      recordSSRMetric({
        renderTime: 100,
        url: "/login",
        timestamp: Date.now(),
        cacheHit: false,
      });
      recordSSRMetric({
        renderTime: 200,
        url: "/register",
        timestamp: Date.now(),
        cacheHit: false,
      });

      expect(getSSRMetrics()).toHaveLength(2);

      clearMetrics();

      expect(getSSRMetrics()).toHaveLength(0);
      expect(getSSRStats().total).toBe(0);
    });

    it("should not throw when clearing empty metrics", () => {
      clearMetrics();
      expect(() => clearMetrics()).not.toThrow();
    });
  });
});
