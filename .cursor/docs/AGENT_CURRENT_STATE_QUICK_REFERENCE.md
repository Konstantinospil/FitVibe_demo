# Agent Current State File - Quick Reference

**Quick guide for managing agent state files**

---

## 📁 File Location

```
.cursor/agents/current_state/{agent-id}-current_state.md
```

**Example**: `.cursor/agents/current_state/backend-agent-current_state.md`

---

## 🔄 File Lifecycle

1. **Create** → When agent starts task
2. **Update** → Continuously during work
3. **Erase** → When task completes (clear content, keep file)
4. **Resume** → Read file to continue after interruption

---

## ✅ Required Sections

Every state file must have:

- Agent ID, Request ID, Status, Timestamps
- Current Task description
- Approach & Strategy
- Progress Status (✅ Completed, 🔄 In Progress, ⏭️ Remaining)
- Context & State
- Files & Artifacts (Created/Modified/Pending)
- Resume Instructions

---

## 📝 Status Values

### Task Status
- `in_progress` - Actively working
- `paused` - Temporarily paused
- `completed` - Task finished
- `blocked` - Blocked by dependency/issue
- `failed` - Task failed

### File Status
- `Active` - Currently in use
- `Completed` - Task finished
- `Cleared` - Content erased, ready for next task

---

## 🎯 When to Update

- ✅ **Create**: When starting new task
- ✅ **Update**: After each phase or significant step
- ✅ **Update**: When encountering blockers
- ✅ **Update**: Before any interruption
- ✅ **Erase**: When task completes successfully

---

## 📋 Quick Template

```markdown
# Current State: {Agent Name}

**Agent ID**: {agent-id}
**Request ID**: {request-id}
**Status**: in_progress
**Last Updated**: {timestamp}
**Started At**: {timestamp}

## Current Task

**Task Description**: [Description]
**Task Type**: [type]
**Priority**: high | medium | low

## Approach & Strategy

[Your approach...]

## Progress Status

### Completed Steps
1. ✅ [Step 1]
2. ✅ [Step 2]

### In Progress
- 🔄 [Current step]

### Remaining Steps
1. ⏭️ [Next step]

## Context & State

[Key context, files, blockers...]

**File Status**: Active
```

---

## 🔄 Completion Process

When task completes:

1. Set status to `completed`
2. Add completion timestamp
3. **Erase all content** (replace with completion marker)
4. Set file status to `Cleared`

**Completion Template**:

```markdown
# Current State: {Agent Name}

**Agent ID**: {agent-id}
**Request ID**: {request-id}
**Status**: completed
**Completed At**: {timestamp}

## Task Completed

This task has been completed successfully. State file cleared and ready for next task.

**File Status**: Cleared
```

---

## 🔗 References

- **Full Specification**: `.cursor/docs/AGENT_CURRENT_STATE_SPECIFICATION.md`
- **Template**: `.cursor/agents/examples/current_state-template.md`
- **Standards**: `.cursor/agents/STANDARDS.md`

---

**Last Updated**: 2025-12-08

