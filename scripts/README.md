# Utility Scripts

This directory contains utility scripts used for development, maintenance, and quality assurance tasks across the FitVibe monorepo.

## Scripts Overview

| Script                               | Purpose                                                                          | Usage                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Git Management**                   |                                                                                  |                                                                              |
| `git-push-branch.sh`                 | Pushes commits to specified branch based on commit message                       | `./scripts/git-push-branch.sh`                                               |
| `git-commit-and-push.sh`             | Commits and pushes to specified branch in one command                            | `./scripts/git-commit-and-push.sh "msg" dev`                                 |
| **Security & Compliance**            |                                                                                  |                                                                              |
| `dependency-audit.sh`                | Audits dependencies for known vulnerabilities                                    | `./scripts/dependency-audit.sh`                                              |
| `gdpr-compliance-check.sh`           | Validates GDPR compliance requirements                                           | `./scripts/gdpr-compliance-check.sh`                                         |
| `secrets-scan.sh`                    | Scans the codebase for potential secrets and credentials                         | `./scripts/secrets-scan.sh`                                                  |
| `security-scan.sh`                   | Runs comprehensive security scans                                                | `./scripts/security-scan.sh`                                                 |
| **Requirements Management**          |                                                                                  |                                                                              |
| `generate_requirements.py`           | Generates requirement documents from structured data                             | `python scripts/generate_requirements.py`                                    |
| `organize_requirements.py`           | Organizes requirement documents by implementation status                         | `python scripts/organize_requirements.py`                                    |
| `project_planning_agent.py`          | Automatically generates epics, stories, ACs, and GitHub issues from requirements | `python scripts/project_planning_agent.py --mode <mode> --git-token <token>` |
| `requirements_to_issues_pipeline.py` | Complete pipeline from requirements to GitHub issues                             | `python scripts/requirements_to_issues_pipeline.py --git-token <token>`      |
| `generate_acceptance_criteria.py`    | Generates acceptance criteria from requirements                                  | `python scripts/generate_acceptance_criteria.py`                             |
| `update_ac_master.py`                | Updates AC_Master.md with all acceptance criteria                                | `python scripts/update_ac_master.py`                                         |
| `update_user_stories_with_ac.py`     | Updates USER_STORIES.md with acceptance criteria                                 | `python scripts/update_user_stories_with_ac.py`                              |
| `update_requirement_docs_with_ac.py` | Updates requirement documents with acceptance criteria                           | `python scripts/update_requirement_docs_with_ac.py`                          |
| **GitHub Issues Management**         |                                                                                  |                                                                              |
| `generate_github_issues.py`          | Generates GitHub issue files from user stories                                   | `python scripts/generate_github_issues.py`                                   |
| `upload_missing_issues.py`           | Uploads only missing GitHub issues                                               | `python scripts/upload_missing_issues.py`                                    |
| `verify_github_issues.py`            | Verifies which GitHub issues have been created                                   | `python scripts/verify_github_issues.py`                                     |
| `update_issues_with_ac.py`           | Updates GitHub issues with acceptance criteria                                   | `python scripts/update_issues_with_ac.py`                                    |
| `update_issue_statuses.py`           | Updates issue statuses based on implementation                                   | `python scripts/update_issue_statuses.py`                                    |
| `create_issues_via_api.py`           | Creates GitHub issues via API                                                    | `python scripts/create_issues_via_api.py`                                    |
| `create_issues.sh`                   | Creates GitHub issues via GitHub CLI                                             | `./scripts/create_issues.sh`                                                 |
| **Code Quality & Maintenance**       |                                                                                  |                                                                              |
| `fix-all-test-imports.mjs`           | Fixes import paths in test files                                                 | `node scripts/fix-all-test-imports.mjs`                                      |
| `add_return_types.py`                | Adds explicit return types to functions                                          | `python scripts/add_return_types.py`                                         |
| `fix_controller_returns.py`          | Fixes return statements in controllers                                           | `python scripts/fix_controller_returns.py`                                   |
| `check_story_implementation.py`      | Checks implementation status of user stories                                     | `python scripts/check_story_implementation.py`                               |
| `check_cursor_rules_compliance.py`   | Checks compliance with Cursor rules                                              | `python scripts/check_cursor_rules_compliance.py`                            |
| `analyze_cursor_chats.py`            | Analyzes Cursor chat history                                                     | `python scripts/analyze_cursor_chats.py`                                     |
| `analyze-coverage.mjs`               | Analyzes test coverage                                                           | `node scripts/analyze-coverage.mjs`                                          |
| `cleanup-visual-artifacts.mjs`       | Cleans up visual test artifacts                                                  | `node scripts/cleanup-visual-artifacts.mjs`                                  |
| **Testing & Validation**             |                                                                                  |                                                                              |
| `check-frontend.sh`                  | Checks frontend code quality                                                     | `./scripts/check-frontend.sh`                                                |
| `run-integration-tests.sh`           | Runs integration tests                                                           | `./scripts/run-integration-tests.sh`                                         |
| `run-integration-tests.bat`          | Runs integration tests (Windows)                                                 | `.\scripts\run-integration-tests.bat`                                        |
| `run-local.sh`                       | Runs local development environment                                               | `./scripts/run-local.sh`                                                     |
| `validate_setup.py`                  | Validates development environment setup                                          | `python scripts/validate_setup.py`                                           |

