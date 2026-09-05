/**
 * tsx image-module stubs for SSR scripts
 */

import { afterEach, describe, expect, it } from "vitest";
import Module from "node:module";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const nodeModule = Module as unknown as {
  _extensions: Record<string, (module: { exports: unknown }, filename: string) => void>;
};

describe("register-static-assets", () => {
  const originalPng = nodeModule._extensions[".png"];
  let tempDir: string | undefined;

  afterEach(() => {
    if (originalPng) {
      nodeModule._extensions[".png"] = originalPng;
    } else {
      delete nodeModule._extensions[".png"];
    }
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("should stub png requires with the filename", async () => {
    await import("../../../apps/frontend/scripts/register-static-assets.js");

    tempDir = mkdtempSync(join(tmpdir(), "fitvibe-asset-"));
    const pngPath = join(tempDir, "logo.png");
    writeFileSync(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const require = createRequire(import.meta.url);
    expect(require(pngPath)).toBe(pngPath);
  });
});
