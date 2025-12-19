#!/usr/bin/env node
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(__dirname, "../../apps/frontend");
const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

const testFile = process.argv[2];

if (!testFile) {
  console.error("Usage: node run-single-test.mjs <test-file>");
  process.exit(1);
}

const require = createRequire(resolve(frontendDir, "package.json"));
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
const nodeArgs = ["--max-old-space-size=6144"];

console.log(`Running: ${testFile}`);
console.log(`Timeout: ${TIMEOUT_MS / 1000}s\n`);

const startTime = Date.now();
let timedOut = false;

const timeoutId = setTimeout(() => {
  if (!timedOut) {
    timedOut = true;
    console.error(`\n⚠️  TEST TIMED OUT after ${TIMEOUT_MS / 1000} seconds!`);
    testProcess.kill("SIGKILL");
    process.exit(1);
  }
}, TIMEOUT_MS);

const testProcess = spawn(
  process.execPath,
  [...nodeArgs, vitestBinPath, "run", "--reporter=verbose", "--no-coverage", testFile],
  {
    stdio: "inherit",
    cwd: frontendDir,
    env: {
      ...process.env,
      VITEST: "true",
      NODE_OPTIONS: process.env.NODE_OPTIONS 
        ? `${process.env.NODE_OPTIONS} --max-old-space-size=6144`.trim()
        : "--max-old-space-size=6144",
    },
  },
);

testProcess.on("exit", (code, signal) => {
  clearTimeout(timeoutId);
  const duration = Date.now() - startTime;
  
  if (timedOut) {
    console.error(`Test was killed after ${duration}ms`);
    process.exit(1);
  } else if (code === 0) {
    console.log(`\n✅ PASSED (${duration}ms)`);
    process.exit(0);
  } else {
    console.log(`\n❌ FAILED (exit code: ${code}, duration: ${duration}ms)`);
    process.exit(code || 1);
  }
});

testProcess.on("error", (error) => {
  clearTimeout(timeoutId);
  console.error(`\n❌ ERROR: ${error.message}`);
  process.exit(1);
});

