# Agent Security Standards

**Version**: 1.0  
**Last Updated**: 2025-01-20  
**Status**: Active  
**Applies To**: All Cursor Agents in FitVibe Project

---

## Overview

This document defines security standards, permissions, and restrictions for all Cursor agents in the FitVibe project. It establishes security boundaries, least-privilege principles, and access controls to ensure agents operate securely and within their defined scope.

---

## Security Principles

### 1. Least Privilege

Each agent should have **only the minimum tools and permissions** necessary to fulfill its responsibilities. Agents should not have access to tools or resources they don't need.

### 2. Separation of Concerns

Agents should operate within their defined domain and avoid overlapping responsibilities that could create security risks or conflicts.

### 3. Explicit Permission Model

All agent permissions must be explicitly defined and documented. No implicit permissions are granted.

### 4. Auditability

All agent operations should be traceable and auditable for security review.

### 5. Security by Default

Agents must follow security best practices by default, including:
- Never committing secrets or sensitive data
- Validating all input
- Following secure coding practices
- Respecting access controls

---

## Tool Categories

### Core Tools (Read-Only)

**Purpose**: Tools that read or analyze without modifying code

- **Read**: Read files, documentation, code
- **Grep**: Search for patterns in codebase
- **Glob**: Find files matching patterns
- **WebFetch**: Fetch documentation or resources from web
- **TodoWrite**: Create task lists (read-only tracking)

**Allowed For**: All agents (minimal risk)

---

### Development Tools (Write Access)

**Purpose**: Tools that modify code or create files

- **Edit**: Modify existing files
- **Write**: Create new files
- **NotebookEdit**: Edit Jupyter notebooks
- **Bash**: Execute commands (restricted usage)
- **BashOutput**: Capture command output
- **KillShell**: Terminate running processes

**Allowed For**: Implementation agents (backend, frontend, fullstack, test-manager)
**Restricted For**: Review/analysis agents (code-review, security-review, api-contract)

---

### Git Operations (High Risk)

**Purpose**: Tools that interact with version control

**Restricted To**: **version-controller only**

**Rationale**: Git operations can:
- Expose secrets if committed
- Modify repository history
- Push unauthorized changes
- Bypass security checks

**Allowed Operations**:
- Read git history
- View diffs
- Create branches
- Stage and commit changes
- Push to remote (with security scans)

**Prohibited Operations**:
- Force push to protected branches (main, develop)
- Git rebase or history rewriting (without approval)
- Bypassing pre-commit hooks

---

### Interactive Tools

**Purpose**: Tools that require user interaction

- **AskUserQuestion**: Prompt user for input
- **Skill**: Custom skill execution
- **SlashCommand**: Execute slash commands

**Allowed For**: Most agents (requires user approval for sensitive operations)

**Restrictions**:
- Cannot bypass security prompts
- Cannot execute destructive operations without confirmation
- Cannot access secrets or credentials via prompts

---

## Agent-Specific Security Standards

### planner-agent

**Domain**: Workflow orchestration, project management

**Allowed Tools**:
- Read, Grep, Glob, WebFetch, TodoWrite
- AskUserQuestion, SlashCommand

**Restricted Tools**:
- Edit, Write (should not modify code directly)
- Bash (limited to project management scripts)
- Git operations (hand off to version-controller)

**File Access**:
- ✅ Read: All documentation, project files
- ✅ Write: Issue tracking, project plans
- ❌ Write: Source code, configuration files
- ❌ Write: Security-sensitive files

---

### requirements-analyst-agent

**Domain**: Requirements analysis and documentation

**Allowed Tools**:
- Read, Grep, Glob, WebFetch, TodoWrite
- Write (documentation only)
- AskUserQuestion

**Restricted Tools**:
- Edit (existing code)
- Bash (no code execution)
- Git operations

**File Access**:
- ✅ Read: All documentation, existing requirements
- ✅ Write: Requirements documents, acceptance criteria
- ❌ Write: Source code, configuration
- ❌ Write: Implementation files

---

### backend-agent

**Domain**: Backend development

**Allowed Tools**:
- All core tools (Read, Grep, Glob)
- All development tools (Edit, Write, Bash)
- TodoWrite

