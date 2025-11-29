#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const passthroughArgs = process.argv.slice(2).filter((arg) => {
  if (arg === "--runInBand" || arg === "--run-in-band") {
    return false;
  }

  if (arg.startsWith("--runInBand=") || arg.startsWith("--run-in-band=")) {
    return false;
  }

  return true;
});

const require = createRequire(import.meta.url);
const vitestPkgPath = require.resolve("vitest/package.json");
const vitestPkg = require("vitest/package.json");
const binEntry =
  typeof vitestPkg.bin === "string"
    ? vitestPkg.bin
    : (vitestPkg.bin?.vitest ?? vitestPkg.bin?.["vitest"]);

if (!binEntry) {
  console.error("[test] Unable to locate the Vitest binary entry point");
  process.exit(1);
}

const vitestBinPath = resolve(dirname(vitestPkgPath), binEntry);

// Set Node.js memory limit to prevent OOM errors
// Default is ~2GB on 64-bit systems, increase to 6GB for test runs
// Check if NODE_OPTIONS already contains memory limit
const existingNodeOptions = process.env.NODE_OPTIONS || "";
const hasMemoryLimit = existingNodeOptions.includes("--max-old-space-size");

// Build NODE_OPTIONS with memory limit
const nodeOptions = hasMemoryLimit
  ? existingNodeOptions
  : existingNodeOptions
    ? `${existingNodeOptions} --max-old-space-size=6144`.trim()
    : "--max-old-space-size=6144";

const env = {
  ...process.env,
  NODE_OPTIONS: nodeOptions,
};

// Also set it directly in the execPath args for better compatibility
const nodeArgs = ["--max-old-space-size=6144"];

const result = spawnSync(
  process.execPath,
  [...nodeArgs, vitestBinPath, "run", "--passWithNoTests", ...passthroughArgs],
  { stdio: "inherit", env },
);

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
