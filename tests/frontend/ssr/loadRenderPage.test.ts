/**
 * SSR production render-bundle loader
 */

import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadProductionRenderPage } from "../../src/ssr/loadRenderPage.js";

const fixturesRoot = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("loadProductionRenderPage", () => {
  it("should load renderPage from the hashed SSR bundle", async () => {
    const renderPage = await loadProductionRenderPage(resolve(fixturesRoot, "valid-bundle"));
    await expect(renderPage("/login")).resolves.toBe("html:/login");
  });

  it("should throw when the SSR bundle directory is missing", async () => {
    await expect(loadProductionRenderPage(resolve(fixturesRoot, "missing-bundle"))).rejects.toThrow(
      /SSR render bundle not found/,
    );
  });

  it("should throw when renderPage is not exported", async () => {
    await expect(loadProductionRenderPage(resolve(fixturesRoot, "no-export"))).rejects.toThrow(
      "renderPage is not a function in production bundle",
    );
  });
});
