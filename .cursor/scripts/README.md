# Cursor Scripts

This directory contains utility scripts related to Cursor IDE configuration and compliance checking.

## Scripts

### `check_cursor_rules_compliance.py`

Checks if the repository complies with cursor rules standards (now in `.cursor/rules/`).

**Usage**:
```bash
python .cursor/scripts/check_cursor_rules_compliance.py [--output <report.md>]
```

**What it checks**:
- TypeScript strict mode configuration
- Absence of `any` types in non-test files
- Code organization and structure
- Other compliance checks based on project rules

**Output**: Generates a compliance report (default: `docs/6.Implementation/cursor_rules_compliance_report.md`)

### `analyze_cursor_chats.py`

Analyzes Cursor chat history to identify patterns and suggest improvements to cursor rules.

**Usage**:
```bash
python .cursor/scripts/analyze_cursor_chats.py [--chat-dir <path>] [--output <output.md>]
```

**What it does**:
- Finds Cursor chat storage location
- Extracts chat messages from SQLite database
- Analyzes patterns and common requests
- Generates recommendations for improving cursor rules

**Output**: Generates an analysis report with recommendations

### Bug Fixing Scripts

Bug-related scripts for collecting and fixing bugs:

- **`bug-collector.mjs`** - Collects bugs from tests, linter, and type checker
- **`bug-fixer-agent.mjs`** - Basic single-agent bug fixer
- **`bug-fixer-multi-agent.mjs`** - Enhanced multi-agent system
- **`bug-brainstorm-coordinator.mjs`** - Coordinates multiple LLMs for solution brainstorming

**Usage**:
```bash
# Collect bugs
node .cursor/scripts/bug-collector.mjs

# Fix bugs (basic)
node .cursor/scripts/bug-fixer-agent.mjs

# Fix bugs (multi-agent)
node .cursor/scripts/bug-fixer-multi-agent.mjs

# Brainstorm solutions
node .cursor/scripts/bug-brainstorm-coordinator.mjs <bug-id>
```

**Bug Database**: `.cursor/bug-database/bugs.json`

See `.cursor/docs/README_BUG_FIXING.md` for complete documentation.

## Notes

- These scripts are copies of the original scripts in `scripts/` directory
- Path calculations have been updated to work from `.cursor/scripts/` location
- Scripts reference `.cursor/rules/` (migrated from legacy `.cursorrules`)

## Original Location

Original scripts are located in `scripts/` directory:
- `scripts/check_cursor_rules_compliance.py`
- `scripts/analyze_cursor_chats.py`

These copies are maintained for convenience and organization within the `.cursor/` directory structure.

---

## Agent Security Enforcement Scripts

New enforcement mechanisms for validating agent security standards:

- **`validate_agent_security.py`** - Validates agent configurations against security standards
- **`agent_operation_validator.mjs`** - Runtime validation of agent operations
- **`agent_audit_logger.mjs`** - Logs agent operations for security auditing

**Usage**:
```bash
# Validate all agents
pnpm agent:validate

# Validate single agent
pnpm agent:validate:single backend-agent

# Runtime validation
node .cursor/scripts/agent_operation_validator.mjs --agent backend-agent --operation write --file path/to/file.ts
```

See `.cursor/docs/AGENT_SECURITY_ENFORCEMENT.md` for complete documentation.

