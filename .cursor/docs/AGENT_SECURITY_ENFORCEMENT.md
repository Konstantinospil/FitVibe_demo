# Agent Security Enforcement Mechanisms

**Version**: 1.0  
**Last Updated**: 2025-01-20  
**Status**: Active

---

## Overview

This document describes the enforcement mechanisms for agent security standards. These tools automatically validate that agents comply with security restrictions defined in `SECURITY_STANDARDS.md`.

---

## Enforcement Tools

### 1. Agent Security Validator (Python)

**Location**: `.cursor/scripts/validate_agent_security.py`

**Purpose**: Validates agent configuration files against security standards.

**Usage**:

```bash
# Validate all agents
python3 .cursor/scripts/validate_agent_security.py --all --strict

# Validate specific agent
python3 .cursor/scripts/validate_agent_security.py --agent backend-agent

# Validate with verbose output
python3 .cursor/scripts/validate_agent_security.py --all --strict --verbose
```

**What It Checks**:
- ✅ Tool restrictions (agents cannot use restricted tools)
- ✅ Read-only agents (code-review, security-review, api-contract cannot write)
- ✅ Git operations (only version-controller can use git)
- ✅ Security standards references

**Exit Codes**:
- `0` - Validation passed (or passed with warnings)
- `1` - Validation failed (errors found)

---

### 2. Agent Operation Validator (Node.js)

**Location**: `.cursor/scripts/agent_operation_validator.mjs`

**Purpose**: Validates agent operations at runtime against security restrictions.

**Usage**:

```bash
# Validate an operation
node .cursor/scripts/agent_operation_validator.mjs \
  --agent backend-agent \
  --operation write \
  --file apps/backend/src/modules/users/users.controller.ts

# Validate with secret scanning
node .cursor/scripts/agent_operation_validator.mjs \
  --agent backend-agent \
  --operation write \
  --file apps/backend/src/config/env.ts \
  --scan
```

**What It Validates**:
- ✅ Operation is allowed for the agent
- ✅ File path is not restricted
- ✅ Read-only agents cannot write
- ✅ Secrets files are protected
- ✅ Git operations restricted to version-controller

**Integration**:
Can be integrated into agent workflows or called before sensitive operations.

---

### 3. Agent Audit Logger (Node.js)

**Location**: `.cursor/scripts/agent_audit_logger.mjs`

**Purpose**: Logs all agent operations for security auditing.

**Usage**:

```bash
# Log an operation
node .cursor/scripts/agent_audit_logger.mjs \
  --agent backend-agent \
  --operation write \
  --file apps/backend/src/modules/users/users.controller.ts \
  --result success
```

**Log Location**: `.cursor/logs/agent_operations.log`

**Log Format** (JSONL):
```json
{
  "timestamp": "2025-01-20T10:30:00.000Z",
  "agent_id": "backend-agent",
  "operation": "write",
  "file_path": "apps/backend/src/modules/users/users.controller.ts",
  "result": "success",
  "details": {}
}
```

---

### 4. Pre-Commit Hook Integration

**Location**: `.husky/pre-commit`

**Purpose**: Automatically validates agent configurations before commit.

**What It Does**:
1. Checks if agent files are being modified
2. Runs agent security validation if agent files changed
3. Blocks commit if validation fails

**Bypass** (Not Recommended):
```bash
git commit --no-verify -m "message"
```

⚠️ **Warning**: Only bypass if absolutely necessary and you're certain there are no security violations.

---

## Package.json Scripts

### Validate All Agents

```bash
pnpm agent:validate
```

Validates all agents against security standards.

### Validate Single Agent

```bash
pnpm agent:validate:single backend-agent
```

Validates a specific agent.

---

## Enforcement Levels

### Level 1: Pre-Commit Validation (Automatic)

**Trigger**: Agent files modified in commit
**Tool**: `validate_agent_security.py`
**Action**: Blocks commit if validation fails

**Status**: ✅ **Active**

---

### Level 2: Runtime Operation Validation (Manual/Integration)

**Trigger**: Before sensitive agent operations
**Tool**: `agent_operation_validator.mjs`
**Action**: Validates operation before execution

**Status**: ✅ **Available** (requires integration)

**Integration Example**:
```javascript
import { validateOperation } from './agent_operation_validator.mjs';

// Before agent operation
const result = validateOperation('backend-agent', 'write', 'path/to/file.ts');
if (!result.valid) {
  throw new Error(result.error);
}
```

---

### Level 3: Audit Logging (Available)

**Trigger**: After agent operations
**Tool**: `agent_audit_logger.mjs`
**Action**: Logs operation for security review

**Status**: ✅ **Available** (requires integration)

---

## Validation Rules

### Tool Restrictions

Each agent can only use tools allowed in `SECURITY_STANDARDS.md`:

- **planner-agent**: Read-only tools + AskUserQuestion
- **backend-agent**: All development tools (no git)
- **code-review-agent**: Read-only tools only
- **version-controller**: All tools including git

### File Access Restrictions

- **Read-only agents** (code-review, security-review, api-contract): Cannot modify any files
- **Backend agent**: Can only modify backend files
- **Frontend agent**: Can only modify frontend files
- **Documentation agent**: Can only modify documentation files

### Git Operations

- **Only version-controller** can perform git operations
- All other agents must hand off to version-controller

---

## Compliance Checking

### Manual Validation

```bash
# Check all agents
pnpm agent:validate

# Check specific agent
python3 .cursor/scripts/validate_agent_security.py --agent backend-agent --strict

# Verbose output
python3 .cursor/scripts/validate_agent_security.py --all --strict --verbose
```

### CI/CD Integration

Add to CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Validate Agent Security Standards
  run: pnpm agent:validate
```

---

## Troubleshooting

### Validation Fails on Commit

**Problem**: Pre-commit hook blocks commit with validation errors.

**Solution**:
1. Review validation errors
2. Fix agent configuration to comply with security standards
3. Re-run validation: `pnpm agent:validate`
4. Commit again

### Python3 Not Found

**Problem**: Pre-commit hook shows "Python3 not found" warning.

**Solution**:
```bash
# Install Python3 (varies by OS)
# macOS
brew install python3

# Ubuntu/Debian
sudo apt-get install python3

# Windows
# Download from python.org
```

### Agent Operation Blocked

**Problem**: Runtime validation blocks an agent operation.

**Solution**:
1. Check if operation is allowed for the agent
2. Verify file path is not restricted
3. Consider handing off to appropriate agent
4. Review `SECURITY_STANDARDS.md` for allowed operations

---

## Future Enhancements

### Planned Improvements

1. **Automated Runtime Enforcement**: Integrate operation validator into agent execution
2. **Real-time Monitoring**: Monitor agent operations in real-time
3. **Violation Alerts**: Send alerts when security violations are detected
4. **Compliance Dashboard**: Visual dashboard showing agent compliance status
5. **Auto-remediation**: Automatically fix common compliance issues

---

## Security Incident Response

If a security violation is detected:

1. **Immediate**: Block the violating operation
2. **Investigation**: Review audit logs to understand what happened
3. **Remediation**: Fix security issues introduced
4. **Agent Update**: Update agent configuration to prevent recurrence
5. **Documentation**: Document incident in security log

---

## References

- **Security Standards**: `.cursor/agents/SECURITY_STANDARDS.md`
- **Agent Standards**: `.cursor/agents/STANDARDS.md`
- **Agent Registry**: `.cursor/agents/REGISTRY.md`

---

**Last Updated**: 2025-01-20  
**Maintained By**: security-review-agent, agent-quality-agent  
**Next Review**: 2025-04-20


















