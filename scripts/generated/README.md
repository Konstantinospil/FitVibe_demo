# Generated GitHub Issues

This directory contains generated files for creating GitHub issues from user stories.

## Files

- **`create_github_issues.sh`**: Bash script with GitHub CLI commands to create issues
- **`github_issues.json`**: JSON file with all issue data for API import

## Usage

### Option 1: Using GitHub CLI (Recommended)

1. Install GitHub CLI if not already installed:

   ```bash
   # macOS
   brew install gh

   # Windows (with Chocolatey)
   choco install gh

   # Linux
   # See https://github.com/cli/cli/blob/trunk/docs/install_linux.md
   ```

2. Authenticate with GitHub:

   ```bash
   gh auth login
   ```

3. Review the generated script:

   ```bash
   cat scripts/generated/create_github_issues.sh
   ```

4. Run the script to create issues:
   ```bash
   bash scripts/generated/create_github_issues.sh
   ```

### Option 2: Using GitHub API (Python Script)

1. Create a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo` (full control of private repositories)
   - Copy the token

2. Set the token as an environment variable:

   ```bash
   # macOS/Linux
   export GITHUB_TOKEN=your_token_here

   # Windows (PowerShell)
   $env:GITHUB_TOKEN="your_token_here"

   # Windows (CMD)
   set GITHUB_TOKEN=your_token_here
   ```

3. Run the Python script:
   ```bash
   python scripts/create_issues_via_api.py
   ```

### Option 3: Manual Creation

1. Review the JSON file:

   ```bash
   cat scripts/generated/github_issues.json
   ```

2. Use the GitHub web interface or API to create issues manually

## Project Board

The issues will be automatically added to GitHub Project #1 if:

- The project exists
- You have the correct permissions
- The project ID is correctly configured

To verify the project:

- Visit: https://github.com/users/Konstantinospil/projects/1

## Labels

The script automatically creates the following labels:

### Priority Labels

- `priority:high` - High priority issues
- `priority:medium` - Medium priority issues
- `priority:low` - Low priority issues

### Epic Labels

- `epic:profile-settings` - Epic 1: Profile & Settings
- `epic:exercise-library` - Epic 2: Exercise Library
- `epic:sharing-community` - Epic 3: Sharing & Community
- `epic:planner` - Epic 4: Planner Completion
- `epic:logging-import` - Epic 5: Logging & Import
- `epic:privacy-gdpr` - Epic 6: Privacy & GDPR
- `epic:performance` - Epic 7: Performance Optimization
- `epic:accessibility` - Epic 8: Accessibility
- `epic:observability` - Epic 9: Observability
- `epic:availability-backups` - Epic 10: Availability & Backups
- `epic:technical-debt` - Epic 11: Technical Debt & Code Quality

### Type Labels

- `type:backend` - Backend work
- `type:frontend` - Frontend work
- `type:testing` - Testing work
- `type:infrastructure` - Infrastructure work
- `type:documentation` - Documentation work
- `type:user-story` - User story issue

## Regenerating Issues

If you update `USER_STORIES.md`, regenerate the issues:

```bash
python scripts/generate_github_issues.py
```

This will update both the shell script and JSON file.

## Troubleshooting

### GitHub CLI not found

- Install GitHub CLI (see Option 1 above)
- Or use the Python API script (Option 2)

### Authentication errors

- Make sure you're authenticated: `gh auth status`
- Re-authenticate if needed: `gh auth login`

### Rate limiting

- GitHub API allows 5000 requests/hour for authenticated users
- The script includes delays to avoid rate limiting
- If you hit rate limits, wait and retry

### Project not found

- Verify the project exists at: https://github.com/users/Konstantinospil/projects/1
- Update `PROJECT_NUMBER` in the scripts if needed
- Project ID lookup requires GraphQL API access

### Labels not created

- Labels are created automatically by the API script
- For CLI script, create labels manually or use: `gh label create <name>`

## Notes

- Issues are created with titles in format: `US-X.Y: <description>`
- Each issue includes the full user story, activities, dependencies, and acceptance criteria
- Issues are automatically labeled based on epic, priority, and type
- The script creates labels if they don't exist (API script only)
