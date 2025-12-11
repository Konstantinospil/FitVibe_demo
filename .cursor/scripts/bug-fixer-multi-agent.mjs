#!/usr/bin/env node
/**
 * Multi-Agent Bug Fixer - Enhanced version with multi-agent collaboration
 *
 * Architecture (RGD Pattern):
 * - Guide Agent: Analyzes bugs, creates fix strategy, coordinates workflow
 * - Debug Agent: Performs root cause analysis, traces errors
 * - Feedback Agent: Validates fixes, provides feedback, suggests improvements
 * - Brainstorm Agent: Coordinates multiple LLMs for diverse perspectives
 *
 * Features:
 * - Multi-LLM ensemble analysis (SLEAN pattern)
 * - Interactive debugging capabilities
 * - Root cause analysis with dependency tracing
 * - Continuous learning from past fixes
 * - Dynamic analysis support
 * - LLM-powered code generation and fixes
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
 */

import { execSync } from "child_process";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readFile,
  writeFile,
  mkdirSync,
  unlinkSync,
} from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);
const unlinkAsync = promisify(unlinkSync);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..", ".."); // .cursor/scripts -> .cursor -> root
const BUG_DB_DIR = join(__dirname, "..", "bug-database"); // .cursor/bug-database
const BUG_DB_FILE = join(BUG_DB_DIR, "bugs.json");
const FIX_HISTORY_FILE = join(BUG_DB_DIR, "fix-history.json");
const CODING_STYLE_GUIDE = join(
  ROOT_DIR,
  "docs",
  "2.Technical_Design_Document",
  "CODING_STYLE_GUIDE.md",
);
const CURSOR_RULES = join(ROOT_DIR, ".cursorrules");
const MAX_ATTEMPTS = 3;
const MAX_BUGS_PER_RUN = 10;
const REGRESSION_TEST_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// LLM Configuration
const LLM_PROVIDER = process.env.LLM_PROVIDER || "anthropic"; // "anthropic" or "openai"
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_MODEL = {
  anthropic: "claude-3-5-sonnet-20241022",
  openai: "gpt-4-turbo-preview",
};

// Agent configuration
const AGENTS = {
  GUIDE: "guide",
  DEBUG: "debug",
  FEEDBACK: "feedback",
  BRAINSTORM: "brainstorm",
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
 * Ensure bug database directory exists
 */
function ensureBugDatabaseDir() {
  if (!existsSync(BUG_DB_DIR)) {
    mkdirSync(BUG_DB_DIR, { recursive: true });
  }
}

/**
 * Load coding style guide reference
 */
function loadStyleGuideReference() {
  const references = {
    styleGuide: null,
    cursorRules: null,
    keyStandards: [],
  };

  // Load coding style guide if available
  if (existsSync(CODING_STYLE_GUIDE)) {
    try {
      const content = readFileSync(CODING_STYLE_GUIDE, "utf-8");
      references.styleGuide = content;

      // Extract key standards
      const standards = [
        "TypeScript strict mode - no 'any' types in public surfaces",
        "Use interfaces for object shapes, types for unions/intersections",
        "Use 'import type' for type-only imports",
        "camelCase for variables and functions",
        "PascalCase for types and interfaces",
        "kebab-case for file names",
        "Double quotes for strings (Prettier config)",
        "Semicolons required",
        "Trailing commas in multiline structures",
      ];
      references.keyStandards = standards;
    } catch (e) {
      console.warn("⚠️  Could not load coding style guide:", e.message);
    }
  }

  // Load cursor rules if available
  if (existsSync(CURSOR_RULES)) {
    try {
      const content = readFileSync(CURSOR_RULES, "utf-8");
      references.cursorRules = content;
    } catch (e) {
      console.warn("⚠️  Could not load cursor rules:", e.message);
    }
  }

  return references;
}

/**
 * Validate bug database structure
 */
function validateBugDatabase(db) {
  if (!db || typeof db !== "object") {
    return false;
  }
  if (!Array.isArray(db.bugs)) {
    return false;
  }
  return true;
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
    const db = JSON.parse(content);

    if (!validateBugDatabase(db)) {
      console.error("❌ Bug database structure is invalid. Please re-run bug-collector.mjs.");
      process.exit(1);
    }

    return db;
  } catch (e) {
    console.error("❌ Could not load bug database:", e.message);
    process.exit(1);
  }
}

/**
 * Validate fix history structure
 */
