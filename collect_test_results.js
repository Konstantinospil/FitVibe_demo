#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const TEST_DIR = path.join(__dirname, "tests/frontend");
const FRONTEND_DIR = path.join(__dirname, "apps/frontend");
const TIMEOUT_MS = 120000; // 2 minutes

function findTestFiles() {
  const testFiles = [];
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) {
        const relativePath = path.relative(TEST_DIR, filePath);
        testFiles.push(relativePath);
      }
    }
  }
  walkDir(TEST_DIR);
  return testFiles.sort();
}

function runTest(testFile) {
  const startTime = Date.now();
  const testPath = path.join("../../tests/frontend", testFile);

  try {
    const result = execSync(`cd ${FRONTEND_DIR} && pnpm test "${testPath}" 2>&1`, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: TIMEOUT_MS,
    });

    const duration = Date.now() - startTime;
    const passedMatch = result.match(/Test Files\s+(\d+)\s+passed.*?Tests\s+(\d+)\s+passed/);
    const failedMatch = result.match(/Test Files\s+(\d+)\s+failed.*?Tests\s+(\d+)\s+failed/);

    if (duration >= TIMEOUT_MS) {
      return { status: "TIMEOUT", duration, testFile };
    }

    if (failedMatch) {
      const failedFiles = parseInt(failedMatch[1]);
      const failedTests = parseInt(failedMatch[2]);

      // Extract failure details
      const failures = [];
      const failRegex = /FAIL\s+([^\s]+)\s+>\s+([^>]+)\s+>\s+(.+?)(?=\n|$)/g;
      let match;
      while ((match = failRegex.exec(result)) !== null) {
        failures.push({
          file: match[1],
          suite: match[2],
          test: match[3].trim(),
        });
      }

      return {
        status: "FAILED",
        testFile,
        failedFiles,
        failedTests,
        failures,
        duration,
      };
    } else if (passedMatch) {
      return {
        status: "PASSED",
        testFile,
        duration,
      };
    } else {
      return {
        status: "UNKNOWN",
        testFile,
        output: result.slice(-500),
        duration,
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    if (duration >= TIMEOUT_MS) {
      return { status: "TIMEOUT", duration, testFile };
    }

    const output = error.stdout || error.stderr || error.message;
    const failedMatch = output.match(/Test Files\s+(\d+)\s+failed.*?Tests\s+(\d+)\s+failed/);

    if (failedMatch) {
      const failedFiles = parseInt(failedMatch[1]);
      const failedTests = parseInt(failedMatch[2]);

      const failures = [];
      const failRegex = /FAIL\s+([^\s]+)\s+>\s+([^>]+)\s+>\s+(.+?)(?=\n|$)/g;
      let match;
      while ((match = failRegex.exec(output)) !== null) {
        failures.push({
          file: match[1],
          suite: match[2],
          test: match[3].trim(),
        });
      }

      return {
        status: "FAILED",
        testFile,
        failedFiles,
        failedTests,
        failures,
        duration,
        error: output.slice(-500),
      };
    }

    return {
      status: "ERROR",
      testFile,
      duration,
      error: output.slice(-500),
    };
  }
}

const testFiles = findTestFiles();
console.log(`Found ${testFiles.length} test files\n`);

const results = [];
for (const testFile of testFiles) {
  process.stdout.write(`Running ${testFile}... `);
  const result = runTest(testFile);
  results.push(result);

  if (result.status === "PASSED") {
    console.log(`✓ PASSED (${result.duration}ms)`);
  } else if (result.status === "FAILED") {
    console.log(`✗ FAILED (${result.failedTests} tests, ${result.duration}ms)`);
  } else if (result.status === "TIMEOUT") {
    console.log(`⏱ TIMEOUT (${result.duration}ms)`);
  } else {
    console.log(`? ${result.status} (${result.duration}ms)`);
  }
}

// Generate report
const failedTests = results.filter(
  (r) => r.status === "FAILED" || r.status === "TIMEOUT" || r.status === "ERROR",
);
const passedTests = results.filter((r) => r.status === "PASSED");

console.log(`\n\nSummary:`);
console.log(`Total: ${results.length}`);
console.log(`Passed: ${passedTests.length}`);
console.log(`Failed: ${failedTests.length}`);

// Save detailed results
fs.writeFileSync("/tmp/test_results_detailed.json", JSON.stringify(results, null, 2));

console.log("\nDetailed results saved to /tmp/test_results_detailed.json");
