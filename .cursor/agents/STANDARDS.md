# Cursor Agent Standards

**Version**: 1.0
**Last Updated**: 2025-01-20
**Status**: Active
**Applies To**: All Cursor Agents in FitVibe Project

---

## Overview

This document defines the standards, structure, and best practices for all Cursor agents in the FitVibe project. All agents must comply with these standards to ensure consistency, quality, and maintainability.

---

## Agent Structure Standards

### Required Sections (In Order)

All agents must include these sections in the specified order:

1. **YAML Frontmatter** (Required)
   - `name`: Agent name (snake_case)
   - `description`: Brief description (one sentence)
   - `tools`: Comma-separated list of available tools
   - `model`: Model specification (e.g., `sonnet`) or omitted for Auto mode
   - `color`: Agent color identifier

2. **Agent Metadata** (Required)
   - Agent ID (must match filename)
   - Type (Orchestrator, Specialist, Generalist, Meta-Agent)
   - Domain (e.g., Backend, Frontend, Testing)
   - Model Tier (must match frontmatter model or "Auto")
   - Status (Active, Inactive, Deprecated)

3. **Mission Statement** (Required)
   - Clear, concise mission (2-3 sentences)
   - Defines agent's primary purpose

4. **Core Responsibilities** (Required)
   - Primary Functions (numbered list)
   - Quality Standards (bulleted list)

5. **Implementation Principles** (Required)
   - Reference to `docs/6.Implementation/implementation_principles.md`
   - Agent-specific principles (if any)

6. **FitVibe-Specific Context** (Required)
   - Tech stack details
   - Project structure
   - Key requirements or constraints

7. **Available Tools** (Required)
   - Core tools list
   - Usage guidance
   - MCP server tools (if applicable)
   - System context (date/time access)

8. **Input Format** (Required)
   - Input structure (JSON schema or description)
   - Example inputs

9. **Processing Workflow** (Required)
   - Phases with time estimates
   - Detailed steps per phase

10. **Code Patterns & Examples** (Required)
    - Common patterns
    - Code examples
    - Best practices

11. **Output Format** (Required)
    - Standard output structure
    - Example outputs

12. **Handoff Protocol** (Required)
    - Success criteria
    - Standard handoff format (must use `HANDOFF_PROTOCOL.md`)
    - Escalation conditions

13. **Quality Checklist** (Required)
    - Completeness checklist
    - Quality checklist
    - Validation checklist

14. **Troubleshooting** (Required)
    - Common issues
    - Solutions

15. **Version History** (Required)
    - Change log with dates
    - Version numbers

16. **Notes for Agent Lifecycle Manager** (Required)
    - Optimization opportunities
    - Replacement triggers
    - Success metrics

17. **Current State File Management** (Required)
    - State file location and naming
    - State file lifecycle (create, update, erase)
    - Resume procedures

18. **Examples and Templates** (Required)
    - Reference shared examples/templates when applicable
    - Keep agent-specific examples inline
    - Use hybrid separation approach

---

## Formatting Standards

### YAML Frontmatter Format

```yaml
---
name: agent_name
description: Brief one-sentence description
tools: Bash, Glob, Grep, Read, Edit, Write, NotebookEdit, WebFetch, TodoWrite, BashOutput, KillShell, AskUserQuestion, Skill, SlashCommand
model: sonnet
color: blue
---
```

### Model Tier Format

Model tier descriptions must follow this format:

```markdown
- **Model Tier**: sonnet (Complex tasks requiring high quality)
```

**Standard Descriptions**:
- `sonnet (Complex tasks requiring high quality)` - For most agents
- `sonnet (Complex analysis tasks requiring high quality)` - For analysis/review agents
- `sonnet (Complex tasks requiring high quality across multiple layers)` - For full-stack agents
- `Auto (Cursor selects optimal model)` - If using Auto mode

**Do NOT use**:
- ❌ "Sonnet (Standard reasoning tasks)" - Inconsistent capitalization and description
- ❌ "sonnet (Secondary but complex tasks requiring highest quality)" - Inconsistent description

### Section Headers

- Use `##` for main sections
- Use `###` for subsections
- Use `####` for sub-subsections
- Maintain consistent hierarchy

### Code Blocks

- Use language tags for code examples
- Use triple backticks with language identifier
- Include line numbers in file references: `file.ts:12:15`

### Lists

- Use numbered lists for sequential steps
- Use bulleted lists for non-sequential items
- Use checkboxes for checklists: `- [ ] Item`

---

## Naming Conventions

### Agent IDs

- Format: `kebab-case`
- Examples: `planner-agent`, `backend-agent`, `test-manager`
- Must match filename (without `.md` extension)

