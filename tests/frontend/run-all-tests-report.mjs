#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { glob } from "glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendDir = resolve(__dirname, "../../apps/frontend");
const testsDir = resolve(__dirname, ".");

// Find all test files
const testFiles = [
  ...(await glob("**/*.test.tsx", { cwd: testsDir })),
  ...(await glob("**/*.test.ts", { cwd: testsDir })),
].sort();

console.log(`Found ${testFiles.length} test files\n`);

const results = {
  passed: [],
  failed: [],
  errors: [],
};

let processed = 0;

for (const testFile of testFiles) {
  processed++;
  const relativePath = `tests/frontend/${testFile}`;
  const displayName = testFile.padEnd(60);
  
  process.stdout.write(`[${processed}/${testFiles.length}] ${displayName} ... `);

  const result = spawnSync(
    "pnpm",
    ["test", relativePath],
    {
      cwd: frontendDir,
      stdio: "pipe",
      encoding: "utf-8",
      timeout: 60000, // 60 second timeout per file
    },
  );

  const output = result.stdout + result.stderr;
  
  // Check if tests passed
  const hasFailures = output.includes("FAIL") || 
                      output.match(/\d+\s+failed/) ||
                      (result.status !== 0 && !output.includes("passed"));
  
  if (hasFailures) {
    // Extract failure details
    const failureMatch = output.match(/(\d+)\s+failed/);
    const passedMatch = output.match(/(\d+)\s+passed/);
    const failedCount = failureMatch ? parseInt(failureMatch[1], 10) : 0;
    const passedCount = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    
    // Extract test names that failed
    const failedTests = [];
    const testFailureRegex = /(?:FAIL|✖)\s+(.+?)(?:\n|$)/g;
    let match;
    while ((match = testFailureRegex.exec(output)) !== null) {
      failedTests.push(match[1].trim());
    }
    
    // Also try to extract from vitest output
    const vitestFailureRegex = /❌\s+(.+?)(?:\n|$)/g;
    while ((match = vitestFailureRegex.exec(output)) !== null) {
      const testName = match[1].trim();
      if (!failedTests.includes(testName)) {
        failedTests.push(testName);
      }
    }
    
    results.failed.push({
      file: testFile,
      relativePath,
      status: result.status,
      failedCount,
      passedCount,
      failedTests: failedTests.length > 0 ? failedTests : ["Unknown - check output"],
      output: output.slice(-3000), // Last 3000 chars
    });
    
    console.log(`❌ FAILED (${failedCount} failed, ${passedCount} passed)`);
  } else if (result.status === 0 || output.includes("passed")) {
    const passedMatch = output.match(/(\d+)\s+passed/);
    const passedCount = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    
    results.passed.push({
      file: testFile,
      passedCount,
    });
    
    console.log(`✅ PASSED (${passedCount} tests)`);
  } else {
    results.errors.push({
      file: testFile,
      relativePath,
      status: result.status,
      error: output.slice(-1500),
    });
    
    console.log(`⚠️  ERROR (exit code: ${result.status})`);
  }
}

// Print summary
console.log("\n" + "=".repeat(80));
console.log("FINAL SUMMARY");
console.log("=".repeat(80));
console.log(`✅ Passed: ${results.passed.length} files`);
console.log(`❌ Failed: ${results.failed.length} files`);
console.log(`⚠️  Errors: ${results.errors.length} files`);

const totalPassed = results.passed.reduce((sum, r) => sum + r.passedCount, 0);
const totalFailed = results.failed.reduce((sum, r) => sum + r.failedCount, 0);
console.log(`\nTotal Tests: ${totalPassed} passed, ${totalFailed} failed`);

// Write detailed report
const reportPath = resolve(__dirname, "TEST_FAILURES_REPORT.md");

let report = `# Frontend Test Failures Report\n\n`;
report += `Generated: ${new Date().toISOString()}\n\n`;
report += `## Summary\n\n`;
report += `- ✅ Passed: ${results.passed.length} files (${totalPassed} tests)\n`;
report += `- ❌ Failed: ${results.failed.length} files (${totalFailed} tests)\n`;
report += `- ⚠️  Errors: ${results.errors.length} files\n\n`;

if (results.failed.length > 0) {
  report += `## Failed Test Files\n\n`;
  for (const failure of results.failed) {
    report += `### ${failure.file}\n\n`;
    report += `- **Status**: Exit code ${failure.status}\n`;
    report += `- **Failed Tests**: ${failure.failedCount}\n`;
    report += `- **Passed Tests**: ${failure.passedCount}\n\n`;
    
    if (failure.failedTests.length > 0) {
      report += `**Failed Test Names:**\n`;
      for (const testName of failure.failedTests) {
        report += `- ${testName}\n`;
      }
      report += `\n`;
    }
    
    report += `<details>\n<summary>View Output</summary>\n\n`;
    report += `\`\`\`\n${failure.output}\n\`\`\`\n\n`;
    report += `</details>\n\n`;
  }
}

if (results.errors.length > 0) {
  report += `## Errors\n\n`;
  for (const error of results.errors) {
    report += `### ${error.file}\n\n`;
    report += `- **Exit Code**: ${error.status}\n\n`;
    report += `<details>\n<summary>View Error</summary>\n\n`;
    report += `\`\`\`\n${error.error}\n\`\`\`\n\n`;
    report += `</details>\n\n`;
  }
}

if (results.passed.length > 0 && results.passed.length <= 50) {
  report += `## Passed Test Files\n\n`;
  for (const passed of results.passed) {
    report += `- ✅ ${passed.file} (${passed.passedCount} tests)\n`;
  }
} else if (results.passed.length > 50) {
  report += `## Passed Test Files\n\n`;
  report += `${results.passed.length} files passed. Total: ${totalPassed} tests.\n\n`;
}

writeFileSync(reportPath, report);
console.log(`\n📄 Detailed report written to: ${reportPath}`);

process.exit(results.failed.length + results.errors.length > 0 ? 1 : 0);

