# System Context: Current Date/Time

**Purpose**: Provide agents with access to current date/time for accurate reporting

---

## Current Date/Time Access

Agents can obtain the current date/time using system commands:

### Get Current Date (YYYY-MM-DD)

```bash
date -u +"%Y-%m-%d"
# Output: 2025-01-21
```

### Get Current Timestamp (ISO 8601 UTC)

```bash
date -u +"%Y-%m-%dT%H:%M:%SZ"
# Output: 2025-01-21T14:30:00Z
```

### Get Current Time Only

```bash
date -u +"%H:%M:%S"
# Output: 14:30:00
```

---

## Usage in Agent Files

### In Agent Configuration

Add to "Available Tools" or new "System Context" section:

```markdown
## System Context

### Current Date/Time

Agents have access to the current date and time via system commands:
- **Current Date**: Use `date -u +"%Y-%m-%d"` to get date in YYYY-MM-DD format
- **Current Timestamp**: Use `date -u +"%Y-%m-%dT%H:%M:%SZ"` to get ISO 8601 UTC timestamp
- **Timezone**: UTC (Coordinated Universal Time)

**Date Usage Guidelines**:
- **CRITICAL**: Always use current date/time for generating timestamps and IDs
- **NEVER hardcode dates** in output, reports, or documentation
- **ALWAYS execute** `date -u +"%Y-%m-%d"` command to get current date before using it
- Use ISO 8601 format for all timestamps
- Use YYYY-MM-DD format for dates in IDs and filenames
- Examples in documentation are for illustration only - always use actual current date
```

### In Processing Workflow

Add date initialization step:

```markdown
### Phase 0: Context Initialization (1-2 minutes)

1. **Obtain Current Date/Time**
   - Execute: `date -u +"%Y-%m-%d"` to get current date (YYYY-MM-DD)
   - Execute: `date -u +"%Y-%m-%dT%H:%M:%SZ"` to get current timestamp (ISO 8601 UTC)
   - Store for use in request IDs, timestamps, and reports
```

---

## Examples

### Request ID Generation

```markdown
**Example Request ID Format**: `{AGENT_PREFIX}-{YYYY-MM-DD}-{NNN}`

**Implementation**:
1. Get current date: `date -u +"%Y-%m-%d"` → "2025-01-21"
2. Generate sequential number: 001, 002, 003...
3. Combine: `AQA-2025-01-21-001`

**Note**: Always use current date, never hardcode or use placeholder.
```

### Timestamp Generation

```markdown
**Example Timestamp Format**: ISO 8601 UTC

**Implementation**:
1. Get current timestamp: `date -u +"%Y-%m-%dT%H:%M:%SZ"`
2. Use in handoffs, reports, logs: `"timestamp": "2025-01-21T14:30:00Z"`

**Note**: Always use current timestamp, never hardcode.
```

### Version History

```markdown
## Version History

- **v2.0** (2025-01-21): Enhanced capabilities
  - Feature 1
  - Feature 2

**Note**: When adding new version entries:
1. Get current date: `date -u +"%Y-%m-%d"`
2. Use format: `- **vX.Y** (YYYY-MM-DD): Description`
```

---

## Validation

Agents should validate:
- ✅ Current date used (not hardcoded or placeholder)
- ✅ ISO 8601 format for timestamps
- ✅ YYYY-MM-DD format for dates
- ✅ UTC timezone specified or implied

---

## Common Patterns

### Pattern 1: Request ID with Current Date

```bash
# Get current date
CURRENT_DATE=$(date -u +"%Y-%m-%d")

# Generate request ID
REQUEST_ID="AQA-${CURRENT_DATE}-001"
# Result: AQA-2025-01-21-001
```

### Pattern 2: Timestamp in JSON

```bash
# Get current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Use in JSON
echo "{\"timestamp\": \"${TIMESTAMP}\"}"
# Result: {"timestamp": "2025-01-21T14:30:00Z"}
```

### Pattern 3: Date Range for Reports

```bash
# Get current date
TODAY=$(date -u +"%Y-%m-%d")

# Calculate report period (e.g., first day of month to today)
FIRST_DAY=$(date -u +"%Y-%m-01")
PERIOD="${FIRST_DAY} to ${TODAY}"
# Result: 2025-01-01 to 2025-01-21
```

---

**Last Updated**: 2025-12-08
**Maintained By**: agent-quality-agent

