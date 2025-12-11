# Cursor Agents Registry

**Version**: 1.1
**Last Updated**: 2025-12-03
**Status**: Active

---

## Overview

This registry documents all Cursor agents available in the FitVibe project, their capabilities, status, and relationships. This enables agent discovery, capability lookup, and workflow planning.

---

## Agent Inventory

### Active Agents (17)

| Agent ID             | Name                 | Type         | Domain                | Model  | Status    | Implementation | Completion | Known Issues | File                            |
| -------------------- | -------------------- | ------------ | --------------------- | ------ | --------- | -------------- | ---------- | ------------ | ------------------------------- |
| planner              | Planner Agent        | Orchestrator | Planning, Workflow    | sonnet | ✅ Active | ✅ Complete    | 100%       | None         | `planner-agent.md`              |
| requirements-analyst | Requirements Analyst | Specialist   | Requirements Analysis | sonnet | ✅ Active | ✅ Complete    | 100%       | None         | `requirements-analyst-agent.md` |
| system-architect     | System Architect     | Specialist   | Architecture, Design  | sonnet | ✅ Active | ✅ Complete    | 100%       | None         | `system-architect-agent.md`     |
| fullstack            | Full-Stack Developer | Generalist   | Full-Stack            | sonnet | ✅ Active | ✅ Complete    | 100%       | None         | `fullstack-agent.md`            |
| backend              | Backend Developer    | Specialist   | Backend               | sonnet | ✅ Active | ✅ Complete    | 100%       | None         | `backend-agent.md`              |
| frontend             | Frontend Developer   | Specialist   | Frontend              | sonnet | ✅ Active | ✅ Complete    | 100%       | None         | `senior-frontend-developer.md`  |
| test-manager         | Test Manager         | Specialist   | Testing               | sonnet | ✅ Active | ✅ Complete    | 100%       | None         | `test_manager.md`               |
| code-review          | Code Review Agent    | Specialist   | Code Review, QA       | sonnet | ✅ Active | ✅ Complete    | 100%       | None         | `code-review-agent.md`          |
| documentation        | Documentation Agent  | Specialist   | Documentation         | sonnet | ✅ Active | ✅ Complete    | 100%       | None         | `documentation-agent.md`        |
| garbage-collection   | Garbage Collection Agent | Specialist | Repository Maintenance | sonnet | ✅ Active | ✅ Complete    | 100%       | None         | `garbage-collection-agent.md`   |
| version-controller   | Version Controller   | Specialist   | Git, Security         | sonnet | ✅ Active | ✅ Complete    | 100%       | None         | `version_controller.md`         |
| security-review      | Security Review Agent | Specialist   | Security Review       | sonnet | ✅ Active | ✅ Complete    | 100%       | None         | `security-review-agent.md`      |
| api-contract         | API Contract Agent   | Specialist   | API Contract Validation | sonnet | ✅ Active | ✅ Complete    | 100%       | None         | `api-contract-agent.md`         |
| agent-quality        | Agent Quality Agent  | Meta-Agent   | Agent Quality         | sonnet | ✅ Active | ✅ Complete    | 100%       | None         | `agent-quality-agent.md`        |
| knowledge-specialist | Knowledge Specialist | Specialist   | Knowledge Retrieval   | sonnet | ✅ Active | ✅ Complete    | 100%       | None         | `knowledge-specialist-agent.md` |
| researcher           | Researcher Agent     | Specialist   | Research & Knowledge  | sonnet | ✅ Active | ✅ Complete    | 100%       | None         | `researcher-agent.md`           |
| prompt-engineer      | Prompt Engineer      | Orchestrator | Communication, Prompt Engineering | sonnet | ✅ Active | ✅ Complete    | 100%       | None         | `prompt-engineer-agent.md`      |

### Implementation Status

**Overall Status**: ✅ **All Agents Fully Implemented** (100% Complete)

