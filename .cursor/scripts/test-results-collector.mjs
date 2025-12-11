#!/usr/bin/env node
/**
 * Test Results Collector - Runs each test suite individually and records results
 *
 * Runs:
 * - Backend tests (Jest)
 * - Frontend tests (Vitest)
 *
 * Outputs: .cursor/test-database/test-results.json
 */

import { execSync } from "child_process";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..", "..");
const TEST_DB_DIR = join(__dirname, "..", "test-database");
const TEST_RESULTS_FILE = join(TEST_DB_DIR, "test-results.json");

// Ensure test database directory exists
if (!existsSync(TEST_DB_DIR)) {
  mkdirSync(TEST_DB_DIR, { recursive: true });
}

/**
 * Run command and capture output
 */
function runCommand(command, options = {}) {
  const startTime = Date.now();
  try {
    const result = execSync(command, {
      encoding: "utf-8",
      cwd: ROOT_DIR,
      maxBuffer: 100 * 1024 * 1024,
      stdio: "pipe",
      ...options,
    });
    const duration = Date.now() - startTime;
    return {
      success: true,
      output: result,
      error: null,
      exitCode: 0,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      output: error.stdout?.toString() || "",
      error: error.stderr?.toString() || "",
      exitCode: error.status || 1,
      fullOutput: (error.stdout?.toString() || "") + (error.stderr?.toString() || ""),
      duration,
    };
  }
}

/**
 * Run backend tests and collect results
 */
function runBackendTests() {
  console.log("🧪 Running backend tests...");
  const result = runCommand("corepack pnpm --filter @fitvibe/backend test -- --json --passWithNoTests", {
    stdio: "pipe",
  });

  const output = result.output || result.fullOutput || "";
  const lines = output.split("\n");

  // Find JSON output
  let jsonLine = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("{") && trimmed.includes('"testResults"')) {
      jsonLine = trimmed;
      break;
    }
  }

  let testResults = null;
  if (jsonLine) {
    try {
      testResults = JSON.parse(jsonLine);
    } catch (e) {
      console.warn("⚠️  Could not parse Jest JSON output:", e.message);
    }
  }

  return {
    suite: "backend",
    type: "jest",
    success: result.success,
    exitCode: result.exitCode,
    duration: result.duration,
    timestamp: new Date().toISOString(),
    rawOutput: output.substring(0, 10000), // First 10KB
    testResults: testResults,
    summary: testResults
      ? {
          numPassedTests: testResults.numPassedTests || 0,
          numFailedTests: testResults.numFailedTests || 0,
          numTotalTests: testResults.numTotalTests || 0,
          numPassedTestSuites: testResults.numPassedTestSuites || 0,
          numFailedTestSuites: testResults.numFailedTestSuites || 0,
          numTotalTestSuites: testResults.numTotalTestSuites || 0,
        }
      : null,
  };
}

/**
 * Run frontend tests and collect results
 */
function runFrontendTests() {
  console.log("🧪 Running frontend tests...");
  const result = runCommand("corepack pnpm --filter @fitvibe/frontend test -- --reporter=json --run", {
    stdio: "pipe",
  });

  const output = result.output || result.fullOutput || result.error || "";
  const lines = output.split("\n");

  // Find JSON output
  let jsonContent = null;
  let jsonStart = -1;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("{") && (line.includes("testResults") || line.includes("files"))) {
      jsonStart = i;
      jsonContent = line;
      braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;

      // If not complete, continue reading lines
      if (braceCount > 0) {
        for (let j = i + 1; j < lines.length && braceCount > 0; j++) {
          jsonContent += "\n" + lines[j];
          braceCount += (lines[j].match(/{/g) || []).length - (lines[j].match(/}/g) || []).length;
        }
      }
      break;
    }
  }

  let testResults = null;
  if (jsonContent) {
    try {
      testResults = JSON.parse(jsonContent);
    } catch (e) {
      console.warn("⚠️  Could not parse Vitest JSON output:", e.message);
    }
  }

  return {
    suite: "frontend",
    type: "vitest",
    success: result.success,
    exitCode: result.exitCode,
    duration: result.duration,
    timestamp: new Date().toISOString(),
    rawOutput: output.substring(0, 10000), // First 10KB
    testResults: testResults,
    summary: testResults
      ? {
          numPassedTests: testResults.numPassedTests || testResults.passed || 0,
          numFailedTests: testResults.numFailedTests || testResults.failed || 0,
          numTotalTests: testResults.numTotalTests || testResults.total || 0,
          numPassedTestSuites: testResults.numPassedTestSuites || 0,
          numFailedTestSuites: testResults.numFailedTestSuites || 0,
          numTotalTestSuites: testResults.numTotalTestSuites || 0,
        }
      : null,
  };
}

/**
 * Main function
 */
function main() {
  console.log("🧪 Test Results Collector - Running test suites individually...\n");

  const results = {
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    suites: [],
    summary: {
      totalSuites: 0,
      passedSuites: 0,
      failedSuites: 0,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
    },
  };

  // Run backend tests
  const backendResults = runBackendTests();
  results.suites.push(backendResults);
  if (backendResults.summary) {
    results.summary.totalTests += backendResults.summary.numTotalTests || 0;
    results.summary.passedTests += backendResults.summary.numPassedTests || 0;
    results.summary.failedTests += backendResults.summary.numFailedTests || 0;
  }
  if (backendResults.success) {
    results.summary.passedSuites++;
  } else {
    results.summary.failedSuites++;
  }
  results.summary.totalSuites++;

  console.log(
    `\n✅ Backend tests completed: ${backendResults.summary?.numPassedTests || 0} passed, ${backendResults.summary?.numFailedTests || 0} failed`,
  );

  // Run frontend tests
  const frontendResults = runFrontendTests();
  results.suites.push(frontendResults);
  if (frontendResults.summary) {
    results.summary.totalTests += frontendResults.summary.numTotalTests || 0;
    results.summary.passedTests += frontendResults.summary.numPassedTests || 0;
    results.summary.failedTests += frontendResults.summary.numFailedTests || 0;
  }
  if (frontendResults.success) {
    results.summary.passedSuites++;
  } else {
    results.summary.failedSuites++;
  }
  results.summary.totalSuites++;

  console.log(
    `✅ Frontend tests completed: ${frontendResults.summary?.numPassedTests || 0} passed, ${frontendResults.summary?.numFailedTests || 0} failed`,
  );

  // Save results
  writeFileSync(TEST_RESULTS_FILE, JSON.stringify(results, null, 2), "utf-8");

  console.log(`\n📊 Summary:`);
  console.log(`   Total suites: ${results.summary.totalSuites}`);
  console.log(`   Passed suites: ${results.summary.passedSuites}`);
  console.log(`   Failed suites: ${results.summary.failedSuites}`);
  console.log(`   Total tests: ${results.summary.totalTests}`);
  console.log(`   Passed tests: ${results.summary.passedTests}`);
  console.log(`   Failed tests: ${results.summary.failedTests}`);
  console.log(`\n📁 Results saved to: ${TEST_RESULTS_FILE}`);

  // Exit with error code if there are failures
  if (results.summary.failedSuites > 0 || results.summary.failedTests > 0) {
    process.exit(1);
  }
}

main();







