#!/usr/bin/env node
/**
 * Extract all test cases from Jest test files
 * Generates a markdown table with test suite information
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Get all test files
function getAllTestFiles() {
  try {
    const output = execSync("npx jest --listTests --passWithNoTests", {
      encoding: "utf-8",
      cwd: path.join(__dirname, ".."),
    });
    return output
      .split("\n")
      .filter((line) => line.includes(".test.ts") || line.includes(".spec.ts"))
      .filter((line) => line.trim().length > 0);
  } catch (error) {
    console.error("Error getting test files:", error.message);
    return [];
  }
}

// Parse test file to extract test cases
function parseTestFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const tests = [];
    let currentSuite = null;
    let suiteStack = [];

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match describe blocks
      const describeMatch = line.match(/describe\(["']([^"']+)["']/);
      if (describeMatch) {
        suiteStack.push(describeMatch[1]);
        currentSuite = suiteStack.join(" > ");
      }

      // Match it/test blocks
      const itMatch = line.match(/(?:it|test)\(["']([^"']+)["']/);
      if (itMatch && currentSuite) {
        tests.push({
          suite: currentSuite,
          name: itMatch[1],
          file: filePath,
        });
      }

      // Match closing describe
      if (line.includes("});") && suiteStack.length > 0) {
        suiteStack.pop();
        currentSuite = suiteStack.length > 0 ? suiteStack.join(" > ") : null;
      }
    }

    return tests;
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
    return [];
  }
}

// Determine test type from file path
function getTestType(filePath) {
  if (filePath.includes("integration") || filePath.includes(".integration.")) {
    return "Integration";
  }
  if (filePath.includes("e2e") || filePath.includes("e2e/")) {
    return "E2E";
  }
  if (filePath.includes("contract")) {
    return "Contract";
  }
  return "Unit";
}

// Get relative path from workspace root
function getRelativePath(filePath) {
  const normalized = path.normalize(filePath);
  const backendIndex = normalized.indexOf("apps/backend/");
  if (backendIndex >= 0) {
    return normalized.substring(backendIndex);
  }
  const testsIndex = normalized.indexOf("tests/");
  if (testsIndex >= 0) {
    return normalized.substring(testsIndex);
  }
  return filePath;
}

// Main execution
const testFiles = getAllTestFiles();
console.log(`Found ${testFiles.length} test files`);

const allTests = [];
testFiles.forEach((file) => {
  const tests = parseTestFile(file);
  allTests.push(...tests);
});

console.log(`Extracted ${allTests.length} test cases`);

// Generate markdown table
let markdown = `# Test Suite

This document lists all test cases in the FitVibe backend codebase.

**Last Updated:** ${new Date().toISOString().split("T")[0]}
**Total Tests:** ${allTests.length}

| # | Test Suite | Test Name | Test File | Description | Type | Passes | Last Run |
|---|------------|-----------|-----------|-------------|------|--------|----------|
`;

let testNumber = 1;
allTests.forEach((test) => {
  const relativePath = getRelativePath(test.file);
  const testType = getTestType(test.file);

  // Generate a brief description from the test name
  const description = test.name
    .replace(/should /gi, "")
    .replace(/must /gi, "")
    .trim();

  markdown += `| ${testNumber} | ${test.suite} | ${test.name} | \`${relativePath}\` | ${description} | ${testType} | | |\n`;
  testNumber++;
});

console.log("\n" + markdown);

// Optionally write to file
if (process.argv[2] === "--write") {
  const outputPath = path.join(
    __dirname,
    "../../docs/4.Testing_and_Quality_Assurance_Plan/Test_Suite.md",
  );
  fs.writeFileSync(outputPath, markdown, "utf-8");
  console.log(`\n✅ Written to ${outputPath}`);
}
