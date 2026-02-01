#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Run Lighthouse CI locally: build frontend, start preview server, run LHCI, then stop server.
 * Usage: node tests/perf/run-lhci-local.mjs [--config path/to/lighthouserc.json]
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const previewUrl = "http://127.0.0.1:4173/";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(maxAttempts = 30, intervalMs = 1000) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const res = await fetch(previewUrl, { method: "HEAD" });
      if (res.ok) return;
    } catch {
      // ignore while server boots
    }
    await delay(intervalMs);
  }
  throw new Error(
    `Preview server did not start at ${previewUrl} within ${maxAttempts * intervalMs}ms. Start it manually: cd apps/frontend && pnpm preview --port 4173 --host 127.0.0.1`,
  );
}

function run(command, args, options = { cwd: rootDir }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function main() {
  const withEquals = process.argv.find((a) => a.startsWith("--config="));
  const idx = process.argv.indexOf("--config");
  const configPath = withEquals
    ? withEquals.slice("--config=".length)
    : idx >= 0 && process.argv[idx + 1]
      ? process.argv[idx + 1]
      : path.join(__dirname, "lighthouserc.ci.json");
  const config = path.isAbsolute(configPath) ? configPath : path.resolve(rootDir, configPath);

  console.log("Building frontend…");
  await run("pnpm", ["--filter", "@fitvibe/frontend", "run", "build"]);

  console.log("Starting preview server on http://127.0.0.1:4173 …");
  const preview = spawn(
    "pnpm",
    [
      "--filter",
      "@fitvibe/frontend",
      "exec",
      "vite",
      "preview",
      "--port",
      "4173",
      "--host",
      "127.0.0.1",
    ],
    {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  try {
    await waitForServer();
    console.log("Running Lighthouse CI…");
    const chromePath = await new Promise((res, rej) => {
      const n = spawn(
        "node",
        [
          "-e",
          "const { chromium } = require('@playwright/test'); console.log(chromium.executablePath());",
        ],
        {
          cwd: rootDir,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let out = "";
      n.stdout?.on("data", (d) => (out += d));
      n.on("exit", (code) =>
        code === 0 ? res(out.trim()) : rej(new Error("Could not get Chrome path")),
      );
    });
    await run("pnpm", ["exec", "lhci", "autorun", "--config", config], {
      env: { ...process.env, CHROME_PATH: chromePath, LHCI_PORT: "4173" },
    });
    console.log("✅ Lighthouse CI finished.");
  } finally {
    preview.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
