#!/usr/bin/env node
/**
 * Bug Fixer Agent - Systematically fixes bugs without breaking functionality
 *
 * Process:
 * 1. Load bug database
 * 2. Prioritize bugs (high severity first, then by type)
 * 3. For each bug:
 *    a. Analyze the bug
 *    b. Use LLM to generate a fix
 *    c. Apply the fix to the file
 *    d. Run regression tests
 *    e. Verify fix doesn't break other tests
 *    f. Mark as fixed or increment attempts
 * 4. Update bug database
 *
 * LLM Integration:
 * - Supports Anthropic Claude (via @anthropic-ai/sdk)
 * - Supports OpenAI GPT (via openai package)
 * - Set environment variables:
 *   - ANTHROPIC_API_KEY: For Claude models
 *   - OPENAI_API_KEY: For GPT models
 *   - LLM_PROVIDER: "anthropic" or "openai" (default: "anthropic")
 *
 * Installation:
 *   pnpm add @anthropic-ai/sdk openai
 *
 * Safety:
 * - Always runs full test suite after each fix
 * - Reverts changes if tests fail
 * - Limits attempts per bug to prevent infinite loops
 * - Creates backup before making changes
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, readFile, writeFile } from "fs";
import { join, dirname, relative, resolve } from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..", ".."); // .cursor/scripts -> .cursor -> root
const BUG_DB_FILE = join(__dirname, "..", "bug-database", "bugs.json"); // .cursor/bug-database/bugs.json
const MAX_ATTEMPTS = 3;
const MAX_BUGS_PER_RUN = 10; // Safety limit

// LLM Configuration
const LLM_PROVIDER = process.env.LLM_PROVIDER || "anthropic"; // "anthropic" or "openai"
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_MODEL = {
  anthropic: "claude-3-5-sonnet-20241022",
  openai: "gpt-4-turbo-preview",
};

/**
 * Resolve file path to absolute path for file operations
 * Handles both Windows absolute paths (C:\...) and relative paths
 */