All 17 agents are fully implemented with:
- ✅ Complete configuration files
- ✅ All required sections present
- ✅ Handoff protocol compliance
- ✅ Standards compliance (per `STANDARDS.md`)
- ✅ Comprehensive documentation
- ✅ Code examples and patterns
- ✅ Quality checklists

**Last Verified**: 2025-01-20

---

## Agent Capabilities Matrix

### Planning & Orchestration

| Capability              | planner | requirements-analyst | fullstack | backend | frontend | test-manager | version-controller | security-review | api-contract | agent-quality |
| ----------------------- | ------- | -------------------- | --------- | ------- | -------- | ------------ | ------------------ | -------------- | ------------ | ------------- |
| Workflow Orchestration  | ✅      | ❌                   | ❌        | ❌      | ❌       | ❌           | ❌                 | ❌            |
| Issue Tracking          | ✅      | ❌                   | ❌        | ❌      | ❌       | ❌           | ❌                 | ❌            |
| Project Plan Management | ✅      | ❌                   | ❌        | ❌      | ❌       | ❌           | ❌                 | ❌            |
| Requirements Analysis   | ❌      | ✅                   | ❌        | ❌      | ❌       | ❌           | ❌                 | ❌              | ❌           | ❌            |
| Acceptance Criteria     | ❌      | ✅                   | ❌        | ❌      | ❌       | ❌           | ❌                 | ❌              | ❌           | ❌            |

### Development

| Capability                | planner | requirements-analyst | fullstack | backend | frontend | test-manager | version-controller | security-review | api-contract | agent-quality |
| ------------------------- | ------- | -------------------- | --------- | ------- | -------- | ------------ | ------------------ | -------------- | ------------ | ------------- |
| Full-Stack Implementation | ❌      | ❌                   | ✅        | ❌      | ❌       | ❌           | ❌                 | ❌            |
| Backend API Development   | ❌      | ❌                   | ✅        | ✅      | ❌       | ❌           | ❌                 | ❌            |
| Database Migrations       | ❌      | ❌                   | ✅        | ✅      | ❌       | ❌           | ❌                 | ❌            |
| Frontend Components       | ❌      | ❌                   | ✅        | ❌      | ✅       | ❌           | ❌                 | ❌            |
| State Management          | ❌      | ❌                   | ✅        | ❌      | ✅       | ❌           | ❌                 | ❌            |
| API Integration           | ❌      | ❌                   | ✅        | ❌      | ✅       | ❌           | ❌                 | ❌              | ❌           | ❌            |

### Quality Assurance

| Capability           | planner | requirements-analyst | fullstack | backend | frontend | test-manager | code-review | documentation | version-controller | security-review | api-contract | agent-quality |
| -------------------- | ------- | -------------------- | --------- | ------- | -------- | ------------ | ----------- | ------------- | ------------------ | -------------- | ------------ | ------------- |
| Test Generation      | ❌      | ❌                   | ❌        | ❌      | ❌       | ✅           | ❌           | ❌            | ❌                 | ❌            |
| Test Coverage        | ❌      | ❌                   | ❌        | ❌      | ❌       | ✅           | ❌           | ❌            | ❌                 | ❌            |
| Code Review          | ❌      | ❌                   | ❌        | ❌      | ❌       | ❌           | ✅           | ❌            | ❌                 | ❌            |
| Security Scanning    | ❌      | ❌                   | ❌        | ❌      | ❌       | ❌           | ✅           | ❌            | ✅                 | ✅             | ❌           | ❌            |
| Security Review      | ❌      | ❌                   | ❌        | ❌      | ❌       | ❌           | Partial      | ❌            | Partial            | ✅             | ❌           | ❌            |
| Contract Validation  | ❌      | ❌                   | ❌        | ❌      | ❌       | ❌           | ❌           | ❌            | ❌                 | ❌             | ✅           | ❌            |
| Documentation Management | ❌ | ❌                | Partial   | Partial | Partial  | ❌           | ❌           | ✅            | ❌                 | ❌             | ❌           | ❌            |
| Agent Quality Review | ❌      | ❌                   | ❌        | ❌      | ❌       | ❌           | ❌           | ❌            | ❌                 | ❌             | ❌           | ✅            |

