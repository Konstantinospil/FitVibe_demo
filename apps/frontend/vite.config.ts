import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { configDefaults } from "vitest/config";
import { resolve as pathResolve } from "node:path";

export default defineConfig(() => {
  const isVitest = process.env.VITEST === "true";
  const isSSR = process.env.SSR === "true";
  const root = fileURLToPath(new URL(".", import.meta.url));
  const workspaceRoot = pathResolve(root, "../..");

  // Allow thread count to be configured via environment variable
  // Default to 4 threads for local development, CI can override with fewer threads
  const maxThreads = process.env.VITEST_MAX_THREADS
    ? parseInt(process.env.VITEST_MAX_THREADS, 10)
    : 4;

  // For SSR, we need React (not Preact) since we're using react-dom/server
  // For tests, we use React
  // For client builds with SSR, we must use React for hydration to work
  // For client-only builds, we can use Preact for smaller bundle size
  // Note: When SSR is enabled, both server and client must use React
  const useReact = isVitest || isSSR || process.env.USE_REACT === "true";

  return {
    root,
    plugins: useReact ? [react()] : [preact()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        // Explicitly resolve testing libraries for setup files in tests/frontend/
        ...(isVitest
          ? {
              "@testing-library/jest-dom": pathResolve(
                root,
                "node_modules/@testing-library/jest-dom",
              ),
              "@testing-library/react": pathResolve(root, "node_modules/@testing-library/react"),
              "@testing-library/user-event": pathResolve(
                root,
                "node_modules/@testing-library/user-event",
              ),
              "@testing-library/dom": pathResolve(root, "node_modules/@testing-library/dom"),
              "react-router-dom": pathResolve(root, "node_modules/react-router-dom"),
              "react-router": pathResolve(root, "node_modules/react-router"),
              "@remix-run/router": pathResolve(root, "node_modules/@remix-run/router"),
              i18next: pathResolve(root, "node_modules/i18next"),
              "react-i18next": pathResolve(root, "node_modules/react-i18next"),
              "@tanstack/react-query": pathResolve(root, "node_modules/@tanstack/react-query"),
              "axios-mock-adapter": pathResolve(root, "node_modules/axios-mock-adapter"),
              // Resolve relative imports from tests/frontend/ to apps/frontend/src/
              // This allows tests in tests/frontend/ to use ../src to import from apps/frontend/src/
              "../src": pathResolve(root, "src"),
              // Also handle imports from tests/frontend subdirectories
              "../../src": pathResolve(root, "src"),
            }
          : {}),
        // For SSR, we must use React (not Preact) for react-dom/server to work
        // Only use Preact aliases for client builds when not doing SSR
        ...(isVitest || isSSR
          ? {}
          : {
              react: "preact/compat",
              "react-dom/test-utils": "preact/test-utils",
              "react-dom": "preact/compat",
              "react/jsx-runtime": "preact/jsx-runtime",
            }),
      },
      // Ensure node_modules resolution works for setup files outside the app directory
      // Include both frontend's node_modules and workspace root node_modules
      // Prioritize frontend's node_modules for test dependencies
      modules: [
        pathResolve(root, "node_modules"),
        pathResolve(workspaceRoot, "node_modules"),
        "node_modules",
      ],
      preserveSymlinks: false,
      // Ensure proper resolution of dependencies when tests are in tests/frontend
      dedupe: ["@testing-library/react", "@testing-library/jest-dom", "axios-mock-adapter"],
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "../../tests/frontend/setupTests.ts",
      include: ["../../tests/frontend/**/*.test.{ts,tsx}"],
      exclude: [
        "../../tests/frontend/**/*.spec.{ts,tsx}",
        "../../tests/frontend/visual/**",
        "../../tests/frontend/e2e/**",
      ],
      css: true,
      pool: "threads",
      poolOptions: {
        threads: {
          // Enable parallel test execution for faster test runs
          // Use multiple threads to balance speed and resource usage
          // Vitest will auto-detect optimal thread count if not specified
          minThreads: 1,
          maxThreads: maxThreads, // Configurable via VITEST_MAX_THREADS env var (default: 4)
          // Use isolate: true to ensure test isolation and prevent shared state issues
          isolate: true,
        },
      },
      // Enable test-level parallelization within files (use with caution if tests share state)
      sequence: {
        shuffle: false,
        concurrent: false, // Disabled to prevent DOM pollution from concurrent tests
      },
      testTimeout: 30000, // 30 second timeout per test (increased to catch slow tests)
      hookTimeout: 15000, // 15 second timeout for hooks (increased for i18n loading)
      teardownTimeout: 15000, // 15 second timeout for teardown (increased for cleanup)
      // Prevent tests from hanging by detecting open handles
      detectOpenHandles: true,
      // Force exit after tests complete to prevent hanging from open handles
      // This is safe because we ensure proper cleanup in afterEach hooks
      forceExit: true,
      // Force exit after tests to prevent hanging
      forceRerunTriggers: ["**/src/**", "**/tests/**"],
      // Ensure dependencies are resolved correctly for setup files
      // Inline all test dependencies to ensure they're resolved from the correct node_modules
      server: {
        deps: {
          inline: [
            // Explicit package names first
            "@testing-library/jest-dom",
            "@testing-library/react",
            "@testing-library/user-event",
            "@testing-library/dom",
            "react-router-dom",
            "react-router",
            "@remix-run/router",
            "i18next",
            "react-i18next",
            "@tanstack/react-query",
            "axios-mock-adapter",
            "axios",
            "recharts",
            // Regex patterns to catch all sub-packages
            /^@testing-library\//,
            /^vitest\//,
            /^react-router/,
            /^@remix-run\//,
            /^@tanstack\//,
          ],
        },
      },
      coverage: {
        provider: "istanbul" as const,
        reporter: ["text", "html", "json", "json-summary"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: [...(configDefaults.coverage.exclude || []), "src/main.tsx"],
        reportsDirectory: "./coverage",
        // Ensure temp directory is explicitly set and created
        tempDirectory: "./coverage/.tmp",
        // Clean coverage directory before running tests
        clean: true,
        // Clean on exit to prevent stale files
        cleanOnRerun: true,
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": "http://localhost:4000",
      },
    },
    build: {
      // Optimize build for performance
      minify: "esbuild" as const,
      target: "es2020",
      cssMinify: true,
      sourcemap: false,
      // SSR builds output to dist/server, client builds to dist/client
      outDir: isSSR ? "dist/server" : "dist/client",
      // Reduce bundle size by optimizing module resolution
      modulePreload: {
        polyfill: false, // Disable module preload polyfill to reduce size
      },
      // Improve performance with better chunk size limits
      chunkSizeWarningLimit: 250, // Reduce warning threshold to catch large chunks earlier
      // Improve loading performance with better chunking strategy
      rollupOptions: {
        output: {
          // Optimize chunk splitting for better caching and loading
          manualChunks: (id: string) => {
            // Vendor chunks - prioritize critical chunks for faster initial load
            if (id.includes("node_modules")) {
              // Large charting library - MUST be lazy loaded (only used in Insights)
              if (id.includes("recharts")) {
                return "charts-vendor";
              }
              // React and React-DOM are large - split them for better code splitting
              // React core (smaller, needed for hydration)
              if (id.includes("react/") && !id.includes("react-dom")) {
                return "react-core";
              }
              // React DOM (larger, needed for rendering)
              if (id.includes("react-dom")) {
                return "react-dom-vendor";
              }
              // Split Preact into smaller chunks to reduce initial bundle size
              // Preact core (small, critical for hydration)
              if (
                id.includes("node_modules/preact/") &&
                !id.includes("preact/compat") &&
                !id.includes("preact/jsx-runtime") &&
                !id.includes("preact/hooks")
              ) {
                return "preact-core";
              }
              // Preact hooks (commonly used, but can be separate)
              if (id.includes("preact/hooks")) {
                return "preact-hooks";
              }
              // Preact compat layer (React compatibility - larger, can be separate)
              if (id.includes("preact/compat") || id.includes("preact/jsx-runtime")) {
                return "preact-compat";
              }
              // React Router - needed for initial routing but can be separate
              if (id.includes("react-router")) {
                return "router-vendor";
              }
              // State management - split for better caching
              // Zustand is small, keep in main bundle for login
              if (id.includes("zustand")) {
                return "state-vendor";
              }
              // React Query - only needed for protected routes, lazy load
              if (id.includes("@tanstack/react-query")) {
                return "query-vendor";
              }
              // i18n libraries - can be loaded on demand
              if (id.includes("i18next") || id.includes("react-i18next")) {
                return "i18n-vendor";
              }
              // HTTP client - needed for login, but can be separate chunk
              if (id.includes("axios")) {
                return "http-vendor";
              }
              // Icon library - large, can be code-split
              // Split lucide-react into smaller chunks per icon set
              if (id.includes("lucide-react")) {
                // Try to split by icon usage patterns
                // This will help tree-shaking work better
                return "icons-vendor";
              }
              // Date utilities - lazy load (not needed for login)
              if (id.includes("date-fns") || id.includes("dayjs") || id.includes("moment")) {
                return "date-vendor";
              }
              // Default vendor chunk for other dependencies
              return "vendor";
            }
            // Split i18n locale files into separate chunks for lazy loading
            // IMPORTANT: Only minimal auth translations in initial bundle
            if (id.includes("/locales/")) {
              // Only auth.json for login - other translations lazy-loaded
              if (id.includes("/locales/en/auth.json")) {
                return "locale-en-auth";
              }
              // All other locale files are lazy-loaded
              if (id.includes("/locales/en/")) {
                return "locale-en-full";
              }
              // All other locales are lazy-loaded
              const match = id.match(/locales\/([^/]+)\//);
              if (match) {
                return `locale-${match[1]}`;
              }
            }
          },
          // Optimize chunk file names for better caching
          // For SSR, output to server directory structure
          chunkFileNames: isSSR ? "[name]-[hash].js" : "assets/js/[name]-[hash].js",
          entryFileNames: isSSR ? "[name]-[hash].js" : "assets/js/[name]-[hash].js",
          assetFileNames: isSSR
            ? "assets/[ext]/[name]-[hash].[ext]"
            : "assets/[ext]/[name]-[hash].[ext]",
          // Compact output to reduce whitespace and file size
          compact: true,
        },
      },
      // Enable tree shaking with more aggressive settings
      treeshake: {
        moduleSideEffects: (id: string) => {
          // Allow side effects for CSS and JSON imports
          if (id.includes(".css") || id.includes(".json")) {
            return true;
          }
          return false;
        },
        preset: "recommended",
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
      // Enable compression reporting for monitoring
      reportCompressedSize: true,
      // Optimize asset inlining threshold - inline more small assets to reduce requests
      assetsInlineLimit: 16384, // Inline assets smaller than 16KB to reduce HTTP requests
      // Enable CSS code splitting to load only necessary CSS per route, improving LCP
      cssCodeSplit: true,
      // Optimize for faster initial load by reducing initial bundle size
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },
      // Reduce initial bundle size by using dynamic imports for non-critical code
      // This helps with code splitting and lazy loading
      experimental: {
        renderBuiltUrl(_filename: string) {
          // Use relative URLs for better caching
          return { relative: true };
        },
      },
    },
    // SSR configuration
    ssr: {
      // Don't externalize these packages for SSR - bundle them
      // These are needed for SSR rendering
      noExternal: [
        "react",
        "react-dom",
        "react-router-dom",
        "react-router",
        "@tanstack/react-query",
        "react-i18next",
        "i18next",
        "zustand",
        // Internal modules should be bundled
        /^@fitvibe\//,
      ],
      // Externalize large dependencies that don't need to be in the SSR bundle
      // These will be resolved from node_modules at runtime
      external: [
        // Express is provided by the server runtime
        "express",
        // Node.js built-ins
        "node:fs",
        "node:path",
        "node:url",
        "node:stream",
      ],
      // Optimize SSR bundle output
      resolve: {
        // Don't bundle dev dependencies for SSR
        conditions: ["node", "production"],
      },
    },
  };
});
