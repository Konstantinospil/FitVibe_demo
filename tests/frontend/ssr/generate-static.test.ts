/**
 * Guards the SSR static-generation entry so tsx never compiles BrandLogo/PNG source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/frontend");

describe("generate-static script", () => {
  it("should load the Vite SSR bundle instead of the source renderer", () => {
    const source = readFileSync(resolve(frontendRoot, "scripts/generate-static.ts"), "utf-8");

    expect(source).toContain("loadProductionRenderPage");
    expect(source).not.toMatch(/from ["']\.\.\/src\/ssr\/render\.js["']/);
  });
});
