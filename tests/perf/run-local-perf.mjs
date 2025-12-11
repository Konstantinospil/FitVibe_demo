#!/usr/bin/env node
/* eslint-disable no-console */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const summaryPath = path.resolve("tests/perf/k6-summary.json");
const mockServerScript = path.resolve("tests/perf/mock-server.mjs");
const healthUrl = "http://127.0.0.1:4173/health";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // ignore while server boots
    }
    await delay(500);
  }
  throw new Error("Mock server did not report healthy in time.");
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function main() {
  console.log("Starting mock server for k6 smoke test…");
  const mockServer = spawn(process.execPath, [mockServerScript], {
    stdio: ["ignore", "inherit", "inherit"],
  });

  try {
    await waitForHealth();

    if (fs.existsSync(summaryPath)) {
      fs.rmSync(summaryPath);
    }

    console.log("Running k6 scenario…");
    await runCommand("k6", ["run", "--summary-export", summaryPath, "tests/perf/k6-smoke.js"]);

    console.log("Validating performance budgets…");
    await runCommand(process.execPath, ["tests/perf/assert-budgets.cjs", summaryPath]);
    console.log("✅ k6 budgets satisfied.");
  } finally {
    mockServer.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