### Operations

| Capability       | planner | requirements-analyst | fullstack | backend | frontend | test-manager | code-review | documentation | version-controller | security-review | api-contract | agent-quality |
| ---------------- | ------- | -------------------- | --------- | ------- | -------- | ------------ | ----------- | ------------- | ------------------ | -------------- | ------------ | ------------- |
| Git Operations   | ❌      | ❌                   | ❌        | ❌      | ❌       | ❌           | ❌           | ❌            | ✅                 | ❌            |
| PR Management    | ❌      | ❌                   | ❌        | ❌      | ❌       | ❌           | ❌           | ❌            | ✅                 | ❌            |
| Secret Detection | ❌      | ❌                   | ❌        | ❌      | ❌       | ❌           | ❌           | ❌            | ✅                 | ✅             | ❌           | ❌            |
| Documentation    | ❌      | ❌                   | Partial   | Partial | Partial  | ❌           | ❌           | ✅            | ❌                 | ❌             | ❌           | ❌            |

---

## Workflow Relationships

### Standard Workflow

**CRITICAL ARCHITECTURE**: All communication flows through the prompt-engineer. Agents NEVER handoff directly to each other.

```
User Request
    ↓
prompt-engineer (receives, clarifies if needed, improves prompt)
    ↓
prompt-engineer → planner (orchestrates workflow)
    ↓
prompt-engineer → requirements-analyst (analyzes requirements)
    ↓
requirements-analyst → prompt-engineer (handoff)
    ↓
prompt-engineer → system-architect (technical design)
    ↓
system-architect → prompt-engineer (handoff)
    ↓
prompt-engineer → fullstack/backend/frontend (implementation)
    ↓
[implementation agent] → prompt-engineer (handoff)
    ↓
prompt-engineer → api-contract (validates API contracts)
    ↓
api-contract → prompt-engineer (handoff)
    ↓
prompt-engineer → test-manager (generates tests)
    ↓
test-manager → prompt-engineer (handoff)
    ↓
prompt-engineer → code-review (reviews code)
    ↓
code-review → prompt-engineer (handoff)
    ↓
prompt-engineer → security-review (security review)
    ↓
security-review → prompt-engineer (handoff)
    ↓
prompt-engineer → documentation (updates docs)
    ↓
documentation → prompt-engineer (handoff)
    ↓
prompt-engineer → garbage-collection (removes temporary files)
    ↓
garbage-collection → prompt-engineer (handoff)
    ↓
prompt-engineer → version-controller (creates PR)
    ↓
version-controller → prompt-engineer (handoff)
    ↓
prompt-engineer → planner (marks complete)
```

### Agent Handoff Map

**CRITICAL**: All agents ALWAYS handoff to prompt-engineer. Prompt-engineer then routes to next agent(s).

