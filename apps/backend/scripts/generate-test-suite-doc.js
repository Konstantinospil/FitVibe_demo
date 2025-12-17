#!/usr/bin/env node
/**
 * Generate Test Suite documentation from Jest test results
 * Extracts all test cases and their pass/fail status from Jest JSON output
 *
 * Features:
 * - Tracks test execution history in .test-results/test-execution-history.json
 * - Detects CI environment (GitHub Actions, GitLab, CircleCI, Jenkins, etc.)
 * - Shows last run timestamp with execution source (Local/CI)
 * - Cross-platform compatible (Windows, Linux, macOS)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Run Jest and get JSON output
function getJestResults() {
  const jestPath = path.join(__dirname, "..");

  // Use file-based approach for cross-platform compatibility
  const tmpFile = path.join(__dirname, "..", "jest-results-tmp.json");

  try {
    // Write Jest output to file (works on all platforms)
    execSync(`npx jest --json --passWithNoTests > "${tmpFile}" 2>&1 || true`, {
      encoding: "utf-8",
      cwd: jestPath,
      maxBuffer: 50 * 1024 * 1024,
      shell: true,
    });

    const content = fs.readFileSync(tmpFile, "utf-8");

    // Find the last line that looks like JSON (starts with {)
    const lines = content.split("\n").filter((line) => line.trim().startsWith("{"));
    if (lines.length > 0) {
      const jsonStr = lines[lines.length - 1];
      const result = JSON.parse(jsonStr);

      // Clean up
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }

      return result;
    }

    // Try parsing the entire output
    const trimmed = content.trim();
    if (trimmed) {
      const result = JSON.parse(trimmed);

      // Clean up
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }

      return result;
    }
  } catch (error) {
    console.error("Error getting Jest results:", error.message);

    // Clean up on error
    if (fs.existsSync(tmpFile)) {
      try {
        fs.unlinkSync(tmpFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    return null;
  }

  // Clean up if we get here
  if (fs.existsSync(tmpFile)) {
    try {
      fs.unlinkSync(tmpFile);
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  return null;
}

// Determine test type from file path
function getTestType(filePath) {
  const normalized = path.normalize(filePath).replace(/\\/g, "/");
  if (normalized.includes("integration") || normalized.includes(".integration.")) {
    return "Integration";
  }
  if (normalized.includes("e2e") || normalized.includes("/e2e/")) {
    return "E2E";
  }
  if (normalized.includes("contract")) {
    return "Contract";
  }
  return "Unit";
}

// Get relative path from workspace root
function getRelativePath(filePath) {
  const normalized = path.normalize(filePath).replace(/\\/g, "/");

  // Handle Windows paths
  if (normalized.includes("apps/backend/")) {
    const index = normalized.indexOf("apps/backend/");
    return normalized.substring(index);
  }
  if (normalized.includes("tests/")) {
    const index = normalized.indexOf("tests/");
    return normalized.substring(index);
  }
  return filePath;
}

// Extract test suite name from fullName (ancestorTitles)
function getTestSuite(fullName, ancestorTitles) {
  if (ancestorTitles && ancestorTitles.length > 0) {
    return ancestorTitles.join(" > ");
  }
  // Fallback: extract from fullName
  const parts = fullName.split(" ");
  if (parts.length > 1) {
    return parts.slice(0, -1).join(" ");
  }
  return "Unknown";
}

// Generate description from test name
function generateDescription(testName) {
  return testName
    .replace(/^should /i, "")
    .replace(/^must /i, "")
    .trim();
}

// Detect if running in CI environment
function isCIEnvironment() {
  return !!(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.JENKINS_URL ||
    process.env.TEAMCITY_VERSION ||
    process.env.BUILDKITE
  );
}

// Get execution source (local or CI)
function getExecutionSource() {
  if (isCIEnvironment()) {
    if (process.env.GITHUB_ACTIONS) return "CI (GitHub Actions)";
    if (process.env.GITLAB_CI) return "CI (GitLab)";
    if (process.env.CIRCLECI) return "CI (CircleCI)";
    return "CI";
  }
  return "Local";
}

// Load test execution history
function loadTestHistory() {
  const historyPath = path.join(__dirname, "..", ".test-results", "test-execution-history.json");
  try {
    if (fs.existsSync(historyPath)) {
      const content = fs.readFileSync(historyPath, "utf-8");
      const parsed = JSON.parse(content);

      // Validate structure
      if (typeof parsed !== "object" || parsed === null) {
        console.warn("Invalid history file structure, using defaults");
        return { lastUpdated: null, lastExecutionSource: null, executions: {} };
      }

      // Ensure required fields exist
      return {
        lastUpdated: parsed.lastUpdated || null,
        lastExecutionSource: parsed.lastExecutionSource || null,
        executions:
          parsed.executions && typeof parsed.executions === "object" ? parsed.executions : {},
      };
    }
  } catch (error) {
    console.warn("Could not load test history:", error.message);
  }
  return { lastUpdated: null, lastExecutionSource: null, executions: {} };
}

// Save test execution history
function saveTestHistory(history) {
  const historyDir = path.join(__dirname, "..", ".test-results");
  const historyPath = path.join(historyDir, "test-execution-history.json");

  // Create directory if it doesn't exist
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  try {
    // Validate history structure before saving
    if (!history || typeof history !== "object") {
      console.warn("Invalid history object, skipping save");
      return;
    }

    // Ensure required fields exist
    const validatedHistory = {
      lastUpdated: history.lastUpdated || null,
      lastExecutionSource: history.lastExecutionSource || null,
      executions:
        history.executions && typeof history.executions === "object" ? history.executions : {},
    };

    fs.writeFileSync(historyPath, JSON.stringify(validatedHistory, null, 2), "utf-8");
  } catch (error) {
    console.warn("Could not save test history:", error.message);
  }
}

// Format timestamp for display
function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  // Handle both ISO strings and epoch milliseconds
  const date = typeof timestamp === "number" ? new Date(timestamp) : new Date(timestamp);
  if (isNaN(date.getTime())) return "";
  return (
    date.toISOString().split("T")[0] + " " + date.toISOString().split("T")[1].split(".")[0] + " UTC"
  );
}

// Main execution
console.log("Running Jest to get test results...");
const jestResults = getJestResults();

if (!jestResults) {
  console.error("Failed to get Jest results");
  process.exit(1);
}

console.log(`Found ${jestResults.numTotalTests} total tests`);
console.log(`Passed: ${jestResults.numPassedTests}, Failed: ${jestResults.numFailedTests}`);

// Load existing history
const testHistory = loadTestHistory();
const executionSource = getExecutionSource();
const currentRunTime = new Date().toISOString();

// Collect all test cases and update history
const allTests = [];
const newHistory = {
  lastUpdated: currentRunTime,
  lastExecutionSource: executionSource,
  executions:
    testHistory.executions && typeof testHistory.executions === "object"
      ? { ...testHistory.executions }
      : {},
};

// Track which test files were executed in this run
const executedFiles = new Set();

jestResults.testResults.forEach((testFile) => {
  const filePath = getRelativePath(testFile.name);
  const testType = getTestType(testFile.name);
  executedFiles.add(filePath);

  // Update history with this test file's execution time
  if (testFile.endTime) {
    // Convert endTime (milliseconds) to ISO string for consistency
    const endTimeISO =
      typeof testFile.endTime === "number"
        ? new Date(testFile.endTime).toISOString()
        : testFile.endTime;

    newHistory.executions[filePath] = {
      lastRun: endTimeISO,
      source: executionSource,
      status: testFile.status,
    };
  }

  testFile.assertionResults.forEach((test) => {
    const suite = getTestSuite(test.fullName, test.ancestorTitles);
    const testName = test.title;
    const passes = test.status === "passed" ? "Yes" : test.status === "failed" ? "No" : "Pending";

    // Get last run info from history
    const fileHistory = newHistory.executions[filePath];
    const lastRun = fileHistory
      ? `${formatTimestamp(fileHistory.lastRun)} (${fileHistory.source})`
      : "";

    allTests.push({
      suite,
      name: testName,
      file: filePath,
      description: generateDescription(testName),
      type: testType,
      passes,
      lastRun,
      fullName: test.fullName,
    });
  });
});

// Note: History cleanup strategy
// We keep entries for test files that were in history but not in current run.
// This is intentional because:
// 1. Test files might be skipped in a particular run
// 2. Files might have been moved/renamed (we track by relative path)
// 3. History provides useful context even for temporarily absent files
// If needed, a cleanup mechanism could be added to remove entries older than X days

// Save updated history
saveTestHistory(newHistory);

// Sort tests by file, then by suite, then by name
allTests.sort((a, b) => {
  if (a.file !== b.file) return a.file.localeCompare(b.file);
  if (a.suite !== b.suite) return a.suite.localeCompare(b.suite);
  return a.name.localeCompare(b.name);
});

// Generate markdown
let markdown = `# Test Suite

This document lists all test cases in the FitVibe backend codebase.

**Last Updated:** ${new Date().toISOString().split("T")[0]}
**Total Tests:** ${allTests.length}
**Passing:** ${jestResults.numPassedTests}
**Failing:** ${jestResults.numFailedTests}
**Pending:** ${jestResults.numPendingTests || 0}

| # | Test Suite | Test Name | Test File | Description | Type | Passes | Last Run |
|---|------------|-----------|-----------|-------------|------|--------|----------|
`;

// Escape markdown special characters for table cells
function escapeMarkdownTableCell(text) {
  if (!text) return "";
  return String(text)
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/\|/g, "\\|") // Escape pipes
    .replace(/\n/g, " ") // Replace newlines with spaces
    .replace(/\r/g, "") // Remove carriage returns
    .trim();
}

let testNumber = 1;
allTests.forEach((test) => {
  // Escape all markdown special characters in test data
  const suite = escapeMarkdownTableCell(test.suite);
  const name = escapeMarkdownTableCell(test.name);
  const description = escapeMarkdownTableCell(test.description);
  const lastRun = escapeMarkdownTableCell(test.lastRun);

  markdown += `| ${testNumber} | ${suite} | ${name} | \`${test.file}\` | ${description} | ${test.type} | ${test.passes} | ${lastRun} |\n`;
  testNumber++;
});

// Write to file - ensure directory exists
const outputDir = path.join(__dirname, "../../../docs/4.Testing_and_Quality_Assurance_Plan");
const outputPath = path.join(outputDir, "Test_Suite.md");

// Create directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, markdown, "utf-8");

console.log(`\n✅ Written ${allTests.length} tests to ${outputPath}`);
console.log(`   Expected: ${jestResults.numTotalTests} tests`);
if (allTests.length !== jestResults.numTotalTests) {
  console.warn(
    `   ⚠️  Warning: Test count mismatch! (found ${allTests.length}, expected ${jestResults.numTotalTests})`,
  );
}
