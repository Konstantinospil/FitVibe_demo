/**
 * Server-Side Rendering (SSR) renderer
 * Renders React components to HTML string for SSR
 */

import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClientProvider, dehydrate, type QueryClient } from "@tanstack/react-query";
import { Router } from "../routes/Router.js";
import { ToastProvider } from "../contexts/ToastContext.js";
import { createQueryClient } from "../lib/queryClient.js";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// __dirname is apps/frontend/src/ssr, so go up to apps/frontend
const root = resolve(__dirname, "../..");

/**
 * Reads the HTML template file
 */
function getHtmlTemplate(): string {
  const templatePath = resolve(root, "index.html");
  return readFileSync(templatePath, "utf-8");
}

/**
 * Prefetches data for a given route
 * This function determines what queries need to be prefetched based on the URL
 */
async function prefetchRouteData(queryClient: QueryClient, url: string): Promise<void> {
  // Parse the URL to determine the route
  const path = url.split("?")[0]; // Remove query string
  const normalizedPath = path.toLowerCase();

  try {
    // Only prefetch for authenticated routes (protected routes)
    // Public routes (login, register, etc.) don't need data prefetching
    if (
      normalizedPath === "/" ||
      normalizedPath.startsWith("/sessions") ||
      normalizedPath.startsWith("/planner") ||
      normalizedPath.startsWith("/insights") ||
      normalizedPath.startsWith("/progress") ||
      normalizedPath.startsWith("/feed") ||
      normalizedPath.startsWith("/profile") ||
      normalizedPath.startsWith("/settings")
    ) {
      // Dynamically import API functions to avoid loading them on server if not needed
      const { listSessions, listExercises, getProgressTrends, getExerciseBreakdown, getFeed } =
        await import("../services/api.js");

      // Prefetch common data for home page
      if (normalizedPath === "/") {
        // Calculate date range for sessions (last 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        await Promise.allSettled([
          // Prefetch sessions for home page
          queryClient.prefetchQuery({
            queryKey: [
              "sessions",
              "history",
              { from: thirtyDaysAgo.toISOString(), to: now.toISOString() },
            ],
            queryFn: () =>
              listSessions({
                planned_from: thirtyDaysAgo.toISOString(),
                planned_to: now.toISOString(),
                limit: 100,
              }),
            staleTime: 60 * 1000,
          }),
          // Prefetch exercises list
          queryClient.prefetchQuery({
            queryKey: ["exercises", "all"],
            queryFn: () => listExercises({ limit: 1000 }),
            staleTime: 5 * 60 * 1000,
          }),
        ]);
      }

      // Prefetch data for insights page
      if (normalizedPath === "/insights" || normalizedPath === "/progress") {
        await Promise.allSettled([
          queryClient.prefetchQuery({
            queryKey: ["progress-trends", { period: 30, group_by: "week" }, "week"],
            queryFn: () =>
              getProgressTrends({
                period: 30,
                group_by: "week",
              }),
          }),
          queryClient.prefetchQuery({
            queryKey: ["exercise-breakdown", { period: 30 }],
            queryFn: () =>
              getExerciseBreakdown({
                period: 30,
              }),
          }),
        ]);
      }

      // Prefetch data for feed page
      if (normalizedPath === "/feed") {
        await queryClient.prefetchQuery({
          queryKey: ["feed", { scope: "public", limit: 20, offset: 0 }],
          queryFn: () => getFeed({ scope: "public", limit: 20, offset: 0 }),
        });
      }
    }
  } catch (error) {
    // Log error but don't fail SSR - let client-side handle data fetching
    console.error("Error prefetching route data:", error);
  }
}

/**
 * Reads Vite manifest.json to get exact bundle paths
 */
function getManifestPaths(): { main?: string } {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) {
    return {};
  }

  const manifestPath = resolve(root, "dist/client/.vite/manifest.json");
  if (!existsSync(manifestPath)) {
    return {};
  }

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as Record<
      string,
      { isEntry?: boolean; file?: string }
    >;
    // Find the main entry point
    const mainEntry = Object.values(manifest).find(
      (entry) =>
        typeof entry === "object" && entry !== null && "isEntry" in entry && entry.isEntry === true,
    );

    return {
      main: mainEntry?.file ? `/assets/${mainEntry.file}` : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Renders the React app to HTML string for SSR (non-streaming fallback)
 * @param url - The URL path to render
 * @returns Complete HTML string with rendered React app
 */
export async function renderPage(url: string): Promise<string> {
  // Ensure i18n is initialized and resources are loaded before rendering
  // This is critical for SSR - components using useTranslation need i18n to be ready
  const { default: i18n } = await import("../i18n/config.js");

  // Wait for i18n to be ready (resources loaded)
  if (!i18n.isInitialized) {
    await new Promise<void>((resolve) => {
      if (i18n.isInitialized) {
        resolve();
      } else {
        i18n.on("initialized", () => resolve());
        // Timeout after 2 seconds to prevent hanging
        setTimeout(() => resolve(), 2000);
      }
    });
  }

  // Ensure minimal translations are loaded for SSR
  // Wait for async translation loading to complete
  // The i18n config already loads minimal translations on initialization
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Ensure i18n language is set
  if (i18n.language !== "en") {
    void i18n.changeLanguage("en");
  }

  // Create a new QueryClient for this request (SSR best practice)
  const queryClient = createQueryClient();

  // Prefetch data for the route before rendering
  await prefetchRouteData(queryClient, url);

  // Dehydrate the query state to pass to client
  const dehydratedState = dehydrate(queryClient);

  // Render React app to string with SSR Router
  // Wrap Router in QueryClientProvider and ToastProvider
  // Pass dehydratedState to Router so it can hydrate ProtectedRoutes
  // Note: I18nextProvider removed - causing React null issues
  // i18n is initialized globally and should work without provider during SSR
  const appHtml = renderToString(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Router location={url} queryClient={queryClient} dehydratedState={dehydratedState} />
      </ToastProvider>
    </QueryClientProvider>,
  );

  // Get HTML template
  const template = getHtmlTemplate();

  // Replace the entire root div content with server-rendered app
  // Remove the static login shell and replace with SSR content
  let html = template.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${appHtml}</div>`);

  // Remove the bootstrap script (not needed for SSR - we hydrate directly)
  html = html.replace(/<script type="module" src="\/src\/bootstrap\.ts"><\/script>/g, "");

  // Inject dehydrated query state as a script tag
  // This allows the client to hydrate the QueryClient with prefetched data
  const dehydratedStateScript = `<script>window.__REACT_QUERY_STATE__ = ${JSON.stringify(dehydratedState)};</script>`;

  // Get hydration script path from manifest.json (Phase 3)
  const isProduction = process.env.NODE_ENV === "production";
  const manifestPaths = getManifestPaths();
  const mainScriptPath = isProduction
    ? manifestPaths.main || "/assets/js/main.js"
    : "/src/main.tsx";
  const hydrationScript = `<script type="module" src="${mainScriptPath}"></script>`;

  // Add resource hints for performance optimization
  // Preload critical resources to improve LCP and FCP
  const resourceHints = isProduction
    ? `<link rel="preload" href="${mainScriptPath}" as="script" crossorigin="anonymous" />`
    : "";

  // Inject resource hints in head and scripts before closing body tag
  html = html.replace("</head>", `${resourceHints}</head>`);
  html = html.replace("</body>", `${dehydratedStateScript}${hydrationScript}</body>`);

  return html;
}
