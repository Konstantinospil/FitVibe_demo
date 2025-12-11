# Agent Current State File Specification

**Date**: 2025-12-08
**Version**: 1.0
**Status**: Active
**Applies To**: All Cursor Agents

---

## Overview

Each agent maintains a `current_state.md` file that documents its current approach, tasks, and progress. This file serves as a checkpoint for resuming work after interruptions, context switching, or agent restarts. After task completion, the file is cleared (emptied) but not deleted.

---

## File Location and Naming

### Location
- **Path**: `.cursor/agents/current_state/{agent-id}-current_state.md`
- **Example**: `.cursor/agents/current_state/backend-agent-current_state.md`
- **Example**: `.cursor/agents/current_state/agent-quality-agent-current_state.md`

### Directory Structure
```
.cursor/agents/
├── *.md                    # Agent configuration files
├── current_state/          # NEW: State files directory
│   ├── backend-agent-current_state.md
│   ├── frontend-agent-current_state.md
│   ├── planner-agent-current_state.md
│   └── ...
├── examples/
├── STANDARDS.md
└── ...
```

---

## File Lifecycle

### 1. **Creation**
- Created when agent starts working on a task
- Created in `.cursor/agents/current_state/` directory
- Named: `{agent-id}-current_state.md`

### 2. **Updates**
- Updated continuously as agent progresses
- Updated at key checkpoints/milestones
- Includes timestamp of last update

### 3. **Completion/Erase**
- When task completes successfully: **ERASE file content** (not delete)
- File remains but is empty (or contains completion marker)
- This allows agent to resume if task is reopened

### 4. **Resume**
- If work is interrupted, agent reads `current_state.md` to resume
- Agent continues from last documented checkpoint

---

## File Structure

### Required Sections

```markdown
# Current State: {Agent Name}

**Agent ID**: {agent-id}
**Request ID**: {request-id}
**Status**: in_progress | paused | completed | blocked
**Last Updated**: {ISO 8601 timestamp}
**Started At**: {ISO 8601 timestamp}

---

## Current Task

**Task Description**: [Brief description of current task]

**Task Type**: [task_type from input]

**Priority**: high | medium | low

---

## Approach & Strategy

[Document the agent's approach to this task, including:]
- Overall strategy
- Key decisions made
- Approach rationale
- Alternatives considered

---

## Progress Status

### Current Phase

**Phase Name**: [Current workflow phase]
**Phase Started**: {ISO 8601 timestamp}
**Estimated Completion**: {ISO 8601 timestamp or duration}

### Completed Steps

1. ✅ [Completed step 1]
2. ✅ [Completed step 2]
3. ✅ [Completed step 3]

### In Progress

- 🔄 [Current step being worked on]
  - Details of what's being done
  - Any blockers or issues

### Remaining Steps

1. ⏭️ [Next step to do]
2. ⏭️ [Following step]
3. ⏭️ [Final step]

---

## Context & State

### Key Context

- Related files/documents
- Important decisions
- Dependencies
- Constraints

### Intermediate Results

- Files created/modified
- Data collected
- Findings discovered
- Decisions made

### Blockers & Issues

- Current blockers (if any)
- Issues encountered
- Resolutions attempted

---

## Files & Artifacts

### Created Files

- `path/to/file1.ts` - [Description]
- `path/to/file2.md` - [Description]

### Modified Files

- `path/to/file3.ts` - [Changes made]

### Pending Files

- `path/to/file4.ts` - [To be created/modified]

---

## Notes & Observations

[Any additional notes, observations, or important information for resuming work]

---

## Resume Instructions

[When resuming, agent should:]
1. Read this file completely
2. Review completed steps
3. Continue from "In Progress" section
4. Update this file as work progresses

---

**File Status**: Active | Completed | Cleared
```

---

## Status Values

### File Status

- **Active**: Currently in use, task in progress
- **Completed**: Task finished, file can be cleared
- **Cleared**: File emptied, ready for next task

### Task Status

- **in_progress**: Actively working on task
- **paused**: Temporarily paused (context switch, waiting)
- **completed**: Task completed successfully
- **blocked**: Blocked by dependency or issue
- **failed**: Task failed (with error details)

---

## Implementation Guidelines

### 1. When to Create/Update

**Create** when:
- Agent starts a new task
- Agent receives a new request

**Update** when:
- Starting a new phase
- Completing a significant step
- Encountering blockers
- Making important decisions
- Reaching checkpoints

**Erase** when:
- Task completes successfully
- All deliverables are done
- Ready for next task

### 2. Update Frequency

- **Minimum**: Once per phase
- **Recommended**: After each significant step
- **Required**: Before any interruption or pause

### 3. Content Guidelines

- **Be specific**: Include file paths, function names, specific details
- **Be current**: Reflect actual current state
- **Be actionable**: Include enough detail to resume
- **Be concise**: Focus on essential information

### 4. Completion Process

When task completes:

```markdown
# Current State: {Agent Name}

**Agent ID**: {agent-id}
**Request ID**: {request-id}
**Status**: completed
**Last Updated**: {ISO 8601 timestamp}
**Completed At**: {ISO 8601 timestamp}

---

## Task Completed

This task has been completed successfully. State file cleared and ready for next task.

**Completion Summary**:
- All deliverables completed
- All acceptance criteria met
- All files created/modified
- All documentation updated

---

**File Status**: Cleared
```

Then **erase the detailed content**, keeping only completion marker.

---

## Example: Active State File

