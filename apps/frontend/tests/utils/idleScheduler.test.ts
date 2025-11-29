import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { scheduleIdleTask } from "../../src/utils/idleScheduler";

describe("idleScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("scheduleIdleTask", () => {
    it("should schedule task with requestIdleCallback when available", () => {
      const callback = vi.fn();
      let capturedCallback: any;
      let capturedOptions: any;

      const mockRequestIdleCallback = vi.fn((cb: any, opts?: any) => {
        capturedCallback = cb;
        capturedOptions = opts;
        return 123;
      });

      const mockCancelIdleCallback = vi.fn();

      Object.defineProperty(window, "requestIdleCallback", {
        writable: true,
        value: mockRequestIdleCallback,
      });

      Object.defineProperty(window, "cancelIdleCallback", {
        writable: true,
        value: mockCancelIdleCallback,
      });

      const { cancel } = scheduleIdleTask(callback);

      expect(mockRequestIdleCallback).toHaveBeenCalledTimes(1);
      expect(capturedOptions).toEqual({ timeout: 1200 });

      // Execute the callback
      capturedCallback({ didTimeout: false, timeRemaining: () => 16 });
      expect(callback).toHaveBeenCalledTimes(1);

      // Test cancel
      cancel();
      expect(mockCancelIdleCallback).toHaveBeenCalledWith(123);
    });

    it("should use setTimeout fallback when requestIdleCallback is not available", () => {
      const callback = vi.fn();

      Object.defineProperty(window, "requestIdleCallback", {
        writable: true,
        value: undefined,
      });

      const { cancel } = scheduleIdleTask(callback);

      // Should have scheduled with setTimeout
      expect(vi.getTimerCount()).toBe(1);

      // Fast-forward time
      vi.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalledTimes(1);

      // Test cancel
      cancel();
      expect(vi.getTimerCount()).toBe(0);
    });

    it("should use custom timeout when provided", () => {
      const callback = vi.fn();
      let capturedOptions: any;

      const mockRequestIdleCallback = vi.fn((cb: any, opts?: any) => {
        capturedOptions = opts;
        return 123;
      });

      Object.defineProperty(window, "requestIdleCallback", {
        writable: true,
        value: mockRequestIdleCallback,
      });

      scheduleIdleTask(callback, { timeout: 5000 });

      expect(capturedOptions).toEqual({ timeout: 5000 });
    });

    it("should use minimum timeout for setTimeout fallback", () => {
      const callback = vi.fn();

      Object.defineProperty(window, "requestIdleCallback", {
        writable: true,
        value: undefined,
      });

      scheduleIdleTask(callback, { timeout: 50 }); // Less than 200ms

      // Uses Math.min(timeout, 200), so 50ms should be used
      vi.advanceTimersByTime(49);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should work in SSR environment (no window)", () => {
      const originalWindow = global.window;
      // @ts-expect-error - intentionally removing window for SSR test
      delete global.window;

      const callback = vi.fn();
      const { cancel } = scheduleIdleTask(callback);

      // Should use setTimeout (not throw)
      expect(callback).not.toHaveBeenCalled();

      cancel();
      global.window = originalWindow;
    });
  });
});
