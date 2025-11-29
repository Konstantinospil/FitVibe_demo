# Standard Handoff Protocol

**Version**: 1.0  
**Date**: 2025-11-29  
**Status**: Active  
**Applies To**: All Cursor Agents

---

## Overview

This document defines the standard handoff protocol that all Cursor agents must use when transferring work between agents. This ensures consistency, clarity, and reliability in agent-to-agent communication.

---

## Standard Handoff Interface

All agents must use this TypeScript-like interface for handoffs:

```typescript
interface StandardHandoff {
  // ============================================
  // METADATA (Required)
  // ============================================

  /** Agent ID sending the handoff */
  from_agent: string;

  /** Agent ID receiving the handoff */
  to_agent: string;

  /** Original request ID (e.g., PLAN-2025-11-29-001) */
  request_id: string;

  /** Unique handoff identifier (e.g., HANDOFF-2025-11-29-001) */
  handoff_id: string;

  /** ISO 8601 timestamp of handoff */
  timestamp: string;

  // ============================================
  // WORK CONTEXT (Required)
  // ============================================

  /** Type of handoff */
  handoff_type: "standard" | "escalation" | "collaboration" | "error_recovery";

  /** Current status of work */
  status: "pending" | "in_progress" | "complete" | "blocked" | "failed";

  /** Priority level */
  priority: "high" | "medium" | "low";

  // ============================================
  // WORK DETAILS (Required)
  // ============================================

  /** Brief summary of work completed */
  summary: string;

  /** List of deliverables (files, documents, etc.) */
  deliverables: string[];

  /** Acceptance criteria that must be met */
  acceptance_criteria: string[];

  // ============================================
  // QUALITY METRICS (Optional but Recommended)
  // ============================================

  /** Quality metrics (coverage, test results, etc.) */
  quality_metrics?: {
    [key: string]: string | number;
  };

  // ============================================
  // CONTEXT (Optional but Recommended)
  // ============================================

  /** Additional context for receiving agent */
  context?: {
    /** Related epic (e.g., "E1") */
    epic?: string;

    /** Related requirement (e.g., "FR-009") */
    requirement?: string;

    /** Related issue IDs */
    related_issues?: string[];

    /** Dependencies (other work items) */
    dependencies?: string[];

    /** Additional context data */
    [key: string]: unknown;
  };

  // ============================================
  // NEXT STEPS (Required)
  // ============================================

  /** What the receiving agent should do */
  next_steps: string;

  /** Special notes or considerations */
  special_notes?: string[];

  /** Blocking issues (if any) */
  blocking_issues?: string[];

  // ============================================
  // ERROR HANDLING (Optional)
  // ============================================

  /** Number of retry attempts (if applicable) */
  retry_count?: number;

  /** Error details (if handoff failed) */
  error_details?: string;
}
```

---

## Handoff Types

### Standard Handoff

Normal workflow handoff from one agent to the next in the standard sequence.

**Example**: Requirements Analyst → Full-Stack Agent

```json
{
  "from_agent": "requirements-analyst-agent",
  "to_agent": "fullstack-agent",
  "handoff_type": "standard",
  "status": "complete",
  ...
}
```

### Escalation Handoff

When an agent needs to escalate an issue or request help.

**Example**: Agent encounters blocking issue → Planner Agent

```json
{
  "from_agent": "backend-agent",
  "to_agent": "planner-agent",
  "handoff_type": "escalation",
  "status": "blocked",
  "blocking_issues": ["Database migration conflict"],
  ...
}
```

### Collaboration Handoff

When multiple agents need to work together on the same task.

**Example**: Full-Stack Agent needs both Backend and Frontend agents

```json
{
  "from_agent": "fullstack-agent",
  "to_agent": "backend-agent",
  "handoff_type": "collaboration",
  "status": "in_progress",
  "special_notes": ["Also coordinating with senior-frontend-developer"],
  ...
}
```

### Error Recovery Handoff

When retrying work after a failure or error.

**Example**: Retry after initial failure

```json
{
  "from_agent": "planner-agent",
  "to_agent": "fullstack-agent",
  "handoff_type": "error_recovery",
  "status": "pending",
  "retry_count": 1,
  "error_details": "Previous attempt failed due to missing dependency",
  ...
}
```

---

## Status Values

### pending

Work is ready to be picked up by receiving agent but not yet started.

**Use When**: Handing off work that should start immediately.

### in_progress

Work has been started by receiving agent.

**Use When**: Receiving agent has begun work but not completed.

### complete

Work has been completed successfully.

**Use When**: All acceptance criteria met, ready for next step.

### blocked

Work cannot proceed due to blocking issue.

**Use When**: Dependency missing, error encountered, or clarification needed.

### failed