## Prerequisites

- **Shell scripts**: Bash (available on Unix-like systems or Git Bash on Windows)
- **Python scripts**: Python 3.8+ with required dependencies

## Usage

### Git Branch Management

#### Push to Branch Based on Commit Message

```bash
# Commit with directive
git commit -m "fix: update tests [push:dev]"
./scripts/git-push-branch.sh
```

**Commit Message Formats:**

- `[push:dev]` - Push to dev branch (triggers CI only)
- `[push:stage]` - Push to stage branch (triggers CI + CD)
- `[push:main]` - Push to main branch (triggers CD only)

Alternative formats: `push to dev`, `deploy to stage`, `push to main`, etc.

#### Commit and Push in One Command

```bash
# Specify branch as argument
./scripts/git-commit-and-push.sh "fix: update tests" dev

# Or include directive in message
./scripts/git-commit-and-push.sh "fix: update tests [push:stage]"
```

See [`docs/DEVELOPMENT.md`](../docs/DEVELOPMENT.md) for detailed workflow documentation.

### Dependency Auditing

```bash
./scripts/dependency-audit.sh
```

Scans all workspaces for vulnerable dependencies and generates a report.

### GDPR Compliance Check

```bash
./scripts/gdpr-compliance-check.sh
```

Validates that the codebase meets GDPR requirements, including:

- Data minimization checks
- Privacy-by-default settings
- Data Subject Rights (DSR) implementation
- Data retention policies

### Requirements Management

#### Generate Requirements

```bash
# Basic usage
python scripts/generate_requirements.py

# With automatic project planning
python scripts/generate_requirements.py --auto-plan --plan-mode epics
python scripts/generate_requirements.py --auto-plan --plan-mode issues --git-token <token> --auto-upload
```

Generates requirement documents from `AC_Master.md`. Use `--auto-plan` to automatically trigger the project-planning agent after generation.

**Options:**

- `--auto-plan`: Automatically trigger project-planning agent after generating requirements
- `--plan-mode {epics|stories|ac|issues}`: Project-planning agent mode (default: epics)
- `--git-token <token>`: GitHub token (required for issues mode)
- `--auto-upload`: Auto-upload issues to GitHub (only for issues mode)

#### Organize Requirements

```bash
# Basic usage
python scripts/organize_requirements.py

# With automatic project planning
python scripts/organize_requirements.py --auto-plan --plan-mode stories
python scripts/organize_requirements.py --auto-plan --plan-mode issues --git-token <token> --auto-upload
```

Organizes requirement documents into `done/`, `progressing/`, and `open/` directories based on implementation status. Use `--auto-plan` to automatically trigger the project-planning agent after organization.

**Options:**

- `--auto-plan`: Automatically trigger project-planning agent after organizing requirements
- `--plan-mode {epics|stories|ac|issues}`: Project-planning agent mode (default: stories)
- `--git-token <token>`: GitHub token (required for issues mode)
- `--auto-upload`: Auto-upload issues to GitHub (only for issues mode)

