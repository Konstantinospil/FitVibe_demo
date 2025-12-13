/**
 * SSR cache tests
 * Tests HTML caching functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type * as NodeFs from "node:fs";

// Use vi.hoisted to create mocks that are available before module import
const { mockExistsSync, mockReadFileSync, mockWriteFileSync, mockMkdirSync, mockStatSync } =
  vi.hoisted(() => {
    return {
      mockExistsSync: vi.fn(() => false),
      mockReadFileSync: vi.fn(),
      mockWriteFileSync: vi.fn(),
      mockMkdirSync: vi.fn(),
      mockStatSync: vi.fn(() => ({
        mtimeMs: Date.now(),
      })),
    };
  });

// Mock node:fs using hoisted mocks
vi.mock("node:fs", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof NodeFs;
  return {
    ...actual,
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
    statSync: mockStatSync,
  };
});

// Import cache module AFTER mocks are set up
import { isCacheableRoute, getCachedHtml, setCachedHtml, clearCache } from "../../src/ssr/cache.js";

// Helper to get mocks
const getMocks = () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
  statSync: mockStatSync,
});

describe("SSR cache", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
    process.env.NODE_ENV = originalEnv;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    clearCache();
  });

  it("should identify cacheable routes", () => {
    expect(isCacheableRoute("/login")).toBe(true);
    expect(isCacheableRoute("/register")).toBe(true);
    expect(isCacheableRoute("/terms")).toBe(true);
    expect(isCacheableRoute("/privacy")).toBe(true);
    expect(isCacheableRoute("/")).toBe(false);
    expect(isCacheableRoute("/sessions")).toBe(false);
  });

  it("should cache and retrieve HTML", () => {
    const url = "/login";
    const html = "<html><body>Test</body></html>";

    setCachedHtml(url, html);
    const cached = getCachedHtml(url);

    expect(cached).toBe(html);
  });

  it("should return null for non-cached routes", () => {
    const cached = getCachedHtml("/nonexistent");
    expect(cached).toBeNull();
  });

  it("should clear cache", () => {
    setCachedHtml("/login", "<html>Test</html>");
    clearCache();
    const cached = getCachedHtml("/login");
    expect(cached).toBeNull();
  });

  it("should handle expired memory cache", () => {
    const url = "/login";
    const html = "<html><body>Test</body></html>";

    // Set cache first
    setCachedHtml(url, html);

    // Manually expire it by setting old timestamp
    // We need to access the internal memory cache
    // Since we can't access it directly, we'll use vi.useFakeTimers to simulate time passing
    vi.useFakeTimers();
    setCachedHtml(url, html);
    vi.advanceTimersByTime(6 * 60 * 1000); // Advance 6 minutes
    const cached = getCachedHtml(url);
    vi.useRealTimers();

    // Should return null for expired cache
    expect(cached).toBeNull();
  });

  it("should handle cacheable routes with query strings", () => {
    expect(isCacheableRoute("/login?redirect=/dashboard")).toBe(true);
    expect(isCacheableRoute("/register?token=abc")).toBe(true);
  });

  it("should handle non-cacheable routes", () => {
    expect(isCacheableRoute("/dashboard")).toBe(false);
    expect(isCacheableRoute("/sessions/123")).toBe(false);
    expect(isCacheableRoute("/profile")).toBe(false);
  });

  it("should test generateStaticPages", async () => {
    const { generateStaticPages } = await import("../../src/ssr/cache.js");
    const mockRenderPage = vi.fn().mockResolvedValue("<html>Test</html>");
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await generateStaticPages(mockRenderPage);

    expect(mockRenderPage).toHaveBeenCalledTimes(8); // 8 public routes
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it("should handle generateStaticPages errors", async () => {
    const { generateStaticPages } = await import("../../src/ssr/cache.js");
    const mockRenderPage = vi
      .fn()
      .mockRejectedValueOnce(new Error("Render error"))
      .mockResolvedValue("<html>Test</html>");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await generateStaticPages(mockRenderPage);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to generate"),
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});