**Restricted Tools**:
- Git operations (hand off to version-controller)
- Interactive tools (limited use)

**File Access**:
- ✅ Read/Write: Backend source code
- ✅ Read/Write: Database migrations
- ✅ Read/Write: Backend configuration
- ❌ Write: Frontend code (use frontend agent)
- ❌ Write: Production secrets
- ❌ Write: Infrastructure files (limited)

**Security Restrictions**:
- Cannot commit secrets (must use environment variables)
- Cannot bypass input validation
- Cannot skip security middleware
- Must validate all user input with Zod

---

### senior-frontend-developer (frontend-agent)

**Domain**: Frontend development

**Allowed Tools**:
- All core tools (Read, Grep, Glob)
- All development tools (Edit, Write, Bash)
- TodoWrite

**Restricted Tools**:
- Git operations (hand off to version-controller)
- Interactive tools (limited use)

**File Access**:
- ✅ Read/Write: Frontend source code
- ✅ Read/Write: Frontend configuration
- ✅ Read: Backend API contracts (read-only)
- ❌ Write: Backend code (use backend agent)
- ❌ Write: Database migrations
- ❌ Write: Production secrets
- ❌ Write: Infrastructure files (limited)

**Security Restrictions**:
- Cannot hardcode API keys or secrets
- Must use environment variables for sensitive config
- Cannot bypass accessibility requirements
- Must validate user input
- Cannot use inline scripts (CSP compliance)

---

### fullstack-agent

**Domain**: Full-stack development

**Allowed Tools**:
- All core tools (Read, Grep, Glob)
- All development tools (Edit, Write, Bash)
- TodoWrite

**Restricted Tools**:
- Git operations (hand off to version-controller)
- Interactive tools (limited use)

**File Access**:
- ✅ Read/Write: Backend and frontend source code
- ✅ Read/Write: Database migrations
- ✅ Read/Write: Configuration files
- ❌ Write: Production secrets
- ❌ Write: Infrastructure files (limited)

**Security Restrictions**:
- Follows all backend and frontend security restrictions
- Cannot commit secrets
- Must validate all input
- Must follow security best practices across layers

---

### test-manager

**Domain**: Test generation and quality assurance

**Allowed Tools**:
- All core tools (Read, Grep, Glob)
- All development tools (Edit, Write, Bash)
- TodoWrite

**Restricted Tools**:
- Git operations (hand off to version-controller)

**File Access**:
- ✅ Read/Write: Test files only
- ✅ Read: Source code (for test coverage)
- ❌ Write: Production code (tests only)
- ❌ Write: Configuration files
- ❌ Write: Secrets or credentials

**Security Restrictions**:
- Cannot modify production code (tests only)
- Cannot expose test secrets in committed files
- Must use test doubles for external services
- Cannot access production databases

---

### code-review-agent

**Domain**: Code quality review

**Allowed Tools**:
- Read, Grep, Glob, WebFetch
- TodoWrite (for review tracking)
- Bash (limited to running linting/type checking)

**Restricted Tools**:
- Edit, Write (read-only review, no code modification)
- Git operations (read-only, no commits)
- NotebookEdit (not applicable)

**File Access**:
- ✅ Read: All source code (for review)
- ✅ Read: Documentation
- ❌ Write: Any files (read-only reviewer)
- ❌ Write: Cannot modify code being reviewed

**Security Restrictions**:
- Read-only access (cannot modify code)
- Cannot bypass security checks
- Cannot commit changes
- Must report security issues, not fix them

---

### security-review-agent

**Domain**: Security review and vulnerability assessment

**Allowed Tools**:
- Read, Grep, Glob, WebFetch
- TodoWrite (for security findings)
- Bash (limited to security scanning tools)

**Restricted Tools**:
- Edit, Write (read-only security review)
- Git operations (read-only, no commits)
- NotebookEdit (not applicable)

**File Access**:
- ✅ Read: All source code (for security review)
- ✅ Read: Configuration files (for security analysis)
- ✅ Read: Dependency files (for vulnerability scanning)
- ❌ Write: Any files (read-only reviewer)
- ❌ Write: Cannot modify code

