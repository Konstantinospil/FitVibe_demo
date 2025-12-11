#!/usr/bin/env node
/**
 * Test Manager - Runs test suite and creates database of test results
 *
 * Collects:
 * - Test results (Jest, Vitest)
 * - Last run time and result for each test
 * - Failing tests database
 *
 * Outputs: .cursor/test-database/tests.json
 *
 * Performance:
 * - NO LLM USAGE - Pure test execution and JSON parsing
 * - Zero token costs - Only parses test runner JSON output
 * - Minimal overhead - Runs tests once, efficient JSON parsing
 * - Fast execution - No external API calls
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..", ".."); // .cursor/scripts -> .cursor -> root
const TEST_DB_DIR = join(__dirname, "..", "test-database"); // .cursor/test-database
const TEST_DB_FILE = join(TEST_DB_DIR, "tests.json");

// Ensure test database directory exists
if (!existsSync(TEST_DB_DIR)) {
  mkdirSync(TEST_DB_DIR, { recursive: true });
}

/**
 * Run command and capture output
 */
function runCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: "utf-8",
      cwd: ROOT_DIR,
      maxBuffer: 50 * 1024 * 1024,
      stdio: "pipe",
      ...options,
    });
    return { success: true, output: result, error: null, exitCode: 0 };
  } catch (error) {
    return {
      success: false,
      output: error.stdout?.toString() || "",
      error: error.stderr?.toString() || "",
      exitCode: error.status || 1,
      fullOutput: (error.stdout?.toString() || "") + (error.stderr?.toString() || ""),
    };
  }
}

/**
 * Normalize file path to be relative to root
 */
function normalizePath(filePath) {
  if (!filePath) return filePath;
  // Handle Windows paths
  const normalized = filePath.replace(/\\/g, "/");
  // Make relative to root if absolute
  if (normalized.startsWith("/") || /^[A-Z]:/.test(normalized)) {
    try {
      return relative(ROOT_DIR, normalized).replace(/\\/g, "/");
    } catch {
      return normalized;
    }
  }
  return normalized;
}

/**
 * Generate test ID from test data
 */
function generateTestId(file, testName, suite) {
  const parts = [];
  if (file) parts.push(normalizePath(file).replace(/[^a-zA-Z0-9]/g, "-"));
  if (suite) parts.push(suite.replace(/[^a-zA-Z0-9]/g, "-"));
  if (testName) parts.push(testName.replace(/[^a-zA-Z0-9]/g, "-"));
  return parts.join("-").toLowerCase();
}

/**
 * Collect Jest test results (both passing and failing)
 */
