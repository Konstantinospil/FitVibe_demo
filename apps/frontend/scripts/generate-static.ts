/**
 * Static page generation script
 * Pre-renders public routes at build time for better performance
 */

import "./register-static-assets.js";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateStaticPages } from "../src/ssr/cache.js";
import { loadProductionRenderPage } from "../src/ssr/loadRenderPage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");

async function main() {
  // Disk cache and hashed client assets are production-only in the SSR helpers.
  process.env.NODE_ENV ??= "production";

  console.log("Starting static page generation...");
  const renderPage = await loadProductionRenderPage(root);
  await generateStaticPages(renderPage);
  console.log("Static page generation complete!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Error generating static pages:", error);
  process.exit(1);
});
