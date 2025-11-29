#!/usr/bin/env node
/**
 * Bug Collector - Systematically collects bugs from all sources
 *
 * Collects:
 * - Test failures (Jest, Vitest, Playwright)
 * - Linter errors (ESLint)
 * - Type errors (TypeScript)
 * - Coverage gaps
 *
 * Outputs: .bug-database/bugs.json
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..");
const BUG_DB_DIR = join(ROOT_DIR, ".bug-database");
const BUG_DB_FILE = join(BUG_DB_DIR, "bugs.json");

// Ensure bug database directory exists
if (!existsSync(BUG_DB_DIR)) {
  mkdirSync(BUG_DB_DIR, { recursive: true });
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
      ...options,
    });
    return { success: true, output: result, error: null };
  } catch (error) {
    return {
      success: false,
      output: error.stdout?.toString() || "",
      error: error.stderr?.toString() || error.message,
    };
  }
}

/**
 * Collect Jest test failures
 */
function collectJestFailures() {
  console.log("🔍 Collecting Jest test failures...");
  const bugs = [];

  // Run Jest with JSON output
  const result = runCommand("pnpm --filter @fitvibe/backend test -- --json --passWithNoTests", {
    stdio: "pipe",
  });

  if (!result.success) {
    // Try to parse JSON from output
    const lines = result.output.split("\n");
    const jsonLine = lines.find((line) => line.trim().startsWith("{"));

    if (jsonLine) {
      try {
        const jestResults = JSON.parse(jsonLine);

        jestResults.testResults?.forEach((testFile) => {
          testFile.assertionResults?.forEach((test) => {
            if (test.status === "failed") {
              bugs.push({
                id: `jest-${testFile.name}-${test.title}`.replace(/[^a-zA-Z0-9-]/g, "-"),
                type: "test-failure",
                category: "backend-unit",
                severity: testFile.name.includes("integration") ? "high" : "medium",
                file: testFile.name,
                testName: test.title,
                suite: test.ancestorTitles?.join(" > ") || "Unknown",
                message: test.failureMessages?.join("\n") || "Test failed",
                status: "open",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                attempts: 0,
                fixed: false,
              });
            }
          });
        });
      } catch (e) {
        console.warn("⚠️  Could not parse Jest JSON output:", e.message);
      }
    }
  }

  return bugs;
}

/**
 * Collect Vitest test failures
 */
function collectVitestFailures() {
  console.log("🔍 Collecting Vitest test failures...");
  const bugs = [];

  const result = runCommand("pnpm --filter @fitvibe/frontend test -- --reporter=json --run", {
    stdio: "pipe",
  });

  if (!result.success) {
    try {
      // Vitest JSON output might be in the error stream or stdout
      const output = result.error || result.output;
      const lines = output.split("\n");
      const jsonLine = lines.find((line) => {
        const trimmed = line.trim();
        return trimmed.startsWith("{") && trimmed.includes("testResults");
      });

      if (jsonLine) {
        const vitestResults = JSON.parse(jsonLine);

        vitestResults.testResults?.forEach((testFile) => {
          testFile.assertionResults?.forEach((test) => {
            if (test.status === "failed") {
              bugs.push({
                id: `vitest-${testFile.name}-${test.title}`.replace(/[^a-zA-Z0-9-]/g, "-"),
                type: "test-failure",
                category: "frontend-unit",
                severity: "medium",
                file: testFile.name,
                testName: test.title,
                suite: test.ancestorTitles?.join(" > ") || "Unknown",
                message: test.failureMessages?.join("\n") || "Test failed",
                status: "open",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                attempts: 0,
                fixed: false,
              });
            }
          });
        });
      }
    } catch (e) {
      console.warn("⚠️  Could not parse Vitest JSON output:", e.message);
    }
  }

  return bugs;
}

/**
 * Collect ESLint errors
 */
function collectLinterErrors() {
  console.log("🔍 Collecting ESLint errors...");
  const bugs = [];

  const result = runCommand("pnpm lint:check", { stdio: "pipe" });

  if (!result.success) {
    const output = result.error || result.output;
    const lines = output.split("\n");

    let currentFile = null;
    let currentLine = null;
    let currentMessage = null;

    lines.forEach((line) => {
      // Match ESLint error format: /path/to/file.js:line:col error message
      const fileMatch = line.match(/^(.+?):(\d+):(\d+)\s+(error|warning)\s+(.+)$/);
      if (fileMatch) {
        if (currentFile && currentMessage) {
          bugs.push({
            id: `eslint-${currentFile}-${currentLine}`.replace(/[^a-zA-Z0-9-]/g, "-"),
            type: "linter-error",
            category: "code-quality",
            severity: "low",
            file: currentFile,
            line: currentLine,
            message: currentMessage,
            status: "open",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attempts: 0,
            fixed: false,
          });
        }

        currentFile = fileMatch[1];
        currentLine = parseInt(fileMatch[2], 10);
        currentMessage = fileMatch[5];
      } else if (currentFile && line.trim()) {
        // Continuation of error message
        currentMessage += " " + line.trim();
      }
    });

    // Add last bug if exists
    if (currentFile && currentMessage) {
      bugs.push({
        id: `eslint-${currentFile}-${currentLine}`.replace(/[^a-zA-Z0-9-]/g, "-"),
        type: "linter-error",
        category: "code-quality",
        severity: "low",
        file: currentFile,
        line: currentLine,
        message: currentMessage,
        status: "open",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attempts: 0,
        fixed: false,
      });
    }
  }

  return bugs;
}

