# GitHub Issues Setup Summary

**Created**: 2025-01-21
**Status**: Ready for Issue Creation

---

## Overview

This document summarizes the GitHub issues setup for the FitVibe project. User stories have been created from epics and activities, and scripts are ready to generate GitHub issues.

## What Was Created

### 1. User Stories Document

**File**: `docs/USER_STORIES.md`

- **65 user stories** organized by epic
- Each story includes:
  - User story format (As a / I want / So that)
  - Story points estimate
  - Priority (High/Medium)
  - Activities grouped under the story
  - Dependencies
  - Related documentation links

### 2. Generated Issue Files

**Location**: `scripts/generated/`

- **`create_github_issues.sh`**: Bash script with GitHub CLI commands
- **`github_issues.json`**: JSON file for API import
- **`README.md`**: Detailed usage instructions

### 3. Issue Creation Scripts

**Location**: `scripts/`

- **`generate_github_issues.py`**: Generates issue files from user stories
- **`create_issues_via_api.py`**: Creates issues via GitHub API

## User Stories Summary

### By Epic

| Epic                             | Stories | Story Points | Priority |
| -------------------------------- | ------- | ------------ | -------- |
| Epic 1: Profile & Settings       | 3       | 12 SP        | Medium   |
| Epic 2: Exercise Library         | 6       | 20 SP        | Medium   |
| Epic 3: Sharing & Community      | 8       | 30 SP        | Medium   |
| Epic 4: Planner Completion       | 5       | 23 SP        | Medium   |
| Epic 5: Logging & Import         | 6       | 26 SP        | Medium   |
| Epic 6: Privacy & GDPR           | 6       | 14 SP        | High     |
| Epic 7: Performance Optimization | 8       | 25 SP        | High     |
| Epic 8: Accessibility            | 7       | 16 SP        | High     |
| Epic 9: Observability            | 6       | 15 SP        | Medium   |
| Epic 10: Availability & Backups  | 5       | 12 SP        | High     |
| Epic 11: Technical Debt          | 5       | 8 SP         | Medium   |
| **Total**                        | **65**  | **201 SP**   | -        |

### By Priority

- **High Priority**: 30 stories (95 SP)
- **Medium Priority**: 35 stories (106 SP)

## How to Create Issues

### Option 1: GitHub CLI (Recommended)

1. **Install GitHub CLI** (if not already installed):

   ```bash
   # Check if installed
   gh --version

   # Install if needed (see scripts/generated/README.md for instructions)
   ```

2. **Authenticate**:

   ```bash
   gh auth login
   ```

3. **Review the script**:

   ```bash
   cat scripts/generated/create_github_issues.sh
   ```

4. **Create issues**:
   ```bash
   bash scripts/generated/create_github_issues.sh
   ```

### Option 2: GitHub API (Python)

1. **Create GitHub Personal Access Token**:
   - Go to https://github.com/settings/tokens
   - Generate new token (classic)
   - Select `repo` scope
   - Copy the token

2. **Set environment variable**:

   ```bash
   # macOS/Linux
   export GITHUB_TOKEN=your_token_here

   # Windows (PowerShell)
   $env:GITHUB_TOKEN="your_token_here"
   ```

3. **Run the script**:

   ```bash
   python scripts/create_issues_via_api.py
   ```

   The script will:
   - Create all labels automatically
   - Create all 65 issues
   - Add issues to GitHub Project #1
   - Show progress and summary

## Labels

The following labels will be created automatically:

### Priority Labels

- `priority:high`
- `priority:medium`
- `priority:low`

### Epic Labels

- `epic:profile-settings`
- `epic:exercise-library`
- `epic:sharing-community`
- `epic:planner`
- `epic:logging-import`
- `epic:privacy-gdpr`
- `epic:performance`
- `epic:accessibility`
- `epic:observability`
- `epic:availability-backups`
- `epic:technical-debt`

### Type Labels

- `type:backend`
- `type:frontend`
- `type:testing`
- `type:infrastructure`
- `type:documentation`
- `type:user-story`

## GitHub Project

Issues will be automatically added to:

- **Project**: https://github.com/users/Konstantinospil/projects/1
- **Project Number**: 1

The API script will automatically add issues to the project if:

- The project exists
- You have correct permissions
- The project ID is found

## Issue Format

Each issue includes:

1. **Title**: `US-X.Y: <description>`
2. **User Story**: As a / I want / So that format
3. **Details**: Story points, priority, epic
4. **Activities**: List of activities (E-X-AY)
5. **Dependencies**: Related requirements or user stories
6. **Acceptance Criteria**: Placeholder (to be filled)
7. **Related Documentation**: Links to docs/USER_STORIES.md and docs/PROJECT_EPICS_AND_ACTIVITIES.md

## Regenerating Issues

If you update `docs/USER_STORIES.md`, regenerate the issue files:

```bash
python scripts/generate_github_issues.py
```

This will update:

- `scripts/generated/create_github_issues.sh`
- `scripts/generated/github_issues.json`

## Next Steps

1. ✅ User stories created (65 stories)
2. ✅ Issue generation scripts created
3. ⏳ **Create issues in GitHub** (choose Option 1 or 2 above)
4. ⏳ Review and prioritize issues in GitHub project
5. ⏳ Fill in acceptance criteria for each issue
6. ⏳ Assign issues to team members
7. ⏳ Plan sprints based on story points

## Troubleshooting

See `scripts/generated/README.md` for detailed troubleshooting guide.

Common issues:

- **GitHub CLI not found**: Install it or use the Python API script
- **Authentication errors**: Run `gh auth login` or set `GITHUB_TOKEN`
- **Rate limiting**: Script includes delays; wait if needed
- **Project not found**: Verify project exists and update PROJECT_NUMBER if needed

## Files Reference

- `docs/USER_STORIES.md` - User stories with activities grouped
- `docs/PROJECT_EPICS_AND_ACTIVITIES.md` - Original epics and activities
- `scripts/generate_github_issues.py` - Generates issue files
- `scripts/create_issues_via_api.py` - Creates issues via API
- `scripts/generated/create_github_issues.sh` - CLI commands
- `scripts/generated/github_issues.json` - JSON for API import
- `scripts/generated/README.md` - Detailed usage instructions

---

**Ready to create issues!** Choose your preferred method above and follow the steps.