### Agent Names

- Format: `snake_case` in frontmatter
- Format: `Title Case` in documentation
- Examples: `planner_agent` → "Planner Agent"

### File Names

- Format: `kebab-case.md`
- Examples: `planner-agent.md`, `backend-agent.md`
- Must match agent ID

---

## Content Standards

### Mission Statement

- **Length**: 2-3 sentences
- **Content**: Clear purpose, primary function, key outcome
- **Tone**: Professional, concise

**Good Example**:
> Deliver production-ready backend APIs and services for FitVibe by implementing complete functionality following the Controller → Service → Repository pattern. Ensure all APIs are properly validated, secured, tested, and documented.

**Bad Example**:
> Does backend stuff.

### Quality Standards

- Must be specific and measurable
- Should include thresholds (e.g., "≥80% coverage")
- Should reference project standards (e.g., "WCAG 2.1 AA")

### Code Examples

- Must be complete and runnable (where applicable)
- Should follow FitVibe coding standards
- Must include comments explaining key points
- Should show both good and bad examples (when relevant)

---

## Handoff Protocol Standards

All agents must use the Standard Handoff Protocol defined in `HANDOFF_PROTOCOL.md`.

### Required Fields

All handoffs must include:
- `from_agent` (string)
- `to_agent` (string)
- `request_id` (string, format: `PLAN-YYYY-MM-DD-NNN`)
- `handoff_id` (string, format: `HANDOFF-YYYY-MM-DD-NNN`)
- `timestamp` (string, ISO 8601)
- `handoff_type` (enum: "standard" | "escalation" | "collaboration" | "error_recovery")
- `status` (enum: "pending" | "in_progress" | "complete" | "blocked" | "failed")
- `priority` (enum: "high" | "medium" | "low")
- `summary` (string)
- `deliverables` (string[])
- `acceptance_criteria` (string[])
- `next_steps` (string)

### Handoff Examples

**Hybrid Approach**: Agents should reference shared handoff examples in `.cursor/agents/examples/handoffs/` but may include agent-specific handoff examples inline when needed.

**Shared Examples Available**:
- Standard handoff: `.cursor/agents/examples/handoffs/standard-handoff.json`
- Escalation handoff: `.cursor/agents/examples/handoffs/escalation-handoff.json`
- Collaboration handoff: `.cursor/agents/examples/handoffs/collaboration-handoff.json`
- Error recovery handoff: `.cursor/agents/examples/handoffs/error-recovery-handoff.json`

**When to Use Shared Examples**:
- Standard handoff patterns (use shared examples with references)
- Common handoff types (reference shared files)

**When to Keep Inline**:
- Agent-specific handoff scenarios
- Domain-specific handoff examples
- Examples demonstrating agent's unique workflow

---

## Quality Thresholds

### Completeness

- **Required Sections**: All 16 sections must be present
- **Section Completeness**: Each section must be substantive (not just placeholders)
- **Examples**: At least 2-3 code examples per agent
- **Handoff Examples**: At least 1 complete handoff example

### Consistency

- **Formatting**: Must match standards in this document
- **Terminology**: Must use consistent terminology across agents
- **Structure**: Must follow required section order

### Clarity

- **Instructions**: Must be clear and unambiguous
- **Examples**: Must be relevant and illustrative
- **Documentation**: Must be self-explanatory

### Compliance

- **Standards**: Must comply with this document
- **Handoff Protocol**: Must use `HANDOFF_PROTOCOL.md` format
- **Implementation Principles**: Must reference `docs/6.Implementation/implementation_principles.md`

---

## Model Specification Standards

### When to Specify Model

**Specify model explicitly** (`model: sonnet`) when:
- Agent handles complex tasks requiring consistent high quality
- Predictable behavior is critical
- Quality requirements are strict
- Agent is production-critical

**Omit model specification** (use Auto mode) when:
- Agent handles simple, variable-complexity tasks
- Cost optimization is priority
- Quality requirements are flexible

### Current Standard

For FitVibe agents, **all agents specify `model: sonnet`** to ensure:
- Consistent high-quality output
- Predictable behavior
- Alignment with documented "Model Tier" expectations

### Model Tier Description Format

All agents must use consistent model tier descriptions:

```markdown
- **Model Tier**: sonnet (Complex tasks requiring high quality)
```

**Variations allowed**:
- `sonnet (Complex analysis tasks requiring high quality)` - For analysis agents
- `sonnet (Complex tasks requiring high quality across multiple layers)` - For full-stack agents

**Not allowed**:
- Inconsistent capitalization ("Sonnet" vs "sonnet")
- Inconsistent descriptions ("Standard reasoning" vs "Complex tasks")
- Vague descriptions ("Secondary but complex")

