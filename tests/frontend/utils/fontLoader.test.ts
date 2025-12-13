/**
 * Font Loader tests
 * Tests asynchronous font loading functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadFontsAsync } from "../../src/utils/fontLoader.js";

describe("fontLoader", () => {
  let originalRequestIdleCallback: typeof window.requestIdleCallback | undefined;
  let originalRequestAnimationFrame: typeof window.requestAnimationFrame;

  beforeEach(() => {
    vi.useFakeTimers();
    // Remove any existing async-fonts style element
    const existingStyle = document.getElementById("async-fonts");
    if (existingStyle) {
      existingStyle.remove();
    }
    // Remove fonts-loaded class from body
    document.body.classList.remove("fonts-loaded");

    // Store original functions
    originalRequestIdleCallback = window.requestIdleCallback;
    originalRequestAnimationFrame = window.requestAnimationFrame;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    // Clean up
    const existingStyle = document.getElementById("async-fonts");
    if (existingStyle) {
      existingStyle.remove();
    }
    document.body.classList.remove("fonts-loaded");

    // Restore original functions
    if (originalRequestIdleCallback) {
      window.requestIdleCallback = originalRequestIdleCallback;
    }
    window.requestAnimationFrame = originalRequestAnimationFrame;
  });

  it("should return early when window is undefined (SSR)", () => {
    const originalWindow = global.window;
    // @ts-expect-error - intentionally setting window to undefined for SSR test
    global.window = undefined;

    try {
      expect(() => loadFontsAsync()).not.toThrow();
      // Should not create any style elements
      expect(document.getElementById("async-fonts")).toBeNull();
    } finally {
      global.window = originalWindow;
    }
  });

  it("should use requestIdleCallback when available", () => {
    const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 16.67 }), 0);
      return 1;
    });

    // @ts-expect-error - requestIdleCallback may not exist in all environments
    window.requestIdleCallback = mockRequestIdleCallback;

    loadFontsAsync();

    expect(mockRequestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 3000 });

    // Fast-forward timers to trigger the callback
    vi.advanceTimersByTime(1);

    // Check that font styles were injected
    const styleElement = document.getElementById("async-fonts");
    expect(styleElement).toBeInTheDocument();
    expect(styleElement?.tagName).toBe("STYLE");
    expect(styleElement?.textContent).toContain("@font-face");
    expect(styleElement?.textContent).toContain('font-family: "Inter"');
    expect(styleElement?.textContent).toContain('font-family: "Roboto Flex"');
  });

  it("should fallback to setTimeout when requestIdleCallback is not available", () => {
    // Remove requestIdleCallback
    // @ts-expect-error - intentionally removing requestIdleCallback
    delete window.requestIdleCallback;

    loadFontsAsync();

    // Should not call requestIdleCallback
    // @ts-expect-error - requestIdleCallback may not exist
    expect(window.requestIdleCallback).toBeUndefined();

    // Fast-forward 2000ms (setTimeout delay)
    vi.advanceTimersByTime(2000);

    // Check that font styles were injected
    const styleElement = document.getElementById("async-fonts");
    expect(styleElement).toBeInTheDocument();
    expect(styleElement?.textContent).toContain("@font-face");
  });

  it("should not inject fonts if already loaded", () => {
    const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 16.67 }), 0);
      return 1;
    });

    // @ts-expect-error - requestIdleCallback may not exist in all environments
    window.requestIdleCallback = mockRequestIdleCallback;

    // First call
    loadFontsAsync();
    vi.advanceTimersByTime(1);

    const firstStyleElement = document.getElementById("async-fonts");
    expect(firstStyleElement).toBeInTheDocument();

    // Second call - should not inject again
    loadFontsAsync();
    vi.advanceTimersByTime(1);

    const styleElements = document.querySelectorAll("#async-fonts");
    expect(styleElements).toHaveLength(1);
  });

  it("should add fonts-loaded class to body after injection", () => {
    const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 16.67 }), 0);
      return 1;
    });

    // @ts-expect-error - requestIdleCallback may not exist in all environments
    window.requestIdleCallback = mockRequestIdleCallback;

    const mockRequestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      setTimeout(callback, 0);
      return 1;
    });
    window.requestAnimationFrame = mockRequestAnimationFrame;

    loadFontsAsync();
    vi.advanceTimersByTime(1);

    // requestAnimationFrame should be called
    expect(mockRequestAnimationFrame).toHaveBeenCalled();

    // Fast-forward to trigger requestAnimationFrame callback
    vi.advanceTimersByTime(1);

    expect(document.body.classList.contains("fonts-loaded")).toBe(true);
  });

  it("should inject font-face rules for Inter font", () => {
    const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 16.67 }), 0);
      return 1;
    });

    // @ts-expect-error - requestIdleCallback may not exist in all environments
    window.requestIdleCallback = mockRequestIdleCallback;

    loadFontsAsync();
    vi.advanceTimersByTime(1);

    const styleElement = document.getElementById("async-fonts");
    expect(styleElement?.textContent).toContain('font-family: "Inter"');
    expect(styleElement?.textContent).toContain("Inter-VariableFont_opsz,wght.ttf");
    expect(styleElement?.textContent).toContain("Inter-Italic-VariableFont_opsz,wght.ttf");
  });

  it("should inject font-face rules for Roboto Flex font", () => {
    const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 16.67 }), 0);
      return 1;
    });

    // @ts-expect-error - requestIdleCallback may not exist in all environments
    window.requestIdleCallback = mockRequestIdleCallback;

    loadFontsAsync();
    vi.advanceTimersByTime(1);

    const styleElement = document.getElementById("async-fonts");
    expect(styleElement?.textContent).toContain('font-family: "Roboto Flex"');
    expect(styleElement?.textContent).toContain("RobotoFlex-VariableFont");
  });

  it("should inject style element into document head", () => {
    const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 16.67 }), 0);
      return 1;
    });

    // @ts-expect-error - requestIdleCallback may not exist in all environments
    window.requestIdleCallback = mockRequestIdleCallback;

    loadFontsAsync();
    vi.advanceTimersByTime(1);

    const styleElement = document.getElementById("async-fonts");
    expect(styleElement).toBeInTheDocument();
    expect(styleElement?.parentElement).toBe(document.head);
  });

  it("should handle requestIdleCallback timeout", () => {
    const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      // Simulate timeout
      setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), 3000);
      return 1;
    });

    // @ts-expect-error - requestIdleCallback may not exist in all environments
    window.requestIdleCallback = mockRequestIdleCallback;

    loadFontsAsync();

    // Fast-forward to timeout
    vi.advanceTimersByTime(3000);

    // Should still inject fonts even on timeout
    const styleElement = document.getElementById("async-fonts");
    expect(styleElement).toBeInTheDocument();
  });

  it("should use correct font-display swap", () => {
    const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 16.67 }), 0);
      return 1;
    });

    // @ts-expect-error - requestIdleCallback may not exist in all environments
    window.requestIdleCallback = mockRequestIdleCallback;

    loadFontsAsync();
    vi.advanceTimersByTime(1);

    const styleElement = document.getElementById("async-fonts");
    expect(styleElement?.textContent).toContain("font-display: swap");
  });
});
