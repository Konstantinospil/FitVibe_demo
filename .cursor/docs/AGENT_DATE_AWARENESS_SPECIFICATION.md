# Agent Date Awareness Specification

**Date**: 2025-12-08
**Version**: 1.0
**Status**: Proposed
**Applies To**: All Cursor Agents

---

## Overview

All Cursor agents must be aware of the current date and time for generating accurate timestamps, request IDs, reports, and version history entries. This specification defines how agents should handle date/time information.

---

## Requirements

### 1. Date Awareness

All agents must:
- Use **current date/time** when generating reports, timestamps, and IDs
- Never use hardcoded dates or placeholders like `YYYY-MM-DD` in actual output
- Use **ISO 8601 format** for all timestamps: `YYYY-MM-DDTHH:mm:ssZ`
- Use **YYYY-MM-DD format** for dates in IDs and filenames

### 2. Date Source

Agents should obtain the current date/time from:

#### Primary Method: System Context (Recommended)
- Cursor IDE provides current date/time in agent context
- Access via environment or system information
- Format: ISO 8601 UTC timestamp

#### Fallback Method: Explicit Request Context
- Request input can include `current_date` or `timestamp` field
- Format: ISO 8601 UTC timestamp
- Example: `"current_date": "2025-01-21T14:30:00Z"`

#### Alternative: Bash/System Command
- Use system date commands if available
- Format output to ISO 8601 UTC

### 3. Date Format Standards

#### Timestamps (Full Date/Time)
- **Format**: ISO 8601 UTC: `YYYY-MM-DDTHH:mm:ssZ`
- **Example**: `2025-01-21T14:30:00Z`
- **Use Cases**:
  - Handoff timestamps
  - Report generation times
  - Audit logs
  - Event timestamps

#### Dates (Date Only)
- **Format**: `YYYY-MM-DD`
- **Example**: `2025-01-21`
- **Use Cases**:
  - Request IDs: `AQA-2025-01-21-001`
  - Version history entries: `v1.0 (2025-01-21)`
  - Report periods: `2025-01-01 to 2025-01-31`
  - Filename dates

#### Date Ranges
- **Format**: `YYYY-MM-DD to YYYY-MM-DD`
- **Example**: `2025-01-01 to 2025-01-31`
- **Use Cases**:
  - Report periods
  - Analysis date ranges
  - Time period references

---

## Implementation Guidelines

### 1. Request ID Generation

**Standard Format**: `{AGENT_PREFIX}-{YYYY-MM-DD}-{NNN}`

**Current Date Usage**:
```typescript
// ✅ CORRECT: Use current date
const today = new Date().toISOString().split('T')[0]; // "2025-01-21"
const requestId = `AQA-${today}-001`;

// ❌ WRONG: Hardcoded date
const requestId = "AQA-2025-01-21-001";

// ❌ WRONG: Placeholder
const requestId = "AQA-YYYY-MM-DD-001";
```

### 2. Timestamp Generation

**Standard Format**: ISO 8601 UTC

```typescript
// ✅ CORRECT: Use current timestamp
const timestamp = new Date().toISOString(); // "2025-01-21T14:30:00.000Z"

// ❌ WRONG: Hardcoded timestamp
const timestamp = "2025-01-21T14:30:00Z";
```

### 3. Version History Entries

**Standard Format**: `vX.Y (YYYY-MM-DD)`

```markdown
## Version History

- **v2.0** (2025-01-21): Enhanced with research-based improvements
  - Self-review capabilities
  - Performance analytics

- **v1.0** (2025-11-29): Initial version
  - Basic functionality
```

**Current Date Usage**:
- Use current date when adding new version entries
- Never use `YYYY-MM-DD` placeholder

### 4. Report Generation

**Standard Format**: Include current date in report headers

```markdown
# Agent Quality Review Report

**Request ID**: AQA-2025-01-21-001
**Target Agent**: backend-agent
**Review Date**: 2025-01-21T14:30:00Z
**Reviewer**: agent-quality-agent
**Status**: Complete
```

### 5. Handoff Protocol

**Standard Format**: ISO 8601 timestamp in handoff JSON

```json
{
  "from_agent": "backend-agent",
  "to_agent": "test-manager",
  "request_id": "BE-2025-01-21-001",
  "handoff_id": "HANDOFF-2025-01-21-001",
  "timestamp": "2025-01-21T14:30:00Z",
  ...
}
```

---

## Agent Configuration Updates

### 1. Add Date Awareness Section

Add to all agent files under "Available Tools" or new "System Context" section:

```markdown
## System Context

### Current Date/Time

Agents have access to the current date and time:
- **Current Date**: YYYY-MM-DD format (e.g., "2025-01-21")
- **Current Timestamp**: ISO 8601 UTC format (e.g., "2025-01-21T14:30:00Z")
- **Timezone**: UTC (Coordinated Universal Time)

### Date Usage Guidelines

- **Always use current date/time** for generating timestamps and IDs
- **Never hardcode dates** in output or reports
- **Use ISO 8601 format** for all timestamps
- **Use YYYY-MM-DD format** for dates in IDs and filenames
```

