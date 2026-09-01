/**
 * Font Loader tests
 * Tests asynchronous font loading functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadAppFonts, loadFontsAsync, loadPublicFonts } from "../../src/utils/fontLoader.js";
import { APP_FONT_FACES } from "../../src/utils/appFontLoader.js";

describe("fontLoader", () => {
  let originalRequestIdleCallback: typeof window.requestIdleCallback | undefined;
  let originalRequestAnimationFrame: typeof window.requestAnimationFrame;

  beforeEach(() => {
    vi.useFakeTimers();
    document.getElementById("async-fonts")?.remove();
    document.getElementById("async-fonts-app")?.remove();
    document.body.classList.remove("fonts-loaded");

    originalRequestIdleCallback = window.requestIdleCallback;
    originalRequestAnimationFrame = window.requestAnimationFrame;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.getElementById("async-fonts")?.remove();
    document.getElementById("async-fonts-app")?.remove();
    document.body.classList.remove("fonts-loaded");

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

    vi.advanceTimersByTime(1);

    const styleElement = document.getElementById("async-fonts");
    expect(styleElement).toBeInTheDocument();
    expect(styleElement?.tagName).toBe("STYLE");
    expect(styleElement?.textContent).toContain("@font-face");
    expect(styleElement?.textContent).toContain('font-family: "Inter"');
    expect(styleElement?.textContent).not.toContain("Roboto Flex");
  });

  it("should fallback to setTimeout when requestIdleCallback is not available", () => {
    // @ts-expect-error - intentionally removing requestIdleCallback
    delete window.requestIdleCallback;

    loadFontsAsync();

    // @ts-expect-error - requestIdleCallback may not exist
    expect(window.requestIdleCallback).toBeUndefined();

    vi.advanceTimersByTime(2000);

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

    loadFontsAsync();
    vi.advanceTimersByTime(1);

    expect(document.getElementById("async-fonts")).toBeInTheDocument();

    loadFontsAsync();
    vi.advanceTimersByTime(1);

    expect(document.querySelectorAll("#async-fonts")).toHaveLength(1);
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

    expect(mockRequestAnimationFrame).toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(document.body.classList.contains("fonts-loaded")).toBe(true);
  });

  it("should inject subsetted Inter woff2 on public pages", () => {
    const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 16.67 }), 0);
      return 1;
    });

    // @ts-expect-error - requestIdleCallback may not exist in all environments
    window.requestIdleCallback = mockRequestIdleCallback;

    loadPublicFonts();
    vi.advanceTimersByTime(1);

    const styleElement = document.getElementById("async-fonts");
    expect(styleElement?.textContent).toContain('font-family: "Inter"');
    expect(styleElement?.textContent).toContain("woff2");
    expect(styleElement?.textContent).toContain("unicode-range");
    expect(styleElement?.textContent).not.toContain(".ttf");
    expect(styleElement?.textContent).not.toContain("Roboto Flex");
  });

  it("should inject Roboto Flex only via loadAppFonts", async () => {
    const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 16.67 }), 0);
      return 1;
    });

    // @ts-expect-error - requestIdleCallback may not exist in all environments
    window.requestIdleCallback = mockRequestIdleCallback;

    loadAppFonts();
    vi.advanceTimersByTime(1);
    await vi.runAllTimersAsync();

    const styleElement = document.getElementById("async-fonts-app");
    expect(styleElement).toBeInTheDocument();
    expect(styleElement?.textContent).toContain('font-family: "Roboto Flex"');
    expect(styleElement?.textContent).toContain("woff2");
    expect(APP_FONT_FACES).toContain("Roboto Flex");
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
      setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), 3000);
      return 1;
    });

    // @ts-expect-error - requestIdleCallback may not exist in all environments
    window.requestIdleCallback = mockRequestIdleCallback;

    loadFontsAsync();

    vi.advanceTimersByTime(3000);

    const styleElement = document.getElementById("async-fonts");
    expect(styleElement).toBeInTheDocument();
  });

  it("should use font-display optional so late Inter cannot become LCP", () => {
    const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 16.67 }), 0);
      return 1;
    });

    // @ts-expect-error - requestIdleCallback may not exist in all environments
    window.requestIdleCallback = mockRequestIdleCallback;

    loadFontsAsync();
    vi.advanceTimersByTime(1);

    const styleElement = document.getElementById("async-fonts");
    expect(styleElement?.textContent).toContain("font-display: optional");
    expect(styleElement?.textContent).not.toContain("font-display: swap");
  });
});
