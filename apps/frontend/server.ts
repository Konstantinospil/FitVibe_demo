/**
 * Express server for Server-Side Rendering (SSR)
 * Serves the React app with server-side rendering
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from "express";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readdirSync } from "node:fs";
import { isCacheableRoute, getCachedHtml, setCachedHtml } from "./src/ssr/cache.js";
import { recordSSRMetric } from "./src/ssr/metrics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, ".");

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4173;
const isProduction = process.env.NODE_ENV === "production";

// Import SSR renderer - use built bundle in production, source in development
// We'll import this dynamically in the route handler to avoid top-level await issues
let renderPageCache: ((url: string) => Promise<string>) | null = null;

const getRenderPage = async (): Promise<(url: string) => Promise<string>> => {
  if (renderPageCache) {
    return renderPageCache;
  }

  if (isProduction) {
    // In production, find the render bundle file (has hash in name)
    try {
      const serverDir = resolve(root, "dist/server");
      const files = readdirSync(serverDir);
      const renderFile = files.find((f) => f.startsWith("render-") && f.endsWith(".js"));
      if (renderFile) {
        // Use file:// URL for proper ESM resolution
        const renderPath = resolve(serverDir, renderFile);
        const module = (await import(`file://${renderPath}`)) as {
          renderPage?: (url: string) => Promise<string>;
        };
        if (typeof module.renderPage === "function") {
          renderPageCache = module.renderPage;
          return renderPageCache;
        }
        throw new Error("renderPage is not a function in production bundle");
      }
      throw new Error("Render file not found");
    } catch (error) {
      console.error("Failed to load production render bundle:", error);
      // Fallback to source if built file not found
      const module = await import("./src/ssr/render.js");
      if (typeof module.renderPage === "function") {
        renderPageCache = module.renderPage as (url: string) => Promise<string>;
        return renderPageCache;
      }
      throw new Error("renderPage is not a function in fallback module");
    }
  } else {
    const module = await import("./src/ssr/render.js");
    if (typeof module.renderPage === "function") {
      renderPageCache = module.renderPage as (url: string) => Promise<string>;
      return renderPageCache;
    }
    throw new Error("renderPage is not a function in development module");
  }
};

// Health check endpoint for container orchestration (must be before SSR handler)
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "frontend-ssr" });
});

// Metrics endpoint for monitoring (must be before SSR handler)
// eslint-disable-next-line @typescript-eslint/no-misused-promises
const metricsHandler: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const { getSSRStats } = await import("./src/ssr/metrics.js");
    const stats = getSSRStats();
    res.status(200).json({
      service: "frontend-ssr",
      metrics: stats,
    });
  } catch {
    res.status(500).json({ error: "Failed to get metrics" });
  }
};
app.get("/metrics", metricsHandler);

// Serve static assets with performance headers
const staticOptions = {
  maxAge: isProduction ? 31536000000 : 0, // 1 year in production, no cache in dev
  etag: true,
  lastModified: true,
  immutable: isProduction,
};

if (isProduction) {
  // In production, serve from dist/client
  app.use("/assets", express.static(resolve(root, "dist/client/assets"), staticOptions));
  app.use("/fonts", express.static(resolve(root, "dist/client/fonts"), staticOptions));
  app.use("/favicon.ico", express.static(resolve(root, "dist/client/favicon.ico"), staticOptions));
} else {
  // In development, serve from public
  app.use("/assets", express.static(resolve(root, "public")));
  app.use("/fonts", express.static(resolve(root, "public/fonts")));
  app.use("/favicon.ico", express.static(resolve(root, "public/favicon.ico")));
}

// SSR route handler with caching and metrics
// eslint-disable-next-line @typescript-eslint/no-misused-promises
const ssrHandler: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  let error: string | undefined;

  try {
    // Check cache for public routes
    if (isCacheableRoute(req.url)) {
      const cachedHtml = getCachedHtml(req.url);
      if (cachedHtml) {
        const renderTime = Date.now() - startTime;
        recordSSRMetric({
          renderTime,
          url: req.url,
          timestamp: Date.now(),
          cacheHit: true,
        });
        // Performance headers
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("X-Cache", "HIT");
        res.setHeader("X-SSR-Time", `${renderTime}ms`);
        res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600"); // 5 min browser, 10 min CDN
        return res.send(cachedHtml);
      }
    }

    // Render page
    const renderPage = await getRenderPage();
    const html = await renderPage(req.url);

    // Cache public routes
    if (isCacheableRoute(req.url)) {
      setCachedHtml(req.url, html);
      res.setHeader("X-Cache", "MISS");
    }

    const renderTime = Date.now() - startTime;
    recordSSRMetric({
      renderTime,
      url: req.url,
      timestamp: Date.now(),
      cacheHit: false,
    });

    // Performance headers
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-SSR-Time", `${renderTime}ms`);
    // Add cache control for public routes
    if (isCacheableRoute(req.url)) {
      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600"); // 5 min browser, 10 min CDN
    } else {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    }
    res.send(html);
  } catch (err) {
    const renderTime = Date.now() - startTime;
    error = err instanceof Error ? err.message : String(err);

    recordSSRMetric({
      renderTime,
      url: req.url,
      timestamp: Date.now(),
      cacheHit: false,
      error,
    });

    console.error("SSR Error for URL:", req.url);
    console.error("Error details:", error);
    if (err instanceof Error && err.stack) {
      console.error("Stack trace:", err.stack);
    }
    next(err);
  }
};
app.get("*", ssrHandler);

// Error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error("Server Error:", err);
  res.status(500).send("Internal Server Error");
});

// Start server
app.listen(PORT, () => {
  console.warn(`SSR server running on http://localhost:${PORT}`);
});
