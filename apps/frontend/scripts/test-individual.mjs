#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
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

// Get all test files from command line args or find them
const testFiles = process.argv.slice(2);

if (testFiles.length === 0) {
  console.error("Usage: node test-individual.mjs <test-file1> [test-file2] ...");
  console.error("Or pipe test files: find ... | xargs node test-individual.mjs");
  process.exit(1);
}

// Set Node.js memory limit
const nodeArgs = ["--max-old-space-size=6144"];
const nodeOptions = process.env.NODE_OPTIONS || "";
const hasMemoryLimit = nodeOptions.includes("--max-old-space-size");
const env = {
  ...process.env,
  NODE_OPTIONS: hasMemoryLimit ? nodeOptions : `${nodeOptions} --max-old-space-size=6144`.trim(),
};

const results = [];

const frontendDir = resolve(__dirname, "..");

for (const testFile of testFiles) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  let peakMemoryMB = startMemory.heapUsed / 1024 / 1024;

  // Convert absolute path to relative path from frontend directory
  let relativePath = testFile;
  if (testFile.startsWith(frontendDir)) {
    relativePath = testFile.replace(frontendDir + "/", "").replace(/\\/g, "/");
  } else if (!testFile.startsWith("tests/")) {
    // If it's not already relative, try to make it relative
    relativePath = testFile.replace(/.*\/tests\//, "tests/").replace(/\\/g, "/");
  }

  console.log(`\n${"=".repeat(80)}`);
  console.log(`Running: ${relativePath}`);
  console.log(`${"=".repeat(80)}`);

  // Monitor memory during execution (sample every 100ms)
  const memoryMonitor = setInterval(() => {
    const mem = process.memoryUsage();
    const memMB = mem.heapUsed / 1024 / 1024;
    if (memMB > peakMemoryMB) {
      peakMemoryMB = memMB;
    }
  }, 100);

  const result = spawnSync(
    process.execPath,
    [...nodeArgs, vitestBinPath, "run", "--reporter=verbose", "--no-coverage", relativePath],
    {
      stdio: "inherit",
      env,
      cwd: frontendDir,
    },
  );

  clearInterval(memoryMonitor);

  const endTime = Date.now();
  const endMemory = process.memoryUsage();
  const duration = endTime - startTime;
  const finalMemoryMB = endMemory.heapUsed / 1024 / 1024;
  if (finalMemoryMB > peakMemoryMB) {
    peakMemoryMB = finalMemoryMB;
  }
  const memoryUsed = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024; // MB

  results.push({
    file: relativePath,
    duration,
    memoryUsed: Math.max(0, memoryUsed), // Can be negative if GC ran
    peakMemory: peakMemoryMB,
    passed: result.status === 0,
    exitCode: result.status,
  });

  console.log(`\nTime: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
  console.log(`Memory: ${memoryUsed.toFixed(2)}MB used, ${peakMemoryMB.toFixed(2)}MB peak`);
  console.log(`Status: ${result.status === 0 ? "PASSED" : "FAILED"}`);
}

// Summary
console.log(`\n${"=".repeat(80)}`);
console.log("SUMMARY");
console.log(`${"=".repeat(80)}`);
console.log(`Total tests: ${results.length}`);
console.log(`Passed: ${results.filter((r) => r.passed).length}`);
console.log(`Failed: ${results.filter((r) => !r.passed).length}`);
console.log(`Total time: ${results.reduce((sum, r) => sum + r.duration, 0)}ms`);
console.log(
  `Average time: ${(results.reduce((sum, r) => sum + r.duration, 0) / results.length).toFixed(2)}ms`,
);
console.log(`Max peak memory: ${Math.max(...results.map((r) => r.peakMemory)).toFixed(2)}MB`);

console.log(`\n${"=".repeat(80)}`);
console.log("DETAILED RESULTS (sorted by duration)");
console.log(`${"=".repeat(80)}`);
results
  .sort((a, b) => b.duration - a.duration)
  .forEach((r) => {
    console.log(
      `${r.passed ? "✓" : "×"} ${r.file.padEnd(60)} ${r.duration.toString().padStart(6)}ms  ${r.peakMemory.toFixed(2).padStart(8)}MB`,
    );
  });

process.exit(results.some((r) => !r.passed) ? 1 : 0);