---

## Date and Time Standards

### Date Awareness

All agents must be aware of the current date and time for generating accurate timestamps, request IDs, reports, and version history entries.

#### Current Date/Time Access

Agents should obtain the current date/time using:

1. **Bash Command** (Primary Method):
   ```bash
   date -u +"%Y-%m-%d"  # Current date: 2025-01-21
   date -u +"%Y-%m-%dT%H:%M:%SZ"  # Current timestamp: 2025-01-21T14:30:00Z
   ```

2. **Request Context** (Alternative):
   - Request may include `current_date` field in ISO 8601 format
   - Format: `"current_date": "2025-01-21T14:30:00Z"`

3. **System Information**:
   - Agents have access to system date/time via available tools
   - Always use UTC timezone for consistency

#### Date Format Standards

- **Timestamps** (Full Date/Time): ISO 8601 UTC format
  - Format: `YYYY-MM-DDTHH:mm:ssZ`
  - Example: `2025-01-21T14:30:00Z`
  - Use for: Handoff timestamps, report generation times, audit logs

- **Dates** (Date Only): `YYYY-MM-DD` format
  - Example: `2025-01-21`
  - Use for: Request IDs (`AQA-2025-01-21-001`), version history, filenames

- **Date Ranges**: `YYYY-MM-DD to YYYY-MM-DD`
  - Example: `2025-01-01 to 2025-01-31`
  - Use for: Report periods, analysis date ranges

#### Date Usage Requirements

- ✅ **Always use current date/time** when generating timestamps and IDs
- ✅ **Use ISO 8601 format** for all timestamps
- ✅ **Use UTC timezone** for all date/time operations
- ❌ **Never hardcode dates** in output or reports
- ❌ **Never use placeholders** like `YYYY-MM-DD` in actual output (only in examples)

#### Implementation Examples

**Request ID Generation**:
```markdown
**Note**: Replace date with current date. Use command: `date -u +"%Y-%m-%d"` to get current date in YYYY-MM-DD format.

Example: If today is 2025-01-21, request ID would be `AQA-2025-01-21-001`
```

**Timestamp Generation**:
```markdown
**Note**: Use current timestamp in ISO 8601 UTC format. Use command: `date -u +"%Y-%m-%dT%H:%M:%SZ"` to get current timestamp.

Example: `"timestamp": "2025-01-21T14:30:00Z"`
```

**Version History**:
```markdown
## Version History

- **v2.0** (2025-01-21): Enhanced capabilities
  - Feature 1
  - Feature 2

**Note**: Use current date when adding new version entries. Get date with: `date -u +"%Y-%m-%d"`
```

---

## Documentation Standards

### Code References

Use code references for existing code:
```markdown
```12:15:apps/backend/src/modules/users/users.controller.ts
// code content
```
```

Use markdown code blocks for new/proposed code:
```markdown
```typescript
// new code example
```
```

### Links

- Use relative paths for internal links
- Use descriptive link text
- Verify links are valid

### Version History

Format:
```markdown
- **v1.0** (YYYY-MM-DD): Initial version
  - Feature 1
  - Feature 2
```

**Note**: Use current date when adding new version entries. Get date with: `date -u +"%Y-%m-%d"`

**Example**:
```markdown
- **v2.0** (2025-01-21): Enhanced capabilities
  - Feature 1
  - Feature 2
```

---

## Validation Checklist

Before considering an agent complete, verify:

### Structure
- [ ] All 16 required sections present
- [ ] Sections in correct order
- [ ] YAML frontmatter complete and valid
- [ ] Agent ID matches filename

### Content
- [ ] Mission statement clear and concise
- [ ] Quality standards specific and measurable
- [ ] Code examples complete and relevant
- [ ] Handoff examples use standard format
- [ ] Troubleshooting section comprehensive

### Formatting
- [ ] Model tier description matches standard format
- [ ] Section headers use correct hierarchy
- [ ] Code blocks properly formatted
- [ ] Lists properly formatted

### Compliance
- [ ] References `HANDOFF_PROTOCOL.md`
- [ ] References `docs/6.Implementation/implementation_principles.md`
- [ ] Follows FitVibe coding standards
- [ ] No placeholder content
- [ ] Uses shared examples where appropriate
- [ ] State file management documented
- [ ] Date awareness implemented

---

## Maintenance

### Review Frequency

- **New Agents**: Review against standards before activation
- **Existing Agents**: Review quarterly or when major changes occur
- **Standards Updates**: Review all agents when standards change

### Update Process

