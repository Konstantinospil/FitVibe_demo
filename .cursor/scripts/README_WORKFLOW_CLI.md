# Workflow CLI - Usage Guide

## Overview

The Workflow CLI (`run_workflow.py`) provides a command-line interface for managing and executing workflows in the FitVibe multi-agent system.

## Installation

No installation required. The script uses Python 3 and the orchestration modules.

## Usage

### List Available Workflows

```bash
cd .cursor
python scripts/run_workflow.py list
```

This displays all available workflows with their metadata:
- Workflow name and ID
- Description
- Number of phases and steps
- Status and priority

### Run a Workflow

#### Basic Usage

```bash
python scripts/run_workflow.py run <workflow-id>
```

Example:
```bash
python scripts/run_workflow.py run bug-fix
```

#### With Input Data (JSON String)

```bash
python scripts/run_workflow.py run feature-development --input '{"task": "Add user profile page", "description": "Create a new user profile page with avatar upload"}'
```

#### With Input Data (JSON File)

```bash
python scripts/run_workflow.py run bug-fix --input-file input.json
```

Example `input.json`:
```json
{
  "bug_id": "bug-123",
  "description": "Fix authentication issue",
  "severity": "high"
}
```

### Check Execution Status

```bash
python scripts/run_workflow.py status <execution-id>
```

This shows:
- Execution status
- Phase and step progress
- Duration
- Errors (if any)

### List All Executions

```bash
python scripts/run_workflow.py list-executions
```

#### Filter by Workflow

```bash
python scripts/run_workflow.py list-executions --workflow-id bug-fix
```

**Note**: This command now loads executions from both active memory and the state repository, so it will show all executions even after a restart.

### Cancel a Running Workflow

Cancel a running workflow execution:

```bash
python scripts/run_workflow.py cancel <execution-id> [--reason "Reason"]
```

Example:
```bash
python scripts/run_workflow.py cancel req-abc12345 --reason "User requested cancellation"
```

This will:
- Mark the execution as cancelled
- Stop further execution
- Save the cancellation state
- Emit a workflow_cancelled event

**Note**: Only running workflows can be cancelled. Completed or failed workflows cannot be cancelled.

### Resume a Failed Workflow

Resume a failed workflow from the last completed step (Phase 4 feature):

```bash
python scripts/run_workflow.py resume <execution-id>
```

Example:
```bash
python scripts/run_workflow.py resume req-abc12345
```

This will:
- Load the execution state from the repository
- Identify completed steps
- Skip already-completed steps
- Retry only failed steps
- Continue from where it left off

### View Workflow Events

View the event log for a workflow execution:

```bash
python scripts/run_workflow.py events <execution-id>
```

#### Filter by Event Type

```bash
python scripts/run_workflow.py events <execution-id> --type workflow_started
```

#### Limit Number of Events

```bash
python scripts/run_workflow.py events <execution-id> --limit 50
```

This shows:
- All events for the execution (workflow_started, step_started, step_completed, etc.)
- Timestamps
- Event types and status
- Phase and step information
- Error messages (if any)
- Event data

### Manage Dead-Letter Queue

View and manage failed tasks in the dead-letter queue (Phase 4 feature):

#### List All Failed Tasks

```bash
python scripts/run_workflow.py dlq
```

#### Filter by Agent

```bash
python scripts/run_workflow.py dlq --agent agent-id
```

#### Show Only Retryable Tasks

```bash
python scripts/run_workflow.py dlq --retryable
```

#### Show Only Non-Retryable Tasks

```bash
python scripts/run_workflow.py dlq --non-retryable
```

#### Remove a Task

```bash
python scripts/run_workflow.py dlq --remove <task-id>
```

#### Limit Results

```bash
python scripts/run_workflow.py dlq --limit 20
```

## Workflow IDs

Available workflow IDs:
- `bug-fix` - Bug Fix Workflow
- `feature-development` - Feature Development Workflow
- `emergency-hotfix` - Emergency Hotfix Workflow

## Examples

### Example 1: Run Bug Fix Workflow

```bash
cd .cursor
python scripts/run_workflow.py run bug-fix
```

The CLI will prompt for task/description if not provided.

### Example 2: Run Feature Development with Input

```bash
python scripts/run_workflow.py run feature-development \
  --input '{"task": "Add user authentication", "description": "Implement JWT-based authentication"}'
```

### Example 3: Check Status

```bash
python scripts/run_workflow.py status req-abc12345
```

### Example 4: List All Executions

```bash
python scripts/run_workflow.py list-executions
```

### Example 5: Cancel a Running Workflow

```bash
python scripts/run_workflow.py cancel req-abc12345 --reason "User requested cancellation"
```

### Example 6: Resume a Failed Workflow

