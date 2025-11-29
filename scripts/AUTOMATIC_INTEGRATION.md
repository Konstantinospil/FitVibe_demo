# Automatic Integration: Requirements Manager → Project Planning Agent

**Created**: 2025-01-23  
**Status**: Active  
**Purpose**: Automate the handoff from requirements management to project planning

---

## Overview

The requirements manager now **automatically hands over** to the project-planning agent when you use the `--auto-plan` flag. This creates a seamless workflow from requirements generation to GitHub issue creation.

---

## How It Works

### Before (Manual Workflow)

```
1. Requirements Analyst Agent → Creates requirements
2. generate_requirements.py → Generates requirement files
3. organize_requirements.py → Organizes by status
4. project_planning_agent.py → Must be run manually ❌
```

### After (Automatic Workflow)

```
1. Requirements Analyst Agent → Creates requirements
2. generate_requirements.py --auto-plan → Generates + Auto-triggers planning ✅
3. organize_requirements.py --auto-plan → Organizes + Auto-triggers planning ✅
4. OR: requirements_to_issues_pipeline.py → Full automated pipeline ✅
```

---

## Usage Examples

### Option 1: Auto-Plan After Generating Requirements

```bash
# Generate requirements and automatically create epics
python scripts/generate_requirements.py --auto-plan --plan-mode epics

# Generate requirements and automatically create/upload issues
python scripts/generate_requirements.py --auto-plan --plan-mode issues --git-token <token> --auto-upload
```

### Option 2: Auto-Plan After Organizing Requirements

```bash
# Organize requirements and automatically generate stories
python scripts/organize_requirements.py --auto-plan --plan-mode stories

# Organize requirements and automatically create/upload issues
python scripts/organize_requirements.py --auto-plan --plan-mode issues --git-token <token> --auto-upload
```

### Option 3: Complete Automated Pipeline (Recommended)

```bash
# Full pipeline: Requirements → Organization → Planning → Issues
python scripts/requirements_to_issues_pipeline.py --git-token <token>
```

This runs everything in sequence:

1. ✅ Generate requirements from `AC_Master.md`
2. ✅ Organize requirements by status
3. ✅ Generate epics/stories from requirements
4. ✅ Generate and upload GitHub issues

---

## Integration Points

### 1. `generate_requirements.py`

**New Flags:**

- `--auto-plan`: Automatically trigger project-planning agent after generating requirements
- `--plan-mode {epics|stories|ac|issues}`: Select planning mode (default: `epics`)
- `--git-token <token>`: GitHub token (required for `issues` mode)
- `--auto-upload`: Auto-upload issues (only for `issues` mode)

**When to Use:**

- After updating `AC_Master.md` and regenerating requirements
- When you want to immediately generate epics from new requirements

### 2. `organize_requirements.py`

**New Flags:**

- `--auto-plan`: Automatically trigger project-planning agent after organizing requirements
- `--plan-mode {epics|stories|ac|issues}`: Select planning mode (default: `stories`)
- `--git-token <token>`: GitHub token (required for `issues` mode)
- `--auto-upload`: Auto-upload issues (only for `issues` mode)

**When to Use:**

- After organizing requirements by status
- When you want to generate stories from newly organized requirements

### 3. `requirements_to_issues_pipeline.py` (New)

**Complete automated pipeline** that runs all steps in sequence.

**Options:**

- `--git-token <token>`: **Required** - GitHub personal access token
- `--skip-generate`: Skip requirement generation step
- `--skip-organize`: Skip requirement organization step
- `--skip-planning`: Skip project planning step
- `--skip-upload`: Skip GitHub issue upload (only generate files)
- `--plan-mode {epics|stories|ac|issues}`: Planning mode (default: `issues`)

**When to Use:**

- For complete automation from requirements to GitHub issues
- In CI/CD pipelines
- When you want a single command to do everything

---

## Workflow Recommendations

### Daily Workflow

```bash
# 1. Requirements Analyst creates/updates requirements
# 2. Generate and auto-plan
python scripts/generate_requirements.py --auto-plan --plan-mode epics

# 3. Review generated epics, then organize and generate stories
python scripts/organize_requirements.py --auto-plan --plan-mode stories

# 4. Review stories, then upload issues
python scripts/project_planning_agent.py --mode issues --git-token <token> --auto-upload
```

### One-Command Workflow

```bash
# Everything in one command
python scripts/requirements_to_issues_pipeline.py --git-token <token>
```

### Incremental Workflow

```bash
# Only generate new requirements
python scripts/generate_requirements.py --auto-plan --plan-mode epics

# Only organize existing requirements
python scripts/organize_requirements.py --auto-plan --plan-mode stories

# Only upload issues (if stories already exist)
python scripts/project_planning_agent.py --mode issues --git-token <token> --auto-upload
```

---

## Benefits

### ✅ Automatic Handoff

- No manual step between requirements and planning
- Reduces chance of forgetting to run planning agent
- Ensures requirements are immediately converted to actionable items

### ✅ Flexible Workflow

- Can still run each step manually if needed
- Can skip steps in pipeline
- Can choose different planning modes per step

### ✅ CI/CD Ready

- Pipeline script can be integrated into CI/CD
- Automated issue creation on requirement updates
- Consistent workflow across team

---

## Error Handling

- If a step fails, the pipeline continues (with warnings)
- Each step can be run independently if needed
- Exit codes are preserved for CI/CD integration

---

## Security Notes

- GitHub tokens are passed as command-line arguments
- Consider using environment variables in CI/CD:
  ```bash
  export GITHUB_TOKEN="your_token"
  python scripts/requirements_to_issues_pipeline.py --git-token "$GITHUB_TOKEN"
  ```
- Never commit tokens to git

---

## Related Documentation

- [`PROJECT_PLANNING_AGENT.md`](./PROJECT_PLANNING_AGENT.md) - Project planning agent details
- [`README.md`](./README.md) - All scripts documentation
- [`docs/1.Product_Requirements/Requirements/README.md`](../docs/1.Product_Requirements/Requirements/README.md) - Requirements organization

---

**Last Updated**: 2025-01-23
