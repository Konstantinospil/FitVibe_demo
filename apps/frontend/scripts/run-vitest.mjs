#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve, join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Ensure coverage directory exists before running tests
// This prevents ENOENT errors when Vitest tries to write coverage files
// Use recursive: true to create parent directories if needed
const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = dirname(scriptPath);
const frontendDir = resolve(scriptDir, "..");
const coverageDir = join(frontendDir, "coverage");
const coverageTmpDir = join(coverageDir, ".tmp");

// Create directories with error handling for race conditions
// Multiple processes might try to create the same directory simultaneously
try {
  if (!existsSync(coverageDir)) {
    mkdirSync(coverageDir, { recursive: true });
  }
} catch (error) {
  // Ignore EEXIST errors (directory already exists)
  // This can happen in race conditions with parallel test execution
  if (error.code !== "EEXIST") {
    console.warn(`Warning: Failed to create coverage directory: ${error.message}`);
  }
}

try {
  if (!existsSync(coverageTmpDir)) {
    mkdirSync(coverageTmpDir, { recursive: true });
  }
} catch (error) {
  // Ignore EEXIST errors (directory already exists)
  // This can happen in race conditions with parallel test execution
  if (error.code !== "EEXIST") {
    console.warn(`Warning: Failed to create coverage temp directory: ${error.message}`);
  }
}

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

// Add --no-watch and --run flags to ensure tests exit cleanly
// --run ensures tests run once and exit (not in watch mode)
// This helps prevent hanging processes
const vitestArgs = ["run", "--passWithNoTests"];
// Only add --no-watch if not already in passthrough args
if (!passthroughArgs.includes("--watch") && !passthroughArgs.includes("-w")) {
  vitestArgs.push("--no-watch");
}

const result = spawnSync(
  process.execPath,
  [...nodeArgs, vitestBinPath, ...vitestArgs, ...passthroughArgs],
  { stdio: "inherit", env },
);

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
