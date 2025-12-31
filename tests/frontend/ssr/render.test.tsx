import { describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => {
  const readFileSync = vi.fn(
    () =>
      '<html><head></head><body><div id="root"></div><script type="module" src="/src/bootstrap.ts"></script></body></html>',
  );
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
  default: {
    isInitialized: true,
    language: "en",
    changeLanguage: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock("../../src/routes/Router", () => ({
  Router: ({ location }: { location: string }) => <div>SSR {location}</div>,
}));

describe("renderPage", () => {
  it("renders HTML with hydrated app markup", async () => {
    const { renderPage } = await import("../../src/ssr/render");
    const html = await renderPage("/login");

    expect(html).toContain('<div id="root">');
    expect(html).toContain("SSR");
    expect(html).toContain("/login");
    expect(html).toContain('<script type="module" src="/src/main.tsx"></script>');
    expect(html).not.toContain("/src/bootstrap.ts");
  });
});
