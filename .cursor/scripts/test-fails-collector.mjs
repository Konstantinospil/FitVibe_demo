#!/usr/bin/env node
/**
 * Test Fails Collector - Collects failing tests and differentiates between test-bugs and functional gaps
 *
 * Collects:
 * - Failing test results (Jest, Vitest only)
 * - Classifies failures as "test-bug" or "functional-gap"
 *
 * Outputs: .cursor/test-database/test-fails.json
 *
 * Performance:
 * - NO LLM USAGE - Pure test execution and JSON parsing
 * - Zero token costs - Only parses test runner JSON output
 * - Minimal overhead - Only collects failing tests
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
const TEST_FAILS_FILE = join(TEST_DB_DIR, "test-fails.json");

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
 * Classify failure type based on error message and patterns
 * Returns: "test-bug" | "functional-gap" | "unknown"
 */
function classifyFailureType(failureMessage, testFile, testName) {
  if (!failureMessage) return "unknown";

  const message = failureMessage.toLowerCase();
  const file = (testFile || "").toLowerCase();

  // Test-bug indicators: Issues with test setup, imports, test infrastructure
  const testBugPatterns = [
    /cannot find module/i,
    /module not found/i,
    /cannot resolve/i,
    /referenceerror/i,
    /syntaxerror/i,
    /typeerror.*is not a function/i,
    /setup.*error/i,
    /teardown.*error/i,
    /beforeeach.*error/i,
    /beforeall.*error/i,
    /aftereach.*error/i,
    /afterall.*error/i,
    /test timeout/i,
    /exceeded timeout/i,
    /jest.*not found/i,
    /vitest.*not found/i,
    /mock.*not found/i,
    /spy.*not found/i,
    /stub.*not found/i,
    /fixture.*not found/i,
    /test.*file.*error/i,
    /import.*error/i,
    /require.*error/i,
    /cannot read property.*of undefined.*test/i,
    /undefined.*test/i,
    /missing.*test.*dependency/i,
  ];

  // Functional gap indicators: Business logic failures, assertion mismatches
  const functionalGapPatterns = [
    /expected.*but received/i,
    /expected.*but got/i,
    /assertion.*failed/i,
    /expect\(.*\)\.toBe\(/i,
    /expect\(.*\)\.toEqual\(/i,
    /expect\(.*\)\.toMatchObject\(/i,
    /should.*but/i,
    /validation.*failed/i,
    /business logic/i,
    /api.*error/i,
    /http.*error/i,
    /status.*code/i,
    /database.*error/i,
    /query.*failed/i,
    /authorization.*failed/i,
    /authentication.*failed/i,
    /permission.*denied/i,
    /invalid.*input/i,
    /missing.*required/i,
    /should return/i,
    /should throw/i,
    /should reject/i,
  ];

  // Check for test-bug patterns first (more specific)
  for (const pattern of testBugPatterns) {
    if (pattern.test(message) || pattern.test(file) || pattern.test(testName || "")) {
      return "test-bug";
    }
  }

  // Check for functional gap patterns
  for (const pattern of functionalGapPatterns) {
    if (pattern.test(message)) {
      return "functional-gap";
    }
  }

  // Additional heuristics
  // If error contains "expected" but doesn't match functional patterns, it's likely a functional gap
  if (/expected/.test(message) && !/cannot find|module not found|referenceerror/i.test(message)) {
    return "functional-gap";
  }

  // If error is in test file itself (syntax/runtime errors), it's likely a test-bug
  if (/syntaxerror|referenceerror|typeerror/.test(message) && /\.test\.|\.spec\./.test(file)) {
    return "test-bug";
  }

  return "unknown";
}

/**
 * Collect Jest test failures only
 */
function collectJestFailures() {
  console.log("🔍 Collecting Jest test failures...");
  const testFails = [];

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
              // Only collect failing tests
              if (test.status === "failed") {
                const testName = test.title || "Unknown test";
                const suite = test.ancestorTitles?.join(" > ") || "Unknown";
                const duration = test.duration || 0;
                const failureMessages = test.failureMessages || [];
                const message = failureMessages.join("\n") || "Test failed";
                const failureType = classifyFailureType(message, filePath, testName);

                testFails.push({
                  id: generateTestId(filePath, testName, suite),
                  type: "jest",
                  category: filePath.includes("integration") ? "backend-integration" : "backend-unit",
                  file: filePath,
                  testName: testName,
                  suite: suite,
                  status: "failing",
                  result: "failed",
                  failureType: failureType, // "test-bug" | "functional-gap" | "unknown"
                  lastRunTime: lastRunTime,
                  duration: duration,
                  failureMessage: message,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }
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

  return testFails;
}

/**
 * Collect Vitest test failures only
 */
function collectVitestFailures() {
  console.log("🔍 Collecting Vitest test failures...");
  const testFails = [];

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
              // Only collect failing tests
              if (status === "failed" || status === "fail") {
                const testName = test.title || test.name || "Unknown test";
                const suite = test.ancestorTitles?.join(" > ") || test.suite || "Unknown";
                const duration = test.duration || 0;
                const failureMessages = test.failureMessages || test.errors || [];
                const message = Array.isArray(failureMessages)
                  ? failureMessages.map((m) => (typeof m === "string" ? m : m.message || JSON.stringify(m))).join("\n")
                  : failureMessages || "Test failed";
                const failureType = classifyFailureType(message, filePath, testName);

                testFails.push({
                  id: generateTestId(filePath, testName, suite),
                  type: "vitest",
                  category: "frontend-unit",
                  file: filePath,
                  testName: testName,
                  suite: suite,
                  status: "failing",
                  result: "failed",
                  failureType: failureType, // "test-bug" | "functional-gap" | "unknown"
                  lastRunTime: lastRunTime,
                  duration: duration,
                  failureMessage: message,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }
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

  return testFails;
}

/**
 * Load existing test fails database
 */
function loadTestFailsDatabase() {
  if (existsSync(TEST_FAILS_FILE)) {
    try {
      const content = readFileSync(TEST_FAILS_FILE, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.warn("⚠️  Could not load existing test fails database:", e.message);
    }
  }

  return {
    version: "1.0.0",
    lastUpdated: null,
    testFails: [],
    stats: {
      total: 0,
      testBugs: 0,
      functionalGaps: 0,
      unknown: 0,
      byType: {},
      byCategory: {},
      byFailureType: {},
    },
  };
}

/**
 * Merge new test failures with existing ones
 */
function mergeTestFails(existing, newTestFails) {
  const existingMap = new Map();
  existing.testFails.forEach((testFail) => {
    existingMap.set(testFail.id, testFail);
  });

  const merged = [];
  const newTestFailIds = new Set();

  newTestFails.forEach((newTestFail) => {
    newTestFailIds.add(newTestFail.id);
    const existingTestFail = existingMap.get(newTestFail.id);

    if (existingTestFail) {
      // Update existing test failure with new run information
      existingTestFail.lastRunTime = newTestFail.lastRunTime;
      existingTestFail.status = newTestFail.status;
      existingTestFail.result = newTestFail.result;
      existingTestFail.duration = newTestFail.duration;
      existingTestFail.failureMessage = newTestFail.failureMessage;
      existingTestFail.failureType = newTestFail.failureType; // Update classification
      existingTestFail.updatedAt = new Date().toISOString();

      // Track status changes
      if (existingTestFail.status !== newTestFail.status) {
        existingTestFail.statusHistory = existingTestFail.statusHistory || [];
        existingTestFail.statusHistory.push({
          from: existingTestFail.status,
          to: newTestFail.status,
          changedAt: new Date().toISOString(),
        });
      }

      merged.push(existingTestFail);
    } else {
      // New test failure
      merged.push(newTestFail);
    }
  });

  // Remove tests that are no longer failing (they passed or were removed)
  // Keep only tests that are still failing or were in the new run
  const stillFailing = existing.testFails.filter((testFail) => {
    // Keep if it was in the new run (already merged) or if we don't have new data for it
    return newTestFailIds.has(testFail.id) || testFail.status === "failing";
  });

  // Merge with new test fails
  const finalMerged = [...merged];
  stillFailing.forEach((testFail) => {
    if (!newTestFailIds.has(testFail.id)) {
      // Test wasn't run this time but was failing before - keep it
      finalMerged.push(testFail);
    }
  });

  return finalMerged;
}

/**
 * Calculate statistics
 */
function calculateStats(testFails) {
  const stats = {
    total: testFails.length,
    testBugs: testFails.filter((t) => t.failureType === "test-bug").length,
    functionalGaps: testFails.filter((t) => t.failureType === "functional-gap").length,
    unknown: testFails.filter((t) => t.failureType === "unknown" || !t.failureType).length,
    byType: {},
    byCategory: {},
    byFailureType: {
      "test-bug": 0,
      "functional-gap": 0,
      unknown: 0,
    },
  };

  testFails.forEach((testFail) => {
    stats.byType[testFail.type] = (stats.byType[testFail.type] || 0) + 1;
    stats.byCategory[testFail.category] = (stats.byCategory[testFail.category] || 0) + 1;
    stats.byFailureType[testFail.failureType || "unknown"] =
      (stats.byFailureType[testFail.failureType || "unknown"] || 0) + 1;
  });

  return stats;
}

/**
 * Main collection function
 */
function main() {
  console.log("🧪 Test Fails Collector - Starting collection of failing tests...\n");

  const existingDb = loadTestFailsDatabase();

  // Collect only failing tests
  const jestFailures = collectJestFailures();
  const vitestFailures = collectVitestFailures();

  const allNewTestFails = [...jestFailures, ...vitestFailures];

  console.log(`\n📊 Collection Summary:`);
  console.log(`   Jest failures: ${jestFailures.length}`);
  console.log(`   Vitest failures: ${vitestFailures.length}`);
  console.log(`   Total failing tests collected: ${allNewTestFails.length}`);

  // Merge with existing test failures
  const mergedTestFails = mergeTestFails(existingDb, allNewTestFails);
  const stats = calculateStats(mergedTestFails);

  // Save test fails database
  const updatedDb = {
    ...existingDb,
    lastUpdated: new Date().toISOString(),
    testFails: mergedTestFails,
    stats,
  };

  writeFileSync(TEST_FAILS_FILE, JSON.stringify(updatedDb, null, 2), "utf-8");

  console.log(`\n✅ Test fails database updated:`);
  console.log(`   Total failing tests: ${stats.total}`);
  console.log(`   Test bugs: ${stats.testBugs}`);
  console.log(`   Functional gaps: ${stats.functionalGaps}`);
  console.log(`   Unknown/Unclassified: ${stats.unknown}`);
  console.log(`\n📁 Database saved to: ${TEST_FAILS_FILE}`);

  if (mergedTestFails.length > 0) {
    console.log(`\n❌ Failing tests breakdown:`);
    console.log(`   Test bugs (test code issues): ${stats.testBugs}`);
    console.log(`   Functional gaps (implementation bugs): ${stats.functionalGaps}`);
    console.log(`   Unknown/Unclassified: ${stats.unknown}`);

    console.log(`\n📋 Sample failing tests (first 10):`);
    mergedTestFails.slice(0, 10).forEach((testFail) => {
      const typeIcon = testFail.failureType === "test-bug" ? "🐛" : testFail.failureType === "functional-gap" ? "⚙️" : "❓";
      console.log(`   ${typeIcon} ${testFail.file}: ${testFail.testName} [${testFail.failureType}]`);
    });
    if (mergedTestFails.length > 10) {
      console.log(`   ... and ${mergedTestFails.length - 10} more`);
    }
    console.log(`\n💡 Use the test fails database to plan repairs and track progress.`);
  } else {
    console.log(`\n✅ All tests passing!`);
  }

  // Exit with error code if there are failing tests
  if (stats.total > 0) {
    process.exit(1);
  }
}

main();







