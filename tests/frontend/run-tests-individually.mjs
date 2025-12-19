#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendDir = resolve(__dirname, "../../apps/frontend");

// Get all test files from command line args or use default list
const testFiles = process.argv.slice(2);

if (testFiles.length === 0) {
  console.error("Usage: node run-tests-individually.mjs <test-file-1> [test-file-2] ...");
  process.exit(1);
}

const results = {
  passed: [],
  failed: [],
  errors: [],
};

for (const testFile of testFiles) {
  const relativePath = testFile.startsWith("tests/") 
    ? testFile 
    : `tests/frontend/${testFile}`;
  
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Running: ${relativePath}`);
  console.log("=".repeat(80));

  const result = spawnSync(
    "pnpm",
    ["test", relativePath],
    {
      cwd: frontendDir,
      stdio: "pipe",
      encoding: "utf-8",
    },
  );

  const output = result.stdout + result.stderr;
  
  // Check if tests passed
  const hasFailures = output.includes("FAIL") || 
                      output.includes("failed") ||
                      result.status !== 0;
  
  if (hasFailures) {
    // Extract failure details
    const failureMatch = output.match(/(\d+)\s+failed/);
    const failedCount = failureMatch ? parseInt(failureMatch[1], 10) : 0;
    
    results.failed.push({
      file: relativePath,
      status: result.status,
      failedCount,
      output: output.slice(-2000), // Last 2000 chars
    });
    
    console.log(`❌ FAILED (${failedCount} tests failed)`);
  } else if (result.status === 0) {
    const passedMatch = output.match(/(\d+)\s+passed/);
    const passedCount = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    
    results.passed.push({
      file: relativePath,
      passedCount,
    });
    
    console.log(`✅ PASSED (${passedCount} tests)`);
  } else {
    results.errors.push({
      file: relativePath,
      status: result.status,
      error: output.slice(-1000),
    });
    
    console.log(`⚠️  ERROR (exit code: ${result.status})`);
  }
}

// Print summary
console.log("\n" + "=".repeat(80));
console.log("SUMMARY");
console.log("=".repeat(80));
console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⚠️  Errors: ${results.errors.length}`);

// Write detailed report
const reportPath = resolve(__dirname, "TEST_FAILURES_REPORT.md");
const fs = await import("fs");

let report = `# Frontend Test Failures Report\n\n`;
report += `Generated: ${new Date().toISOString()}\n\n`;
report += `## Summary\n\n`;
report += `- ✅ Passed: ${results.passed.length} files\n`;
report += `- ❌ Failed: ${results.failed.length} files\n`;
report += `- ⚠️  Errors: ${results.errors.length} files\n\n`;

if (results.failed.length > 0) {
  report += `## Failed Tests\n\n`;
  for (const failure of results.failed) {
    report += `### ${failure.file}\n\n`;
    report += `- Failed Tests: ${failure.failedCount}\n`;
    report += `- Exit Code: ${failure.status}\n\n`;
    report += `\`\`\`\n${failure.output}\n\`\`\`\n\n`;
  }
}

if (results.errors.length > 0) {
  report += `## Errors\n\n`;
  for (const error of results.errors) {
    report += `### ${error.file}\n\n`;
    report += `- Exit Code: ${error.status}\n\n`;
    report += `\`\`\`\n${error.error}\n\`\`\`\n\n`;
  }
}

if (results.passed.length > 0) {
  report += `## Passed Tests\n\n`;
  for (const passed of results.passed) {
    report += `- ✅ ${passed.file} (${passed.passedCount} tests)\n`;
  }
}

fs.writeFileSync(reportPath, report);
console.log(`\n📄 Detailed report written to: ${reportPath}`);

process.exit(results.failed.length + results.errors.length > 0 ? 1 : 0);