```bash
python scripts/run_workflow.py resume req-abc12345
```

### Example 7: View Workflow Events

```bash
python scripts/run_workflow.py events req-abc12345
```

### Example 8: View Dead-Letter Queue

```bash
python scripts/run_workflow.py dlq --retryable
```

## Status Indicators

- `[PENDING]` - Workflow is queued
- `[RUNNING]` - Workflow is executing
- `[PAUSED]` - Workflow is paused (manual intervention)
- `[COMPLETED]` - Workflow completed successfully
- `[FAILED]` - Workflow failed
- `[CANCELLED]` - Workflow was cancelled

## Error Handling

If a workflow fails:
1. Check the error message in the status output
2. Review failed steps using `status` command
3. View workflow events using `events` command
4. Check the dead-letter queue using `dlq` command
5. Resume the workflow using `resume` command (Phase 4 feature)
6. Check agent execution logs

## Tips

1. **Use JSON files for complex input**: For workflows with many input parameters, use `--input-file` instead of `--input`.

2. **Monitor execution**: Use `status` command to monitor long-running workflows.

3. **List workflows first**: Always use `list` to see available workflows and their IDs.

4. **Check validation errors**: The CLI will warn about validation errors before execution. Review them carefully.

## Troubleshooting

### "Workflow not found"
- Check the workflow ID is correct
- Use `list` command to see available workflows
- Ensure workflow file exists in `.cursor/workflows/`

### "Agent not found"
- Check agent definitions exist in `.cursor/agents/`
- Review validation errors before execution

### "Execution not found"
- Execution may have been cleared from active memory
- The `list-executions` command now loads from state repository, so try that
- Check if execution completed or failed
- Use `events` command to see if events exist for the execution

### "Cannot resume workflow"
- Ensure the execution actually failed (check with `status` command)
- Verify the execution exists in the state repository
- Check that the workflow definition still exists

## Integration

The CLI integrates with:
- **Workflow Parser**: Loads and parses workflow definitions
- **Workflow Validator**: Validates workflows before execution
- **Workflow Executor**: Executes workflows
- **Agent Executor**: Executes agents within workflows
- **State Management**: Tracks execution state (SQLite-based)
- **Event Log**: Tracks workflow events (SQLite-based)
- **Dead-Letter Queue**: Manages failed tasks (Phase 4)
- **Error Recovery**: Resume workflows from failures (Phase 4)

## Next Steps

After running a workflow:
1. Check execution status using `status` command
2. Review phase and step results
3. View workflow events using `events` command for detailed execution history
4. Check agent execution outputs
5. Review any errors or warnings
6. If workflow failed, check dead-letter queue using `dlq` command
7. Resume failed workflows using `resume` command (Phase 4 feature)
8. Use execution ID for debugging if needed

## Phase 4 Features

The CLI now supports Phase 4 error recovery features:

- **Resume Workflows**: Automatically resume from the last completed step
- **Dead-Letter Queue**: Track and manage failed tasks
- **Event Logging**: View complete execution history
- **State Persistence**: Executions persist across restarts

## Phase 6 Features (Observability)

The CLI now supports Phase 6 observability features:

### Metrics

View workflow and system metrics:

```bash
# System-wide metrics
python scripts/run_workflow.py metrics

# Workflow-specific metrics
python scripts/run_workflow.py metrics --workflow-id bug-fix
```

Shows:
- Total executions, success/failure rates
- Average execution duration
- Last execution timestamps
- Executions in last 24h and 7d
- Top workflows by execution count

### Dashboard

Real-time monitoring dashboard:

```bash
# One-time dashboard view
python scripts/run_workflow.py dashboard

# Continuous refresh (every 5 seconds)
python scripts/run_workflow.py dashboard --continuous --refresh 5

# Workflow-specific dashboard
python scripts/run_workflow.py dashboard --workflow-id bug-fix --continuous
```

Shows:
- System overview (workflows, executions, success rates)
- Recent executions
- Dead-letter queue status
- Recent events
- Top workflows

### Debug Tools

Debug workflow execution issues:

```bash
# Inspect execution details
python scripts/run_workflow.py debug inspect <execution-id> [--verbose]

# Replay execution from events
python scripts/run_workflow.py debug replay <execution-id>

# Compare two executions
python scripts/run_workflow.py debug compare <execution-id1> <execution-id2>

# Trace execution flow
python scripts/run_workflow.py debug trace <execution-id> [--step-id STEP_ID]

# Validate execution state
python scripts/run_workflow.py debug validate <execution-id>
```

**Debug Commands**:
- **inspect**: Detailed execution inspection with events, phases, steps, and state
- **replay**: Reconstruct execution from event log
- **compare**: Side-by-side comparison of two executions
- **trace**: Event timeline and execution flow
- **validate**: State integrity validation













