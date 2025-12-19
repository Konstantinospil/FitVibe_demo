#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(__dirname, "..");
const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

const testFile = process.argv[2];

if (!testFile) {
  console.error("Usage: node run-test-with-timeout.mjs <test-file>");
  process.exit(1);
}

const relativePath = testFile.startsWith("tests/") 
  ? testFile 
  : `tests/frontend/${testFile}`;

console.log(`Running: ${relativePath}`);
console.log(`Timeout: ${TIMEOUT_MS / 1000}s`);

return new Promise((resolve) => {
  let timedOut = false;
  let killed = false;

  const timeoutId = setTimeout(() => {
    if (!killed) {
      timedOut = true;
      console.error(`\n⚠️  TEST TIMED OUT after ${TIMEOUT_MS / 1000} seconds!`);
      console.error(`Killing process...`);
      testProcess.kill("SIGKILL");
      killed = true;
      resolve({ timedOut: true, exitCode: -1 });
    }
  }, TIMEOUT_MS);

  const testProcess = spawn(
    "pnpm",
    ["test", relativePath, "--run", "--reporter=verbose"],
    {
      stdio: "inherit",
      cwd: frontendDir,
    },
  );

  testProcess.on("exit", (code, signal) => {
    clearTimeout(timeoutId);
    if (!timedOut) {
      resolve({ timedOut: false, exitCode: code, signal });
    }
  });

  testProcess.on("error", (error) => {
    clearTimeout(timeoutId);
    console.error(`Error running test: ${error.message}`);
    resolve({ timedOut: false, exitCode: -1, error: error.message });
  });
}).then((result) => {
  if (result.timedOut) {
    process.exit(1);
  } else {
    process.exit(result.exitCode || 0);
  }
});

