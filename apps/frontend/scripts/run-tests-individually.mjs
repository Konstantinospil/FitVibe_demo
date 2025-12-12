#!/usr/bin/env node
import { spawnSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

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
const frontendDir = resolve(__dirname, "..");
const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

// Set Node.js memory limit
const nodeArgs = ["--max-old-space-size=6144"];
const nodeOptions = process.env.NODE_OPTIONS || "";
const hasMemoryLimit = nodeOptions.includes("--max-old-space-size");
const env = {
  ...process.env,
  VITEST: "true",
  NODE_OPTIONS: hasMemoryLimit ? nodeOptions : `${nodeOptions} --max-old-space-size=6144`.trim(),
};

// Get all test files
const testFiles = process.argv.slice(2);

if (testFiles.length === 0) {
  console.error("Usage: node run-tests-individually.mjs <test-file1> [test-file2] ...");
  console.error("Or: find ../../tests/frontend -name '*.test.ts' -o -name '*.test.tsx' | xargs node run-tests-individually.mjs");
  process.exit(1);
}

const results = [];
const slowTests = [];
const stuckTests = [];

function analyzeTimingIssues(testFile, duration) {
  const issues = [];
  
  // Check if test file exists and read it
  let testContent = "";
  try {
    const fullPath = testFile.startsWith("tests/") 
      ? resolve(frontendDir, "..", "..", testFile)
      : resolve(frontendDir, testFile);
    testContent = readFileSync(fullPath, "utf-8");
  } catch (err) {
    issues.push(`Could not read test file: ${err.message}`);
    return issues;
  }

  // Check for common timing issues
  const checks = [
    {
      pattern: /waitFor|waitForElementToBeRemoved|waitForElement|findBy/i,
      issue: "Uses waitFor/findBy without explicit timeout - may wait too long",
      fix: "Add explicit timeout: waitFor(..., { timeout: 5000 })"
    },
    {
      pattern: /setTimeout|setInterval/i,
      issue: "Uses setTimeout/setInterval - may cause timing issues",
      fix: "Use fake timers: vi.useFakeTimers() and vi.advanceTimersByTime()"
    },
    {
      pattern: /sleep|delay|pause/i,
      issue: "Uses sleep/delay/pause - may cause slow tests",
      fix: "Use fake timers or waitFor with proper conditions"
    },
    {
      pattern: /vi\.useRealTimers\(\)/i,
      issue: "Uses real timers - may cause slow tests",
      fix: "Consider using fake timers for faster execution"
    },
    {
      pattern: /beforeAll|beforeEach.*async/i,
      issue: "Has async setup hooks - may cause delays",
      fix: "Ensure setup hooks complete quickly or have timeouts"
    },
    {
      pattern: /afterAll|afterEach.*async/i,
      issue: "Has async teardown hooks - may cause delays",
      fix: "Ensure teardown hooks complete quickly or have timeouts"
    },
    {
      pattern: /testTimeout|hookTimeout/i,
      issue: "Custom timeout settings found",
      fix: "Check if timeout is too high or causing issues"
    },
    {
      pattern: /fetch|axios|http/i,
      issue: "Makes HTTP requests - may hang if not mocked",
      fix: "Ensure all HTTP requests are properly mocked"
    },
    {
      pattern: /\.then\(|await.*then/i,
      issue: "Uses promises - may hang if not resolved",
      fix: "Ensure all promises resolve/reject with timeouts"
    },
    {
      pattern: /while.*true|for.*;;/i,
      issue: "Potential infinite loop",
      fix: "Add loop termination conditions"
    }
  ];

  for (const check of checks) {
    if (check.pattern.test(testContent)) {
      issues.push({
        type: check.issue,
        fix: check.fix,
        pattern: check.pattern.toString()
      });
    }
  }

  // Check for missing timeouts in waitFor
  const waitForMatches = testContent.matchAll(/waitFor\s*\([^)]*\)/gi);
  for (const match of waitForMatches) {
    if (!match[0].includes("timeout")) {
      issues.push({
        type: "waitFor without explicit timeout",
        fix: "Add timeout option: waitFor(..., { timeout: 5000 })",
        pattern: match[0]
      });
    }
  }

  return issues;
}

async function runTest(testFile) {
  const startTime = Date.now();
  
  // Convert to relative path
  let relativePath = testFile;
  if (testFile.startsWith(frontendDir)) {
    relativePath = testFile.replace(frontendDir + "/", "").replace(/\\/g, "/");
  } else if (!testFile.startsWith("tests/")) {
    relativePath = testFile.replace(/.*\/tests\//, "tests/").replace(/\\/g, "/");
  }

  console.log(`\n${"=".repeat(80)}`);
  console.log(`Running: ${relativePath}`);
  console.log(`${"=".repeat(80)}`);

  return new Promise((resolve) => {
    let timedOut = false;
    let killed = false;

    const timeoutId = setTimeout(() => {
      if (!killed) {
        timedOut = true;
        console.log(`\n⚠️  TEST TIMED OUT after 2 minutes!`);
        console.log(`Killing process...`);
        testProcess.kill("SIGKILL");
        killed = true;
      }
    }, TIMEOUT_MS);

    const testProcess = spawn(
      process.execPath,
      [...nodeArgs, vitestBinPath, "run", "--reporter=verbose", "--no-coverage", "--run", relativePath],
      {
        stdio: "inherit",
        env,
        cwd: frontendDir,
      }
    );

    testProcess.on("exit", (code, signal) => {
      clearTimeout(timeoutId);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const result = {
        file: relativePath,
        duration,
        passed: code === 0 && !timedOut,
        exitCode: code,
        signal,
        timedOut,
      };

      if (timedOut) {
        stuckTests.push(result);
        console.log(`\n🔴 STUCK TEST: ${relativePath}`);
        console.log(`Duration: ${duration}ms (exceeded ${TIMEOUT_MS}ms timeout)`);
        
        // Analyze timing issues
        const issues = analyzeTimingIssues(relativePath, duration);
        if (issues.length > 0) {
          console.log(`\n📋 TIMING ISSUES DETECTED:`);
          issues.forEach((issue, idx) => {
            if (typeof issue === "string") {
              console.log(`  ${idx + 1}. ${issue}`);
            } else {
              console.log(`  ${idx + 1}. ${issue.type}`);
              console.log(`     Fix: ${issue.fix}`);
            }
          });
          result.timingIssues = issues;
        } else {
          console.log(`\n⚠️  No obvious timing issues detected in code.`);
          console.log(`   This may be a deeper issue (infinite loop, hanging promise, etc.)`);
        }
      } else if (duration > TIMEOUT_MS) {
        slowTests.push(result);
        console.log(`\n🟡 SLOW TEST: ${relativePath}`);
        console.log(`Duration: ${duration}ms (exceeded ${TIMEOUT_MS}ms but completed)`);
        
        const issues = analyzeTimingIssues(relativePath, duration);
        if (issues.length > 0) {
          console.log(`\n📋 POTENTIAL TIMING ISSUES:`);
          issues.forEach((issue, idx) => {
            if (typeof issue === "string") {
              console.log(`  ${idx + 1}. ${issue}`);
            } else {
              console.log(`  ${idx + 1}. ${issue.type}`);
              console.log(`     Fix: ${issue.fix}`);
            }
          });
          result.timingIssues = issues;
        }
      }

      results.push(result);
      resolve(result);
    });

    testProcess.on("error", (error) => {
      clearTimeout(timeoutId);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.error(`\n❌ ERROR running test: ${error.message}`);
      results.push({
        file: relativePath,
        duration,
        passed: false,
        exitCode: null,
        error: error.message,
      });
      resolve();
    });
  });
}

// Run all tests sequentially
async function runAllTests() {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`RUNNING ${testFiles.length} TESTS INDIVIDUALLY`);
  console.log(`Timeout threshold: ${TIMEOUT_MS / 1000}s per test`);
  console.log(`${"=".repeat(80)}`);

  for (let i = 0; i < testFiles.length; i++) {
    const testFile = testFiles[i];
    console.log(`\n[${i + 1}/${testFiles.length}]`);
    await runTest(testFile);
  }

  // Summary
  console.log(`\n${"=".repeat(80)}`);
  console.log("SUMMARY");
  console.log(`${"=".repeat(80)}`);
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${results.filter((r) => r.passed).length}`);
  console.log(`Failed: ${results.filter((r) => !r.passed && !r.timedOut).length}`);
  console.log(`Stuck (timed out): ${stuckTests.length}`);
  console.log(`Slow (>${TIMEOUT_MS / 1000}s): ${slowTests.length}`);
  console.log(`Total time: ${results.reduce((sum, r) => sum + r.duration, 0)}ms`);
  console.log(
    `Average time: ${(results.reduce((sum, r) => sum + r.duration, 0) / results.length).toFixed(2)}ms`,
  );

  if (stuckTests.length > 0) {
    console.log(`\n${"=".repeat(80)}`);
    console.log("🔴 STUCK TESTS (timed out after 2 minutes)");
    console.log(`${"=".repeat(80)}`);
    stuckTests.forEach((r) => {
      console.log(`\n❌ ${r.file}`);
      console.log(`   Duration: ${r.duration}ms`);
      if (r.timingIssues && r.timingIssues.length > 0) {
        console.log(`   Issues found: ${r.timingIssues.length}`);
      }
    });
  }

  if (slowTests.length > 0) {
    console.log(`\n${"=".repeat(80)}`);
    console.log("🟡 SLOW TESTS (>2 minutes but completed)");
    console.log(`${"=".repeat(80)}`);
    slowTests.forEach((r) => {
      console.log(`\n⚠️  ${r.file}`);
      console.log(`   Duration: ${r.duration}ms`);
      if (r.timingIssues && r.timingIssues.length > 0) {
        console.log(`   Issues found: ${r.timingIssues.length}`);
      }
    });
  }

  console.log(`\n${"=".repeat(80)}`);
  console.log("DETAILED RESULTS (sorted by duration)");
  console.log(`${"=".repeat(80)}`);
  results
    .sort((a, b) => b.duration - a.duration)
    .forEach((r) => {
      const status = r.timedOut ? "🔴 STUCK" : r.passed ? "✓" : "×";
      const timeStr = r.timedOut ? "TIMEOUT" : `${r.duration}ms`;
      console.log(
        `${status} ${r.file.padEnd(60)} ${timeStr.padStart(10)}`,
      );
    });

  process.exit(stuckTests.length > 0 || results.some((r) => !r.passed && !r.timedOut) ? 1 : 0);
}

runAllTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

