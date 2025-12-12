/**
 * Static page generation script
 * Pre-renders public routes at build time for better performance
 */

import { generateStaticPages } from "../src/ssr/cache.js";
import { renderPage } from "../src/ssr/render.js";

async function main() {
  console.log("Starting static page generation...");
  await generateStaticPages(renderPage);
  console.log("Static page generation complete!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Error generating static pages:", error);
  process.exit(1);
});
