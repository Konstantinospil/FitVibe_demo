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
2. Review failed steps
3. Check agent execution logs
4. Retry the workflow if needed

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
- Execution may have been cleared from memory
- Check if execution completed or failed
- Use `list-executions` to see all active executions

## Integration

The CLI integrates with:
- **Workflow Parser**: Loads and parses workflow definitions
- **Workflow Validator**: Validates workflows before execution
- **Workflow Executor**: Executes workflows
- **Agent Executor**: Executes agents within workflows
- **State Management**: Tracks execution state

## Next Steps

After running a workflow:
1. Check execution status
2. Review phase and step results
3. Check agent execution outputs
4. Review any errors or warnings
5. Use execution ID for debugging if needed













