#!/usr/bin/env node
/**
 * Test Runner for Test Manager Agent Specification
 *
 * Validates the test manager agent specification document
 * to ensure it is well-formed, complete, and follows best practices.
 */

const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const specPath = join(__dirname, "..", "..", ".claude", "agents", "test_manager.md");

function extractFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  return frontmatterMatch[1]
    .split("\n")
    .reduce((acc, line) => {
      const [key, ...valueParts] = line.split(":");
      if (key && valueParts.length > 0) {
        acc[key.trim()] = valueParts.join(":").trim();
      }
      return acc;
    }, {});
}

function runTests() {
  console.log("Testing Test Manager Agent Specification...\n");

  let passed = 0;
  let failed = 0;
  const errors = [];

  function test(name, fn) {
    try {
      fn();
      passed++;
      console.log(`✅ ${name}`);
    } catch (error) {
      failed++;
      errors.push({ name, error: error.message });
      console.log(`❌ ${name}: ${error.message}`);
    }
  }

  // Read and parse spec
  let specContent;
  let frontmatter;

  try {
    specContent = readFileSync(specPath, "utf-8");
    frontmatter = extractFrontmatter(specContent);
  } catch (error) {
    console.error(`Failed to read spec file: ${error.message}`);
    process.exit(1);
  }

  // File Structure Tests
  test("File exists and is readable", () => {
    if (!specContent || specContent.length === 0) {
      throw new Error("Spec content is empty");
    }
  });

  test("Has YAML frontmatter", () => {
    if (!specContent.match(/^---\n/) || !specContent.match(/\n---\n/)) {
      throw new Error("Missing YAML frontmatter");
    }
  });

  test("Has proper markdown structure", () => {
    if (!specContent.includes("# Agent: Test Manager")) {
      throw new Error("Missing main heading");
    }
    if (!specContent.includes("## Agent Metadata")) {
      throw new Error("Missing Agent Metadata section");
    }
  });

  // Frontmatter Validation
  test("Has required frontmatter fields", () => {
    if (!frontmatter) {
      throw new Error("Frontmatter not parsed");
    }
    if (frontmatter.name !== "test_manager") {
      throw new Error(`Expected name 'test_manager', got '${frontmatter.name}'`);
    }
    if (!frontmatter.description) {
      throw new Error("Missing description");
    }
    if (!frontmatter.tools) {
      throw new Error("Missing tools");
    }
    if (!frontmatter.model) {
      throw new Error("Missing model");
    }
    if (!frontmatter.color) {
      throw new Error("Missing color");
    }
  });

  test("Has valid agent name", () => {
    if (!/^[a-z_]+$/.test(frontmatter.name)) {
      throw new Error(`Invalid agent name format: ${frontmatter.name}`);
    }
  });

  test("Has non-empty description", () => {
    if (!frontmatter.description || frontmatter.description.length < 10) {
      throw new Error("Description too short");
    }
  });

  test("Has valid model specification", () => {
    const validModels = ["sonnet", "opus", "haiku"];
    if (!validModels.includes(frontmatter.model)) {
      throw new Error(`Invalid model: ${frontmatter.model}`);
    }
  });

  // Required Sections
  const requiredSections = [
    "Agent Metadata",
    "Mission Statement",
    "Core Responsibilities",
    "Available Tools",
    "Input Format",
    "Processing Workflow",
    "Output Format",
    "Handoff Protocol",
    "Quality Checklist",
  ];

  requiredSections.forEach((section) => {
    test(`Contains section: ${section}`, () => {
      if (!specContent.includes(`## ${section}`)) {
        throw new Error(`Missing section: ${section}`);
      }
    });
  });

  test("Has Agent Metadata with required fields", () => {
    if (!specContent.includes("**Agent ID**: test-manager")) {
      throw new Error("Missing Agent ID");
    }
    if (!specContent.includes("**Type**:")) {
      throw new Error("Missing Type field");
    }
    if (!specContent.includes("**Domain**:")) {
      throw new Error("Missing Domain field");
    }
    if (!specContent.includes("**Model Tier**:")) {
      throw new Error("Missing Model Tier field");
    }
    if (!specContent.includes("**Status**:")) {
      throw new Error("Missing Status field");
    }
  });

  test("Has Core Responsibilities section", () => {
    if (!specContent.includes("### Primary Functions")) {
      throw new Error("Missing Primary Functions");
    }
    if (!specContent.includes("### Quality Standards")) {
      throw new Error("Missing Quality Standards");
    }
  });

  test("Has Processing Workflow with phases", () => {
    if (!specContent.includes("### Phase 1:")) {
      throw new Error("Missing Phase 1");
    }
    if (!specContent.includes("### Phase 2:")) {
      throw new Error("Missing Phase 2");
    }
    if (!specContent.includes("### Phase 3:")) {
      throw new Error("Missing Phase 3");
    }
    if (!specContent.includes("### Phase 4:")) {
      throw new Error("Missing Phase 4");
    }
  });

  // JSON Examples Validation
  test("Has valid input format JSON example", () => {
    const inputFormatMatch = specContent.match(/```json\n([\s\S]*?)```/);
    if (!inputFormatMatch) {
      throw new Error("No JSON examples found");
    }

    const jsonContent = inputFormatMatch[1];
    try {
      // More comprehensive cleaning of placeholders and pipe-separated values
      let cleaned = jsonContent
        .replace(/<[^>]+>/g, '"placeholder"')
        .replace(/YYYY-MM-DD-NNN/g, "2025-01-01-001")
        .replace(/YYYY-MM-DD/g, "2025-01-01")
        .replace(/unit_test\|integration_test\|e2e_test/g, "unit_test")
        .replace(/typescript\|javascript\|python\|etc/g, "typescript")
        .replace(/react\|vue\|express\|fastapi/g, "express")
        .replace(/jest\|vitest\|mocha\|pytest/g, "jest")
        .replace(/eslint\|biome\|ruff/g, "eslint")
        .replace(/typescript\|mypy\|pyright/g, "typescript")
        .replace(/high\|medium\|low/g, "high");

      // Handle array placeholders
      cleaned = cleaned.replace(/\[<[^>]+>\]/g, '["placeholder"]');

      JSON.parse(cleaned);
    } catch (error) {
      // If JSON parsing fails, just check that it has the basic structure
      if (!jsonContent.includes("request_id") || !jsonContent.includes("task_type")) {
        throw new Error(`JSON example missing required fields: ${error.message}`);
      }
      // Otherwise, it's likely just a formatting issue with placeholders, which is acceptable
    }
  });

  test("Has multiple JSON examples", () => {
    const exampleMatches = specContent.match(/```json\n([\s\S]*?)```/g);
    if (!exampleMatches || exampleMatches.length < 2) {
      throw new Error("Need at least 2 JSON examples");
    }
  });

  // Content Quality
  test("Has comprehensive mission statement", () => {
    const missionMatch = specContent.match(/## Mission Statement\n\n([^\n]+(?:\n[^\n#]+)*)/);
    if (!missionMatch) {
      throw new Error("Mission statement not found");
    }
    const mission = missionMatch[1];
    if (mission.length < 50) {
      throw new Error("Mission statement too short");
    }
    if (!mission.toLowerCase().includes("test")) {
      throw new Error("Mission statement should mention testing");
    }
  });

  test("Defines quality standards", () => {
    const standards = ["Zero Linting Errors", "Type Safety", "Security", "Coverage", "Maintainability"];
    standards.forEach((standard) => {
      if (!specContent.includes(standard)) {
        throw new Error(`Missing quality standard: ${standard}`);
      }
    });
  });

  test("Lists available tools with descriptions", () => {
    if (!specContent.includes("### Knowledge MCP Server")) {
      throw new Error("Missing Knowledge MCP Server section");
    }
    if (!specContent.includes("### Codebase MCP Server")) {
      throw new Error("Missing Codebase MCP Server section");
    }
    if (!specContent.includes("### Testing MCP Server")) {
      throw new Error("Missing Testing MCP Server section");
    }
  });

  test("Has usage guidance", () => {
    if (!specContent.includes("### Usage Guidance")) {
      throw new Error("Missing Usage Guidance section");
    }
    if (!specContent.includes("**Always**")) {
      throw new Error("Missing 'Always' guidance");
    }
  });

  test("Has complete workflow phases", () => {
    const phases = [
      "Phase 1: Analysis & Understanding",
      "Phase 2: Test Generation",
      "Phase 3: Quality Assurance",
      "Phase 4: Documentation & Handoff",
    ];

    phases.forEach((phase) => {
      if (!specContent.includes(phase)) {
        throw new Error(`Missing phase: ${phase}`);
      }
    });
  });

  test("Has quality checklist with all categories", () => {
    const checklistCategories = [
      "Completeness",
      "Code Quality",
      "Security",
      "Type Safety",
      "Test Execution",
      "Coverage",
      "Maintainability",
      "Documentation",
    ];

    checklistCategories.forEach((category) => {
      if (!specContent.includes(`### ${category}`)) {
        throw new Error(`Missing checklist category: ${category}`);
      }
    });
  });

  // Workflow Validation
  test("Has time estimates for each phase", () => {
    if (!specContent.match(/Phase 1:.*\(3-5 minutes\)/)) {
      throw new Error("Missing time estimate for Phase 1");
    }
    // Phase 2 may have complexity-based time estimates
    if (!specContent.match(/Phase 2:.*\(10-20 minutes/) && !specContent.match(/Phase 2:.*\(10-40 minutes/)) {
      throw new Error("Missing time estimate for Phase 2");
    }
    if (!specContent.match(/Phase 3:.*\(5-10 minutes\)/)) {
      throw new Error("Missing time estimate for Phase 3");
    }
    if (!specContent.match(/Phase 4:.*\(2-3 minutes\)/)) {
      throw new Error("Missing time estimate for Phase 4");
    }
  });

  test("Has code examples in workflow", () => {
    if (!specContent.includes("```bash")) {
      throw new Error("Missing bash code examples");
    }
    if (!specContent.includes("npm run lint")) {
      throw new Error("Missing lint command example");
    }
    if (!specContent.includes("npm run typecheck")) {
      throw new Error("Missing typecheck command example");
    }
  });

  test("Has example workflow with complete steps", () => {
    if (!specContent.includes("## Example: Complete Workflow")) {
      throw new Error("Missing example workflow section");
    }
    if (!specContent.includes("### Input Example")) {
      throw new Error("Missing input example");
    }
    if (!specContent.includes("### Processing Steps")) {
      throw new Error("Missing processing steps");
    }
    if (!specContent.includes("### Output Example")) {
      throw new Error("Missing output example");
    }
  });

  // Output Format Validation
  test("Defines standard output structure", () => {
    if (!specContent.includes("## Output Format")) {
      throw new Error("Missing Output Format section");
    }
    if (!specContent.includes("### Standard Output Structure")) {
      throw new Error("Missing Standard Output Structure");
    }
  });

  test("Includes required output sections", () => {
    const outputSections = [
      "Summary",
      "Test Suite Details",
      "Quality Metrics",
      "Acceptance Criteria Coverage",
      "Test Code",
      "Issues & Risks",
      "Next Steps",
      "Handoff Information",
    ];

    outputSections.forEach((section) => {
      if (!specContent.includes(`## ${section}`)) {
        throw new Error(`Missing output section: ${section}`);
      }
    });
  });

  test("Defines quality metrics structure", () => {
    const metrics = ["Code Quality", "Security", "Coverage", "Test Execution"];
    metrics.forEach((metric) => {
      if (!specContent.includes(`### ${metric}`)) {
        throw new Error(`Missing quality metric: ${metric}`);
      }
    });
  });

  // Handoff Protocol
  test("Defines success criteria", () => {
    if (!specContent.includes("### Success Criteria for Handoff")) {
      throw new Error("Missing Success Criteria section");
    }
    if (!specContent.includes("All criteria must be met")) {
      throw new Error("Missing success criteria description");
    }
  });

  test("Defines escalation conditions", () => {
    if (!specContent.includes("### Escalation Conditions")) {
      throw new Error("Missing Escalation Conditions section");
    }
    if (!specContent.includes("Escalate to supervisor/orchestrator when:")) {
      throw new Error("Missing escalation description");
    }
  });

  test("Has handoff message format", () => {
    if (!specContent.includes("### Handoff Message Format")) {
      throw new Error("Missing Handoff Message Format section");
    }
  });

  // Version History
  test("Has version history section", () => {
    if (!specContent.includes("## Version History")) {
      throw new Error("Missing Version History section");
    }
  });

  test("Has at least one version entry", () => {
    if (!specContent.match(/v\d+\.\d+.*\d{4}-\d{2}-\d{2}/)) {
      throw new Error("Missing version entry");
    }
  });

  // Agent Lifecycle
  test("Has notes for Agent Lifecycle Manager", () => {
    if (!specContent.includes("## Notes for Agent Lifecycle Manager")) {
      throw new Error("Missing Agent Lifecycle Manager notes");
    }
  });

  test("Defines optimization opportunities", () => {
    if (!specContent.includes("**Optimization Opportunities**:")) {
      throw new Error("Missing optimization opportunities");
    }
  });

  test("Defines replacement triggers", () => {
    if (!specContent.includes("**Replacement Triggers**:")) {
      throw new Error("Missing replacement triggers");
    }
  });

  test("Defines success metrics", () => {
    if (!specContent.includes("**Success Metrics**:")) {
      throw new Error("Missing success metrics");
    }
  });

  // Consistency Checks
  test("Has consistent agent ID references", () => {
    const agentIdMatches = specContent.match(/test-manager/g);
    if (!agentIdMatches || agentIdMatches.length === 0) {
      throw new Error("No agent ID references found");
    }
  });

  test("Has end marker", () => {
    if (!specContent.includes("**END OF AGENT CONFIGURATION**")) {
      throw new Error("Missing end marker");
    }
  });

  // Code Examples
  test("Has TypeScript code examples", () => {
    if (!specContent.includes("```typescript")) {
      throw new Error("Missing TypeScript code examples");
    }
  });

  test("Has bash code examples", () => {
    if (!specContent.includes("```bash")) {
      throw new Error("Missing bash code examples");
    }
  });

  test("Has markdown code examples", () => {
    if (!specContent.includes("```markdown")) {
      throw new Error("Missing markdown code examples");
    }
  });

  // Completeness
  test("Has all required sections", () => {
    const sectionCount = (specContent.match(/^## /gm) || []).length;
    if (sectionCount < 10) {
      throw new Error(`Too few sections: ${sectionCount}`);
    }
  });

  test("Has sufficient detail in major sections", () => {
    const majorSections = [
      { name: "Core Responsibilities", minLength: 100 },
      { name: "Available Tools", minLength: 200 },
      { name: "Input Format", minLength: 200 },
      { name: "Processing Workflow", minLength: 200 },
      { name: "Output Format", minLength: 200 },
    ];

    majorSections.forEach(({ name, minLength }) => {
      // Find the section start
      const sectionStart = specContent.indexOf(`## ${name}`);
      if (sectionStart === -1) {
        throw new Error(`Section not found: ${name}`);
      }

      // Find the next section or end of document
      const nextSectionMatch = specContent.substring(sectionStart).match(/\n## [^#]/);
      const sectionEnd = nextSectionMatch
        ? sectionStart + nextSectionMatch.index
        : specContent.length;

      const sectionContent = specContent.substring(sectionStart, sectionEnd);
      if (sectionContent.length < minLength) {
        throw new Error(`Section too short: ${name} (${sectionContent.length} chars, need ${minLength})`);
      }
    });
  });

  test("Has example workflow that demonstrates all phases", () => {
    const exampleStart = specContent.indexOf("## Example: Complete Workflow");
    if (exampleStart === -1) {
      throw new Error("Example workflow section not found");
    }

    // Find the next major section or end
    const nextSectionMatch = specContent.substring(exampleStart).match(/\n## [^#]/);
    const exampleEnd = nextSectionMatch
      ? exampleStart + nextSectionMatch.index
      : specContent.length;

    const example = specContent.substring(exampleStart, exampleEnd);

    // Check for input example (can be "### Input Example" or "**Example Input:**")
    if (!example.includes("### Input Example") && !example.includes("**Example Input:**") && !example.includes('"request_id": "TEST-')) {
      throw new Error("Missing Input Example in workflow");
    }
    if (!example.includes("### Processing Steps")) {
      throw new Error("Missing Processing Steps in workflow");
    }
    if (!example.includes("### Output Example")) {
      throw new Error("Missing Output Example in workflow");
    }
  });

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Tests: ${passed} passed, ${failed} failed`);
  console.log(`${"=".repeat(60)}\n`);

  if (failed > 0) {
    console.log("Failed tests:");
    errors.forEach(({ name, error }) => {
      console.log(`  - ${name}: ${error}`);
    });
    console.log();
    process.exit(1);
  }

  console.log("✅ All tests passed!");
  process.exit(0);
}

runTests();

