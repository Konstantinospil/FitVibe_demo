import { beforeEach, describe, expect, it, vi } from "vitest";

const templateHtml =
  '<html><head></head><body><div id="root"></div><script type="module" src="/src/bootstrap.ts"></script></body></html>';

const i18nMock = {
  isInitialized: true,
  language: "en",
  changeLanguage: vi.fn(),
  on: vi.fn(),
};

vi.mock("node:fs", () => {
  const readFileSync = vi.fn((path: string) => {
    if (path.toString().includes("manifest.json")) {
      return JSON.stringify({
        "src/main.tsx": { isEntry: true, file: "assets/main.js" },
      });
    }

    return templateHtml;
  });
  const existsSync = vi.fn(() => false);

  return {
    readFileSync,
    existsSync,
    default: {
      readFileSync,
      existsSync,
    },
  };
});

vi.mock("../../src/i18n/config.js", () => ({
  default: i18nMock,
}));

vi.mock("../../src/routes/Router", () => ({
  Router: ({ location }: { location: string }) => <div>SSR {location}</div>,
}));

vi.mock("../../src/services/api.js", () => ({
  listSessions: vi.fn(() => []),
  listExercises: vi.fn(() => []),
  getProgressTrends: vi.fn(() => []),
  getExerciseBreakdown: vi.fn(() => []),
  getFeed: vi.fn(() => []),
}));

describe("renderPage", () => {
  beforeEach(async () => {
    process.env.NODE_ENV = "test";
    i18nMock.isInitialized = true;
    i18nMock.language = "en";
    i18nMock.changeLanguage.mockReset();
    i18nMock.on.mockReset();
    const fs = await import("node:fs");
    vi.mocked(fs.existsSync).mockReset().mockReturnValue(false);
    vi.mocked(fs.readFileSync).mockImplementation((path: string) => {
      if (path.toString().includes("manifest.json")) {
        return JSON.stringify({
          "src/main.tsx": { isEntry: true, file: "assets/main.js" },
        });
      }

      return templateHtml;
    });
  });

  it("renders HTML with hydrated app markup", async () => {
    const { renderPage } = await import("../../src/ssr/render");
    const html = await renderPage("/login");

    expect(html).toContain('<div id="root">');
    expect(html).toContain("SSR");
    expect(html).toContain("/login");
    expect(html).toContain('<script type="module" src="/src/main.tsx"></script>');
    expect(html).not.toContain("/src/bootstrap.ts");
  });

  it("uses manifest paths and resource hints in production", async () => {
    const fs = await import("node:fs");
    vi.mocked(fs.existsSync).mockImplementation((path: string) =>
      path.toString().includes("manifest.json"),
    );
    vi.mocked(fs.readFileSync).mockImplementation((path: string) => {
      if (path.toString().includes("manifest.json")) {
        return JSON.stringify({
          "src/main.tsx": { isEntry: true, file: "client-main.js" },
        });
      }

      return templateHtml;
    });

    process.env.NODE_ENV = "production";
    const { renderPage } = await import("../../src/ssr/render");
    const html = await renderPage("/profile");

    expect(html).toContain('<script type="module" src="/assets/client-main.js"></script>');
    expect(html).toContain('rel="preload" href="/assets/client-main.js"');
    expect(html).toContain("og:title");
  });

  it("waits for i18n initialization and normalizes language", async () => {
    vi.useFakeTimers();
    i18nMock.isInitialized = false;
    i18nMock.language = "fr";
    i18nMock.on.mockImplementation((event, callback) => {
      if (event === "initialized") {
        i18nMock.isInitialized = true;
        callback();
      }
    });

    const { renderPage } = await import("../../src/ssr/render");
    const renderPromise = renderPage("/settings");
    await vi.runAllTimersAsync();
    const html = await renderPromise;

    expect(html).toContain("SSR");
    expect(html).toContain("/settings");
    expect(i18nMock.changeLanguage).toHaveBeenCalledWith("en");
    vi.useRealTimers();
  });

  it("prefetches feed data for protected feed route", async () => {
    const { getFeed } = await import("../../src/services/api.js");
    const { renderPage } = await import("../../src/ssr/render");

    await renderPage("/feed");

    expect(getFeed).toHaveBeenCalled();
  });

  it("prefetches insights data for protected insights route", async () => {
    const { getProgressTrends, getExerciseBreakdown } = await import("../../src/services/api.js");
    const { renderPage } = await import("../../src/ssr/render");

    await renderPage("/insights");

    expect(getProgressTrends).toHaveBeenCalled();
    expect(getExerciseBreakdown).toHaveBeenCalled();
  });
});