1. Update `STANDARDS.md` with changes
2. Update version number and date
3. Review all agents for compliance
4. Update non-compliant agents
5. Document changes in agent version history

---

## References

- **Handoff Protocol**: `.cursor/agents/HANDOFF_PROTOCOL.md`
- **Agent Registry**: `.cursor/agents/REGISTRY.md`
- **Implementation Principles**: `docs/6.Implementation/implementation_principles.md`
- **Project Rules**: `.cursor/rules/` (migrated from legacy `.cursorrules`)

---

**Last Updated**: 2025-12-08
**Maintained By**: agent-quality-agent
**Next Review**: 2026-03-08

---

## Current State File Standards

All agents must maintain a `current_state.md` file to track their approach, tasks, and progress. This enables resuming work after interruptions.

### File Location

- **Path**: `.cursor/agents/current_state/{agent-id}-current_state.md`
- **Example**: `.cursor/agents/current_state/backend-agent-current_state.md`

### File Lifecycle

1. **Create**: When agent starts working on a task
2. **Update**: Continuously as agent progresses (at least once per phase)
3. **Erase**: When task completes successfully (clear content, don't delete file)
4. **Resume**: Agent reads state file to resume after interruption

### Required Sections

All state files must include:
- Agent ID, Request ID, Status, Timestamps
- Current Task description
- Approach & Strategy
- Progress Status (completed, in progress, remaining)
- Context & State
- Files & Artifacts
- Resume Instructions

### Status Values

- **File Status**: Active | Completed | Cleared
- **Task Status**: in_progress | paused | completed | blocked | failed

### Completion Process

When task completes:
1. Set status to "completed"
2. Document completion summary
3. **Erase file content** (replace with completion marker)
4. Set file status to "Cleared"

**Important**: File is **erased** (content cleared) but **not deleted** (file remains).

See `.cursor/docs/AGENT_CURRENT_STATE_SPECIFICATION.md` for complete details.

---

## Examples and Templates Standards (Hybrid Separation)

Agents should use a **hybrid separation approach** for examples and templates: reference shared examples when appropriate, but keep agent-specific examples inline.

### Shared Examples Directory Structure

```
.cursor/agents/examples/
├── handoffs/
│   ├── standard-handoff.json
│   ├── escalation-handoff.json
│   ├── collaboration-handoff.json
│   └── error-recovery-handoff.json
├── templates/
│   ├── input-format-template.json
│   └── output-format-template.json
├── patterns/
│   └── (common code patterns - future)
└── current_state-template.md
```

### When to Use Shared Examples

**✅ Use Shared Examples** for:
- **Handoff protocol examples** (standard, escalation, collaboration, error recovery)
- **Common input/output format templates**
- **Reusable code patterns** that appear across multiple agents
- **Standardized structures** that are identical across agents

**Reference Format**:
```markdown
For standard handoff format, see: `.cursor/agents/examples/handoffs/standard-handoff.json`

For escalation handoff format, see: `.cursor/agents/examples/handoffs/escalation-handoff.json`

**Agent-Specific Example**:

[Keep agent-specific handoff example inline here if it demonstrates unique workflow]
```

### When to Keep Examples Inline

**✅ Keep Inline** for:
- **Agent-specific input/output examples** (show how THIS agent works)
- **Domain-specific code examples** (backend vs frontend patterns)
- **Workflow examples** (specific to agent's process)
- **Unique scenarios** not covered by shared examples

### Implementation Guidelines

1. **Reference Shared Examples**: Link to shared examples in appropriate sections
2. **Keep Agent-Specific**: Maintain agent-specific examples that show unique functionality
3. **Use Clear References**: Make it clear when referencing vs. showing inline examples
4. **Update Shared Examples**: When updating shared examples, verify all references still work

### Benefits

- **Reduced File Size**: ~10-18% reduction per agent file
- **Single Source of Truth**: Update once, applies everywhere
- **Better Maintainability**: Easier to keep examples consistent
- **Improved Reusability**: Easy to create new agents using templates

See `.cursor/docs/AGENT_EXAMPLES_SEPARATION_ANALYSIS.md` for complete analysis.

---

## Date and Time Standards

All agents must be aware of the current date and time for generating accurate timestamps, request IDs, reports, and version history entries. See `.cursor/docs/AGENT_DATE_AWARENESS_SPECIFICATION.md` for complete details.

**Quick Reference**:
- Get current date: `date -u +"%Y-%m-%d"` → `2025-01-21`
- Get current timestamp: `date -u +"%Y-%m-%dT%H:%M:%SZ"` → `2025-01-21T14:30:00Z`
- Always use current date/time (never hardcode)
- Use ISO 8601 format for timestamps
- Use UTC timezone for all dates/times