### 2. Update Input Format

Add optional date context to input format:

```json
{
  "request_id": "AQA-YYYY-MM-DD-NNN",
  "context": {
    "current_date": "2025-01-21T14:30:00Z",
    "timezone": "UTC"
  }
}
```

### 3. Update Processing Workflow

Add date initialization step:

```markdown
### Phase 0: Context Initialization (1-2 minutes)

1. **Obtain Current Date/Time**
   - Get current date: YYYY-MM-DD format
   - Get current timestamp: ISO 8601 UTC format
   - Verify timezone is UTC

2. **Generate Request IDs**
   - Format: {AGENT_PREFIX}-{YYYY-MM-DD}-{NNN}
   - Use current date from system
   - Ensure sequential numbering within day
```

---

## Examples in Agent Files

### Example 1: Request ID Generation

```markdown
**Example Input:**

```json
{
  "request_id": "AQA-2025-01-21-001",
  ...
}
```

**Note**: Replace `2025-01-21` with current date when generating actual request IDs.
```

### Example 2: Timestamp Usage

```markdown
**Example Output:**

```json
{
  "timestamp": "2025-01-21T14:30:00Z",
  ...
}
```

**Note**: Use current timestamp in ISO 8601 UTC format.
```

### Example 3: Version History

```markdown
## Version History

- **v2.0** (2025-01-21): Enhanced capabilities
  - Feature 1
  - Feature 2

**Note**: Use current date when adding new version entries.
```

---

## Validation Rules

### Agent Quality Agent Validation

The agent-quality-agent should validate:

1. ✅ **No hardcoded dates** in agent outputs
2. ✅ **ISO 8601 format** used for all timestamps
3. ✅ **YYYY-MM-DD format** used for dates in IDs
4. ✅ **Current date** used (not placeholder or old dates)
5. ✅ **UTC timezone** specified or implied

### Common Issues to Flag

- ❌ Hardcoded dates like "2025-01-21" in examples that should use current date
- ❌ Placeholder dates like "YYYY-MM-DD" in actual output
- ❌ Missing timestamps in handoffs or reports
- ❌ Wrong date format (MM/DD/YYYY, DD-MM-YYYY, etc.)
- ❌ Timezone not specified or wrong timezone

---

## Migration Plan

### Phase 1: Update Standards

1. ✅ Add date awareness to STANDARDS.md
2. ⏭️ Document date format requirements
3. ⏭️ Add validation rules

### Phase 2: Update Agent Configurations

1. ⏭️ Add "System Context" section to all agents
2. ⏭️ Update input/output format examples
3. ⏭️ Add date initialization to workflows

### Phase 3: Update Examples

1. ⏭️ Replace placeholder dates with notes
2. ⏭️ Add "use current date" guidance
3. ⏭️ Update handoff examples

### Phase 4: Validation

1. ⏭️ Update agent-quality-agent validation rules
2. ⏭️ Test date generation in reports
3. ⏭️ Verify timestamp formats

---

## Technical Implementation

### Recommended: Bash System Command

Agents have access to Bash commands via the Bash tool. Use system date commands:

```bash
# Get current date (YYYY-MM-DD)
date -u +"%Y-%m-%d"
# Output: 2025-01-21

# Get current timestamp (ISO 8601 UTC)
date -u +"%Y-%m-%dT%H:%M:%SZ"
# Output: 2025-01-21T14:30:00Z
```

**Implementation in Agent Workflow**:

```markdown
### Phase 0: Context Initialization

1. **Get Current Date/Time**
   - Execute Bash command: `date -u +"%Y-%m-%d"` → Store as `CURRENT_DATE`
   - Execute Bash command: `date -u +"%Y-%m-%dT%H:%M:%SZ"` → Store as `CURRENT_TIMESTAMP`
   - Use `CURRENT_DATE` for request IDs and dates
   - Use `CURRENT_TIMESTAMP` for timestamps and logs
```

### Alternative: Request Context

Request input can optionally include current date/time:

```json
{
  "request_id": "...",
  "context": {
    "current_date": "2025-01-21T14:30:00Z",
    "timezone": "UTC"
  }
}
```

**Note**: Bash command is preferred as it ensures accuracy and doesn't require manual input.

---

## Benefits

1. **Accurate Reporting**: Reports always use current dates
2. **Consistent Formatting**: Standard date/time formats across all agents
3. **Traceability**: Accurate timestamps for audit trails
4. **No Maintenance**: No need to update hardcoded dates
5. **Timezone Consistency**: All dates in UTC

---

## References

- **ISO 8601 Standard**: Date and time format
- **Handoff Protocol**: `.cursor/agents/HANDOFF_PROTOCOL.md`
- **Agent Standards**: `.cursor/agents/STANDARDS.md`

---

**Status**: Proposed for implementation
**Next Steps**: Update STANDARDS.md and agent configurations

