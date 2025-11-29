#!/usr/bin/env node
/**
 * Bug Fixer Agent - Systematically fixes bugs without breaking functionality
 *
 * Process:
 * 1. Load bug database
 * 2. Prioritize bugs (high severity first, then by type)
 * 3. For each bug:
 *    a. Analyze the bug
 *    b. Create a fix
 *    c. Run regression tests
 *    d. Verify fix doesn't break other tests
 *    e. Mark as fixed or increment attempts
 * 4. Update bug database
 *
 * Safety:
 * - Always runs full test suite after each fix
 * - Reverts changes if tests fail
 * - Limits attempts per bug to prevent infinite loops
 * - Creates backup before making changes
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, readFile, writeFile } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..");
const BUG_DB_FILE = join(ROOT_DIR, ".bug-database", "bugs.json");
const MAX_ATTEMPTS = 3;
const MAX_BUGS_PER_RUN = 10; // Safety limit

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
 * Load bug database
 */
function loadBugDatabase() {
  if (!existsSync(BUG_DB_FILE)) {
    console.error("❌ Bug database not found. Run bug-collector.mjs first.");
    process.exit(1);
  }

  try {
    const content = readFileSync(BUG_DB_FILE, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    console.error("❌ Could not load bug database:", e.message);
    process.exit(1);
  }
}

/**
 * Save bug database
 */
function saveBugDatabase(db) {
  // Recalculate stats
  db.stats = calculateStats(db.bugs);
  db.lastUpdated = new Date().toISOString();

  writeFileSync(BUG_DB_FILE, JSON.stringify(db, null, 2), "utf-8");
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
 * Prioritize bugs
 */
function prioritizeBugs(bugs) {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const typeOrder = {
    "type-error": 0,
    "test-failure": 1,
    "linter-error": 2,
  };

  return bugs
    .filter((b) => b.status === "open" && !b.fixed)
    .sort((a, b) => {
      // First by severity
      const severityDiff = (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99);
      if (severityDiff !== 0) return severityDiff;

      // Then by type
      const typeDiff = (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
      if (typeDiff !== 0) return typeDiff;

      // Then by attempts (fewer attempts first)
      return a.attempts - b.attempts;
    })
    .slice(0, MAX_BUGS_PER_RUN);
}

/**
 * Create backup of file
 */
async function backupFile(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  const backupPath = filePath + ".bug-fix-backup";
  const content = await readFileAsync(filePath, "utf-8");
  await writeFileAsync(backupPath, content, "utf-8");
  return backupPath;
}

/**
 * Restore file from backup
 */
async function restoreFile(backupPath) {
  if (!backupPath || !existsSync(backupPath)) {
    return false;
  }

  const originalPath = backupPath.replace(".bug-fix-backup", "");
  const content = await readFileAsync(backupPath, "utf-8");
  await writeFileAsync(originalPath, content, "utf-8");
  return true;
}

/**
 * Run regression tests
 */
function runRegressionTests() {
  console.log("   🔄 Running regression tests...");

  // Run type check
  const typeCheck = runCommand("pnpm typecheck", { stdio: "pipe" });
  if (!typeCheck.success) {
    return { success: false, message: "Type check failed", output: typeCheck.error };
  }

  // Run linter
  const lint = runCommand("pnpm lint:check", { stdio: "pipe" });
  if (!lint.success) {
    return { success: false, message: "Linter check failed", output: lint.error };
  }

  // Run backend tests (limited to avoid long runs)
  const backendTests = runCommand(
    "pnpm --filter @fitvibe/backend test -- --passWithNoTests --maxWorkers=2",
    { stdio: "pipe" },
  );
  if (!backendTests.success) {
    return {
      success: false,
      message: "Backend tests failed",
      output: backendTests.error,
    };
  }

  // Run frontend tests
  const frontendTests = runCommand("pnpm --filter @fitvibe/frontend test -- --run", {
    stdio: "pipe",
  });
  if (!frontendTests.success) {
    return {
      success: false,
      message: "Frontend tests failed",
      output: frontendTests.error,
    };
  }

  return { success: true, message: "All regression tests passed" };
}

/**
 * Analyze bug and generate fix instructions
 */
function analyzeBug(bug) {
  const analysis = {
    category: bug.category,
    type: bug.type,
    file: bug.file,
    fixStrategy: null,
    instructions: [],
  };

  if (bug.type === "type-error") {
    analysis.fixStrategy = "type-fix";
    analysis.instructions = [
      "Read the TypeScript error message carefully",
      "Identify the type mismatch or missing type",
      "Add proper types without using 'any'",
      "Ensure the fix maintains functionality",
    ];
  } else if (bug.type === "linter-error") {
    analysis.fixStrategy = "lint-fix";
    analysis.instructions = [
      "Read the ESLint error message",
      "Fix the code style or rule violation",
      "Run 'pnpm lint -- --fix' if it's auto-fixable",
      "Otherwise, manually fix the issue",
    ];
  } else if (bug.type === "test-failure") {
    analysis.fixStrategy = "test-fix";
    analysis.instructions = [
      "Read the test failure message",
      "Understand what the test is checking",
      "Fix the implementation to match the test expectations",
      "Ensure the fix doesn't break other functionality",
    ];
  }

  return analysis;
}

/**
 * Fix a bug (this is a template - actual fixing requires AI/LLM)
 */
async function fixBug(bug, analysis) {
  console.log(`\n🔧 Fixing bug: ${bug.id}`);
  console.log(`   Type: ${bug.type}`);
  console.log(`   File: ${bug.file}`);
  console.log(`   Message: ${bug.message.substring(0, 100)}...`);

  // Create backup
  const filePath = join(ROOT_DIR, bug.file);
  const backupPath = await backupFile(filePath);

  if (!backupPath && bug.type !== "test-failure") {
    console.log(`   ⚠️  File not found: ${bug.file}, skipping...`);
    return { success: false, message: "File not found" };
  }

  // For now, this is a placeholder
  // In a real implementation, this would:
  // 1. Use an LLM to generate the fix
  // 2. Apply the fix to the file
  // 3. Verify the fix

  console.log(`   📝 Analysis: ${analysis.fixStrategy}`);
  console.log(`   💡 Instructions:`);
  analysis.instructions.forEach((inst, i) => {
    console.log(`      ${i + 1}. ${inst}`);
  });

  console.log(`\n   ⚠️  Auto-fix not implemented. Manual fix required.`);
  console.log(`   📋 Please fix this bug manually and run the agent again.`);

  return {
    success: false,
    message: "Auto-fix not implemented - requires manual intervention",
    requiresManualFix: true,
  };
}

/**
 * Mark bug as fixed
 */
function markBugFixed(db, bugId, fixDetails) {
  const bug = db.bugs.find((b) => b.id === bugId);
  if (bug) {
    bug.status = "fixed";
    bug.fixed = true;
    bug.fixedAt = new Date().toISOString();
    bug.fixDetails = fixDetails;
    bug.updatedAt = new Date().toISOString();
  }
}

/**
 * Increment bug attempts
 */
function incrementAttempts(db, bugId, error) {
  const bug = db.bugs.find((b) => b.id === bugId);
  if (bug) {
    bug.attempts = (bug.attempts || 0) + 1;
    bug.lastAttemptAt = new Date().toISOString();
    bug.lastAttemptError = error;

    if (bug.attempts >= MAX_ATTEMPTS) {
      bug.status = "blocked";
      bug.blockedReason = `Exceeded max attempts (${MAX_ATTEMPTS})`;
    }

    bug.updatedAt = new Date().toISOString();
  }
}

/**
 * Main fixing function
 */
async function main() {
  console.log("🔧 Bug Fixer Agent - Starting...\n");

  const db = loadBugDatabase();

  if (db.stats.open === 0) {
    console.log("✅ No open bugs to fix!");
    return;
  }

  console.log(`📊 Bug Statistics:`);
  console.log(`   Total bugs: ${db.stats.total}`);
  console.log(`   Open: ${db.stats.open}`);
  console.log(`   Fixed: ${db.stats.fixed}`);
  console.log(`\n🎯 Prioritizing bugs...`);

  const prioritizedBugs = prioritizeBugs(db.bugs);

  if (prioritizedBugs.length === 0) {
    console.log("✅ No bugs to fix (all are fixed or blocked)!");
    return;
  }

  console.log(`\n📋 Will attempt to fix ${prioritizedBugs.length} bugs:\n`);

  let fixedCount = 0;
  let failedCount = 0;

  for (const bug of prioritizedBugs) {
    if (bug.attempts >= MAX_ATTEMPTS) {
      console.log(`\n⏭️  Skipping ${bug.id} (exceeded max attempts)`);
      continue;
    }

    const analysis = analyzeBug(bug);
    const fixResult = await fixBug(bug, analysis);

    if (fixResult.success) {
      // Run regression tests
      const regressionResult = runRegressionTests();

      if (regressionResult.success) {
        markBugFixed(db, bug.id, {
          strategy: analysis.fixStrategy,
          fixedAt: new Date().toISOString(),
        });
        saveBugDatabase(db);
        fixedCount++;
        console.log(`   ✅ Bug fixed and verified!`);
      } else {
        // Revert changes
        const filePath = join(ROOT_DIR, bug.file);
        const backupPath = filePath + ".bug-fix-backup";
        await restoreFile(backupPath);

        incrementAttempts(db, bug.id, `Regression test failed: ${regressionResult.message}`);
        saveBugDatabase(db);
        failedCount++;
        console.log(`   ❌ Fix broke regression tests, reverted changes`);
        console.log(`   Error: ${regressionResult.message}`);
      }
    } else if (fixResult.requiresManualFix) {
      // Manual fix required - don't increment attempts
      console.log(`   ⏸️  Requires manual fix`);
    } else {
      incrementAttempts(db, bug.id, fixResult.message || "Fix failed");
      saveBugDatabase(db);
      failedCount++;
      console.log(`   ❌ Fix failed: ${fixResult.message}`);
    }
  }

  console.log(`\n📊 Fix Session Summary:`);
  console.log(`   Fixed: ${fixedCount}`);
  console.log(`   Failed: ${failedCount}`);
  console.log(`   Remaining open: ${db.stats.open}`);

  saveBugDatabase(db);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