See [`docs/1.Product_Requirements/Requirements/README.md`](../docs/1.Product_Requirements/Requirements/README.md) for details.

#### Complete Pipeline (Requirements → Issues)

```bash
# Full automated pipeline
python scripts/requirements_to_issues_pipeline.py --git-token <token>

# Skip specific steps
python scripts/requirements_to_issues_pipeline.py --git-token <token> --skip-generate --skip-organize
```

Runs the complete automated workflow:

1. Generate requirements from `AC_Master.md`
2. Organize requirements by status
3. Generate epics/stories from requirements
4. Generate and upload GitHub issues

**Options:**

- `--git-token <token>`: GitHub personal access token (required)
- `--skip-generate`: Skip requirement generation step
- `--skip-organize`: Skip requirement organization step
- `--skip-planning`: Skip project planning step
- `--skip-upload`: Skip GitHub issue upload (only generate files)
- `--plan-mode {epics|stories|ac|issues}`: Project-planning agent mode (default: issues)

### Project Planning Agent

The **Project Planning Agent** automatically reads requirements from the requirements manager and generates epics, user stories, acceptance criteria, and GitHub issues.

#### Modes

- **`epics`**: Generate epics from requirements
- **`stories`**: Generate user stories from requirements
- **`ac`**: Extract acceptance criteria from requirements
- **`issues`**: Generate and upload GitHub issues from user stories

#### Usage Examples

```bash
# Generate epics from open requirements
python scripts/project_planning_agent.py --mode epics --status-filter open

# Generate user stories from all requirements
python scripts/project_planning_agent.py --mode stories

# Extract acceptance criteria
python scripts/project_planning_agent.py --mode ac

# Generate and automatically upload GitHub issues
python scripts/project_planning_agent.py --mode issues --git-token <your_token> --auto-upload

# Generate issues without uploading (review first)
python scripts/project_planning_agent.py --mode issues --git-token <your_token>
```

#### Options

- `--mode {epics|stories|ac|issues}`: Required. Select the operation mode
- `--git-token <token>`: GitHub personal access token (required for `issues` mode)
- `--status-filter {open|progressing|done}`: Filter requirements by status
- `--auto-upload`: Automatically upload issues to GitHub (requires `--git-token`)

#### How It Works

1. **Reads Requirements**: Scans `docs/1.Product_Requirements/Requirements/` for requirement markdown files
2. **Generates Artifacts**: Creates epics, stories, or extracts ACs based on requirement content
3. **Creates GitHub Issues**: Generates issue JSON and optionally uploads to GitHub
4. **Tracks Status**: Only uploads missing issues (checks existing issues first)

#### Output Locations

- **Generated epics**: `docs/Implementation/generated_epics.json`
- **Generated stories**: `docs/Implementation/generated_stories.json`
- **GitHub issues JSON**: `scripts/generated/github_issues.json`
- **GitHub issues script**: `scripts/generated/create_github_issues.sh`

### GitHub Issues Management

#### Generate Issues from User Stories

```bash
python scripts/generate_github_issues.py
```

Reads `docs/USER_STORIES.md` and generates:

- `scripts/generated/create_github_issues.sh` - Bash script with GitHub CLI commands
- `scripts/generated/github_issues.json` - JSON file for API import

#### Upload Missing Issues

```bash
GITHUB_TOKEN=<token> python scripts/upload_missing_issues.py
```

Checks which issues are already on GitHub and uploads only the missing ones. This is safer than uploading all issues and prevents duplicates.

#### Verify Issues Status

```bash
GITHUB_TOKEN=<token> python scripts/verify_github_issues.py
```

Compares expected issues (from `github_issues.json`) with actual GitHub issues and reports:

- Which issues have been created
- Which issues are missing
- Completion percentage

### Security Scanning

#### Secrets Scan

```bash
./scripts/secrets-scan.sh
```

Scans the repository for potential secrets, API keys, passwords, and other sensitive information. Results are saved to `security-reports/` directory.

#### Comprehensive Security Scan

```bash
./scripts/security-scan.sh
```

Runs multiple security checks including:

- Dependency vulnerability scanning
- Secrets detection
- Code security analysis
- Configuration security review

