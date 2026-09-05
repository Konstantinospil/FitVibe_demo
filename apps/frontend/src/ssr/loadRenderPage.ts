/**
 * Loads the Vite-built SSR renderer from dist/server.
 * Binary assets (PNG/ICO) are resolved during `vite build --ssr`; running
 * the TypeScript source through tsx would try to execute those files as JS.
 */

import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function loadProductionRenderPage(
  root: string,
): Promise<(url: string) => Promise<string>> {
  const serverDir = resolve(root, "dist/server");
  let files: string[];
  try {
    files = readdirSync(serverDir);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`SSR render bundle not found in ${serverDir}: ${reason}`);
  }
  const renderFile = files.find((f) => f.startsWith("render-") && f.endsWith(".js"));
  if (!renderFile) {
    throw new Error(`SSR render bundle not found in ${serverDir}`);
  }

  const renderPath = resolve(serverDir, renderFile);
  const module = (await import(pathToFileURL(renderPath).href)) as {
    renderPage?: (url: string) => Promise<string>;
  };

  if (typeof module.renderPage !== "function") {
    throw new Error("renderPage is not a function in production bundle");
  }

  return module.renderPage;
}
