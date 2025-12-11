# Utility Scripts

This directory contains utility scripts used for development, maintenance, and quality assurance tasks across the FitVibe monorepo.

## Scripts Overview

| Script                      | Purpose                                                                          | Usage                                                                        |
| --------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `git-push-branch.sh`        | Pushes commits to specified branch based on commit message                       | `./scripts/git-push-branch.sh`                                               |
| `git-commit-and-push.sh`    | Commits and pushes to specified branch in one command                            | `./scripts/git-commit-and-push.sh "msg" dev`                                 |
| `dependency-audit.sh`       | Audits dependencies for known vulnerabilities                                    | `./scripts/dependency-audit.sh`                                              |
| `gdpr-compliance-check.sh`  | Validates GDPR compliance requirements                                           | `./scripts/gdpr-compliance-check.sh`                                         |
| `generate_requirements.py`  | Generates requirement documents from structured data                             | `python scripts/generate_requirements.py`                                    |
| `organize_requirements.py`  | Organizes requirement documents by implementation status                         | `python scripts/organize_requirements.py`                                    |
| `project_planning_agent.py` | Automatically generates epics, stories, ACs, and GitHub issues from requirements | `python scripts/project_planning_agent.py --mode <mode> --git-token <token>` |
| `generate_github_issues.py` | Generates GitHub issue files from user stories                                   | `python scripts/generate_github_issues.py`                                   |
| `upload_missing_issues.py`  | Uploads only missing GitHub issues                                               | `python scripts/upload_missing_issues.py`                                    |
| `verify_github_issues.py`   | Verifies which GitHub issues have been created                                   | `python scripts/verify_github_issues.py`                                     |
| `secrets-scan.sh`           | Scans the codebase for potential secrets and credentials                         | `./scripts/secrets-scan.sh`                                                  |
| `security-scan.sh`          | Runs comprehensive security scans                                                | `./scripts/security-scan.sh`                                                 |

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
