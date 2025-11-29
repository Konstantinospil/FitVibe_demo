# Cursor Agents Registry

**Version**: 1.0  
**Last Updated**: 2025-11-29  
**Status**: Active

---

## Overview

This registry documents all Cursor agents available in the FitVibe project, their capabilities, status, and relationships. This enables agent discovery, capability lookup, and workflow planning.

---

## Agent Inventory

### Active Agents (8)

| Agent ID             | Name                 | Type         | Domain                | Model  | Status    | File                            |
| -------------------- | -------------------- | ------------ | --------------------- | ------ | --------- | ------------------------------- |
| planner              | Planner Agent        | Orchestrator | Planning, Workflow    | sonnet | ✅ Active | `planner-agent.md`              |
| requirements-analyst | Requirements Analyst | Specialist   | Requirements Analysis | sonnet | ✅ Active | `requirements-analyst-agent.md` |
| fullstack            | Full-Stack Developer | Generalist   | Full-Stack            | sonnet | ✅ Active | `fullstack-agent.md`            |
| backend              | Backend Developer    | Specialist   | Backend               | sonnet | ✅ Active | `backend-agent.md`              |
| frontend             | Frontend Developer   | Specialist   | Frontend              | sonnet | ✅ Active | `senior-frontend-developer.md`  |
| test-manager         | Test Manager         | Specialist   | Testing               | sonnet | ✅ Active | `test_manager.md`               |
| version-controller   | Version Controller   | Specialist   | Git, Security         | sonnet | ✅ Active | `version_controller.md`         |
| agent-quality        | Agent Quality Agent  | Meta-Agent   | Agent Quality         | sonnet | ✅ Active | `agent-quality-agent.md`        |

---

## Agent Capabilities Matrix

### Planning & Orchestration

| Capability              | planner | requirements-analyst | fullstack | backend | frontend | test-manager | version-controller | agent-quality |
| ----------------------- | ------- | -------------------- | --------- | ------- | -------- | ------------ | ------------------ | ------------- |
| Workflow Orchestration  | ✅      | ❌                   | ❌        | ❌      | ❌       | ❌           | ❌                 | ❌            |
| Issue Tracking          | ✅      | ❌                   | ❌        | ❌      | ❌       | ❌           | ❌                 | ❌            |
| Project Plan Management | ✅      | ❌                   | ❌        | ❌      | ❌       | ❌           | ❌                 | ❌            |
| Requirements Analysis   | ❌      | ✅                   | ❌        | ❌      | ❌       | ❌           | ❌                 | ❌            |
| Acceptance Criteria     | ❌      | ✅                   | ❌        | ❌      | ❌       | ❌           | ❌                 | ❌            |

### Development

| Capability                | planner | requirements-analyst | fullstack | backend | frontend | test-manager | version-controller | agent-quality |
| ------------------------- | ------- | -------------------- | --------- | ------- | -------- | ------------ | ------------------ | ------------- |
| Full-Stack Implementation | ❌      | ❌                   | ✅        | ❌      | ❌       | ❌           | ❌                 | ❌            |
| Backend API Development   | ❌      | ❌                   | ✅        | ✅      | ❌       | ❌           | ❌                 | ❌            |
| Database Migrations       | ❌      | ❌                   | ✅        | ✅      | ❌       | ❌           | ❌                 | ❌            |
| Frontend Components       | ❌      | ❌                   | ✅        | ❌      | ✅       | ❌           | ❌                 | ❌            |
| State Management          | ❌      | ❌                   | ✅        | ❌      | ✅       | ❌           | ❌                 | ❌            |
| API Integration           | ❌      | ❌                   | ✅        | ❌      | ✅       | ❌           | ❌                 | ❌            |

### Quality Assurance

| Capability           | planner | requirements-analyst | fullstack | backend | frontend | test-manager | version-controller | agent-quality |
| -------------------- | ------- | -------------------- | --------- | ------- | -------- | ------------ | ------------------ | ------------- |
| Test Generation      | ❌      | ❌                   | ❌        | ❌      | ❌       | ✅           | ❌                 | ❌            |
| Test Coverage        | ❌      | ❌                   | ❌        | ❌      | ❌       | ✅           | ❌                 | ❌            |
| Code Review          | ❌      | ❌                   | ❌        | ❌      | ❌       | ❌           | ❌                 | ❌            |
| Security Scanning    | ❌      | ❌                   | ❌        | ❌      | ❌       | ❌           | ✅                 | ❌            |
| Agent Quality Review | ❌      | ❌                   | ❌        | ❌      | ❌       | ❌           | ❌                 | ✅            |

### Operations

| Capability       | planner | requirements-analyst | fullstack | backend | frontend | test-manager | version-controller | agent-quality |
| ---------------- | ------- | -------------------- | --------- | ------- | -------- | ------------ | ------------------ | ------------- |
| Git Operations   | ❌      | ❌                   | ❌        | ❌      | ❌       | ❌           | ✅                 | ❌            |
| PR Management    | ❌      | ❌                   | ❌        | ❌      | ❌       | ❌           | ✅                 | ❌            |
| Secret Detection | ❌      | ❌                   | ❌        | ❌      | ❌       | ❌           | ✅                 | ❌            |
| Documentation    | ❌      | ❌                   | Partial   | Partial | Partial  | ❌           | ❌                 | ❌            |

---

## Workflow Relationships

### Standard Workflow

```
User Request
    ↓
planner (orchestrates)
    ↓
requirements-analyst (analyzes requirements)
    ↓
planner (updates tracking)
    ↓
fullstack (or backend + frontend separately)
    ↓
test-manager (generates tests)
    ↓
version-controller (creates PR)
    ↓
planner (marks complete)
```