### Code Quality & Maintenance

#### Fix Test Imports

```bash
node scripts/fix-all-test-imports.mjs
```

Fixes import paths in test files after moving tests to `tests/backend/` directory. Updates relative imports to point to `apps/backend/src/`.

#### Add Return Types

```bash
python scripts/add_return_types.py
```

Adds explicit return types to functions missing them. Focuses on service and repository functions.

#### Fix Controller Returns

```bash
python scripts/fix_controller_returns.py
```

Fixes return statements in controller files to comply with `Promise<void>` return type. Changes `return res.status().json()` to `res.status().json(); return;`.

#### Check Story Implementation

```bash
python scripts/check_story_implementation.py
```

Checks implementation status of user stories by analyzing the codebase. Verifies if backend/frontend code exists for each story.

#### Check Cursor Rules Compliance

```bash
python scripts/check_cursor_rules_compliance.py
```

Validates that code follows Cursor rules and coding standards defined in `.cursorrules`.

#### Analyze Cursor Chats

```bash
python scripts/analyze_cursor_chats.py [--chat-dir <path>] [--output <output.md>]
```

Analyzes Cursor chat history to identify patterns and improve `.cursorrules`. Generates insights about common issues and solutions.

#### Analyze Coverage

```bash
node scripts/analyze-coverage.mjs
```

Analyzes test coverage reports and generates summaries.

#### Cleanup Visual Artifacts

```bash
node scripts/cleanup-visual-artifacts.mjs
```

Cleans up visual test artifacts and snapshots.

### Testing & Validation

#### Check Frontend

```bash
./scripts/check-frontend.sh
```

Runs frontend code quality checks including linting, type checking, and tests.

#### Run Integration Tests

```bash
# Unix/Linux/Mac
./scripts/run-integration-tests.sh

# Windows
.\scripts\run-integration-tests.bat
```

Runs integration tests for the entire application.

#### Run Local Environment

```bash
./scripts/run-local.sh
```

Sets up and runs the local development environment with all required services.

#### Validate Setup

```bash
python scripts/validate_setup.py
```

Validates that the development environment is properly configured with all required dependencies and services.

### Acceptance Criteria Management

#### Update AC Master

```bash
python scripts/update_ac_master.py
```

Updates `AC_Master.md` with all acceptance criteria from user stories.

#### Update User Stories with AC

```bash
python scripts/update_user_stories_with_ac.py
```

Updates `USER_STORIES.md` with acceptance criteria from `AC_ALL_STORIES.md`.

#### Update Requirement Docs with AC

```bash
python scripts/update_requirement_docs_with_ac.py
```

Updates requirement documents with acceptance criteria.

#### Update Issues with AC

```bash
python scripts/update_issues_with_ac.py
```

Updates GitHub issues with acceptance criteria from user stories.

#### Update Issue Statuses

```bash
python scripts/update_issue_statuses.py
```

Updates GitHub issue statuses based on implementation progress.

### GitHub Issues

#### Create Issues via API

```bash
python scripts/create_issues_via_api.py
```

Creates GitHub issues using the GitHub API.

#### Create Issues via CLI

```bash
./scripts/create_issues.sh
```

Creates GitHub issues using GitHub CLI (`gh`).

## Output Locations

- **Security reports**: `security-reports/` (created automatically)
- **Audit results**: Console output and log files
- **Requirement documents**: `docs/1.Product_Requirements/Requirements/`

## Integration with CI/CD

These scripts are designed to be run in CI/CD pipelines:

- `dependency-audit.sh` - Run on every PR
- `secrets-scan.sh` - Run on every commit
- `security-scan.sh` - Run on scheduled basis and before releases
- `gdpr-compliance-check.sh` - Run before releases

## Notes

- All scripts should be run from the repository root
- Some scripts require environment variables (check individual script headers)
- Security scan results should be reviewed before merging PRs
- Requirements organization should be run after significant feature implementations

## Contributing

When adding new utility scripts:

1. Place them in this directory
2. Make them executable (`chmod +x script.sh`)
3. Add documentation to this README
4. Include usage examples and prerequisites
5. Ensure scripts work on both Unix-like systems and Windows (via Git Bash)
