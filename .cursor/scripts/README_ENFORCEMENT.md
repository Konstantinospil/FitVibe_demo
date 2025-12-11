# Agent Security Enforcement - Quick Start

## Quick Commands

### Validate All Agents
```bash
pnpm agent:validate
```

### Validate Single Agent
```bash
pnpm agent:validate:single backend-agent
```

### Manual Validation (Python)
```bash
python3 .cursor/scripts/validate_agent_security.py --all --strict
```

### Validate Agent Operation (Runtime)
```bash
node .cursor/scripts/agent_operation_validator.mjs \
  --agent backend-agent \
  --operation write \
  --file apps/backend/src/file.ts
```

### Log Agent Operation
```bash
node .cursor/scripts/agent_audit_logger.mjs \
  --agent backend-agent \
  --operation write \
  --file apps/backend/src/file.ts \
  --result success
```

## Pre-Commit Hook

Agent validation runs automatically when you commit agent files. If validation fails, the commit is blocked.

**To bypass** (not recommended):
```bash
git commit --no-verify -m "message"
```

## Files

- **Validation Script**: `.cursor/scripts/validate_agent_security.py`
- **Operation Validator**: `.cursor/scripts/agent_operation_validator.mjs`
- **Audit Logger**: `.cursor/scripts/agent_audit_logger.mjs`
- **Pre-Commit Hook**: `.husky/pre-commit`
- **Security Standards**: `.cursor/agents/SECURITY_STANDARDS.md`

## Documentation

See `.cursor/docs/AGENT_SECURITY_ENFORCEMENT.md` for complete documentation.


















