import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { fileURLToPath } from "node:url";

export default defineConfig(() => {
  const root = fileURLToPath(new URL(".", import.meta.url));

  return {
    root,
    plugins: [preact()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        react: "preact/compat",
        "react-dom/test-utils": "preact/test-utils",
        "react-dom": "preact/compat",
        "react/jsx-runtime": "preact/jsx-runtime",
      },
    },
    server: {
      port: 5174,
      proxy: {
        "/api": "http://localhost:4000",
      },
    },
    build: {
      minify: "esbuild",
      target: "es2020",
      cssMinify: true,
      sourcemap: false,
    },
  };
});