```markdown
# Current State: Backend Agent

**Agent ID**: backend-agent
**Request ID**: BE-2025-01-21-001
**Status**: in_progress
**Last Updated**: 2025-01-21T14:30:00Z
**Started At**: 2025-01-21T14:00:00Z

---

## Current Task

**Task Description**: Create PUT endpoint to update user profile

**Task Type**: endpoint

**Priority**: high

---

## Approach & Strategy

- Implementing Controller → Service → Repository pattern
- Using Zod for input validation
- Adding authentication middleware
- Implementing idempotency support
- Following existing module structure in `users` module

---

## Progress Status

### Current Phase

**Phase Name**: Backend Module Implementation
**Phase Started**: 2025-01-21T14:15:00Z
**Estimated Completion**: 2025-01-21T14:45:00Z

### Completed Steps

1. ✅ Analyzed requirements and API contract
2. ✅ Created TypeScript types (`users.types.ts`)
3. ✅ Created Zod schemas (`users.schemas.ts`)
4. ✅ Implemented repository layer (`users.repository.ts`)

### In Progress

- 🔄 Implementing service layer (`users.service.ts`)
  - Adding business logic validation
  - Checking authorization (user can only update own profile)
  - Handling edge cases

### Remaining Steps

1. ⏭️ Implement controller layer (`users.controller.ts`)
   - Add asyncHandler wrapper
   - Add idempotency support
   - Add error handling
2. ⏭️ Define routes (`users.routes.ts`)
3. ⏭️ Write tests
4. ⏭️ Update documentation

---

## Context & State

### Key Context

- Module: `apps/backend/src/modules/users/`
- Existing profile update logic in service needs refactoring
- Following pattern from `exercises` module
- Database table: `profiles` already exists

### Intermediate Results

- Types defined: `UpdateProfileDTO`, `ProfileResponse`
- Schema created: `UpdateProfileSchema`
- Repository function: `updateProfile(userId, data)`

### Blockers & Issues

- None currently

---

## Files & Artifacts

### Created Files

- `apps/backend/src/modules/users/users.types.ts` - Added UpdateProfileDTO
- `apps/backend/src/modules/users/users.schemas.ts` - Added UpdateProfileSchema
- `apps/backend/src/modules/users/users.repository.ts` - Added updateProfile function

### Modified Files

- None yet

### Pending Files

- `apps/backend/src/modules/users/users.service.ts` - Add updateProfile service method
- `apps/backend/src/modules/users/users.controller.ts` - Add PUT handler
- `apps/backend/src/modules/users/users.routes.ts` - Add route definition
- `apps/backend/src/modules/users/__tests__/users.service.test.ts` - Add tests

---

## Notes & Observations

- Following existing patterns from exercises module
- Need to check if profile update requires avatar upload separately
- Should verify GDPR compliance for profile updates

---

## Resume Instructions

When resuming:
1. Review completed repository implementation
2. Continue with service layer implementation
3. Focus on authorization checks
4. Update this file after service completion

---

**File Status**: Active
```

---

## Integration with Agent Workflows

### Phase 0: State Initialization

Add to all agent workflows:

```markdown
### Phase 0: State Initialization (1-2 minutes)

1. **Create/Update State File**
   - Create or update `.cursor/agents/current_state/{agent-id}-current_state.md`
   - Initialize with request ID, task description, status
   - Set current timestamp

2. **Document Initial Approach**
   - Document planned approach
   - List initial steps
   - Set status to "in_progress"
```

### During Work

```markdown
3. **Update State File at Checkpoints**
   - Update after each phase
   - Document completed steps
   - Update current phase
   - Note any blockers
```

### Completion

```markdown
4. **Finalize State File**
   - Set status to "completed"
   - Document completion summary
   - Clear file content (not delete)
   - Set file status to "Cleared"
```

---

## Validation Rules

### Agent Quality Agent Should Validate

1. ✅ State file exists when agent is working
2. ✅ State file is updated regularly (not stale)
3. ✅ State file contains required sections
4. ✅ Status values are valid
5. ✅ Timestamps are in ISO 8601 format
6. ✅ File is cleared after completion (not deleted)
7. ✅ File path follows naming convention

---

## Benefits

1. **Resume Capability**: Agents can resume work after interruption
2. **Context Preservation**: Important context not lost
3. **Progress Tracking**: Clear visibility into agent progress
4. **Debugging**: Easier to debug stuck/failed tasks
5. **Audit Trail**: Record of agent work and decisions
6. **Collaboration**: Other agents can understand state

---

## File Management

### Git Considerations

- State files should be in `.gitignore` (they're runtime files)
- Or tracked but frequently updated (may create noise)
- Recommendation: Add to `.cursorignore` or `.gitignore`

### Cleanup

- Cleared files remain (empty or with completion marker)
- Can be safely deleted if needed
- No automatic cleanup required

---

## Directory Setup

Create the directory structure:

```bash
mkdir -p .cursor/agents/current_state
```

Add to `.cursorignore` or `.gitignore`:

```
# Agent state files (runtime, frequently changing)
.cursor/agents/current_state/*.md
```

---

## Migration Plan

### Phase 1: Setup

1. ✅ Create specification (this document)
2. ⏭️ Create directory structure
3. ⏭️ Add to .gitignore/.cursorignore
4. ⏭️ Update STANDARDS.md

### Phase 2: Template Creation

1. ⏭️ Create template file
2. ⏭️ Add to examples directory
3. ⏭️ Document in agent standards

### Phase 3: Agent Updates

1. ⏭️ Update all agents with state file instructions
2. ⏭️ Add Phase 0 to workflows
3. ⏭️ Update agent-quality-agent validation

---

## References

- **Agent Standards**: `.cursor/agents/STANDARDS.md`
- **Date Awareness**: `.cursor/docs/AGENT_DATE_AWARENESS_SPECIFICATION.md`
- **Handoff Protocol**: `.cursor/agents/HANDOFF_PROTOCOL.md`

---

**Status**: Active
**Last Updated**: 2025-01-21
**Next Review**: 2026-03-08

