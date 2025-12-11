#!/usr/bin/env node
/**
 * Test Failure Fixer - Systematically fixes test failures
 *
 * Process:
 * 1. Load test database (from test-fails-collector)
 * 2. Get failing tests
 * 3. For each failing test:
 *    a. Analyze whether failure is due to:
 *       - Incorrect test implementation (test bug)
 *       - Actual app bug (implementation bug)
 *    b. Use LLM to generate appropriate fix
 *    c. Apply fix following repo standards
 *    d. Run tests to verify fix
 *    e. Update test database
 *
 * LLM Integration:
 * - Uses OpenAI GPT (via openai package)
 * - Loads environment variables from .env file in root directory
 * - Set environment variable:
 *   - OPENAI_API_KEY: For GPT models (can be in .env file or as environment variable)
 *   - LLM_PROVIDER: "openai" (default: "openai")
 *
 * Safety:
 * - Always runs tests after each fix
 * - Reverts changes if tests fail
 * - Limits attempts per test to prevent infinite loops
 * - Creates backup before making changes
 * - Follows repo standards without reducing functionality
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
const ENV_FILE = join(ROOT_DIR, ".env");
const TEST_DB_FILE = join(__dirname, "..", "test-database", "test-fails.json");
const MAX_ATTEMPTS = 3;
const MAX_TESTS_PER_RUN = 10; // Safety limit

/**
 * Load environment variables from .env file in root directory
 */