**Security Restrictions**:
- Read-only access (cannot modify code)
- Cannot commit changes
- Can scan for secrets but cannot fix them (report only)
- Must report vulnerabilities, not remediate them
- Cannot access production secrets or credentials

**Special Permissions**:
- Can run security scanning tools (`pnpm audit`, secret detection)
- Can analyze dependency vulnerabilities
- Can review security configurations

---

### api-contract-agent

**Domain**: API contract validation

**Allowed Tools**:
- Read, Grep, Glob
- TodoWrite (for contract findings)
- Bash (limited to type checking)

**Restricted Tools**:
- Edit, Write (read-only validation)
- Git operations (read-only)
- NotebookEdit (not applicable)

**File Access**:
- ✅ Read: Backend schemas (Zod)
- ✅ Read: Frontend types (TypeScript)
- ✅ Read: API documentation
- ❌ Write: Any files (read-only validator)
- ❌ Write: Cannot modify contracts

**Security Restrictions**:
- Read-only access (cannot modify code)
- Cannot commit changes
- Can validate contracts but cannot fix them (report only)
- Cannot access production data

---

### documentation-agent

**Domain**: Documentation management

**Allowed Tools**:
- Read, Grep, Glob, WebFetch
- Edit, Write (documentation files only)
- TodoWrite

**Restricted Tools**:
- Bash (limited use)
- Git operations (hand off to version-controller)
- NotebookEdit (not applicable)

**File Access**:
- ✅ Read/Write: Documentation files (PRD, TDD, ADRs)
- ✅ Read/Write: README files
- ✅ Read: Source code (for documentation)
- ❌ Write: Source code (documentation only)
- ❌ Write: Configuration files
- ❌ Write: Secrets or credentials

**Security Restrictions**:
- Cannot modify source code
- Cannot expose secrets in documentation
- Must sanitize any sensitive information in docs
- Cannot modify security-sensitive documentation without review

---

### version-controller

**Domain**: Git operations and security scanning

**Allowed Tools**:
- All core tools (Read, Grep, Glob)
- Edit, Write (git hooks, PR templates)
- Bash (git commands, security scans)
- TodoWrite

**Special Permissions**:
- ✅ Git operations (commit, push, branch)
- ✅ Security scanning (secret detection)
- ✅ Dependency auditing

**Restricted Tools**:
- NotebookEdit (not applicable)

**File Access**:
- ✅ Read/Write: Git configuration
- ✅ Read/Write: Pre-commit hooks
- ✅ Read/Write: PR templates
- ✅ Read: All source code (for scanning)
- ❌ Write: Source code (use implementation agents)
- ❌ Write: Cannot modify code directly (git operations only)

**Security Restrictions**:
- **MUST** scan for secrets before committing
- **MUST** scan for vulnerabilities before pushing
- **MUST** enforce conventional commits
- **CANNOT** force push to protected branches (main, develop)
- **CANNOT** bypass pre-commit hooks
- **CANNOT** commit secrets (must block if detected)

**Critical Security Rules**:
1. **Secret Detection**: Must run secret scanning before any commit
2. **Vulnerability Scanning**: Must run `pnpm audit` before push
3. **Branch Protection**: Cannot force push or bypass branch protection
4. **Conventional Commits**: Must follow commit format
5. **PR Requirements**: Must include security checklist in PR

---

### agent-quality-agent

**Domain**: Agent configuration review

**Allowed Tools**:
- Read, Grep, Glob
- Edit, Write (agent configuration files only)
- TodoWrite

**Restricted Tools**:
- Bash (limited use)
- Git operations (hand off to version-controller)

**File Access**:
- ✅ Read/Write: Agent configuration files (`.cursor/agents/*.md`)
- ✅ Read: Standards and protocols
- ❌ Write: Source code
- ❌ Write: Configuration files outside agents directory

**Security Restrictions**:
- Cannot modify source code
- Can only modify agent configurations
- Cannot bypass security standards
- Must follow agent security standards

---

## Prohibited Operations (All Agents)

### Never Allowed

