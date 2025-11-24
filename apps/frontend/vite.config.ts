import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { configDefaults } from "vitest/config";

export default defineConfig(() => {
  const isVitest = process.env.VITEST === "true";

  return {
    plugins: isVitest ? [react()] : [preact()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        ...(isVitest
          ? {}
          : {
              react: "preact/compat",
              "react-dom/test-utils": "preact/test-utils",
              "react-dom": "preact/compat",
              "react/jsx-runtime": "preact/jsx-runtime",
            }),
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "../../tests/frontend/setupTests.ts",
      css: true,
      pool: "threads",
      poolOptions: {
        threads: {
          // Explicitly set thread limits to avoid minThreads/maxThreads conflict
          // In CI, use fewer threads to avoid resource contention
          // Ensure minThreads <= maxThreads to prevent RangeError
          minThreads: 1,
          maxThreads: process.env.CI ? 2 : 4,
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
  };
});