function loadEnvFile() {
  if (!existsSync(ENV_FILE)) {
    return; // .env file doesn't exist, skip loading
  }

  try {
    const content = readFileSync(ENV_FILE, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      // Parse KEY=VALUE format
      const match = trimmed.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // Only set if not already in process.env (environment variables take precedence)
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️  Warning: Could not load .env file: ${error.message}`);
  }
}

// Load .env file before reading environment variables
loadEnvFile();

// LLM Configuration (read after loading .env file)
const LLM_PROVIDER = process.env.LLM_PROVIDER || "openai"; // Use OpenAI by default
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_MODEL = "gpt-4o";

/**
 * Resolve file path to absolute path for file operations
 */
function resolveFilePath(filePath) {
  if (!filePath) return null;

  const rootResolved = resolve(ROOT_DIR);

  // If it's already an absolute path
  if (/^[A-Z]:[\\/]/.test(filePath) || filePath.startsWith("/")) {
    try {
      const resolved = resolve(filePath);
      const rootNormalized = rootResolved.replace(/\\/g, "/").toLowerCase();
      const pathNormalized = resolved.replace(/\\/g, "/").toLowerCase();

      if (pathNormalized.startsWith(rootNormalized)) {
        return resolved;
      }
      return resolved;
    } catch {
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
 * Load test database
 */
function loadTestDatabase() {
  if (!existsSync(TEST_DB_FILE)) {
    console.error(`❌ Test database not found: ${TEST_DB_FILE}`);
    console.error(`   Run 'pnpm test:fails:collect' first to create the database.`);
    process.exit(1);
  }

  try {
    const content = readFileSync(TEST_DB_FILE, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    console.error(`❌ Failed to load test database: ${e.message}`);
    process.exit(1);
  }
}

/**
 * Get failing tests from database
 */
function getFailingTests(testDb) {
  return (testDb.testFails || testDb.tests || []).filter(
    (test) => test.status === "failing" || test.result === "failed" || test.result === "fail"
  );
}

/**
 * Create backup of file
 */
async function createBackup(filePath) {
  const backupPath = filePath + ".test-fix-backup";
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

  const originalPath = backupPath.replace(".test-fix-backup", "");
  const content = await readFileAsync(backupPath, "utf-8");
  await writeFileAsync(originalPath, content, "utf-8");
  return true;
}

/**
 * Run specific test to verify fix
 */
function runSpecificTest(test) {
  console.log(`   🔄 Running test to verify fix...`);

  // Determine test command based on test type
  if (test.type === "jest") {
    // Jest: run specific test file
    const testFile = test.file.replace(/\\/g, "/");
    const command = `pnpm --filter @fitvibe/backend test -- --testPathPattern="${testFile}" --passWithNoTests`;
    const result = runCommand(command, { stdio: "pipe" });
    return {
      success: result.success && result.exitCode === 0,
      output: result.output || result.error,
    };
  } else if (test.type === "vitest") {
    // Vitest: run specific test file
    const testFile = test.file.replace(/\\/g, "/");
    const command = `pnpm --filter @fitvibe/frontend test -- --run "${testFile}"`;
    const result = runCommand(command, { stdio: "pipe" });
    return {
      success: result.success && result.exitCode === 0,
      output: result.output || result.error,
    };
  }

  return { success: false, output: "Unknown test type" };
}

/**
 * Initialize LLM client
 */
async function getLLMClient() {
  if (LLM_PROVIDER === "openai" && OPENAI_API_KEY) {
    try {
      const openaiModule = await import("openai");
      const OpenAI = openaiModule.default || openaiModule.OpenAI;
      return {
        provider: "openai",
        client: new OpenAI({ apiKey: OPENAI_API_KEY }),
        model: DEFAULT_MODEL,
      };
    } catch (e) {
      console.warn(`⚠️  OpenAI SDK not available: ${e.message}`);
    }
  }

  return null;
}

/**
 * Analyze test failure to determine root cause
 */
async function analyzeTestFailure(test, testFileContent, sourceFileContent) {
  const llm = await getLLMClient();
  if (!llm) {
    // Fallback analysis without LLM
    return {
      rootCause: "unknown",
      isTestBug: false,
      isAppBug: false,
      confidence: 0.5,
      reasoning: "LLM not available for analysis",
    };
  }

  const systemPrompt = `You are an expert software engineer analyzing test failures.
Your task is to determine whether a test failure is due to:
1. **Test Bug**: The test itself is incorrectly implemented (wrong expectations, incorrect setup, flaky test, etc.)
2. **App Bug**: The application code has a bug that the test is correctly catching

Analyze the test failure and provide a JSON response with:
- rootCause: "test-bug" or "app-bug" or "unknown"
- isTestBug: boolean
- isAppBug: boolean
- confidence: number between 0 and 1
- reasoning: detailed explanation of your analysis
- recommendedFix: brief description of what should be fixed

Be thorough and consider:
- Test expectations vs actual behavior
- Whether the test logic is correct
- Whether the application behavior matches requirements
- Code quality and standards`;

  let userPrompt = `Analyze this test failure:\n\n`;
  userPrompt += `Test File: ${test.file}\n`;
  userPrompt += `Test Name: ${test.testName}\n`;
  userPrompt += `Suite: ${test.suite}\n`;
  userPrompt += `Type: ${test.type}\n\n`;
  userPrompt += `Failure Message:\n${test.failureMessage || "No message"}\n\n`;

  if (testFileContent) {
    userPrompt += `Test Code:\n\`\`\`typescript\n${testFileContent}\n\`\`\`\n\n`;
  }

  if (sourceFileContent) {
    userPrompt += `Source Code Being Tested:\n\`\`\`typescript\n${sourceFileContent}\n\`\`\`\n\n`;
  }

  userPrompt += `Please analyze whether this is a test bug or an app bug, and provide your reasoning.`;

  try {
    const response = await llm.client.chat.completions.create({
      model: llm.model,
      max_tokens: 2000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      try {
        const analysis = JSON.parse(content);
        return {
          rootCause: analysis.rootCause || "unknown",
          isTestBug: analysis.isTestBug || false,
          isAppBug: analysis.isAppBug || false,
          confidence: analysis.confidence || 0.5,
          reasoning: analysis.reasoning || "",
          recommendedFix: analysis.recommendedFix || "",
        };
      } catch (e) {
        console.warn(`⚠️  Failed to parse LLM analysis: ${e.message}`);
      }
    }
  } catch (error) {
    console.warn(`⚠️  LLM analysis failed: ${error.message}`);
  }

  // Fallback
  return {
    rootCause: "unknown",
    isTestBug: false,
    isAppBug: false,
    confidence: 0.5,
    reasoning: "LLM analysis failed",
  };
}

/**
 * Generate fix using LLM
 */
async function generateFixWithLLM(test, analysis, testFileContent, sourceFileContent) {
  const llm = await getLLMClient();
  if (!llm) {
    return {
      success: false,
      message: "No LLM client available. Set OPENAI_API_KEY environment variable.",
    };
  }

  const systemPrompt = `You are an expert software engineer fixing test failures in a TypeScript/JavaScript codebase.

**CRITICAL REQUIREMENTS:**
1. **Follow Repository Standards:**
   - TypeScript strict mode (no 'any' types in public surfaces)
   - Use proper error handling with HttpError utility
   - Follow Controller → Service → Repository pattern
   - Use Zod schemas for validation
   - Use i18n for all user-facing text
   - Use configuration from env.ts (never hardcode values)
   - Ensure accessibility (ARIA labels, keyboard navigation)

2. **Do NOT reduce or change functionality:**
   - Maintain all existing behavior
   - Don't remove features or simplify logic
   - Keep all error handling intact
   - Preserve all validation rules

3. **Fix Strategy:**
   - If test bug: Fix the test to correctly validate the implementation
   - If app bug: Fix the implementation to match requirements and pass the test
   - Ensure the fix doesn't break other tests or functionality

4. **Code Quality:**
   - Write complete, production-ready code
   - Include proper error handling
   - Add appropriate comments where needed
   - Follow existing code patterns in the codebase

Always provide the complete fixed code block, not just instructions.`;

  let userPrompt = `Fix this test failure:\n\n`;
  userPrompt += `Test File: ${test.file}\n`;
  userPrompt += `Test Name: ${test.testName}\n`;
  userPrompt += `Suite: ${test.suite}\n`;
  userPrompt += `Failure Message:\n${test.failureMessage || "No message"}\n\n`;

  userPrompt += `Analysis:\n`;
  userPrompt += `- Root Cause: ${analysis.rootCause}\n`;
  userPrompt += `- Is Test Bug: ${analysis.isTestBug}\n`;
  userPrompt += `- Is App Bug: ${analysis.isAppBug}\n`;
  userPrompt += `- Reasoning: ${analysis.reasoning}\n`;
  userPrompt += `- Recommended Fix: ${analysis.recommendedFix}\n\n`;

  if (analysis.isTestBug && testFileContent) {
    userPrompt += `Fix the TEST CODE. The test is incorrectly implemented.\n\n`;
    userPrompt += `Current Test Code:\n\`\`\`typescript\n${testFileContent}\n\`\`\`\n\n`;
    if (sourceFileContent) {
      userPrompt += `Source Code Being Tested (for reference):\n\`\`\`typescript\n${sourceFileContent}\n\`\`\`\n\n`;
    }
  } else if (analysis.isAppBug && sourceFileContent) {
    userPrompt += `Fix the APPLICATION CODE. The implementation has a bug.\n\n`;
    userPrompt += `Current Source Code:\n\`\`\`typescript\n${sourceFileContent}\n\`\`\`\n\n`;
    if (testFileContent) {
      userPrompt += `Test Code (for reference):\n\`\`\`typescript\n${testFileContent}\n\`\`\`\n\n`;
    }
  } else {
    userPrompt += `Fix the code based on the analysis.\n\n`;
    if (testFileContent) {
      userPrompt += `Test Code:\n\`\`\`typescript\n${testFileContent}\n\`\`\`\n\n`;
    }
    if (sourceFileContent) {
      userPrompt += `Source Code:\n\`\`\`typescript\n${sourceFileContent}\n\`\`\`\n\n`;
    }
  }

  userPrompt += `Please provide the complete fixed code. Return ONLY the fixed code block with proper formatting.`;

  try {
    const response = await llm.client.chat.completions.create({
      model: llm.model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      // Extract code from markdown code blocks
      const codeBlockMatch = content.match(/```(?:typescript|ts|javascript|js|tsx|jsx)?\n([\s\S]*?)```/);
      const fixedCode = codeBlockMatch ? codeBlockMatch[1].trim() : content.trim();

      return {
        success: true,
        fixedCode: fixedCode,
        model: llm.model,
        provider: llm.provider,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `LLM API error: ${error.message}`,
      error: error,
    };
  }

  return {
    success: false,
    message: "LLM response format unexpected",
  };
}

/**
 * Apply fix to file
 */
async function applyFixToFile(filePath, fixedCode) {
  try {
    await writeFileAsync(filePath, fixedCode, "utf-8");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: `Failed to apply fix: ${error.message}`,
    };
  }
}

/**
 * Get source file path from test file path
 */
function getSourceFilePath(testFilePath) {
  // Convert test file path to source file path
  // e.g., tests/frontend/pages/Login.test.tsx -> apps/frontend/src/pages/Login.tsx
  // e.g., apps/backend/src/modules/auth/__tests__/auth.controller.test.ts -> apps/backend/src/modules/auth/auth.controller.ts

  let sourcePath = testFilePath;

  // Remove test directory prefix
  if (sourcePath.includes("/tests/")) {
    sourcePath = sourcePath.replace(/^tests\//, "");
    // Map test structure to source structure
    if (sourcePath.startsWith("frontend/")) {
      sourcePath = sourcePath.replace(/^frontend\//, "apps/frontend/src/");
    } else if (sourcePath.startsWith("backend/")) {
      sourcePath = sourcePath.replace(/^backend\//, "apps/backend/src/");
    }
  }

  // Remove __tests__ directory
  sourcePath = sourcePath.replace(/\/__tests__\//, "/");

  // Remove .test.ts or .test.tsx extension
  sourcePath = sourcePath.replace(/\.test\.(ts|tsx)$/, ".$1");

  return sourcePath;
}

/**
 * Fix a test failure
 */
async function fixTestFailure(test, testDb) {
  console.log(`\n🔧 Fixing test failure: ${test.testName}`);
  console.log(`   File: ${test.file}`);
  console.log(`   Type: ${test.type}`);

  // Read test file
  const testFilePath = resolveFilePath(test.file);
  if (!testFilePath || !existsSync(testFilePath)) {
    console.error(`   ❌ Test file not found: ${test.file}`);
    return { success: false, message: "Test file not found" };
  }

  let testFileContent;
  try {
    testFileContent = await readFileAsync(testFilePath, "utf-8");
  } catch (error) {
    console.error(`   ❌ Failed to read test file: ${error.message}`);
    return { success: false, message: `Failed to read test file: ${error.message}` };
  }

  // Try to find and read source file
  const sourceFilePath = resolveFilePath(getSourceFilePath(test.file));
  let sourceFileContent = null;
  if (sourceFilePath && existsSync(sourceFilePath)) {
    try {
      sourceFileContent = await readFileAsync(sourceFilePath, "utf-8");
    } catch (error) {
      console.warn(`   ⚠️  Could not read source file: ${sourceFilePath}`);
    }
  }

  // Analyze test failure
  console.log(`   🔍 Analyzing test failure...`);
  const analysis = await analyzeTestFailure(test, testFileContent, sourceFileContent);
  console.log(`   📊 Analysis: ${analysis.rootCause} (confidence: ${(analysis.confidence * 100).toFixed(0)}%)`);
  console.log(`   💡 ${analysis.reasoning.substring(0, 100)}...`);

  // Determine which file to fix
  const fileToFix = analysis.isTestBug ? testFilePath : sourceFilePath || testFilePath;
  const contentToFix = analysis.isTestBug ? testFileContent : sourceFileContent || testFileContent;

  if (!fileToFix || !existsSync(fileToFix)) {
    console.error(`   ❌ File to fix not found: ${fileToFix}`);
    return { success: false, message: "File to fix not found" };
  }

  // Create backup
  console.log(`   💾 Creating backup...`);
  const backupPath = await createBackup(fileToFix);

  try {
    // Generate fix with LLM
    console.log(`   🤖 Generating fix with LLM...`);
    const fixResult = await generateFixWithLLM(test, analysis, testFileContent, sourceFileContent);

    if (!fixResult.success) {
      console.error(`   ❌ Failed to generate fix: ${fixResult.message}`);
      await restoreFile(backupPath);
      return fixResult;
    }

    // Apply fix
    console.log(`   ✏️  Applying fix...`);
    const applyResult = await applyFixToFile(fileToFix, fixResult.fixedCode);

    if (!applyResult.success) {
      console.error(`   ❌ Failed to apply fix: ${applyResult.message}`);
      await restoreFile(backupPath);
      return applyResult;
    }

    // Run test to verify fix
    console.log(`   ✅ Fix applied, verifying...`);
    const testResult = runSpecificTest(test);

    if (testResult.success) {
      console.log(`   ✅ Test passed! Fix successful.`);
      return { success: true, message: "Test fixed successfully" };
    } else {
      console.error(`   ❌ Test still failing, reverting changes...`);
      await restoreFile(backupPath);
      return {
        success: false,
        message: "Test still failing after fix",
        output: testResult.output,
      };
    }
  } catch (error) {
    console.error(`   ❌ Error during fix: ${error.message}`);
    await restoreFile(backupPath);
    return {
      success: false,
      message: `Error: ${error.message}`,
    };
  }
}

/**
 * Update test database after fix
 */
function updateTestDatabase(testDb, testId, success) {
  const testFails = testDb.testFails || testDb.tests || [];
  const test = testFails.find((t) => t.id === testId);
  if (test) {
    if (success) {
      test.status = "passing";
      test.result = "passed";
      test.updatedAt = new Date().toISOString();
    } else {
      test.attempts = (test.attempts || 0) + 1;
      test.updatedAt = new Date().toISOString();
    }
  }

  // Recalculate stats
  testDb.stats = {
    total: testFails.length,
    passing: testFails.filter((t) => t.status === "passing" || t.result === "passed").length,
    failing: testFails.filter((t) => t.status === "failing" || t.result === "failed").length,
    pending: testFails.filter((t) => t.result === "pending" || t.result === "todo").length,
    skipped: testFails.filter((t) => t.result === "skipped").length,
    byType: {},
    byCategory: {},
  };

  testFails.forEach((t) => {
    testDb.stats.byType[t.type] = (testDb.stats.byType[t.type] || 0) + 1;
    testDb.stats.byCategory[t.category] = (testDb.stats.byCategory[t.category] || 0) + 1;
  });

  testDb.lastUpdated = new Date().toISOString();
  writeFileSync(TEST_DB_FILE, JSON.stringify(testDb, null, 2), "utf-8");
}

/**
 * Main function
 */
async function main() {
  console.log("🧪 Test Failure Fixer - Starting...\n");

  // Check for OpenAI API key
  if (!OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY environment variable not set.");
    console.error("   Set it in the .env file in the root directory:");
    console.error("   OPENAI_API_KEY=your-key-here");
    console.error("   Or set it as an environment variable:");
    console.error("   export OPENAI_API_KEY='your-key-here' (Linux/Mac)");
    console.error("   set OPENAI_API_KEY=your-key-here (Windows)");
    process.exit(1);
  }

  // Load test database
  const testDb = loadTestDatabase();
  let failingTests = getFailingTests(testDb);

  // Prioritize frontend (vitest) tests if any exist
  const frontendTests = failingTests.filter((t) => t.type === "vitest");
  const backendTests = failingTests.filter((t) => t.type === "jest");
  if (frontendTests.length > 0) {
    console.log(`📊 Found ${failingTests.length} failing test(s) (${frontendTests.length} frontend, ${backendTests.length} backend)`);
    console.log(`   Prioritizing frontend tests...\n`);
    failingTests = [...frontendTests, ...backendTests];
  } else {
    console.log(`📊 Found ${failingTests.length} failing test(s)\n`);
  }

  // Limit number of tests to fix
  const testsToFix = failingTests.slice(0, MAX_TESTS_PER_RUN);
  if (failingTests.length > MAX_TESTS_PER_RUN) {
    console.log(`⚠️  Limiting to ${MAX_TESTS_PER_RUN} tests per run.\n`);
  }

  let fixedCount = 0;
  let failedCount = 0;

  for (const test of testsToFix) {
    // Skip if too many attempts
    if ((test.attempts || 0) >= MAX_ATTEMPTS) {
      console.log(`\n⏭️  Skipping ${test.testName} (max attempts reached)`);
      continue;
    }

    const result = await fixTestFailure(test, testDb);

    if (result.success) {
      fixedCount++;
      updateTestDatabase(testDb, test.id, true);
    } else {
      failedCount++;
      updateTestDatabase(testDb, test.id, false);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Fixed: ${fixedCount}`);
  console.log(`   Failed: ${failedCount}`);
  console.log(`   Total: ${testsToFix.length}`);

  if (fixedCount > 0) {
    console.log(`\n✅ Successfully fixed ${fixedCount} test(s)!`);
  }

  process.exit(failedCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