/**
 * Collect TypeScript errors
 */
function collectTypeErrors() {
  console.log("🔍 Collecting TypeScript errors...");
  const bugs = [];

  const result = runCommand("pnpm typecheck", { stdio: "pipe" });

  if (!result.success) {
    const output = result.error || result.output;
    const lines = output.split("\n");

    let currentFile = null;
    let currentLine = null;
    let currentMessage = null;

    lines.forEach((line) => {
      // Match TypeScript error format: file.ts(line,col): error TS####: message
      const fileMatch = line.match(/^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/);
      if (fileMatch) {
        if (currentFile && currentMessage) {
          bugs.push({
            id: `typescript-${currentFile}-${currentLine}`.replace(/[^a-zA-Z0-9-]/g, "-"),
            type: "type-error",
            category: "type-safety",
            severity: "high",
            file: currentFile,
            line: parseInt(fileMatch[2], 10),
            code: fileMatch[4],
            message: currentMessage,
            status: "open",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attempts: 0,
            fixed: false,
          });
        }

        currentFile = fileMatch[1];
        currentLine = parseInt(fileMatch[2], 10);
        currentMessage = fileMatch[5];
      } else if (currentFile && line.trim() && !line.includes("error TS")) {
        // Continuation of error message
        currentMessage += " " + line.trim();
      }
    });

    // Add last bug if exists
    if (currentFile && currentMessage) {
      bugs.push({
        id: `typescript-${currentFile}-${currentLine}`.replace(/[^a-zA-Z0-9-]/g, "-"),
        type: "type-error",
        category: "type-safety",
        severity: "high",
        file: currentFile,
        line: currentLine,
        message: currentMessage,
        status: "open",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attempts: 0,
        fixed: false,
      });
    }
  }

  return bugs;
}

/**
 * Load existing bug database
 */
function loadBugDatabase() {
  if (existsSync(BUG_DB_FILE)) {
    try {
      const content = readFileSync(BUG_DB_FILE, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.warn("⚠️  Could not load existing bug database:", e.message);
    }
  }

  return {
    version: "1.0.0",
    lastUpdated: null,
    bugs: [],
    stats: {
      total: 0,
      open: 0,
      fixed: 0,
      byType: {},
      bySeverity: {},
    },
  };
}

/**
 * Merge new bugs with existing ones
 */
function mergeBugs(existing, newBugs) {
  const existingMap = new Map();
  existing.bugs.forEach((bug) => {
    existingMap.set(bug.id, bug);
  });

  const merged = [...existing.bugs];

  newBugs.forEach((newBug) => {
    const existingBug = existingMap.get(newBug.id);
    if (existingBug) {
      // Update existing bug if it's still failing
      if (existingBug.status === "open") {
        existingBug.updatedAt = new Date().toISOString();
        existingBug.message = newBug.message; // Update message in case it changed
      }
    } else {
      // New bug
      merged.push(newBug);
    }
  });

  return merged;
}

/**
 * Calculate statistics
 */
function calculateStats(bugs) {
  const stats = {
    total: bugs.length,
    open: bugs.filter((b) => b.status === "open").length,
    fixed: bugs.filter((b) => b.status === "fixed" || b.fixed).length,
    byType: {},
    bySeverity: {},
  };

  bugs.forEach((bug) => {
    stats.byType[bug.type] = (stats.byType[bug.type] || 0) + 1;
    stats.bySeverity[bug.severity] = (stats.bySeverity[bug.severity] || 0) + 1;
  });

  return stats;
}

/**
 * Main collection function
 */
function main() {
  console.log("🐛 Bug Collector - Starting collection...\n");

  const existingDb = loadBugDatabase();

  // Collect all bugs
  const jestBugs = collectJestFailures();
  const vitestBugs = collectVitestFailures();
  const linterBugs = collectLinterErrors();
  const typeBugs = collectTypeErrors();

  const allNewBugs = [...jestBugs, ...vitestBugs, ...linterBugs, ...typeBugs];

  console.log(`\n📊 Collection Summary:`);
  console.log(`   Jest failures: ${jestBugs.length}`);
  console.log(`   Vitest failures: ${vitestBugs.length}`);
  console.log(`   Linter errors: ${linterBugs.length}`);
  console.log(`   Type errors: ${typeBugs.length}`);
  console.log(`   Total new bugs: ${allNewBugs.length}`);

  // Merge with existing bugs
  const mergedBugs = mergeBugs(existingDb, allNewBugs);
  const stats = calculateStats(mergedBugs);

  // Save bug database
  const updatedDb = {
    ...existingDb,
    lastUpdated: new Date().toISOString(),
    bugs: mergedBugs,
    stats,
  };

  writeFileSync(BUG_DB_FILE, JSON.stringify(updatedDb, null, 2), "utf-8");

  console.log(`\n✅ Bug database updated:`);
  console.log(`   Total bugs: ${stats.total}`);
  console.log(`   Open: ${stats.open}`);
  console.log(`   Fixed: ${stats.fixed}`);
  console.log(`\n📁 Database saved to: ${BUG_DB_FILE}`);

  // Exit with error code if there are open bugs
  if (stats.open > 0) {
    process.exit(1);
  }
}

main();
