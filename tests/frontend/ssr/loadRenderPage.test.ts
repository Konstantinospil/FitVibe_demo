/**
 * SSR production render-bundle loader
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadProductionRenderPage } from "../../src/ssr/loadRenderPage.js";

const fixturesRoot = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures");

function writeRenderBundle(bundleName: string, source: string): string {
  const bundleRoot = resolve(fixturesRoot, bundleName);
  const serverDir = resolve(bundleRoot, "dist/server");
  mkdirSync(serverDir, { recursive: true });
  writeFileSync(resolve(serverDir, "render-testbundle.js"), source, "utf8");
  return bundleRoot;
}

beforeAll(() => {
  writeRenderBundle(
    "valid-bundle",
    "export async function renderPage(url) { return 'html:' + url; }\n",
  );
  writeRenderBundle("no-export", "export const unused = true;\n");
});

afterAll(() => {
  rmSync(fixturesRoot, { recursive: true, force: true });
});

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
