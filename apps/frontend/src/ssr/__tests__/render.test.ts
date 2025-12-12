/**
 * SSR rendering tests
 * Tests server-side rendering functionality
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderPage } from "../render.js";

// Mock the dependencies
vi.mock("react-dom/server", () => ({
  renderToString: vi.fn((component) => "<div>Rendered</div>"),
}));

vi.mock("../lib/queryClient.js", () => ({
  createQueryClient: vi.fn(() => ({
    prefetchQuery: vi.fn(() => Promise.resolve()),
    dehydrate: vi.fn(() => ({ queries: [] })),
  })),
}));

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(() => "<!doctype html><html><head></head><body><div id=\"root\"></div></body></html>"),
  existsSync: vi.fn(() => false),
}));

describe("SSR render", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render a page for a given URL", async () => {
    const html = await renderPage("/login");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<div id=\"root\">");
  });

  it("should inject dehydrated state script", async () => {
    const html = await renderPage("/login");
    expect(html).toContain("window.__REACT_QUERY_STATE__");
  });

  it("should inject hydration script", async () => {
    const html = await renderPage("/login");
    expect(html).toContain("<script type=\"module\"");
  });

  it("should handle different routes", async () => {
    const routes = ["/", "/login", "/register", "/terms", "/privacy"];
    for (const route of routes) {
      const html = await renderPage(route);
      expect(html).toContain("<!doctype html>");
    }
  });
});
