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
      include: ["../../tests/frontend/**/*.{test,spec}.{ts,tsx}"],
      css: true,
      pool: "threads",
      poolOptions: {
        threads: {
          // Explicitly set thread limits to avoid minThreads/maxThreads conflict
          // In CI, use fewer threads to avoid resource contention
          // Ensure minThreads <= maxThreads to prevent RangeError
          // Reduced threads to prevent memory issues - single thread for stability
          minThreads: 1,
          maxThreads: 1, // Use single thread to prevent memory accumulation
        },
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
      rollupOptions: {
        output: {
          // Optimize chunk splitting for better caching and loading
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes("node_modules")) {
              // Separate large dependencies
              if (id.includes("react") || id.includes("react-dom") || id.includes("preact")) {
                return "react-vendor";
              }
              if (id.includes("@tanstack/react-query")) {
                return "query-vendor";
              }
              if (id.includes("react-router")) {
                return "router-vendor";
              }
              if (id.includes("recharts")) {
                return "charts-vendor";
              }
              if (id.includes("zustand")) {
                return "state-vendor";
              }
              if (id.includes("i18next") || id.includes("react-i18next")) {
                return "i18n-vendor";
              }
              if (id.includes("axios")) {
                return "http-vendor";
              }
              // Other vendor code
              return "vendor";
            }
          },
          // Optimize chunk file names for better caching
          chunkFileNames: "assets/js/[name]-[hash].js",
          entryFileNames: "assets/js/[name]-[hash].js",
          assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
        },
      },
      // Chunk size warnings threshold (300KB as per PRD)
      chunkSizeWarningLimit: 300,
      // Enable tree shaking
      treeshake: true,
      // Enable compression
      reportCompressedSize: true,
      // Optimize asset inlining threshold
      assetsInlineLimit: 4096, // Inline assets smaller than 4KB
    },
  };
});