Work failed and cannot be completed as-is.

**Use When**: Error occurred that prevents completion, retry needed.

---

## Priority Levels

### high

Critical work that should be prioritized.

**Use When**:

- Blocking other work
- Security issue
- Production bug
- Deadline approaching

### medium

Normal priority work.

**Use When**: Standard feature work, normal development tasks.

### low

Low priority work that can be deferred.

**Use When**: Nice-to-have features, technical debt, optimizations.

---

## Example Handoffs

### Example 1: Requirements → Implementation

```json
{
  "from_agent": "requirements-analyst-agent",
  "to_agent": "fullstack-agent",
  "request_id": "PLAN-2025-11-29-001",
  "handoff_id": "HANDOFF-2025-11-29-001",
  "timestamp": "2025-11-29T10:30:00Z",
  "handoff_type": "standard",
  "status": "complete",
  "priority": "high",
  "summary": "Requirements analysis complete for user profile editing feature. All acceptance criteria defined, dependencies identified, ready for implementation.",
  "deliverables": [
    "docs/requirements/REQ-2025-11-29-001.md",
    "docs/requirements/acceptance-criteria.md"
  ],
  "acceptance_criteria": [
    "PUT /api/v1/users/:id/profile endpoint created",
    "Input validation with Zod schemas",
    "User can only update own profile",
    "Tests written and passing"
  ],
  "quality_metrics": {
    "requirements_completeness": "100%",
    "acceptance_criteria_count": 4,
    "dependencies_identified": 2
  },
  "context": {
    "epic": "E1",
    "requirement": "FR-009",
    "related_issues": ["ISSUE-001"],
    "dependencies": ["FR-001", "FR-002"]
  },
  "next_steps": "Implement backend API endpoint, frontend form, and database migration. Follow Controller → Service → Repository pattern.",
  "special_notes": [
    "Profile fields are immutable: date_of_birth, gender",
    "Avatar upload will be separate task",
    "Must validate weight range (0-500 kg)"
  ]
}
```

### Example 2: Implementation → Testing

```json
{
  "from_agent": "fullstack-agent",
  "to_agent": "test-manager",
  "request_id": "PLAN-2025-11-29-001",
  "handoff_id": "HANDOFF-2025-11-29-002",
  "timestamp": "2025-11-29T14:00:00Z",
  "handoff_type": "standard",
  "status": "complete",
  "priority": "high",
  "summary": "Implementation complete for user profile editing. Backend API, frontend form, and database migration created. All code passes linting and type checking.",
  "deliverables": [
    "apps/backend/src/modules/users/user-profile.controller.ts",
    "apps/backend/src/modules/users/user-profile.service.ts",
    "apps/backend/src/modules/users/user-profile.repository.ts",
    "apps/backend/src/modules/users/user-profile.schemas.ts",
    "apps/backend/src/db/migrations/202511291200_create_user_profiles.ts",
    "apps/frontend/src/components/ProfileEditForm.tsx",
    "apps/frontend/src/pages/ProfilePage.tsx"
  ],
  "acceptance_criteria": [
    "PUT /api/v1/users/:id/profile endpoint created",
    "Input validation with Zod schemas",
    "User can only update own profile",
    "Tests written and passing"
  ],
  "quality_metrics": {
    "typescript_coverage": "100%",
    "eslint_errors": 0,
    "test_coverage": "0%",
    "lines_of_code": 450
  },
  "context": {
    "epic": "E1",
    "requirement": "FR-009",
    "related_issues": ["ISSUE-001"]
  },
  "next_steps": "Generate comprehensive test suite covering happy paths, edge cases, and error conditions. Target 80% coverage minimum, 90% for critical paths.",
  "special_notes": [
    "Backend uses asyncHandler wrapper",
    "Frontend uses React Query for API calls",
    "i18n tokens added for all user-facing text"
  ]
}
```

### Example 3: Escalation

```json
{
  "from_agent": "backend-agent",
  "to_agent": "planner-agent",
  "request_id": "PLAN-2025-11-29-002",
  "handoff_id": "HANDOFF-2025-11-29-003",
  "timestamp": "2025-11-29T15:30:00Z",
  "handoff_type": "escalation",
  "status": "blocked",
  "priority": "high",
  "summary": "Blocked on database migration. Migration conflicts with existing schema changes from another feature branch.",
  "deliverables": [],
  "acceptance_criteria": [],
  "context": {
    "epic": "E1",
    "requirement": "FR-009",
    "related_issues": ["ISSUE-002"]
  },
  "next_steps": "Resolve migration conflict. May need to coordinate with team working on related feature.",
  "blocking_issues": [
    "Migration 202511281200_add_exercise_types conflicts with new migration",
    "Need to rebase or merge strategy",
    "Database schema state unclear"
  ],
  "special_notes": [
    "Both migrations modify same table",
    "Need to coordinate with team member",
    "May require schema redesign"
  ]
}
```