### Agent Handoff Map

```
planner
  ├─→ requirements-analyst
  ├─→ fullstack
  │     ├─→ backend
  │     └─→ frontend
  ├─→ test-manager
  └─→ version-controller

requirements-analyst
  └─→ planner

fullstack
  ├─→ backend
  ├─→ frontend
  └─→ test-manager

backend
  └─→ frontend

frontend
  └─→ test-manager

test-manager
  └─→ version-controller

version-controller
  └─→ planner

agent-quality
  └─→ (all agents for review)
```

---

## Agent Details

### planner (Planner Agent)

**Purpose**: Orchestrate development workflow, track project progress, manage issues

**Key Capabilities**:

- Workflow orchestration
- Issue tracking and management
- Project plan updates
- GitHub integration
- Status tracking

**When to Use**:

- Starting new features
- Coordinating multi-agent work
- Tracking project progress
- Managing issues

**File**: `.cursor/agents/planner-agent.md`

---

### requirements-analyst (Requirements Analyst)

**Purpose**: Transform user requests into clear technical requirements with acceptance criteria

**Key Capabilities**:

- Requirements elicitation
- Requirements analysis
- Acceptance criteria definition
- Dependency identification
- Requirements documentation

**When to Use**:

- Analyzing user requests
- Defining requirements
- Creating acceptance criteria
- Identifying dependencies

**File**: `.cursor/agents/requirements-analyst-agent.md`

---

### fullstack (Full-Stack Developer)

**Purpose**: Implement end-to-end features across backend and frontend

**Key Capabilities**:

- Full-stack implementation
- API design and development
- Frontend component development
- Database schema design
- Cross-layer testing

**When to Use**:

- Implementing complete features
- Need both backend and frontend
- API and UI development together

**File**: `.cursor/agents/fullstack-agent.md`

---

### backend (Backend Developer)

**Purpose**: Implement backend APIs, services, and database operations

**Key Capabilities**:

- REST API development
- Database migrations
- Business logic implementation
- Input validation
- Authentication/authorization

**When to Use**:

- Backend-only work
- API development
- Database work
- Service layer implementation

**File**: `.cursor/agents/backend-agent.md`

---

### frontend (Frontend Developer)

**Purpose**: Implement React components, UI features, and frontend logic

**Key Capabilities**:

- React component development
- State management
- i18n integration
- Accessibility (WCAG 2.1 AA)
- Performance optimization

**When to Use**:

- Frontend-only work
- UI component development
- Frontend feature implementation
- Accessibility improvements

**File**: `.cursor/agents/senior-frontend-developer.md`

---

### test-manager (Test Manager)

**Purpose**: Generate comprehensive test suites and ensure quality

**Key Capabilities**:

- Test generation (unit, integration, E2E)
- Test coverage analysis
- Quality assurance
- Test pattern implementation
- Deterministic testing

**When to Use**:

- After implementation
- Need test coverage
- Quality assurance
- Test pattern implementation

**File**: `.cursor/agents/test_manager.md`

---

### version-controller (Version Controller)

**Purpose**: Manage git operations, security scanning, and PR workflows

**Key Capabilities**:

- Git operations
- Security scanning
- Secret detection
- PR management
- Dependency auditing

**When to Use**:

- Creating commits
- Managing branches
- Security scanning
- Creating PRs
- Secret detection

**File**: `.cursor/agents/version_controller.md`

---

### agent-quality (Agent Quality Agent)

**Purpose**: Review, validate, and improve agent configurations

**Key Capabilities**:

- Agent configuration review
- Standards compliance checking
- Handoff protocol validation
- Improvement suggestions
- Quality scoring

**When to Use**:

- Reviewing agent configurations
- Ensuring consistency
- Validating standards compliance
- Improving agent quality

**File**: `.cursor/agents/agent-quality-agent.md`

---

## Planned Agents

### High Priority

1. **code-review-agent** - Code review and quality assurance
2. **documentation-agent** - Documentation management and updates

### Medium Priority

3. **security-review-agent** - Comprehensive security review
4. **api-contract-agent** - API contract validation

---

## Agent Status Tracking

| Agent                | Current Work | Status | Last Updated |
| -------------------- | ------------ | ------ | ------------ |
| planner              | -            | Idle   | -            |
| requirements-analyst | -            | Idle   | -            |
| fullstack            | -            | Idle   | -            |
| backend              | -            | Idle   | -            |
| frontend             | -            | Idle   | -            |
| test-manager         | -            | Idle   | -            |
| version-controller   | -            | Idle   | -            |
| agent-quality        | -            | Idle   | -            |

_Status tracking updated by planner-agent_

---

## Agent Selection Guide

### When to Use Which Agent

**Starting New Feature**:

1. Start with `planner` to create issue and track
2. Use `requirements-analyst` to analyze requirements
3. Use `fullstack` for complete feature, or `backend` + `frontend` separately
4. Use `test-manager` for tests
5. Use `version-controller` for PR

**Backend-Only Work**:

- Use `backend` agent
- Hand off to `test-manager` for tests

**Frontend-Only Work**:

- Use `frontend` agent
- Hand off to `test-manager` for tests

**Requirements Analysis**:

- Use `requirements-analyst` agent
- Always use before implementation

**Quality Review**:

- Use `agent-quality` to review agent configurations
- Use `test-manager` for test quality
- Use `version-controller` for security

---

## Maintenance

**Updated By**: planner-agent, agent-quality-agent  
**Update Frequency**: When agents are added, modified, or removed  
**Last Review**: 2025-11-29

---

**Registry Version**: 1.0  
**Next Review**: 2025-12-15
