import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { configDefaults } from "vitest/config";
import { resolve as pathResolve } from "node:path";

export default defineConfig(() => {
  const isVitest = process.env.VITEST === "true";
  const root = fileURLToPath(new URL(".", import.meta.url));
  const workspaceRoot = pathResolve(root, "../..");

  // Allow thread count to be configured via environment variable
  // Default to 4 threads for local development, CI can override with fewer threads
  const maxThreads = process.env.VITEST_MAX_THREADS
    ? parseInt(process.env.VITEST_MAX_THREADS, 10)
    : 4;

  return {
    root,
    plugins: isVitest ? [react()] : [preact()],
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
        ...(isVitest
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
        concurrent: true, // Allow tests within the same file to run concurrently if they don't share state
      },
      testTimeout: 10000, // 10 second timeout per test
      hookTimeout: 10000, // 10 second timeout for hooks
      teardownTimeout: 5000, // 5 second timeout for teardown
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
      minify: "esbuild",
      target: "es2020",
      cssMinify: true,
      sourcemap: false,
      // Reduce bundle size by optimizing module resolution
      modulePreload: {
        polyfill: false, // Disable module preload polyfill to reduce size
      },
      // Improve loading performance with better chunking strategy
      rollupOptions: {
        output: {
          // Optimize chunk splitting for better caching and loading
          manualChunks: (id) => {
            // Vendor chunks - prioritize critical chunks for faster initial load
            if (id.includes("node_modules")) {
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
              // Large charting library - lazy load when needed
              if (id.includes("recharts")) {
                return "charts-vendor";
              }
              // State management - split for better caching
              if (id.includes("@tanstack/react-query")) {
                return "query-vendor";
              }
              if (id.includes("zustand")) {
                return "state-vendor";
              }
              // i18n libraries - can be loaded on demand
              if (id.includes("i18next") || id.includes("react-i18next")) {
                return "i18n-vendor";
              }
              // HTTP client
              if (id.includes("axios")) {
                return "http-vendor";
              }
              // Icon library - large, can be code-split
              if (id.includes("lucide-react")) {
                return "icons-vendor";
              }
              // Date utilities
              if (id.includes("date-fns") || id.includes("dayjs") || id.includes("moment")) {
                return "date-vendor";
              }
              // Default vendor chunk for other dependencies
              return "vendor";
            }
            // Split i18n locale files into separate chunks for lazy loading
            if (id.includes("/locales/") && !id.includes("/locales/en/")) {
              const match = id.match(/locales\/([^/]+)\//);
              if (match) {
                return `locale-${match[1]}`;
              }
            }
          },
          // Optimize chunk file names for better caching
          chunkFileNames: "assets/js/[name]-[hash].js",
          entryFileNames: "assets/js/[name]-[hash].js",
          assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
          // Compact output to reduce whitespace
          compact: true,
        },
      },
      // Chunk size warnings threshold (500KB to allow for reasonable chunk sizes)
      // We'll optimize chunks to stay under 300KB where possible
      chunkSizeWarningLimit: 500,
      // Enable tree shaking
      treeshake: true,
      // Enable compression
      reportCompressedSize: true,
      // Optimize asset inlining threshold
      assetsInlineLimit: 4096, // Inline assets smaller than 4KB
      // Reduce CSS code splitting to minimize initial bundle
      cssCodeSplit: true,
    },
  };
});
