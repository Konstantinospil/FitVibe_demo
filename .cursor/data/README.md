# Data Directory

**Version**: 1.0  
**Last Updated**: 2025-01-21

---

## Overview

This directory contains runtime data files for the FitVibe multi-agent system. These files are generated at runtime and should not be committed to version control.

---

## Directory Structure

```
.cursor/data/
├── agent_states/          # Agent execution states
│   ├── versions/          # State version history
│   └── backups/           # State backups
├── quota_state/           # Quota tracking state
├── routing_history.jsonl  # Model routing history
└── approval_queue/        # HITL approval requests
```

---

## Files

### agent_states/

Contains agent and workflow execution states:
- `{state_id}.json` - Current state files
- `versions/{state_id}/v{N}.json` - Version history
- `backups/{state_id}_{timestamp}.json` - Backup files

### quota_state/

Contains quota tracking state:
- `quota_state.json` - Current quota usage
- `quota_limits.json` - Quota limits configuration

### routing_history.jsonl

JSONL file containing model routing decisions with timestamps.

### approval_queue/

Contains HITL approval requests:
- `{request_id}.json` - Approval request files

---

## Data Retention

- **State files**: Retained for 30 days (configurable)
- **Version history**: Last 10 versions per state (configurable)
- **Backups**: Last 10 backups per state (configurable)
- **Routing history**: Retained indefinitely (can be rotated)

---

## Backup & Recovery

All state files are automatically backed up before modification. Use the state manager's restore functionality to recover from backups.

---

**Last Updated**: 2025-01-21
