function resolveFilePath(filePath) {
  if (!filePath) return null;
  
  const rootResolved = resolve(ROOT_DIR);
  
  // If it's already an absolute path (Windows drive letter or Unix absolute)
  if (/^[A-Z]:[\\/]/.test(filePath) || filePath.startsWith("/")) {
    // Check if it's within ROOT_DIR
    try {
      const resolved = resolve(filePath);
      // Use case-insensitive comparison on Windows
      const rootNormalized = rootResolved.replace(/\\/g, "/").toLowerCase();
      const pathNormalized = resolved.replace(/\\/g, "/").toLowerCase();
      
      if (pathNormalized.startsWith(rootNormalized)) {
        // Path is within root, return absolute resolved path
        return resolved;
      }
      // Path is outside root, but try to use it anyway (might be a symlink or special case)
      return resolved;
    } catch {
      // If resolution fails, try joining with root
      return resolve(ROOT_DIR, filePath);
    }
  }
  
  // Relative path - join with ROOT_DIR
  return join(ROOT_DIR, filePath);
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
 * Initialize LLM client
 */
async function getLLMClient() {
  if (LLM_PROVIDER === "anthropic" && ANTHROPIC_API_KEY) {
    try {
      // Try standard Anthropic SDK first
      const sdkModule = await import("@anthropic-ai/sdk").catch(() => null);
      if (sdkModule) {
        const Anthropic = sdkModule.default || sdkModule.Anthropic;
        return {
          provider: "anthropic",
          client: new Anthropic({ apiKey: ANTHROPIC_API_KEY }),
          model: DEFAULT_MODEL.anthropic,
        };
      }
      
      // Try agent SDK as fallback
      const agentModule = await import("@anthropic-ai/claude-agent-sdk").catch(() => null);
      if (agentModule) {
        // Agent SDK has different API, but we can try to use it
        console.warn("⚠️  Using Claude Agent SDK (limited functionality)");
        // Note: Agent SDK has different API structure, may need different implementation
      }
    } catch (e) {
      console.warn(`⚠️  Anthropic SDK not available: ${e.message}`);
    }
  }

  if (LLM_PROVIDER === "openai" && OPENAI_API_KEY) {
    try {
      const openaiModule = await import("openai");
      const OpenAI = openaiModule.default || openaiModule.OpenAI;
      return {
        provider: "openai",
        client: new OpenAI({ apiKey: OPENAI_API_KEY }),
        model: DEFAULT_MODEL.openai,
      };
    } catch (e) {
      console.warn(`⚠️  OpenAI SDK not available: ${e.message}`);
    }
  }

  // Try fallback: if anthropic requested but not available, try OpenAI
  if (LLM_PROVIDER === "anthropic" && OPENAI_API_KEY && !ANTHROPIC_API_KEY) {
    try {
      const openaiModule = await import("openai");
      const OpenAI = openaiModule.default || openaiModule.OpenAI;
      console.log("   ℹ️  Using OpenAI as fallback (ANTHROPIC_API_KEY not set)");
      return {
        provider: "openai",
        client: new OpenAI({ apiKey: OPENAI_API_KEY }),
        model: DEFAULT_MODEL.openai,
      };
    } catch (e) {
      // No LLM available
    }
  }

  return null;
}

/**
 * Call LLM to generate fix
 */
async function generateFixWithLLM(bug, analysis, fileContent) {
  const llm = await getLLMClient();
  if (!llm) {
    return {
      success: false,
      message: "No LLM client available. Set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable.",
    };
  }

  // Build context about the bug
  const context = {
    bugType: bug.type,
    file: bug.file,
    errorMessage: bug.message,
    line: bug.line,
    column: bug.column,
    rule: bug.rule,
    code: bug.code,
    testName: bug.testName,
    suite: bug.suite,
  };

  // Generate prompt
  const systemPrompt = `You are an expert software engineer fixing bugs in a TypeScript/JavaScript codebase. 
Your task is to analyze bugs and provide precise, correct fixes that:
1. Fix the specific issue without breaking existing functionality
2. Follow the project's coding standards (TypeScript strict mode, no 'any' types in public surfaces)
3. Maintain code quality and readability
4. Are minimal and focused on the specific problem

Always provide the complete fixed code block, not just instructions.`;

  let userPrompt = `Fix the following ${bug.type}:\n\n`;
  userPrompt += `File: ${bug.file}\n`;
  if (bug.line) userPrompt += `Line: ${bug.line}\n`;
  if (bug.column) userPrompt += `Column: ${bug.column}\n`;
  userPrompt += `\nError Message:\n${bug.message}\n\n`;

  if (fileContent) {
    // Include relevant code context (lines around the error)
    const lines = fileContent.split("\n");
    const startLine = Math.max(0, (bug.line || 1) - 10);
    const endLine = Math.min(lines.length, (bug.line || 1) + 10);
    const contextLines = lines.slice(startLine, endLine);
    userPrompt += `Code Context (lines ${startLine + 1}-${endLine}):\n\`\`\`\n${contextLines.join("\n")}\n\`\`\`\n\n`;
  }

  userPrompt += `Fix Strategy: ${analysis.fixStrategy}\n\n`;
  userPrompt += `Please provide the fixed code. Return ONLY the fixed code block, maintaining the same structure and formatting.`;

  try {
    let response;
    if (llm.provider === "anthropic") {
      response = await llm.client.messages.create({
        model: llm.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      });
      const content = response.content[0];
      if (content.type === "text") {
        return {
          success: true,
          fixedCode: content.text,
          model: llm.model,
          provider: llm.provider,
        };
      }
    } else if (llm.provider === "openai") {
      response = await llm.client.chat.completions.create({
        model: llm.model,
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const content = response.choices[0]?.message?.content;
      if (content) {
        return {
          success: true,
          fixedCode: content,
          model: llm.model,
          provider: llm.provider,
        };
      }
    }

    return {
      success: false,
      message: "LLM response format unexpected",
    };
  } catch (error) {
    return {
      success: false,
      message: `LLM API error: ${error.message}`,
      error: error,
    };
  }
}

/**
 * Extract code block from LLM response
 */
function extractCodeFromResponse(responseText) {
  // Try to extract code from markdown code blocks
  const codeBlockMatch = responseText.match(/```(?:typescript|ts|javascript|js|tsx|jsx)?\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // If no code block, try to find code-like content
  // Look for function/class definitions
  const functionMatch = responseText.match(/((?:export\s+)?(?:async\s+)?function[\s\S]*?})/);
  if (functionMatch) {
    return functionMatch[1];
  }

  // Return the whole response if it looks like code
  if (responseText.includes("function") || responseText.includes("const") || responseText.includes("import")) {
    return responseText.trim();
  }

  return null;
}

/**
 * Apply LLM-generated fix to file
 */
function applyFixToFile(filePath, originalContent, fixedCode, bug) {
  try {
    const lines = originalContent.split("\n");
    
    // If we have a specific line number, try to replace that section
    if (bug.line && fixedCode) {
      // Extract the relevant section from fixed code
      const fixedLines = fixedCode.split("\n");
      
      // Try to find matching context to replace
      const startLine = Math.max(0, bug.line - 1);
      const endLine = Math.min(lines.length, bug.line + 20);
      
      // For now, replace a reasonable section
      // In a more sophisticated implementation, we'd do AST-based replacement
      const beforeLines = lines.slice(0, startLine);
      const afterLines = lines.slice(endLine);
      
      // Use the fixed code, but be conservative
      const newContent = [...beforeLines, ...fixedLines, ...afterLines].join("\n");
      return { success: true, content: newContent };
    }
    
    // If no line number, replace entire file (for type errors that might affect multiple lines)
    return { success: true, content: fixedCode };
  } catch (error) {
    return {
      success: false,
      message: `Failed to apply fix: ${error.message}`,
    };
  }
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
 * Fix a bug using LLM
 */
async function fixBug(bug, analysis) {
  console.log(`\n🔧 Fixing bug: ${bug.id}`);
  console.log(`   Type: ${bug.type}`);
  console.log(`   File: ${bug.file}`);
  console.log(`   Message: ${bug.message.substring(0, 100)}...`);

  // Create backup - resolve file path properly
  const filePath = resolveFilePath(bug.file);
  if (!filePath) {
    console.log(`   ⚠️  Could not resolve file path: ${bug.file}`);
    return { success: false, message: "Could not resolve file path" };
  }

  // For test failures, the file might be the test file, not the source file
  // We'll still try to fix it if the file exists
  let fileContent = null;
  if (existsSync(filePath)) {
    try {
      fileContent = await readFileAsync(filePath, "utf-8");
    } catch (e) {
      console.log(`   ⚠️  Could not read file: ${e.message}`);
      if (bug.type !== "test-failure") {
        return { success: false, message: `Could not read file: ${e.message}` };
      }
    }
  } else if (bug.type !== "test-failure") {
    console.log(`   ⚠️  File not found: ${filePath}`);
    return { success: false, message: "File not found" };
  }

  const backupPath = await backupFile(filePath);

  console.log(`   📝 Analysis: ${analysis.fixStrategy}`);
  console.log(`   🤖 Calling LLM to generate fix...`);

  // Generate fix using LLM
  const llmResult = await generateFixWithLLM(bug, analysis, fileContent);

  if (!llmResult.success) {
    console.log(`   ❌ LLM fix generation failed: ${llmResult.message}`);
    if (llmResult.message.includes("No LLM client available")) {
      console.log(`   💡 Set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable to enable LLM fixes.`);
      return {
        success: false,
        message: llmResult.message,
        requiresManualFix: true,
      };
    }
    return {
      success: false,
      message: llmResult.message,
      requiresManualFix: true,
    };
  }

  console.log(`   ✅ LLM generated fix using ${llmResult.provider}/${llmResult.model}`);

  // Extract code from LLM response
  const fixedCode = extractCodeFromResponse(llmResult.fixedCode);

  if (!fixedCode) {
    console.log(`   ⚠️  Could not extract code from LLM response`);
    console.log(`   📋 LLM Response:\n${llmResult.fixedCode.substring(0, 200)}...`);
    return {
      success: false,
      message: "Could not extract code from LLM response",
      requiresManualFix: true,
      llmResponse: llmResult.fixedCode,
    };
  }

  // Apply fix to file
  if (fileContent && filePath) {
    const applyResult = applyFixToFile(filePath, fileContent, fixedCode, bug);

    if (applyResult.success) {
      try {
        await writeFileAsync(filePath, applyResult.content, "utf-8");
        console.log(`   ✅ Fix applied to file`);
        return {
          success: true,
          message: "Fix applied successfully",
          backupPath,
          llmModel: llmResult.model,
          llmProvider: llmResult.provider,
        };
      } catch (e) {
        console.log(`   ❌ Failed to write file: ${e.message}`);
        return {
          success: false,
          message: `Failed to write file: ${e.message}`,
          backupPath,
        };
      }
    } else {
      console.log(`   ⚠️  Could not apply fix: ${applyResult.message}`);
      return {
        success: false,
        message: applyResult.message,
        requiresManualFix: true,
        fixedCode,
        backupPath,
      };
    }
  } else {
    // For test failures or when file doesn't exist, return the fix for manual review
    console.log(`   📋 Generated fix (file not available for auto-apply):`);
    console.log(`   \`\`\`\n${fixedCode.substring(0, 300)}...\n\`\`\``);
    return {
      success: false,
      message: "File not available for auto-apply",
      requiresManualFix: true,
      fixedCode,
      backupPath,
    };
  }
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
        const filePath = resolveFilePath(bug.file);
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
