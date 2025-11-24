import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scheduleIdleTask } from "../../src/utils/idleScheduler";

describe("idleScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should use requestIdleCallback when available", () => {
    const callback = vi.fn();
    const mockRequestIdleCallback = vi.fn((cb: () => void) => {
      setTimeout(cb, 0);
      return 123;
    });
    const mockCancelIdleCallback = vi.fn();

    Object.defineProperty(window, "requestIdleCallback", {
      value: mockRequestIdleCallback,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "cancelIdleCallback", {
      value: mockCancelIdleCallback,
      writable: true,
      configurable: true,
    });

    const { cancel } = scheduleIdleTask(callback, { timeout: 1200 });

    expect(mockRequestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 1200 });

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalled();

    cancel();
    expect(mockCancelIdleCallback).toHaveBeenCalledWith(123);
  });

  it("should fallback to setTimeout when requestIdleCallback is not available", () => {
    const callback = vi.fn();

    // Remove requestIdleCallback if it exists
    const originalRequestIdleCallback = (window as any).requestIdleCallback;
    const originalCancelIdleCallback = (window as any).cancelIdleCallback;
    delete (window as any).requestIdleCallback;
    delete (window as any).cancelIdleCallback;

    const { cancel } = scheduleIdleTask(callback, { timeout: 1200 });

    // Should use setTimeout with min(1200, 200) = 200
    vi.advanceTimersByTime(199);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalled();

    cancel();

    // Restore if they existed
    if (originalRequestIdleCallback) {
      (window as any).requestIdleCallback = originalRequestIdleCallback;
    }
    if (originalCancelIdleCallback) {
      (window as any).cancelIdleCallback = originalCancelIdleCallback;
    }
  });

  it("should use default timeout of 1200ms when not specified", () => {
    const callback = vi.fn();
    const mockRequestIdleCallback = vi.fn((cb: () => void) => {
      setTimeout(cb, 0);
      return 123;
    });

    Object.defineProperty(window, "requestIdleCallback", {
      value: mockRequestIdleCallback,
      writable: true,
      configurable: true,
    });

    scheduleIdleTask(callback);

    expect(mockRequestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 1200 });
  });

  it("should work in non-browser environment (SSR)", () => {
    const originalWindow = global.window;
    // @ts-expect-error - intentionally removing window for SSR test
    delete global.window;

    const callback = vi.fn();
    const { cancel } = scheduleIdleTask(callback, { timeout: 500 });

    // Should use setTimeout with the provided timeout
    vi.advanceTimersByTime(499);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalled();

    cancel();

    global.window = originalWindow;
  });

  it("should cancel setTimeout when cancel is called", () => {
    const callback = vi.fn();
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    // Remove requestIdleCallback
    const originalRequestIdleCallback = (window as any).requestIdleCallback;
    delete (window as any).requestIdleCallback;

    const { cancel } = scheduleIdleTask(callback, { timeout: 500 });

    cancel();

    vi.advanceTimersByTime(500);
    expect(callback).not.toHaveBeenCalled();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    if (originalRequestIdleCallback) {
      (window as any).requestIdleCallback = originalRequestIdleCallback;
    }
  });

  it("should handle timeout values correctly in setTimeout fallback", () => {
    const callback = vi.fn();

    // Remove requestIdleCallback
    const originalRequestIdleCallback = (window as any).requestIdleCallback;
    delete (window as any).requestIdleCallback;

    // Test with timeout > 200 (should use 200)
    scheduleIdleTask(callback, { timeout: 5000 });
    vi.advanceTimersByTime(200);
    expect(callback).toHaveBeenCalled();

    callback.mockClear();

    // Test with timeout < 200 (should use the provided timeout)
    scheduleIdleTask(callback, { timeout: 100 });
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalled();

    if (originalRequestIdleCallback) {
      (window as any).requestIdleCallback = originalRequestIdleCallback;
    }
  });
});
