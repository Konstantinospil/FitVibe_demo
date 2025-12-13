/**
 * useCountdown hook tests
 * Tests countdown timer functionality including start, stop, reset, and edge cases
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCountdown } from "../../src/hooks/useCountdown";

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should initialize with initial seconds", () => {
    const { result } = renderHook(() => useCountdown(10));

    expect(result.current[0]).toBe(10);
    expect(result.current[1]).toBe(true); // isActive
  });

  it("should initialize as inactive when initial seconds is 0", () => {
    const { result } = renderHook(() => useCountdown(0));

    expect(result.current[0]).toBe(0);
    expect(result.current[1]).toBe(false); // isActive
  });

  it("should count down from initial seconds", () => {
    const { result } = renderHook(() => useCountdown(5));

    expect(result.current[0]).toBe(5);
    expect(result.current[1]).toBe(true);

    // Advance 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current[0]).toBe(4);

    // Advance another second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current[0]).toBe(3);
  });

  it("should stop when countdown reaches 0", () => {
    const { result } = renderHook(() => useCountdown(2));

    expect(result.current[0]).toBe(2);
    expect(result.current[1]).toBe(true);

    // Advance 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current[0]).toBe(1);

    // Advance another second to reach 0
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current[0]).toBe(0);
    expect(result.current[1]).toBe(false); // Should be inactive

    // Advance more time - should stay at 0
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current[0]).toBe(0);
    expect(result.current[1]).toBe(false);
  });

  it("should reset countdown to initial seconds", () => {
    const { result } = renderHook(() => useCountdown(5));

    // Count down a bit
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current[0]).toBe(3);

    // Reset
    act(() => {
      result.current[2](); // reset function
    });

    expect(result.current[0]).toBe(5);
    expect(result.current[1]).toBe(true);
  });

  it("should reset countdown to new seconds when provided", () => {
    const { result } = renderHook(() => useCountdown(5));

    // Count down a bit
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current[0]).toBe(3);

    // Reset with new value
    act(() => {
      result.current[2](10); // reset with 10 seconds
    });

    expect(result.current[0]).toBe(10);
    expect(result.current[1]).toBe(true);
  });

  it("should reset to inactive when reset to 0", () => {
    const { result } = renderHook(() => useCountdown(5));

    // Reset to 0
    act(() => {
      result.current[2](0);
    });

    expect(result.current[0]).toBe(0);
    expect(result.current[1]).toBe(false);
  });

  it("should continue counting after reset", () => {
    const { result } = renderHook(() => useCountdown(5));

    // Count down
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current[0]).toBe(3);

    // Reset
    act(() => {
      result.current[2]();
    });

    expect(result.current[0]).toBe(5);

    // Should continue counting
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current[0]).toBe(4);
  });

  it("should handle multiple rapid resets", () => {
    const { result } = renderHook(() => useCountdown(5));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current[0]).toBe(4);

    // Reset multiple times rapidly
    act(() => {
      result.current[2](10);
      result.current[2](15);
      result.current[2](20);
    });

    expect(result.current[0]).toBe(20);
    expect(result.current[1]).toBe(true);
  });

  it("should clear interval on unmount", () => {
    const { result, unmount } = renderHook(() => useCountdown(5));

    expect(result.current[0]).toBe(5);

    // Start counting
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current[0]).toBe(4);

    // Unmount - this should clear the interval
    act(() => {
      unmount();
    });

    // Clear all timers after unmount
    act(() => {
      vi.clearAllTimers();
    });
  });

  it("should handle countdown from 1 second", () => {
    const { result } = renderHook(() => useCountdown(1));

    expect(result.current[0]).toBe(1);
    expect(result.current[1]).toBe(true);

    // Advance 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current[0]).toBe(0);
    expect(result.current[1]).toBe(false);
  });

  it("should handle large initial seconds", () => {
    const { result } = renderHook(() => useCountdown(100));

    expect(result.current[0]).toBe(100);
    expect(result.current[1]).toBe(true);

    // Advance 10 seconds
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current[0]).toBe(90);
  });

  it("should not count down when inactive", () => {
    const { result } = renderHook(() => useCountdown(0));

    expect(result.current[0]).toBe(0);
    expect(result.current[1]).toBe(false);

    // Advance time - should stay at 0
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current[0]).toBe(0);
    expect(result.current[1]).toBe(false);
  });

  it("should handle reset while countdown is active", () => {
    const { result } = renderHook(() => useCountdown(10));

    // Start counting
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current[0]).toBe(7);

    // Reset while active
    act(() => {
      result.current[2](15);
    });

    expect(result.current[0]).toBe(15);
    expect(result.current[1]).toBe(true);

    // Should continue from new value
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current[0]).toBe(14);
  });

  it("should handle reset after countdown reaches 0", () => {
    const { result } = renderHook(() => useCountdown(2));

    // Count down to 0
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current[0]).toBe(0);
    expect(result.current[1]).toBe(false);

    // Reset after reaching 0
    act(() => {
      result.current[2](5);
    });

    expect(result.current[0]).toBe(5);
    expect(result.current[1]).toBe(true);

    // Should start counting again
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current[0]).toBe(4);
  });

  it("should handle multiple countdowns in sequence", () => {
    const { result } = renderHook(() => useCountdown(3));

    // First countdown
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current[0]).toBe(2);

    // Reset
    act(() => {
      result.current[2](3);
    });

    expect(result.current[0]).toBe(3);

    // Second countdown
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current[0]).toBe(1);
  });

  it("should handle negative reset value", () => {
    const { result } = renderHook(() => useCountdown(5));

    // Reset with negative value (edge case)
    act(() => {
      result.current[2](-1);
    });

    expect(result.current[0]).toBe(-1);
    expect(result.current[1]).toBe(false); // Should be inactive for negative
  });

  it("should handle very small time intervals", () => {
    const { result } = renderHook(() => useCountdown(2));

    // Advance by very small increments
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should still be at 2 (only counts in 1-second intervals)
    expect(result.current[0]).toBe(2);

    // Advance to 1 second
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current[0]).toBe(1);
  });
});
