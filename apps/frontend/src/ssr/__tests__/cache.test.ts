/**
 * SSR cache tests
 * Tests HTML caching functionality
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { isCacheableRoute, getCachedHtml, setCachedHtml, clearCache } from "../cache.js";

// Mock node:fs
vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  statSync: vi.fn(() => ({
    mtimeMs: Date.now(),
  })),
}));

describe("SSR cache", () => {
  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
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
});
