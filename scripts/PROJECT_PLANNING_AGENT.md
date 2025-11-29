# Project Planning Agent

**Created**: 2025-01-23  
**Status**: Active  
**Purpose**: Automatically generate epics, stories, acceptance criteria, and GitHub issues from requirements

---

## Overview

The Project Planning Agent is an automated tool that reads requirements from the requirements manager and generates project planning artifacts:

- **Epics**: High-level feature groupings from requirements
- **User Stories**: Detailed user stories with acceptance criteria
- **Acceptance Criteria**: Extraction and analysis of ACs from requirements
- **GitHub Issues**: Automatic generation and upload of issues to GitHub

---

## Quick Start

### Basic Usage

```bash
# Generate epics from open requirements
python scripts/project_planning_agent.py --mode epics --status-filter open

# Generate user stories
python scripts/project_planning_agent.py --mode stories

# Extract acceptance criteria
python scripts/project_planning_agent.py --mode ac

# Generate and upload GitHub issues (requires token)
python scripts/project_planning_agent.py --mode issues --git-token <token> --auto-upload
```

---

## Modes

### 1. Epics Mode (`--mode epics`)

Generates epic structures from requirements.

**What it does:**

- Reads requirements from `docs/1.Product_Requirements/Requirements/`
- Creates epic structures with activities based on acceptance criteria
- Estimates story points based on AC count
- Saves to `docs/Implementation/generated_epics.json`

**Example:**

```bash
python scripts/project_planning_agent.py --mode epics --status-filter open
```

**Output:**

- JSON file with epic definitions
- Each epic includes: ID, title, status, priority, gate, estimated SP, activities

---

### 2. Stories Mode (`--mode stories`)

Generates user stories from requirements.

**What it does:**

- Reads requirements and their acceptance criteria
- Groups ACs into logical user stories (max 5 ACs per story)
- Assigns story points based on AC count
- Saves to `docs/Implementation/generated_stories.json`

**Example:**

```bash
python scripts/project_planning_agent.py --mode stories
```

**Output:**

- JSON file with user story definitions
- Each story includes: ID, title, user story format, epic, story points, priority, dependencies, ACs

---

### 3. Acceptance Criteria Mode (`--mode ac`)

Extracts and displays acceptance criteria from requirements.

**What it does:**

- Scans all requirement files
- Extracts acceptance criteria
- Displays summary statistics

**Example:**

```bash
python scripts/project_planning_agent.py --mode ac --status-filter open
```

**Output:**

- Console summary of ACs per requirement
- Total AC count

---

### 4. Issues Mode (`--mode issues`)

Generates and uploads GitHub issues from user stories.

**What it does:**

1. Reads `docs/USER_STORIES.md`
2. Generates GitHub issue JSON
3. Checks existing GitHub issues
4. Uploads only missing issues (if `--auto-upload` is used)

**Required:**

- `--git-token`: GitHub personal access token with `repo` scope

**Example:**

```bash
# Generate issues without uploading (review first)
python scripts/project_planning_agent.py --mode issues --git-token <token>

# Generate and automatically upload
python scripts/project_planning_agent.py --mode issues --git-token <token> --auto-upload
```

**Output:**

- `scripts/generated/github_issues.json` - Issue data
- `scripts/generated/create_github_issues.sh` - CLI commands
- Issues uploaded to GitHub (if `--auto-upload`)

---

## Command-Line Options

| Option            | Required          | Description                                           |
| ----------------- | ----------------- | ----------------------------------------------------- |
| `--mode`          | Yes               | Operation mode: `epics`, `stories`, `ac`, or `issues` |
| `--git-token`     | For `issues` mode | GitHub personal access token                          |
| `--status-filter` | No                | Filter requirements: `open`, `progressing`, or `done` |
| `--auto-upload`   | No                | Automatically upload issues (requires `--git-token`)  |

---

## Workflow Examples

### Complete Workflow: Requirements → Epics → Stories → Issues

```bash
# Step 1: Generate epics from open requirements
python scripts/project_planning_agent.py --mode epics --status-filter open

# Step 2: Review generated epics in docs/Implementation/generated_epics.json
# (Manually integrate into PROJECT_EPICS_AND_ACTIVITIES.md if needed)

# Step 3: Generate stories from requirements
python scripts/project_planning_agent.py --mode stories

# Step 4: Review generated stories in docs/Implementation/generated_stories.json
# (Manually integrate into USER_STORIES.md if needed)

# Step 5: Generate and upload GitHub issues
python scripts/project_planning_agent.py --mode issues --git-token <token> --auto-upload
```

### Quick Issue Upload (Existing Stories)

```bash
# If USER_STORIES.md already has stories, just upload issues
python scripts/project_planning_agent.py --mode issues --git-token <token> --auto-upload
```

### Extract ACs for Review

```bash
# See all acceptance criteria from open requirements
python scripts/project_planning_agent.py --mode ac --status-filter open
```

---

## Integration with Existing Scripts

The Project Planning Agent integrates with:

- **`generate_github_issues.py`**: Uses its parsing and generation functions
- **`upload_missing_issues.py`**: Uses its upload and verification functions
- **`verify_github_issues.py`**: Can be run separately to verify status

---

## Requirements Structure

The agent expects requirements in:

```
docs/1.Product_Requirements/Requirements/
├── open/          # Open requirements
├── progressing/   # In-progress requirements
└── done/          # Completed requirements
```

Each requirement file should have:

- Requirement ID (e.g., `FR-001`)
- Title
- Status, Priority, Gate
- Acceptance Criteria section

---

## Output Files

| Mode      | Output File               | Location               |
| --------- | ------------------------- | ---------------------- |
| `epics`   | `generated_epics.json`    | `docs/Implementation/` |
| `stories` | `generated_stories.json`  | `docs/Implementation/` |
| `ac`      | Console output            | -                      |
| `issues`  | `github_issues.json`      | `scripts/generated/`   |
| `issues`  | `create_github_issues.sh` | `scripts/generated/`   |

---

## GitHub Token Setup

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select `repo` scope
4. Copy the token
5. Use with `--git-token` option

**Security Note**: Never commit tokens to git. Use environment variables or pass as command argument.

---

## Troubleshooting

### Issue: "Requirement file not found"

**Solution**: Ensure requirements are in `docs/1.Product_Requirements/Requirements/` organized by status.

### Issue: "No acceptance criteria found"

**Solution**: Check that requirement files have an "Acceptance Criteria" section with properly formatted ACs.

### Issue: "GitHub token invalid"

**Solution**:

- Verify token has `repo` scope
- Check token hasn't expired
- Ensure token has access to the repository

### Issue: "Issues already exist"

**Solution**: The agent automatically skips existing issues. Use `verify_github_issues.py` to check status.

---

## Related Scripts

- `generate_github_issues.py` - Generate issue files from USER_STORIES.md
- `upload_missing_issues.py` - Upload only missing issues
- `verify_github_issues.py` - Verify which issues are on GitHub
- `generate_requirements.py` - Generate requirement documents
- `organize_requirements.py` - Organize requirements by status

---

## Future Enhancements

Potential improvements:

- AI-powered story point estimation
- Automatic epic grouping by theme
- Dependency analysis and visualization
- Integration with project management tools
- Automated acceptance criteria generation

---

**Last Updated**: 2025-01-23