function collectJestResults() {
  console.log("🔍 Collecting Jest test results...");
  const tests = [];

  // Run Jest with JSON output - always check output even if exit code is 0
  const result = runCommand("pnpm --filter @fitvibe/backend test -- --json --passWithNoTests", {
    stdio: "pipe",
  });

  const output = result.output || result.fullOutput || "";
  const lines = output.split("\n");

  // Find JSON output - Jest outputs JSON as a single line
  let jsonLine = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("{") && trimmed.includes('"testResults"')) {
      jsonLine = trimmed;
      break;
    }
  }

  // Also try to find JSON in error output
  if (!jsonLine && result.error) {
    const errorLines = result.error.split("\n");
    for (const line of errorLines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("{") && trimmed.includes('"testResults"')) {
        jsonLine = trimmed;
        break;
      }
    }
  }

  if (jsonLine) {
    try {
      const jestResults = JSON.parse(jsonLine);

      if (jestResults.testResults && Array.isArray(jestResults.testResults)) {
        jestResults.testResults.forEach((testFile) => {
          const filePath = normalizePath(testFile.name);
          const startTime = testFile.startTime || Date.now();
          const endTime = testFile.endTime || Date.now();
          const lastRunTime = new Date(endTime).toISOString();

          if (testFile.assertionResults && Array.isArray(testFile.assertionResults)) {
            testFile.assertionResults.forEach((test) => {
              const testName = test.title || "Unknown test";
              const suite = test.ancestorTitles?.join(" > ") || "Unknown";
              const status = test.status || "unknown"; // "passed", "failed", "pending", "todo", "skipped"
              const duration = test.duration || 0;
              const failureMessages = test.status === "failed" ? (test.failureMessages || []) : [];
              const message = failureMessages.join("\n") || null;

              tests.push({
                id: generateTestId(filePath, testName, suite),
                type: "jest",
                category: filePath.includes("integration") ? "backend-integration" : "backend-unit",
                file: filePath,
                testName: testName,
                suite: suite,
                status: status === "passed" ? "passing" : status === "failed" ? "failing" : status,
                result: status, // "passed", "failed", "pending", "todo", "skipped"
                lastRunTime: lastRunTime,
                duration: duration,
                failureMessage: message,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            });
          }
        });
      }
    } catch (e) {
      console.warn("⚠️  Could not parse Jest JSON output:", e.message);
    }
  } else if (!result.success || result.exitCode !== 0) {
    console.warn("⚠️  Jest command failed but could not parse JSON output");
  }

  return tests;
}

/**
 * Collect Vitest test results (both passing and failing)
 */
function collectVitestResults() {
  console.log("🔍 Collecting Vitest test results...");
  const tests = [];

  // Run Vitest with JSON output
  const result = runCommand("pnpm --filter @fitvibe/frontend test -- --reporter=json --run", {
    stdio: "pipe",
  });

  const output = result.output || result.fullOutput || result.error || "";
  const lines = output.split("\n");

  // Find JSON output - Vitest outputs JSON as a single line or multiple lines
  let jsonContent = null;
  let jsonStart = -1;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("{") && line.includes("testResults")) {
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

  if (jsonContent) {
    try {
      const vitestResults = JSON.parse(jsonContent);

      // Vitest JSON structure may vary, try different formats
      const testResults = vitestResults.testResults || vitestResults.results || [];
      const startTime = vitestResults.startTime || Date.now();
      const endTime = vitestResults.endTime || Date.now();
      const lastRunTime = new Date(endTime).toISOString();

      if (Array.isArray(testResults)) {
        testResults.forEach((testFile) => {
          const filePath = normalizePath(testFile.name || testFile.file || testFile.filePath);
          const assertions = testFile.assertionResults || testFile.tests || [];

          if (Array.isArray(assertions)) {
            assertions.forEach((test) => {
              const status = test.status || test.state || "unknown";
              const testName = test.title || test.name || "Unknown test";
              const suite = test.ancestorTitles?.join(" > ") || test.suite || "Unknown";
              const duration = test.duration || 0;
              const failureMessages = status === "failed" || status === "fail" ? (test.failureMessages || test.errors || []) : [];
              const message = Array.isArray(failureMessages)
                ? failureMessages.map((m) => (typeof m === "string" ? m : m.message || JSON.stringify(m))).join("\n")
                : failureMessages || null;

              const resultStatus = status === "passed" || status === "pass" ? "passing" : status === "failed" || status === "fail" ? "failing" : status;

              tests.push({
                id: generateTestId(filePath, testName, suite),
                type: "vitest",
                category: "frontend-unit",
                file: filePath,
                testName: testName,
                suite: suite,
                status: resultStatus,
                result: status, // "passed", "failed", "pending", "todo", "skipped"
                lastRunTime: lastRunTime,
                duration: duration,
                failureMessage: message,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            });
          }
        });
      }
    } catch (e) {
      console.warn("⚠️  Could not parse Vitest JSON output:", e.message);
    }
  } else if (!result.success || result.exitCode !== 0) {
    console.warn("⚠️  Vitest command failed but could not parse JSON output");
  }

  return tests;
}

/**
 * Load existing test database
 */
function loadTestDatabase() {
  if (existsSync(TEST_DB_FILE)) {
    try {
      const content = readFileSync(TEST_DB_FILE, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.warn("⚠️  Could not load existing test database:", e.message);
    }
  }

  return {
    version: "1.0.0",
    lastUpdated: null,
    tests: [],
    stats: {
      total: 0,
      passing: 0,
      failing: 0,
      pending: 0,
      skipped: 0,
      byType: {},
      byCategory: {},
    },
  };
}

/**
 * Merge new test results with existing ones
 */
function mergeTestResults(existing, newTests) {
  const existingMap = new Map();
  existing.tests.forEach((test) => {
    existingMap.set(test.id, test);
  });

  const merged = [];
  const newTestIds = new Set();

  newTests.forEach((newTest) => {
    newTestIds.add(newTest.id);
    const existingTest = existingMap.get(newTest.id);

    if (existingTest) {
      // Update existing test with new run information
      existingTest.lastRunTime = newTest.lastRunTime;
      existingTest.result = newTest.result;
      existingTest.status = newTest.status;
      existingTest.duration = newTest.duration;
      existingTest.failureMessage = newTest.failureMessage;
      existingTest.updatedAt = new Date().toISOString();

      // Track status changes
      if (existingTest.status !== newTest.status) {
        existingTest.statusHistory = existingTest.statusHistory || [];
        existingTest.statusHistory.push({
          from: existingTest.status,
          to: newTest.status,
          changedAt: new Date().toISOString(),
        });
      }

      merged.push(existingTest);
    } else {
      // New test
      merged.push(newTest);
    }
  });

  // Keep tests that weren't run this time (they may have been removed or not executed)
  // But mark them as potentially stale
  existing.tests.forEach((test) => {
    if (!newTestIds.has(test.id)) {
      // Test wasn't run - keep it but mark as potentially stale
      merged.push(test);
    }
  });

  return merged;
}

/**
 * Calculate statistics
 */
function calculateStats(tests) {
  const stats = {
    total: tests.length,
    passing: tests.filter((t) => t.status === "passing" || t.result === "passed").length,
    failing: tests.filter((t) => t.status === "failing" || t.result === "failed").length,
    pending: tests.filter((t) => t.result === "pending" || t.result === "todo").length,
    skipped: tests.filter((t) => t.result === "skipped").length,
    byType: {},
    byCategory: {},
  };

  tests.forEach((test) => {
    stats.byType[test.type] = (stats.byType[test.type] || 0) + 1;
    stats.byCategory[test.category] = (stats.byCategory[test.category] || 0) + 1;
  });

  return stats;
}

/**
 * Get failing tests for repair planning
 */
function getFailingTests(tests) {
  return tests.filter((test) => test.status === "failing" || test.result === "failed");
}

/**
 * Main collection function
 */
function main() {
  console.log("🧪 Test Manager - Starting test execution and collection...\n");

  const existingDb = loadTestDatabase();

  // Collect all test results
  const jestTests = collectJestResults();
  const vitestTests = collectVitestResults();

  const allNewTests = [...jestTests, ...vitestTests];

  console.log(`\n📊 Collection Summary:`);
  console.log(`   Jest tests: ${jestTests.length}`);
  console.log(`   Vitest tests: ${vitestTests.length}`);
  console.log(`   Total tests collected: ${allNewTests.length}`);

  // Merge with existing tests
  const mergedTests = mergeTestResults(existingDb, allNewTests);
  const stats = calculateStats(mergedTests);
  const failingTests = getFailingTests(mergedTests);

  // Save test database
  const updatedDb = {
    ...existingDb,
    lastUpdated: new Date().toISOString(),
    tests: mergedTests,
    stats,
    failingTests: failingTests.length,
  };

  writeFileSync(TEST_DB_FILE, JSON.stringify(updatedDb, null, 2), "utf-8");

  console.log(`\n✅ Test database updated:`);
  console.log(`   Total tests: ${stats.total}`);
  console.log(`   Passing: ${stats.passing}`);
  console.log(`   Failing: ${stats.failing}`);
  console.log(`   Pending: ${stats.pending}`);
  console.log(`   Skipped: ${stats.skipped}`);
  console.log(`\n📁 Database saved to: ${TEST_DB_FILE}`);

  if (failingTests.length > 0) {
    console.log(`\n❌ Failing tests (${failingTests.length}):`);
    failingTests.slice(0, 10).forEach((test) => {
      console.log(`   - ${test.file}: ${test.testName}`);
    });
    if (failingTests.length > 10) {
      console.log(`   ... and ${failingTests.length - 10} more`);
    }
    console.log(`\n💡 Use the test database to plan and streamline test repairs.`);
  } else {
    console.log(`\n✅ All tests passing!`);
  }

  // Exit with error code if there are failing tests
  if (stats.failing > 0) {
    process.exit(1);
  }
}

main();