```
USER
  └─→ prompt-engineer

prompt-engineer (CENTRAL HUB)
  ├─→ knowledge-specialist (queries for context when needed)
  ├─→ planner (routes user queries requiring workflow orchestration)
  ├─→ requirements-analyst (routes requirements analysis requests)
  ├─→ system-architect (routes architecture requests)
  ├─→ fullstack (routes full-stack implementation)
  ├─→ backend (routes backend implementation)
  ├─→ frontend (routes frontend implementation)
  ├─→ test-manager (routes testing requests)
  ├─→ code-review (routes code review requests)
  ├─→ security-review (routes security review requests)
  ├─→ documentation (routes documentation requests)
  ├─→ garbage-collection (routes cleanup requests after documentation)
  ├─→ version-controller (routes version control requests)
  ├─→ api-contract (routes API contract validation)
  ├─→ researcher (routes research requests)
  └─→ agent-quality (routes agent quality reviews)

ALL AGENTS
  └─→ prompt-engineer (ALWAYS handoff here, never directly to other agents)

knowledge-specialist
  └─→ prompt-engineer (returns context, can notify documentation about gaps)
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

**Inputs/Uses**:

- User requirements and feature requests
- Project plans and epics
- GitHub issues and project boards
- Workflow templates and patterns
- Agent handoffs and status updates

**Produces/Outputs**:

- Workflow orchestration plans
- GitHub issues and project board updates
- Project status reports
- Task assignments to agents
- Progress tracking documentation

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

**Inputs/Uses**:

- Clarified user requests (from prompt-engineer)
- Requirements document template (Standard Requirements Document Structure)
- User story format template (US-N.M format with ACs)
- Existing requirements documents for reference
- Codebase patterns and constraints (via knowledge-specialist)
- Project PRD and requirements catalogue

**Produces/Outputs**:

- Requirements documents following standard template structure
- User stories with acceptance criteria (US-N.M format)
- Functional and non-functional requirements (FR-XXX, NFR-XXX)
- Dependencies and constraints documentation
- Requirements traceability documentation

**When to Use**:

- Analyzing user requests
- Defining requirements
- Creating acceptance criteria
- Identifying dependencies

**File**: `.cursor/agents/requirements-analyst-agent.md`

---

### system-architect (System Architect)

**Purpose**: Design system architecture, API contracts, data models, and technical specifications from requirements

**Key Capabilities**:

- Technical design creation
- API contract design
- Data model design
- Architecture decision documentation (ADRs)
- Integration planning
- Pattern application
- Design validation

**Inputs/Uses**:

- Requirements documents (from requirements-analyst)
- Technical Design Document (TDD) template and structure
- ADR template for architecture decisions
- Existing architecture patterns and ADRs
- API contract templates and conventions
- Database schema patterns and migration templates
- Codebase patterns (via knowledge-specialist)

**Produces/Outputs**:

- Technical design documents following TDD structure
- API contract specifications (request/response schemas, endpoints, error codes)
- Database schema designs and migration specifications
- ADRs (Architectural Decision Records) for significant decisions
- Integration planning documentation
- Implementation guidance for backend/frontend agents

**When to Use**:

- After requirements analysis
- Before implementation
- Creating technical designs
- Designing API contracts
- Designing database schemas
- Making architectural decisions

**File**: `.cursor/agents/system-architect-agent.md`

---

### fullstack (Full-Stack Developer)

**Purpose**: Implement end-to-end features across backend and frontend

**Key Capabilities**:

- Full-stack implementation
- API design and development
- Frontend component development
- Database schema design
- Cross-layer testing

**Inputs/Uses**:

- Technical design documents
- Backend module templates (all 6 files)
- Frontend component templates
- Database migration templates
- API service patterns
- React Query patterns

**Produces/Outputs**:

- Complete backend module implementations
- Frontend components and pages
- Database migrations
- API services
- Cross-layer integration
- End-to-end feature implementation

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

**Inputs/Uses**:

- Technical design documents (from system-architect)
- API contract specifications
- Backend module structure template (routes, controller, service, repository, types, schemas)
- Database migration template (YYYYMMDDHHMM_description.ts)
- Codebase patterns (Controller → Service → Repository)
- Zod schema templates for validation
- Knex.js query patterns

**Produces/Outputs**:

- Backend module implementations (all 6 files per module)
- Database migrations with up/down functions
- REST API endpoints with proper routing
- Zod validation schemas
- TypeScript type definitions
- Unit and integration tests
- Updated TDD documentation (if technical approach changed)

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

**Inputs/Uses**:

- Technical design documents and API contracts
- React component patterns and templates
- API service patterns (axios with auth interceptor)
- React Query patterns (useQuery, useMutation)
- i18n translation templates and patterns
- UI component library patterns
- Accessibility guidelines (WCAG 2.1 AA)

**Produces/Outputs**:

- React components (TSX files)
- API service functions
- Custom hooks (React Query integration)
- Page components with route integration
- i18n translation keys
- Component tests
- Updated frontend documentation

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

**Inputs/Uses**:

- Source code files to test
- Requirements documents with acceptance criteria
- Test framework templates (Jest, Vitest patterns)
- Test coverage requirements (≥80% repo-wide, ≥90% critical paths)
- Deterministic testing patterns (FakeClock, seeded PRNG, deterministic UUIDs)
- Existing test patterns in codebase

**Produces/Outputs**:

- Unit test files (__tests__ directories)
- Integration test files
- E2E test files (Playwright)
- Test coverage reports
- Test execution results
- Test quality metrics

**When to Use**:

- After implementation
- Need test coverage
- Quality assurance
- Test pattern implementation

**File**: `.cursor/agents/test_manager.md`

---

### code-review (Code Review Agent)

**Purpose**: Review code changes for quality, standards compliance, and best practices

**Key Capabilities**:

- Code quality review
- Standards compliance checking
- Security review
- Performance analysis
- Architecture validation
- Type safety review
- Test quality review
- Refactoring suggestions

**Inputs/Uses**:

- Source code files to review
- Code quality standards and checklists
- ESLint and Prettier configurations
- TypeScript strict mode requirements
- Architecture patterns (Controller → Service → Repository)
- Coding standards from project rules

**Produces/Outputs**:

- Code review reports
- Quality assessment and scores
- Refactoring suggestions
- Standards compliance findings
- Security issue identification
- Performance recommendations

**When to Use**:

- After implementation
- Before merging
- Code quality assurance
- Standards compliance verification

**File**: `.cursor/agents/code-review-agent.md`

---

### documentation (Documentation Agent)

**Purpose**: Maintain and update project documentation

**Key Capabilities**:

- PRD updates
- TDD updates
- ADR creation and updates
- API documentation
- Requirements tracking
- RTM updates
- Documentation consistency

**Inputs/Uses**:

- Completed feature implementations
- Requirements documents
- Technical design documents
- PRD template and structure
- TDD template and structure
- ADR template
- RTM (Requirements Traceability Matrix) template

**Produces/Outputs**:

- Updated PRD sections
- Updated TDD sections
- New/updated ADRs
- API documentation
- Updated Requirements Catalogue
- Updated RTM entries
- Knowledge base updates

**When to Use**:

- After feature completion
- When documentation needs updating
- Architecture decisions made
- API changes

**File**: `.cursor/agents/documentation-agent.md`

---

### garbage-collection (Garbage Collection Agent)

**Purpose**: Remove temporary documentation files created by agents after their purpose is fulfilled

**Key Capabilities**:

- Temporary file identification
- Pattern-based file discovery
- Safety validation
- File removal with logging
- Cleanup reporting
- Backup file cleanup

**Inputs/Uses**:

- File patterns for temporary files (e.g., `.tmp`, `.cache`, `*.bak`)
- Safety exclusion patterns (protected files)
- Repository structure knowledge
- Cleanup request from prompt-engineer

**Produces/Outputs**:

- Cleanup reports (files removed)
- Repository cleanup logs
- Confirmation of cleanup completion

**When to Use**:

- After documentation agent updates knowledge database
- When temporary files accumulate
- Repository cleanup needed
- After bug fixes or migrations complete

**File**: `.cursor/agents/garbage-collection-agent.md`

---

### version-controller (Version Controller)

**Purpose**: Manage git operations, security scanning, and PR workflows

**Key Capabilities**:

- Git operations
- Security scanning
- Secret detection
- PR management
- Dependency auditing

**Inputs/Uses**:

- Code changes to commit
- Conventional commit format template
- Branch naming conventions
- PR template
- Security scanning tools (git-secrets, etc.)
- Dependency audit tools

**Produces/Outputs**:

- Git commits (following conventional commit format)
- Branches created
- Pull requests with PR template filled
- Security scan reports
- Secret detection reports
- Dependency audit reports

**When to Use**:

- Creating commits
- Managing branches
- Security scanning
- Creating PRs
- Secret detection

**File**: `.cursor/agents/version_controller.md`

---

### security-review (Security Review Agent)

**Purpose**: Perform comprehensive security review of code, dependencies, and configurations

**Key Capabilities**:

- Security code review (OWASP Top 10)
- Dependency vulnerability scanning
- Secret detection and prevention
- Security configuration review
- GDPR compliance verification
- Security testing guidance

**Inputs/Uses**:

- Source code files to review
- OWASP Top 10 checklist
- Security scanning tools
- Dependency vulnerability databases
- GDPR compliance checklists
- Security configuration templates

**Produces/Outputs**:

- Security review reports
- Vulnerability assessments
- Security recommendations
- GDPR compliance reports
- Security testing guidance

**When to Use**:

- After code review
- Before merging security-sensitive changes
- Comprehensive security assessment
- Compliance verification

**File**: `.cursor/agents/security-review-agent.md`

---

### api-contract (API Contract Agent)

**Purpose**: Ensure API contract consistency between backend and frontend

**Key Capabilities**:

- Contract validation (Zod ↔ TypeScript)
- Type safety verification
- Contract drift detection
- API documentation generation
- Backward compatibility checking

**Inputs/Uses**:

- Backend Zod schemas
- Frontend TypeScript types
- API contract specifications
- Existing API contracts for comparison

**Produces/Outputs**:

- Contract validation reports
- Type consistency verification
- Contract drift detection reports
- API documentation updates
- Backward compatibility assessments

**When to Use**:

- After backend/frontend implementation
- Before code review
- API contract validation
- Type safety verification

**File**: `.cursor/agents/api-contract-agent.md`

---

### agent-quality (Agent Quality Agent)

**Purpose**: Review, validate, and improve agent configurations

**Key Capabilities**:

- Agent configuration review
- Standards compliance checking
- Handoff protocol validation
- Improvement suggestions
- Quality scoring

**Inputs/Uses**:

- Agent configuration files
- Agent standards and templates
- Handoff protocol specifications
- Quality scoring criteria

**Produces/Outputs**:

- Agent quality review reports
- Standards compliance assessments
- Quality scores
- Improvement suggestions
- Configuration recommendations

**When to Use**:

- Reviewing agent configurations
- Ensuring consistency
- Validating standards compliance
- Improving agent quality

**File**: `.cursor/agents/agent-quality-agent.md`

---

### knowledge-specialist (Knowledge Specialist)

**Purpose**: Query RAG knowledge base to provide relevant, filtered context to other agents based on their specific needs

**Key Capabilities**:

- RAG knowledge base querying
- Agent-specific context filtering
- Relevance assessment
- Knowledge gap identification
- Context compilation

**Inputs/Uses**:

- Context requests from prompt-engineer or other agents
- Semantic search queries
- ChromaDB/vector database for code chunks
- Codebase search tools (codebase_search, grep, read_file)
- Project documentation and code patterns

**Produces/Outputs**:

- Chunked, focused context responses
- Relevant code examples with source locations
- Pattern documentation with file references
- Context chunks organized by topic/pattern
- Knowledge gap notifications (if documentation missing)

**When to Use**:

- Agents need context from knowledge base
- Need filtered information based on agent type
- Identify knowledge gaps in RAG
- Provide domain-specific information

**File**: `.cursor/agents/knowledge-specialist-agent.md`

---

### researcher (Researcher Agent)

**Purpose**: Research technical information, best practices, and solutions to enrich the knowledge base

**Key Capabilities**:

- External knowledge research
- Information evaluation and synthesis
- Best practices research
- Solution analysis
- Knowledge base enrichment preparation

**Inputs/Uses**:

- Research requests from prompt-engineer
- Web search tools for external information
- Technical documentation sources
- Best practices databases
- Solution analysis frameworks

**Produces/Outputs**:

- Research reports and findings
- Best practices documentation
- Solution recommendations
- Knowledge base enrichment materials
- Synthesized technical information

**When to Use**:

- Need external research for technical solutions
- Researching best practices
- Finding solutions to technical problems
- Enriching knowledge base with new information

**File**: `.cursor/agents/researcher-agent.md`

---

### prompt-engineer (Prompt Engineer)

**Purpose**: Central communication hub that receives all user queries and agent handoffs, clarifies requirements, improves prompts, integrates context, and routes requests to appropriate agents

**Key Capabilities**:

- User query reception and clarification
- Prompt translation and improvement
- Context integration from knowledge-specialist
- Agent routing and coordination
- Handoff processing and improvement
- Communication coordination

**Inputs/Uses**:

- User queries (natural language, potentially ambiguous)
- Agent handoffs (from all agents)
- Prompt clarity assessment methodology (≥80% threshold)
- Prompt format templates and best practices
- Context from knowledge-specialist when needed
- Agent registry and capabilities matrix for routing decisions
- Clarification questions templates

**Produces/Outputs**:

- Clarified and improved prompts (≥80% clarity score)
- Refined user requirements with explicit hypotheses verified
- Context-integrated prompts for target agents
- Routing decisions to appropriate agent(s)
- Quality-assured prompts with all necessary information
- User clarification questions when needed

**When to Use**:

- **CRITICAL**: All user queries go through prompt-engineer first
- **CRITICAL**: All agent handoffs go through prompt-engineer (agents ALWAYS handoff here)
- Need prompt clarification or improvement
- Need context integrated into prompts
- Need optimal routing to agents

**File**: `.cursor/agents/prompt-engineer-agent.md`

**Architecture Note**: The prompt-engineer is the central communication hub. All agents handoff to prompt-engineer, who then improves prompts and routes to next agent(s). Agents NEVER handoff directly to each other.

---

## Implementation Status Summary

**Overall Status**: ✅ **All Agents Fully Implemented** (100% Complete)

All 16 agents are fully implemented with:
- ✅ Complete configuration files with all required sections
- ✅ Handoff protocol compliance (using `HANDOFF_PROTOCOL.md`)
- ✅ Standards compliance (per `STANDARDS.md`)
- ✅ Comprehensive documentation and examples
- ✅ Quality checklists and validation procedures
- ✅ Consistent model tier specifications

**Verification Date**: 2025-01-21
**Last Updated**: 2025-01-21 (Added garbage-collection-agent)

### Implementation Checklist

| Agent | Config File | Sections | Handoff | Standards | Examples | Status |
|-------|-------------|----------|---------|-----------|----------|--------|
| planner | ✅ | ✅ 16/16 | ✅ | ✅ | ✅ | ✅ Complete |
| requirements-analyst | ✅ | ✅ 16/16 | ✅ | ✅ | ✅ | ✅ Complete |
| system-architect | ✅ | ✅ 16/16 | ✅ | ✅ | ✅ | ✅ Complete |
| fullstack | ✅ | ✅ 16/16 | ✅ | ✅ | ✅ | ✅ Complete |
| backend | ✅ | ✅ 16/16 | ✅ | ✅ | ✅ | ✅ Complete |
| frontend | ✅ | ✅ 16/16 | ✅ | ✅ | ✅ | ✅ Complete |
| test-manager | ✅ | ✅ 16/16 | ✅ | ✅ | ✅ | ✅ Complete |
| code-review | ✅ | ✅ 16/16 | ✅ | ✅ | ✅ | ✅ Complete |
| documentation | ✅ | ✅ 16/16 | ✅ | ✅ | ✅ | ✅ Complete |
| garbage-collection | ✅ | ✅ 16/16 | ✅ | ✅ | ✅ | ✅ Complete |
| version-controller | ✅ | ✅ 16/16 | ✅ | ✅ | ✅ | ✅ Complete |
| security-review | ✅ | ✅ 16/16 | ✅ | ✅ | ✅ | ✅ Complete |
| api-contract | ✅ | ✅ 16/16 | ✅ | ✅ | ✅ | ✅ Complete |
| agent-quality | ✅ | ✅ 16/16 | ✅ | ✅ | ✅ | ✅ Complete |
| knowledge-specialist | ✅ | ✅ 16/16 | ✅ | ✅ | ✅ | ✅ Complete |
| researcher | ✅ | ✅ 16/16 | ✅ | ✅ | ✅ | ✅ Complete |
| prompt-engineer | ✅ | ✅ 16/16 | ✅ | ✅ | ✅ | ✅ Complete |

**Known Limitations**: None
**Outstanding Issues**: None

---

## Agent Status Tracking

| Agent                | Current Work | Status | Last Updated |
| -------------------- | ------------ | ------ | ------------ |
| planner              | -            | Idle   | -            |
| requirements-analyst | -            | Idle   | -            |
| system-architect     | -            | Idle   | -            |
| fullstack            | -            | Idle   | -            |
| backend              | -            | Idle   | -            |
| frontend             | -            | Idle   | -            |
| test-manager         | -            | Idle   | -            |
| code-review          | -            | Idle   | -            |
| documentation        | -            | Idle   | -            |
| garbage-collection   | -            | Idle   | -            |
| version-controller   | -            | Idle   | -            |
| security-review      | -            | Idle   | -            |
| api-contract         | -            | Idle   | -            |
| agent-quality        | -            | Idle   | -            |
| knowledge-specialist | -            | Idle   | -            |
| researcher           | -            | Idle   | -            |
| prompt-engineer      | -            | Idle   | -            |

_Status tracking updated by planner-agent_

---

## Agent Selection Guide

### When to Use Which Agent

**Starting New Feature**:

1. Start with `planner` to create issue and track
2. Use `requirements-analyst` to analyze requirements
3. Use `system-architect` to create technical design (API contracts, data models)
4. Use `fullstack` for complete feature, or `backend` + `frontend` separately
4. Use `api-contract` to validate API contracts
5. Use `test-manager` for tests
6. Use `code-review` to review code quality
7. Use `security-review` for comprehensive security review
8. Use `documentation` to update docs
9. Use `version-controller` for PR

**Backend-Only Work**:

- Use `backend` agent
- Hand off to `api-contract` for contract validation
- Hand off to `code-review` for review
- Hand off to `test-manager` for tests
- Hand off to `security-review` for security review

**Frontend-Only Work**:

- Use `frontend` agent
- Hand off to `api-contract` for contract validation
- Hand off to `code-review` for review
- Hand off to `test-manager` for tests

**Requirements Analysis**:

- Use `requirements-analyst` agent
- Always use before implementation

**Code Review**:

- Use `code-review` agent after implementation
- Ensures quality and standards compliance

**Documentation Updates**:

- Use `documentation` agent after feature completion
- Updates PRD, TDD, ADRs, and requirements tracking
- Use `garbage-collection` agent after documentation agent completes
- Removes temporary files created during workflow

**Knowledge and Research**:

- Use `knowledge-specialist` when agents need context from knowledge base
- Use `researcher` when external research is needed for solutions or best practices
- Knowledge specialist filters context by agent type and identifies gaps
- Researcher enriches knowledge base with external findings

**Quality Review**:

- Use `agent-quality` to review agent configurations
- Use `code-review` for code quality
- Use `test-manager` for test quality
- Use `security-review` for comprehensive security review
- Use `api-contract` for contract validation
- Use `version-controller` for basic security scanning

---

## Maintenance

**Updated By**: planner-agent, agent-quality-agent
**Update Frequency**: When agents are added, modified, or removed
**Last Review**: 2025-01-20
**Implementation Status**: All agents complete (100%)

---

**Registry Version**: 1.1
**Next Review**: 2025-04-20
