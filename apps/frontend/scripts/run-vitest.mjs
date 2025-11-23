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

const result = spawnSync(
  process.execPath,
  [vitestBinPath, "run", "--passWithNoTests", ...passthroughArgs],
  { stdio: "inherit" },
);

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
