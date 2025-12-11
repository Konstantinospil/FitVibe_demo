# FitVibe Project Rules

This directory contains the project rules for FitVibe, organized by topic for better maintainability and clarity. Rules use the `.mdc` (Markdown with Cursor metadata) format with YAML frontmatter for advanced scoping and control.

## Rule Files

### Core Rules

- **`project-overview.mdc`** - Project overview, repository structure, technology stack, domain concepts, and project status (Always applied, all files)
- **`coding-standards.mdc`** - TypeScript standards, code organization, formatting, API conventions, and database practices (Always applied, TypeScript files)
- **`implementation-principles.mdc`** - Core implementation principles, "When Writing Code" guidelines (Always applied, app code)
- **`security-privacy.mdc`** - Security requirements, privacy & GDPR compliance, and accessibility standards (Always applied, all app files)
- **`testing-requirements.mdc`** - Testing standards, tools, structure, and best practices (Always applied, test files)
- **`implementation-patterns.mdc`** - Common code patterns for backend, frontend, database, and testing (Auto-attached, TypeScript/TSX files)
- **`technology-guidance.mdc`** - Technology-specific guidance for React, Knex.js, Express.js, TypeScript, Docker (Auto-attached, backend/frontend code)
- **`development-workflow.mdc`** - Documentation standards, branching, quality gates, PR requirements, and Turborepo tasks (Agent-requested)
- **`domain-concepts.mdc`** - Observability patterns, troubleshooting guidance, and references (Manual/reference only)
- **`troubleshooting.mdc`** - Troubleshooting guidance for common development issues (Manual/reference only)

## Rule Format (.mdc files)

All rules now use the `.mdc` format with YAML frontmatter for metadata:

```yaml
---
description: "Human-readable description of the rule"
globs: ["**/*.ts", "**/*.tsx"]  # File patterns for scoping
alwaysApply: true                # Whether to always apply or auto-attach
ruleType: "always"              # always | auto_attached | agent_requested | manual
tags: ["tag1", "tag2"]          # Tags for categorization
---
```

### Rule Types

- **`always`**: Applied automatically to all matching files
- **`auto_attached`**: Attached automatically when context matches (file patterns)
- **`agent_requested`**: Only applied when specific agents request them
- **`manual`**: Applied only when explicitly requested (reference documentation)

### Glob Patterns

Rules are scoped using glob patterns to apply only to relevant files:

- **`["**"]`**: All files (project-wide rules)
- **`["apps/**/*.ts", "apps/**/*.tsx"]`**: All TypeScript/TSX files in apps
- **`["apps/backend/**/*.ts"]`**: Backend TypeScript files only
- **`["**/__tests__/**", "**/*.test.ts"]`**: Test files only

## Migration from `.cursorrules` and `.md` Files

The original `.cursorrules` file (663 lines) has been split into focused rule files and converted to `.mdc` format to:
- Improve maintainability (each file < 500 lines)
- Enhance clarity (focused topics)
- Enable file-specific scoping via glob patterns
- Support advanced rule types and metadata
- Improve AI performance (fewer rules evaluated per file)

All content from `.cursorrules` and `.md` files has been preserved and reorganized. Legacy `.md` files remain for backward compatibility but should be considered deprecated in favor of `.mdc` files.

## Usage

Cursor automatically loads all `.mdc` files in `.cursor/rules/` as project rules. Rules are applied based on:
- **Glob patterns**: Only rules matching the current file are evaluated
- **Rule types**: Rules are applied based on their type configuration
- **Metadata**: Description and tags help with rule discovery and organization

## Updating Rules

When updating rules:
1. Edit the appropriate `.mdc` file in `.cursor/rules/`
2. Keep files focused on a single topic
3. Maintain files under 500 lines when possible
4. Update glob patterns if file scoping needs to change
5. Update this README if adding new rule files
6. Consider removing legacy `.md` files once migration is complete

## Rule File Sizes (Current)

All rule files are within the 500-line recommendation:
- `security-privacy.mdc`: 52 lines ✅
- `troubleshooting.mdc`: 54 lines ✅
- `testing-requirements.mdc`: 57 lines ✅
- `implementation-principles.mdc`: 64 lines ✅
- `technology-guidance.mdc`: 81 lines ✅
- `development-workflow.mdc`: 94 lines ✅
- `coding-standards.mdc`: 109 lines ✅
- `domain-concepts.mdc`: 109 lines ✅
- `project-overview.mdc`: 114 lines ✅
- `implementation-patterns.mdc`: 269 lines ✅

## References

- **Implementation Principles**: `docs/6.Implementation/implementation_principles.md`
- **Agent Standards**: `.cursor/agents/STANDARDS.md`
- **Handoff Protocol**: `.cursor/agents/HANDOFF_PROTOCOL.md`
- **Cursor Rules Best Practices**: `.cursor/docs/CURSOR_RULES_BEST_PRACTICES_ANALYSIS.md`