1. **Secrets Management**:
   - ❌ Commit secrets, API keys, passwords
   - ❌ Hardcode credentials
   - ❌ Store secrets in code files
   - ❌ Access production secrets

2. **Destructive Operations**:
   - ❌ Delete production data
   - ❌ Force push to protected branches
   - ❌ Bypass security checks
   - ❌ Skip required validation

3. **Bypass Security Controls**:
   - ❌ Disable security middleware
   - ❌ Skip input validation
   - ❌ Bypass authentication/authorization
   - ❌ Disable rate limiting

4. **Unauthorized Access**:
   - ❌ Access production databases
   - ❌ Access production secrets
   - ❌ Access user data without authorization
   - ❌ Modify infrastructure without approval

---

## Security Checklist

Before any agent operation, verify:

- [ ] Agent has required permissions for the operation
- [ ] No secrets will be committed or exposed
- [ ] Input validation is in place (if modifying code)
- [ ] Security standards are followed
- [ ] No prohibited operations are attempted
- [ ] Changes are auditable

---

## Access Control Matrix

| Agent                | Read Code | Write Code | Git Ops | Security Scan | Modify Docs | Access Secrets |
| -------------------- | --------- | ---------- | ------- | ------------- | ----------- | -------------- |
| planner              | ✅        | ❌         | ❌      | ❌            | ✅          | ❌             |
| requirements-analyst | ✅        | ❌         | ❌      | ❌            | ✅          | ❌             |
| fullstack            | ✅        | ✅         | ❌      | ❌            | ❌          | ❌             |
| backend              | ✅        | ✅         | ❌      | ❌            | ❌          | ❌             |
| frontend             | ✅        | ✅         | ❌      | ❌            | ❌          | ❌             |
| test-manager         | ✅        | ✅ (tests) | ❌      | ❌            | ❌          | ❌             |
| code-review          | ✅        | ❌         | ❌      | ✅            | ❌          | ❌             |
| security-review      | ✅        | ❌         | ❌      | ✅            | ❌          | ❌             |
| api-contract         | ✅        | ❌         | ❌      | ❌            | ❌          | ❌             |
| documentation        | ✅        | ✅ (docs)  | ❌      | ❌            | ✅          | ❌             |
| version-controller   | ✅        | ❌         | ✅      | ✅            | ✅          | ❌             |
| agent-quality        | ✅        | ✅ (agents)| ❌      | ❌            | ❌          | ❌             |

**Legend**:
- ✅ Allowed
- ❌ Prohibited
- ✅ (tests/docs/agents) - Limited to specific file types

---

## Enforcement

### Current Enforcement

Currently, tool restrictions are **informational only** - they're defined in agent configurations but not technically enforced by Cursor. Agents rely on:

1. **Agent Instructions**: Security restrictions are documented in agent configuration files
2. **Code Review**: Security review agent checks for violations
3. **Version Control**: version-controller scans for secrets before commits
4. **Manual Review**: Human review of agent operations

### Future Improvements

Consider implementing:

1. **Tool-Level Restrictions**: Enforce tool restrictions at Cursor configuration level
2. **File System Permissions**: Limit file access based on agent role
3. **Automated Enforcement**: Pre-commit hooks that verify agent permissions
4. **Audit Logging**: Log all agent operations for security review

---

## Incident Response

If an agent violates security standards:

1. **Immediate**: Block the violating operation
2. **Investigation**: Review what was attempted and why
3. **Remediation**: Fix any security issues introduced
4. **Agent Update**: Update agent configuration to prevent recurrence
5. **Documentation**: Document incident and lessons learned

---

## Version History

- **v1.0** (2025-01-20): Initial Agent Security Standards
  - Defined security principles
  - Created agent-specific security standards
  - Established access control matrix
  - Defined prohibited operations

---

## References

- **Agent Standards**: `.cursor/agents/STANDARDS.md`
- **Security & Privacy Rules**: `.cursor/rules/security-privacy.md`
- **Security Policy**: `docs/SECURITY.md`
- **Agent Registry**: `.cursor/agents/REGISTRY.md`

---

**Last Updated**: 2025-01-20  
**Maintained By**: security-review-agent, agent-quality-agent  
**Next Review**: 2025-04-20


