function validateFixHistory(history) {
  if (!history || typeof history !== "object") {
    return false;
  }
  if (!Array.isArray(history.fixes)) {
    return false;
  }
  return true;
}

/**
 * Load fix history for learning
 */
function loadFixHistory() {
  if (!existsSync(FIX_HISTORY_FILE)) {
    return {
      fixes: [],
      patterns: {},
      successRate: {},
    };
  }

  try {
    const content = readFileSync(FIX_HISTORY_FILE, "utf-8");
    const history = JSON.parse(content);

    if (!validateFixHistory(history)) {
      console.warn("⚠️  Fix history structure is invalid, resetting...");
      return {
        fixes: [],
        patterns: {},
        successRate: {},
      };
    }

    return history;
  } catch (e) {
    console.warn("⚠️  Could not load fix history:", e.message);
    return {
      fixes: [],
      patterns: {},
      successRate: {},
    };
  }
}

/**
 * Save fix history
 */
function saveFixHistory(history) {
  ensureBugDatabaseDir();
  try {
    writeFileSync(FIX_HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
  } catch (e) {
    console.error("❌ Could not save fix history:", e.message);
    throw e;
  }
}

/**
 * Save bug database
 */
function saveBugDatabase(db) {
  ensureBugDatabaseDir();
  try {
    db.stats = calculateStats(db.bugs);
    db.lastUpdated = new Date().toISOString();
    writeFileSync(BUG_DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("❌ Could not save bug database:", e.message);
    throw e;
  }
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
 * Prioritize bugs with enhanced algorithm
 */
function prioritizeBugs(bugs, fixHistory) {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const typeOrder = {
    "type-error": 0,
    "test-failure": 1,
    "linter-error": 2,
  };

  // Calculate success rate for similar bugs
  function getSimilarBugSuccessRate(bug) {
    const similarFixes = fixHistory.fixes.filter(
      (f) => f.bugType === bug.type && f.category === bug.category,
    );
    if (similarFixes.length === 0) return 0.5; // Default confidence

    const successful = similarFixes.filter((f) => f.success).length;
    return successful / similarFixes.length;
  }

  return bugs
    .filter((b) => b.status === "open" && !b.fixed)
    .map((bug) => ({
      bug,
      priority: calculatePriority(bug, fixHistory),
    }))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_BUGS_PER_RUN)
    .map((item) => item.bug);

  function calculatePriority(bug, history) {
    // Base priority from severity
    let priority = (severityOrder[bug.severity] || 99) * 1000;

    // Adjust by type
    priority += (typeOrder[bug.type] || 99) * 100;

    // Adjust by attempts (fewer attempts = higher priority)
    priority += bug.attempts * 10;

    // Adjust by historical success rate (higher success = higher priority)
    const successRate = getSimilarBugSuccessRate(bug);
    priority -= successRate * 5;

    return priority;
  }
}

/**
 * Guide Agent: Analyzes bug and creates fix strategy
 */
async function guideAgent(bug, fixHistory, styleGuideRef) {
  console.log(`\n🧭 [Guide Agent] Analyzing bug: ${bug.id}`);

  const analysis = {
    bugId: bug.id,
    category: bug.category,
    type: bug.type,
    file: bug.file,
    fixStrategy: null,
    approach: null,
    confidence: 0.5,
    estimatedComplexity: "medium",
    similarFixes: [],
    instructions: [],
    styleGuide: styleGuideRef,
  };

  // Find similar past fixes
  const similarFixes = fixHistory.fixes.filter(
    (f) => f.bugType === bug.type && f.category === bug.category,
  );
  analysis.similarFixes = similarFixes.slice(0, 3);

  // Determine fix strategy based on type
  if (bug.type === "type-error") {
    analysis.fixStrategy = "type-fix";
    analysis.approach = "Add proper TypeScript types following FitVibe strict mode standards";
    analysis.confidence = 0.8;
    analysis.estimatedComplexity = "low";
    analysis.instructions = [
      "Read the TypeScript error message carefully",
      "Identify the type mismatch or missing type",
      "Check similar fixes in history for patterns",
      "Follow FitVibe TypeScript conventions:",
      "  - NO 'any' types in public surfaces (strict mode enforced)",
      "  - Use 'interface' for object shapes that may be extended",
      "  - Use 'type' for unions, intersections, and computed types",
      "  - Use 'import type' for type-only imports",
      "  - Prefer type inference where possible, but be explicit for public APIs",
      "Add proper types maintaining functionality",
      "Verify no 'any' types are introduced",
      "Reference: docs/2.Technical_Design_Document/CODING_STYLE_GUIDE.md (TypeScript Conventions)",
    ];
  } else if (bug.type === "linter-error") {
    analysis.fixStrategy = "lint-fix";
    analysis.approach = "Fix code style or rule violation following FitVibe coding standards";
    analysis.confidence = 0.9;
    analysis.estimatedComplexity = "low";
    analysis.instructions = [
      "Read the ESLint error message carefully",
      "Try auto-fix first: 'pnpm lint -- --fix'",
      "If not auto-fixable, manually fix following FitVibe coding standards:",
      "  - Use double quotes (not single quotes)",
      "  - Add semicolons at end of statements",
      "  - Use trailing commas in multiline structures",
      "  - Follow naming conventions (camelCase, PascalCase, kebab-case)",
      "  - Use 'import type' for type-only imports",
      "  - Follow file organization patterns",
      "Reference: docs/2.Technical_Design_Document/CODING_STYLE_GUIDE.md",
      "Verify fix with: 'pnpm lint:check'",
    ];
  } else if (bug.type === "test-failure") {
    analysis.fixStrategy = "test-fix";
    analysis.approach = "Fix implementation to match test expectations following FitVibe patterns";
    analysis.confidence = 0.6;
    analysis.estimatedComplexity = "high";
    analysis.instructions = [
      "Read the test failure message carefully",
      "Understand what the test is checking",
      "Trace the code path that's failing",
      "Fix the implementation to match expectations",
      "Follow FitVibe coding standards:",
      "  - Maintain TypeScript strict mode compliance",
      "  - Follow naming conventions (camelCase, PascalCase)",
      "  - Use proper error handling patterns",
      "  - Follow module organization patterns",
      "Ensure fix doesn't break other functionality",
      "Run tests to verify: 'pnpm test'",
      "Reference: docs/2.Technical_Design_Document/CODING_STYLE_GUIDE.md",
    ];
  }

  // Learn from similar fixes
  if (similarFixes.length > 0) {
    const successfulFixes = similarFixes.filter((f) => f.success);
    if (successfulFixes.length > 0) {
      analysis.confidence = Math.min(0.95, analysis.confidence + 0.1);
      analysis.instructions.push(`Learn from ${successfulFixes.length} similar successful fixes`);
    }
  }

  console.log(`   Strategy: ${analysis.fixStrategy}`);
  console.log(`   Confidence: ${(analysis.confidence * 100).toFixed(0)}%`);
  console.log(`   Complexity: ${analysis.estimatedComplexity}`);

  return analysis;
}

/**
 * Debug Agent: Performs root cause analysis
 */
async function debugAgent(bug, analysis) {
  console.log(`\n🔍 [Debug Agent] Root cause analysis for: ${bug.id}`);

  const rootCause = {
    bugId: bug.id,
    primaryCause: null,
    contributingFactors: [],
    dependencyChain: [],
    errorTrace: [],
    recommendations: [],
  };

  // Handle test-failure bugs that might not have a file path
  if (!bug.file) {
    rootCause.primaryCause = "Test failure - no source file associated";
    rootCause.recommendations.push("Review test file and implementation");
    console.log(`   ⚠️  No file path for this bug`);
    return rootCause;
  }

  // Resolve file path (handle both relative and absolute paths)
  const filePath = resolveFilePath(bug.file);

  let fileContent = null;

  try {
    if (existsSync(filePath)) {
      fileContent = await readFileAsync(filePath, "utf-8");
      const lines = fileContent.split("\n");

      // Analyze error location
      if (bug.line && bug.line > 0 && bug.line <= lines.length) {
        const errorLine = lines[bug.line - 1];
        rootCause.errorTrace.push({
          file: bug.file,
          line: bug.line,
          code: errorLine?.trim(),
        });

        // Try to find related code
        const contextStart = Math.max(0, bug.line - 5);
        const contextEnd = Math.min(lines.length, bug.line + 5);
        rootCause.errorTrace.push({
          context: lines.slice(contextStart, contextEnd).join("\n"),
        });
      }
    } else {
      console.warn(`   ⚠️  File not found: ${filePath}`);
      rootCause.contributingFactors.push(`File not found: ${bug.file}`);
    }
  } catch (e) {
    console.warn(`   ⚠️  Could not read file: ${e.message}`);
    rootCause.contributingFactors.push(`File read error: ${e.message}`);
  }

  // Analyze based on bug type
  if (bug.type === "type-error") {
    rootCause.primaryCause = "Type mismatch or missing type definition";
    rootCause.recommendations.push("Check type definitions and imports");
    rootCause.recommendations.push("Verify function signatures match usage");
    rootCause.recommendations.push("Ensure no 'any' types (strict mode enforced)");
    rootCause.recommendations.push("Reference: CODING_STYLE_GUIDE.md - TypeScript Conventions");
  } else if (bug.type === "linter-error") {
    rootCause.primaryCause = "Code style or rule violation";
    rootCause.recommendations.push("Check ESLint configuration (eslint.config.js)");
    rootCause.recommendations.push("Review FitVibe coding standards");
    rootCause.recommendations.push("Verify: double quotes, semicolons, trailing commas");
    rootCause.recommendations.push("Reference: CODING_STYLE_GUIDE.md - Code Formatting");
  } else if (bug.type === "test-failure") {
    rootCause.primaryCause = "Implementation doesn't match test expectations";
    rootCause.recommendations.push("Review test to understand expected behavior");
    rootCause.recommendations.push("Check if test or implementation is incorrect");
    rootCause.recommendations.push("Ensure fix follows FitVibe patterns");
    rootCause.recommendations.push("Reference: CODING_STYLE_GUIDE.md - Testing Patterns");
  }

  // Try to find dependencies
  if (fileContent) {
    const importMatches = fileContent.matchAll(/import\s+.*?\s+from\s+['"](.+?)['"]/g);
    for (const match of importMatches) {
      rootCause.dependencyChain.push(match[1]);
    }
  }

  console.log(`   Primary cause: ${rootCause.primaryCause}`);
  console.log(`   Dependencies: ${rootCause.dependencyChain.length}`);

  return rootCause;
}

/**
 * Initialize LLM client
 */
async function getLLMClient(provider = null) {
  const useProvider = provider || LLM_PROVIDER;
  
  if (useProvider === "anthropic" && ANTHROPIC_API_KEY) {
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
    } catch (e) {
      console.warn(`⚠️  Anthropic SDK not available: ${e.message}`);
    }
  }

  if (useProvider === "openai" && OPENAI_API_KEY) {
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

  // Try fallback
  if (useProvider === "anthropic" && OPENAI_API_KEY && !ANTHROPIC_API_KEY) {
    try {
      const openaiModule = await import("openai");
      const OpenAI = openaiModule.default || openaiModule.OpenAI;
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
 * Call LLM to generate solution perspective
 */
async function callLLMForSolution(bug, analysis, rootCause, style, modelProvider = null) {
  const llm = await getLLMClient(modelProvider);
  if (!llm) {
    // Fallback to placeholder if no LLM available
    return generateSolution(bug, analysis, rootCause, style);
  }

  // Read file content for context
  let fileContent = null;
  if (bug.file) {
    const filePath = resolveFilePath(bug.file);
    if (filePath && existsSync(filePath)) {
      try {
        fileContent = await readFileAsync(filePath, "utf-8");
      } catch (e) {
        // Ignore file read errors
      }
    }
  }

  const systemPrompt = `You are an expert software engineer providing ${style} solutions for fixing bugs in a TypeScript/JavaScript codebase.
Your task is to analyze bugs and provide precise, correct fixes that:
1. Fix the specific issue without breaking existing functionality
2. Follow the project's coding standards (TypeScript strict mode, no 'any' types in public surfaces)
3. Maintain code quality and readability
4. Are minimal and focused on the specific problem

Style: ${style}
- conservative: Safe, minimal changes, well-tested patterns
- creative: Innovative solutions, may consider refactoring
- specialized: Deep domain knowledge, optimized for specific bug type`;

  let userPrompt = `Provide a ${style} solution for this ${bug.type}:\n\n`;
  userPrompt += `File: ${bug.file}\n`;
  if (bug.line) userPrompt += `Line: ${bug.line}\n`;
  userPrompt += `\nError Message:\n${bug.message}\n\n`;
  userPrompt += `Analysis: ${analysis.fixStrategy}\n`;
  userPrompt += `Root Cause: ${rootCause.primaryCause}\n\n`;

  if (fileContent && bug.line) {
    const lines = fileContent.split("\n");
    const startLine = Math.max(0, (bug.line || 1) - 10);
    const endLine = Math.min(lines.length, (bug.line || 1) + 10);
    const contextLines = lines.slice(startLine, endLine);
    userPrompt += `Code Context:\n\`\`\`\n${contextLines.join("\n")}\n\`\`\`\n\n`;
  }

  userPrompt += `Provide a solution following the ${style} approach. Include reasoning and the fix approach.`;

  try {
    let response;
    if (llm.provider === "anthropic") {
      response = await llm.client.messages.create({
        model: llm.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });
      const content = response.content[0];
      if (content.type === "text") {
        return {
          approach: analysis.fixStrategy,
          changes: [content.text],
          style,
          reasoning: content.text.substring(0, 200),
          llmGenerated: true,
        };
      }
    } else if (llm.provider === "openai") {
      response = await llm.client.chat.completions.create({
        model: llm.model,
        max_tokens: 2048,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const content = response.choices[0]?.message?.content;
      if (content) {
        return {
          approach: analysis.fixStrategy,
          changes: [content],
          style,
          reasoning: content.substring(0, 200),
          llmGenerated: true,
        };
      }
    }
  } catch (error) {
    console.warn(`   ⚠️  LLM call failed for ${style} perspective: ${error.message}`);
  }

  // Fallback to placeholder
  return generateSolution(bug, analysis, rootCause, style);
}

/**
 * Brainstorm Agent: Coordinates multiple LLMs for diverse perspectives
 */
async function brainstormAgent(bug, analysis, rootCause) {
  console.log(`\n💡 [Brainstorm Agent] Generating solutions with multiple perspectives...`);

  const brainstorming = {
    bugId: bug.id,
    solutions: [],
    consensus: null,
    confidence: 0,
    modelPerspectives: [],
  };

  // Try to get multiple LLM perspectives
  const perspectives = [];

  // Try Anthropic Claude (conservative)
  const claudeSolution = await callLLMForSolution(bug, analysis, rootCause, "conservative", "anthropic");
  perspectives.push({
    model: "claude-3-5-sonnet",
    perspective: "primary",
    solution: claudeSolution,
    confidence: claudeSolution.llmGenerated ? 0.85 : 0.7,
  });

  // Try OpenAI GPT (alternative/creative)
  const gptSolution = await callLLMForSolution(bug, analysis, rootCause, "creative", "openai");
  perspectives.push({
    model: "gpt-4-turbo",
    perspective: "alternative",
    solution: gptSolution,
    confidence: gptSolution.llmGenerated ? 0.8 : 0.65,
  });

  // Add specialized perspective (use whichever LLM is available)
  const specializedSolution = await callLLMForSolution(bug, analysis, rootCause, "specialized", LLM_PROVIDER);
  perspectives.push({
    model: "specialized",
    perspective: "specialized",
    solution: specializedSolution,
    confidence: specializedSolution.llmGenerated ? 0.75 : 0.6,
  });

  brainstorming.modelPerspectives = perspectives;

  // Find consensus
  const consensusSolution = findConsensus(perspectives);
  brainstorming.consensus = consensusSolution;
  brainstorming.confidence = consensusSolution ? consensusSolution.confidence : 0.5;

  console.log(`   Generated ${perspectives.length} solution perspectives`);
  console.log(`   Consensus confidence: ${(brainstorming.confidence * 100).toFixed(0)}%`);

  return brainstorming;
}

/**
 * Generate a solution (placeholder - would use actual LLM in production)
 */
function generateSolution(bug, analysis, rootCause, style) {
  return {
    approach: analysis.fixStrategy,
    changes: [
      `Fix ${bug.type} in ${bug.file}`,
      `Follow ${analysis.approach}`,
      `Address: ${rootCause.primaryCause}`,
    ],
    style,
    reasoning: `Based on ${style} approach for ${bug.type}`,
  };
}

/**
 * Find consensus among multiple solutions
 */
function findConsensus(perspectives) {
  if (!perspectives || perspectives.length === 0) {
    return null;
  }

  // Simple consensus: use highest confidence solution
  // In production, would use more sophisticated voting/merging
  const best = perspectives.reduce((best, current) =>
    current.confidence > best.confidence ? current : best,
  );

  if (!best || !best.solution) {
    return null;
  }

  return {
    solution: best.solution,
    confidence: best.confidence,
    source: best.model,
    agreement: perspectives.filter((p) => p.solution?.approach === best.solution.approach).length,
  };
}

/**
 * Feedback Agent: Validates fixes and provides feedback
 */
async function feedbackAgent(bug, fixResult, regressionResult) {
  console.log(`\n✅ [Feedback Agent] Validating fix for: ${bug.id}`);

  const feedback = {
    bugId: bug.id,
    fixAccepted: false,
    issues: [],
    recommendations: [],
    quality: 0,
  };

  if (regressionResult.success) {
    feedback.fixAccepted = true;
    feedback.quality = 0.9;
    feedback.recommendations.push("Fix validated - ready to commit");
  } else {
    feedback.fixAccepted = false;
    feedback.issues.push(regressionResult.message);
    feedback.quality = 0.3;
    feedback.recommendations.push("Fix broke regression tests - needs revision");
    feedback.recommendations.push(`Error: ${regressionResult.message}`);
  }

  // Additional quality checks
  if (fixResult.changes) {
    // Check if fix introduces new issues
    if (fixResult.changes.some((c) => c.includes("any"))) {
      feedback.issues.push("Fix may introduce 'any' types");
      feedback.quality = Math.max(0, feedback.quality - 0.2);
    }
  }

  console.log(`   Fix accepted: ${feedback.fixAccepted}`);
  console.log(`   Quality score: ${(feedback.quality * 100).toFixed(0)}%`);

  return feedback;
}

/**
 * Create backup of file
 */
async function backupFile(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const backupPath = filePath + ".bug-fix-backup";
    const content = await readFileAsync(filePath, "utf-8");
    await writeFileAsync(backupPath, content, "utf-8");
    return backupPath;
  } catch (e) {
    console.warn(`   ⚠️  Could not create backup: ${e.message}`);
    return null;
  }
}

/**
 * Restore file from backup
 */
async function restoreFile(backupPath) {
  if (!backupPath || !existsSync(backupPath)) {
    return false;
  }

  try {
    const originalPath = backupPath.replace(".bug-fix-backup", "");
    const content = await readFileAsync(backupPath, "utf-8");
    await writeFileAsync(originalPath, content, "utf-8");
    return true;
  } catch (e) {
    console.error(`   ❌ Could not restore from backup: ${e.message}`);
    return false;
  }
}

/**
 * Cleanup backup file
 */
async function cleanupBackup(backupPath) {
  if (!backupPath || !existsSync(backupPath)) {
    return;
  }

  try {
    await unlinkAsync(backupPath);
  } catch (e) {
    console.warn(`   ⚠️  Could not cleanup backup: ${e.message}`);
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
 * Apply fix to file using LLM-generated solution
 */
async function applyFix(bug, consensusSolution) {
  // Validate consensus solution
  if (!consensusSolution || !consensusSolution.solution) {
    return { success: false, message: "Invalid consensus solution" };
  }

  // Handle test-failure bugs that might not have a file path
  if (!bug.file) {
    return { success: false, message: "No file path for this bug" };
  }

  // Resolve file path (handle both relative and absolute paths)
  const filePath = resolveFilePath(bug.file);
  
  if (!filePath) {
    return { success: false, message: "Could not resolve file path" };
  }

  if (!existsSync(filePath)) {
    return { success: false, message: `File not found: ${filePath}` };
  }

  // Create backup before modifying
  const backupPath = await backupFile(filePath);
  if (!backupPath) {
    return { success: false, message: "Could not create backup" };
  }

  console.log(`\n🔧 Applying fix based on consensus solution...`);
  console.log(`   Approach: ${consensusSolution.solution.approach}`);

  // Get LLM to generate the actual fix code
  const llm = await getLLMClient();
  if (!llm) {
    console.log(`   ⚠️  No LLM available for code generation`);
    return {
      success: false,
      message: "LLM not available for code generation. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.",
      requiresLLM: true,
      backupPath,
    };
  }

  // Read current file content
  let fileContent;
  try {
    fileContent = await readFileAsync(filePath, "utf-8");
  } catch (e) {
    return { success: false, message: `Could not read file: ${e.message}`, backupPath };
  }

  // Generate fix code using LLM
  const systemPrompt = `You are an expert software engineer. Generate the complete fixed code for the bug.
Return ONLY the fixed code block in a markdown code block. Do not include explanations outside the code block.`;

  let userPrompt = `Fix this ${bug.type} in the following code:\n\n`;
  userPrompt += `Error: ${bug.message}\n\n`;
  if (bug.line) {
    const lines = fileContent.split("\n");
    const startLine = Math.max(0, bug.line - 15);
    const endLine = Math.min(lines.length, bug.line + 15);
    userPrompt += `Current code (lines ${startLine + 1}-${endLine}):\n\`\`\`\n${lines.slice(startLine, endLine).join("\n")}\n\`\`\`\n\n`;
  } else {
    userPrompt += `Current code:\n\`\`\`\n${fileContent}\n\`\`\`\n\n`;
  }
  userPrompt += `Solution approach: ${consensusSolution.solution.approach}\n\n`;
  userPrompt += `Provide the complete fixed code section.`;

  try {
    let fixedCode;
    if (llm.provider === "anthropic") {
      const response = await llm.client.messages.create({
        model: llm.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });
      const content = response.content[0];
      if (content.type === "text") {
        fixedCode = extractCodeFromResponse(content.text);
      }
    } else if (llm.provider === "openai") {
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
        fixedCode = extractCodeFromResponse(content);
      }
    }

    if (!fixedCode) {
      return {
        success: false,
        message: "Could not extract code from LLM response",
        backupPath,
      };
    }

    // Apply fix - for now, replace the relevant section
    // In a more sophisticated implementation, we'd do AST-based replacement
    let newContent = fileContent;
    if (bug.line) {
      const lines = fileContent.split("\n");
      const startLine = Math.max(0, bug.line - 1);
      const endLine = Math.min(lines.length, bug.line + 20);
      const beforeLines = lines.slice(0, startLine);
      const afterLines = lines.slice(endLine);
      const fixedLines = fixedCode.split("\n");
      newContent = [...beforeLines, ...fixedLines, ...afterLines].join("\n");
    } else {
      // For type errors that might affect multiple lines, replace entire file
      newContent = fixedCode;
    }

    // Write the fixed content
    await writeFileAsync(filePath, newContent, "utf-8");
    console.log(`   ✅ Fix applied to file`);

    return {
      success: true,
      message: "Fix applied successfully",
      backupPath,
      llmModel: llm.model,
      llmProvider: llm.provider,
    };
  } catch (error) {
    return {
      success: false,
      message: `LLM code generation failed: ${error.message}`,
      backupPath,
    };
  }
}

/**
 * Run command with timeout
 */
function runCommandWithTimeout(command, timeout, options = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    try {
      const result = runCommand(command, options);
      const elapsed = Date.now() - startTime;

      if (elapsed > timeout) {
        resolve({
          success: false,
          output: "",
          error: `Command timed out after ${timeout}ms`,
          timedOut: true,
        });
      } else {
        resolve(result);
      }
    } catch (error) {
      resolve({
        success: false,
        output: error.stdout?.toString() || "",
        error: error.stderr?.toString() || error.message,
      });
    }
  });
}

/**
 * Run comprehensive regression tests
 */
async function runRegressionTests() {
  console.log("   🔄 Running comprehensive regression tests...");

  const tests = [
    { name: "Type check", command: "pnpm typecheck", timeout: 2 * 60 * 1000 },
    { name: "Linter", command: "pnpm lint:check", timeout: 2 * 60 * 1000 },
    {
      name: "Backend tests",
      command: "pnpm --filter @fitvibe/backend test -- --passWithNoTests --maxWorkers=2",
      timeout: 5 * 60 * 1000,
    },
    {
      name: "Frontend tests",
      command: "pnpm --filter @fitvibe/frontend test -- --run",
      timeout: 3 * 60 * 1000,
    },
  ];

  const results = [];

  for (const test of tests) {
    const timeout = test.timeout || REGRESSION_TEST_TIMEOUT;
    const result = await runCommandWithTimeout(test.command, timeout, { stdio: "pipe" });

    results.push({
      name: test.name,
      success: result.success,
      output: result.error || result.output,
      timedOut: result.timedOut || false,
    });

    if (!result.success) {
      return {
        success: false,
        message: result.timedOut ? `${test.name} timed out` : `${test.name} failed`,
        output: result.error,
        failedTest: test.name,
        timedOut: result.timedOut,
      };
    }
  }

  return {
    success: true,
    message: "All regression tests passed",
    results,
  };
}

/**
 * Main multi-agent fixing workflow
 */
async function main() {
  console.log("🤖 Multi-Agent Bug Fixer - Starting...\n");

  // Load style guide reference for agents
  const styleGuideRef = loadStyleGuideReference();
  if (styleGuideRef.styleGuide || styleGuideRef.cursorRules) {
    console.log("📚 Coding style guide loaded for agent reference\n");
  }

  const db = loadBugDatabase();
  const fixHistory = loadFixHistory();

  if (db.stats.open === 0) {
    console.log("✅ No open bugs to fix!");
    return;
  }

  console.log(`📊 Bug Statistics:`);
  console.log(`   Total bugs: ${db.stats.total}`);
  console.log(`   Open: ${db.stats.open}`);
  console.log(`   Fixed: ${db.stats.fixed}`);
  console.log(`   Historical fixes: ${fixHistory.fixes.length}`);

  const prioritizedBugs = prioritizeBugs(db.bugs, fixHistory);

  if (prioritizedBugs.length === 0) {
    console.log("✅ No bugs to fix!");
    return;
  }

  console.log(`\n📋 Will attempt to fix ${prioritizedBugs.length} bugs using multi-agent system\n`);

  let fixedCount = 0;
  let failedCount = 0;

  for (const bug of prioritizedBugs) {
    if (bug.attempts >= MAX_ATTEMPTS) {
      console.log(`\n⏭️  Skipping ${bug.id} (exceeded max attempts)`);
      continue;
    }

    try {
      // Step 1: Guide Agent - Create strategy
      const analysis = await guideAgent(bug, fixHistory, styleGuideRef);

      // Step 2: Debug Agent - Root cause analysis
      const rootCause = await debugAgent(bug, analysis);

      // Step 3: Brainstorm Agent - Multi-LLM coordination
      const brainstorming = await brainstormAgent(bug, analysis, rootCause);

      // Step 4: Apply fix
      // Validate consensus before applying
      if (!brainstorming.consensus) {
        console.log(`   ⚠️  No consensus solution found, skipping...`);
        bug.attempts = (bug.attempts || 0) + 1;
        saveBugDatabase(db);
        failedCount++;
        continue;
      }

      const fixResult = await applyFix(bug, brainstorming.consensus);

      if (fixResult.success) {
        // Step 5: Run regression tests
        const regressionResult = await runRegressionTests();

        // Step 6: Feedback Agent - Validate
        const feedback = await feedbackAgent(bug, fixResult, regressionResult);

        if (feedback.fixAccepted) {
          // Mark as fixed
          bug.status = "fixed";
          bug.fixed = true;
          bug.fixedAt = new Date().toISOString();
          bug.fixDetails = {
            strategy: analysis.fixStrategy,
            confidence: brainstorming.confidence,
            agents: Object.values(AGENTS),
          };

          // Record in fix history
          fixHistory.fixes.push({
            bugId: bug.id,
            bugType: bug.type,
            category: bug.category,
            success: true,
            strategy: analysis.fixStrategy,
            fixedAt: new Date().toISOString(),
          });

          // Cleanup backup file after successful fix
          if (fixResult.backupPath) {
            await cleanupBackup(fixResult.backupPath);
          }

          saveBugDatabase(db);
          saveFixHistory(fixHistory);
          fixedCount++;
          console.log(`   ✅ Bug fixed and verified!`);
        } else {
          // Revert changes from backup
          if (fixResult.backupPath) {
            const restored = await restoreFile(fixResult.backupPath);
            if (restored) {
              console.log(`   🔄 Changes reverted from backup`);
              await cleanupBackup(fixResult.backupPath);
            } else {
              console.warn(`   ⚠️  Could not revert changes`);
            }
          }

          // Record failure
          bug.attempts = (bug.attempts || 0) + 1;
          fixHistory.fixes.push({
            bugId: bug.id,
            bugType: bug.type,
            category: bug.category,
            success: false,
            reason: feedback.issues.join("; "),
            fixedAt: new Date().toISOString(),
          });
          saveBugDatabase(db);
          saveFixHistory(fixHistory);
          failedCount++;
          console.log(`   ❌ Fix validation failed`);
        }
      } else {
        bug.attempts = (bug.attempts || 0) + 1;
        saveBugDatabase(db);
        failedCount++;
        console.log(`   ❌ Fix application failed: ${fixResult.message}`);
      }
    } catch (error) {
      console.error(`   ❌ Error processing bug: ${error.message}`);
      bug.attempts = (bug.attempts || 0) + 1;
      failedCount++;
    }
  }

  console.log(`\n📊 Multi-Agent Fix Session Summary:`);
  console.log(`   Fixed: ${fixedCount}`);
  console.log(`   Failed: ${failedCount}`);
  console.log(`   Remaining open: ${db.stats.open}`);
  console.log(`   Total fixes in history: ${fixHistory.fixes.length}`);

  saveBugDatabase(db);
  saveFixHistory(fixHistory);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
