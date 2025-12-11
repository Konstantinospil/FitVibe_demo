#!/usr/bin/env node
/**
 * Bug Collector - Systematically collects code quality bugs
 *
 * Collects:
 * - Linter errors (ESLint)
 * - Type errors (TypeScript)
 *
 * Note: Test failures are collected separately by /test-fails-collect
 *
 * Outputs: .cursor/bug-database/bugs.json
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..", ".."); // .cursor/scripts -> .cursor -> root
const BUG_DB_DIR = join(__dirname, "..", "bug-database"); // .cursor/bug-database
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
 * Generate bug ID from bug data
 */
function generateBugId(prefix, file, line) {
  const parts = [prefix];
  if (file) parts.push(normalizePath(file).replace(/[^a-zA-Z0-9]/g, "-"));
  if (line) parts.push(`L${line}`);
  return parts.join("-").toLowerCase();
}

/**
 * Collect ESLint errors
 */
function collectLinterErrors() {
  console.log("🔍 Collecting ESLint errors...");
  const bugs = [];

  const result = runCommand("pnpm lint:check", { stdio: "pipe" });

  // ESLint outputs errors to stderr or stdout
  const output = result.error || result.output || result.fullOutput || "";
  const lines = output.split("\n");

  let currentFile = null;
  let currentLine = null;
  let currentCol = null;
  let currentSeverity = null;
  let currentRule = null;
  let currentMessage = null;
  let messageLines = [];

  for (const line of lines) {
    // Match ESLint error format: /path/to/file.js:line:col error|warning rule message
    // Also handle: /path/to/file.js
    //              line:col  error|warning  rule  message
    const fileMatch = line.match(/^(.+?):(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+(.+)$/);
    const fileMatch2 = line.match(/^(.+?):(\d+):(\d+)\s+(error|warning)\s+(.+)$/);
    const fileMatch3 = line.match(/^(.+?):(\d+):(\d+)\s+(.+)$/);
    const continuationMatch = line.match(/^\s{2,}(.+)$/);

    if (fileMatch) {
      // Save previous bug if exists
      if (currentFile && currentMessage) {
        const filePath = normalizePath(currentFile);
        bugs.push({
          id: generateBugId("eslint", filePath, currentLine),
          type: "linter-error",
          category: "code-quality",
          severity: currentSeverity === "error" ? "medium" : "low",
          file: filePath,
          line: currentLine,
          column: currentCol,
          rule: currentRule,
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
      currentCol = parseInt(fileMatch[3], 10);
      currentSeverity = fileMatch[4];
      currentRule = fileMatch[5];
      currentMessage = fileMatch[6];
      messageLines = [fileMatch[6]];
    } else if (fileMatch2) {
      // Save previous bug if exists
      if (currentFile && currentMessage) {
        const filePath = normalizePath(currentFile);
        bugs.push({
          id: generateBugId("eslint", filePath, currentLine),
          type: "linter-error",
          category: "code-quality",
          severity: currentSeverity === "error" ? "medium" : "low",
          file: filePath,
          line: currentLine,
          column: currentCol,
          rule: currentRule,
          message: currentMessage,
          status: "open",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          attempts: 0,
          fixed: false,
        });
      }

      currentFile = fileMatch2[1];
      currentLine = parseInt(fileMatch2[2], 10);
      currentCol = parseInt(fileMatch2[3], 10);
      currentSeverity = fileMatch2[4];
      currentRule = null;
      currentMessage = fileMatch2[5];
      messageLines = [fileMatch2[5]];
    } else if (fileMatch3 && !currentFile) {
      // Simple format without severity/rule
      currentFile = fileMatch3[1];
      currentLine = parseInt(fileMatch3[2], 10);
      currentCol = parseInt(fileMatch3[3], 10);
      currentSeverity = "error";
      currentRule = null;
      currentMessage = fileMatch3[4];
      messageLines = [fileMatch3[4]];
    } else if (continuationMatch && currentFile) {
      // Continuation of error message
      messageLines.push(continuationMatch[1].trim());
      currentMessage = messageLines.join(" ");
    } else if (line.trim() && currentFile && !line.includes("✖") && !line.includes("✔")) {
      // Additional message line
      messageLines.push(line.trim());
      currentMessage = messageLines.join(" ");
    }
  }

  // Add last bug if exists
  if (currentFile && currentMessage) {
    const filePath = normalizePath(currentFile);
    bugs.push({
      id: generateBugId("eslint", filePath, currentLine),
      type: "linter-error",
      category: "code-quality",
      severity: currentSeverity === "error" ? "medium" : "low",
      file: filePath,
      line: currentLine,
      column: currentCol,
      rule: currentRule,
      message: currentMessage,
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attempts: 0,
      fixed: false,
    });
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

  // TypeScript outputs errors to stderr
  const output = result.error || result.output || result.fullOutput || "";
  const lines = output.split("\n");

  let currentFile = null;
  let currentLine = null;
  let currentCol = null;
  let currentCode = null;
  let currentMessage = null;
  let messageLines = [];

  for (const line of lines) {
    // Match TypeScript error format: file.ts(line,col): error TS####: message
    // Also handle: file.ts:line:col - error TS####: message
    const fileMatch = line.match(/^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/);
    const fileMatch2 = line.match(/^(.+?):(\d+):(\d+)\s+-\s+error\s+(TS\d+):\s+(.+)$/);
    const fileMatch3 = line.match(/^(.+?):(\d+):(\d+)\s+error\s+(TS\d+):\s+(.+)$/);
    const continuationMatch = line.match(/^\s{2,}(.+)$/);

    if (fileMatch) {
      // Save previous bug if exists
      if (currentFile && currentMessage) {
        const filePath = normalizePath(currentFile);
        bugs.push({
          id: generateBugId("typescript", filePath, currentLine),
          type: "type-error",
          category: "type-safety",
          severity: "high",
          file: filePath,
          line: currentLine,
          column: currentCol,
          code: currentCode,
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
      currentCol = parseInt(fileMatch[3], 10);
      currentCode = fileMatch[4];
      currentMessage = fileMatch[5];
      messageLines = [fileMatch[5]];
    } else if (fileMatch2) {
      // Save previous bug if exists
      if (currentFile && currentMessage) {
        const filePath = normalizePath(currentFile);
        bugs.push({
          id: generateBugId("typescript", filePath, currentLine),
          type: "type-error",
          category: "type-safety",
          severity: "high",
          file: filePath,
          line: currentLine,
          column: currentCol,
          code: currentCode,
          message: currentMessage,
          status: "open",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          attempts: 0,
          fixed: false,
        });
      }

      currentFile = fileMatch2[1];
      currentLine = parseInt(fileMatch2[2], 10);
      currentCol = parseInt(fileMatch2[3], 10);
      currentCode = fileMatch2[4];
      currentMessage = fileMatch2[5];
      messageLines = [fileMatch2[5]];
    } else if (fileMatch3) {
      // Save previous bug if exists
      if (currentFile && currentMessage) {
        const filePath = normalizePath(currentFile);
        bugs.push({
          id: generateBugId("typescript", filePath, currentLine),
          type: "type-error",
          category: "type-safety",
          severity: "high",
          file: filePath,
          line: currentLine,
          column: currentCol,
          code: currentCode,
          message: currentMessage,
          status: "open",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          attempts: 0,
          fixed: false,
        });
      }

      currentFile = fileMatch3[1];
      currentLine = parseInt(fileMatch3[2], 10);
      currentCol = parseInt(fileMatch3[3], 10);
      currentCode = fileMatch3[4];
      currentMessage = fileMatch3[5];
      messageLines = [fileMatch3[5]];
    } else if (continuationMatch && currentFile) {
      // Continuation of error message
      messageLines.push(continuationMatch[1].trim());
      currentMessage = messageLines.join(" ");
    } else if (line.trim() && currentFile && !line.includes("error TS") && !line.match(/^\s*$/)) {
      // Additional message line (but not a new error)
      const trimmed = line.trim();
      if (!trimmed.startsWith("at ") && !trimmed.startsWith("Error:")) {
        messageLines.push(trimmed);
        currentMessage = messageLines.join(" ");
      }
    }
  }

  // Add last bug if exists
  if (currentFile && currentMessage) {
    const filePath = normalizePath(currentFile);
    bugs.push({
      id: generateBugId("typescript", filePath, currentLine),
      type: "type-error",
      category: "type-safety",
      severity: "high",
      file: filePath,
      line: currentLine,
      column: currentCol,
      code: currentCode,
      message: currentMessage,
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attempts: 0,
      fixed: false,
    });
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
  const newBugIds = new Set();

  newBugs.forEach((newBug) => {
    newBugIds.add(newBug.id);
    const existingBug = existingMap.get(newBug.id);
    if (existingBug) {
      // Update existing bug if it's still failing
      if (existingBug.status === "open") {
        existingBug.updatedAt = new Date().toISOString();
        existingBug.message = newBug.message; // Update message in case it changed
        existingBug.attempts = existingBug.attempts || 0;
      }
    } else {
      // New bug
      merged.push(newBug);
    }
  });

  // Mark bugs as fixed if they're no longer in the new bugs list
  // (only for bugs that were previously open)
  merged.forEach((bug) => {
    if (bug.status === "open" && !newBugIds.has(bug.id)) {
      // Bug is no longer present, mark as fixed
      bug.status = "fixed";
      bug.fixed = true;
      bug.updatedAt = new Date().toISOString();
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

  // Collect all bugs (only ESLint and TypeScript errors)
  const linterBugs = collectLinterErrors();
  const typeBugs = collectTypeErrors();

  const allNewBugs = [...linterBugs, ...typeBugs];

  console.log(`\n📊 Collection Summary:`);
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
