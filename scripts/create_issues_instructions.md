# Instructions for Creating GitHub Issues

Since GitHub CLI requires admin rights to install, we'll use the GitHub API directly (which is what Option 1 does under the hood).

## Quick Start

1. **Create a GitHub Personal Access Token**:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Name it: "FitVibe Issues Creation"
   - Select scope: `repo` (Full control of private repositories)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again)

2. **Set the token** (choose one method):

   **Windows Git Bash:**

   ```bash
   export GITHUB_TOKEN=your_token_here
   ```

   **Windows PowerShell:**

   ```powershell
   $env:GITHUB_TOKEN="your_token_here"
   ```

   **Windows CMD:**

   ```cmd
   set GITHUB_TOKEN=your_token_here
   ```

3. **Run the script**:
   ```bash
   python scripts/create_issues_via_api.py
   ```

The script will:

- ✅ Create all labels automatically
- ✅ Create all 65 issues
- ✅ Add issues to GitHub Project #1
- ✅ Show progress and summary

## Alternative: Manual Review

If you prefer to review before creating, you can:

1. Review the JSON file: `scripts/generated/github_issues.json`
2. Review the shell script: `scripts/generated/create_github_issues.sh`
3. Create issues manually via GitHub web interface

## Troubleshooting

- **Token not working**: Make sure you selected the `repo` scope
- **Rate limiting**: The script includes delays; if you hit limits, wait 1 hour
- **Project not found**: Verify project exists at https://github.com/users/Konstantinospil/projects/1
