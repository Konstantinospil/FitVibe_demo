# Current State: {Agent Name}

**Agent ID**: {agent-id}
**Request ID**: {request-id}
**Status**: in_progress | paused | completed | blocked
**Last Updated**: {ISO 8601 timestamp - use `date -u +"%Y-%m-%dT%H:%M:%SZ"`}
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

---

## Completion Template

When task is complete, replace all content above with:

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