---

## Validation Rules

### Required Fields

All handoffs must include:

- `from_agent`
- `to_agent`
- `request_id`
- `handoff_id`
- `timestamp`
- `handoff_type`
- `status`
- `priority`
- `summary`
- `deliverables`
- `acceptance_criteria`
- `next_steps`

### Field Validation

- **from_agent / to_agent**: Must be valid agent IDs from registry
- **request_id**: Must match pattern `[PREFIX]-YYYY-MM-DD-NNN`
- **handoff_id**: Must match pattern `HANDOFF-YYYY-MM-DD-NNN`
- **timestamp**: Must be valid ISO 8601 format
- **handoff_type**: Must be one of the defined types
- **status**: Must be one of the defined statuses
- **priority**: Must be one of the defined priorities
- **deliverables**: Must be array of strings (file paths, document names, etc.)
- **acceptance_criteria**: Must be array of strings

### Quality Checks

Before sending handoff, verify:

- [ ] All required fields present
- [ ] Field types correct
- [ ] Agent IDs valid
- [ ] Timestamp current
- [ ] Summary clear and concise
- [ ] Deliverables list complete
- [ ] Acceptance criteria specific and testable
- [ ] Next steps actionable

---

## Best Practices

### Writing Summaries

- **Be concise**: 1-2 sentences describing work completed
- **Be specific**: Mention key accomplishments
- **Be clear**: Use plain language

**Good**:

```json
"summary": "Requirements analysis complete for user profile editing feature. All acceptance criteria defined, dependencies identified, ready for implementation."
```

**Bad**:

```json
"summary": "Done."
```

### Listing Deliverables

- **Be specific**: Include full file paths
- **Be complete**: List all created/modified files
- **Be organized**: Group by type if many files

**Good**:

```json
"deliverables": [
  "apps/backend/src/modules/users/user-profile.controller.ts",
  "apps/backend/src/modules/users/user-profile.service.ts",
  "apps/frontend/src/components/ProfileEditForm.tsx"
]
```

**Bad**:

```json
"deliverables": ["some files"]
```

### Defining Acceptance Criteria

- **Be specific**: Clear, testable conditions
- **Be measurable**: Can verify completion
- **Be complete**: Cover all requirements

**Good**:

```json
"acceptance_criteria": [
  "PUT /api/v1/users/:id/profile endpoint returns 200 with updated profile",
  "Input validation rejects invalid email format with 400 error",
  "User cannot update another user's profile (403 error)",
  "All tests pass with ≥80% coverage"
]
```

**Bad**:

```json
"acceptance_criteria": ["It works"]
```

### Writing Next Steps

- **Be actionable**: Clear instructions
- **Be specific**: Mention tools, patterns, standards
- **Be complete**: Cover all aspects

**Good**:

```json
"next_steps": "Implement backend API endpoint following Controller → Service → Repository pattern. Use Zod for validation, HttpError for errors. Create frontend form with React Query integration."
```

**Bad**:

```json
"next_steps": "Do the thing"
```

---

## Migration Guide

### For Existing Agents

To migrate existing agents to use standard handoff protocol:

1. **Review Current Handoffs**: Identify all handoff examples in agent file
2. **Map to Standard Format**: Convert existing format to StandardHandoff interface
3. **Update Examples**: Replace old examples with new standard format
4. **Validate**: Ensure all required fields present
5. **Test**: Verify handoff format works correctly

### Common Migrations

**Old Format**:

```json
{
  "from": "agent-id",
  "to": "next-agent-id",
  "message": "Work done"
}
```

**New Format**:

```json
{
  "from_agent": "agent-id",
  "to_agent": "next-agent-id",
  "request_id": "PLAN-2025-11-29-001",
  "handoff_id": "HANDOFF-2025-11-29-001",
  "timestamp": "2025-11-29T10:00:00Z",
  "handoff_type": "standard",
  "status": "complete",
  "priority": "medium",
  "summary": "Work done",
  "deliverables": [],
  "acceptance_criteria": [],
  "next_steps": "Continue with next phase"
}
```

---

## Version History

- **v1.0** (2025-11-29): Initial standard handoff protocol
  - Defined StandardHandoff interface
  - Documented handoff types
  - Provided examples and best practices
  - Created validation rules

---

## References

- **Agent Registry**: `.cursor/agents/REGISTRY.md`
- **Agent Standards**: `.cursor/agents/STANDARDS.md`
- **Implementation Principles**: `docs/6.Implementation/implementation_principles.md`

---

**Last Updated**: 2025-11-29  
**Maintained By**: agent-quality-agent
