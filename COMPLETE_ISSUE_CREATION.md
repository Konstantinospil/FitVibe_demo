# Complete GitHub Issues Creation Guide

## Current Status

✅ **All files are ready:**

- 65 user stories created in `USER_STORIES.md`
- Issue generation scripts created
- JSON and shell scripts generated
- Python API script ready

⏳ **Action Required:** Set up GitHub token and run script

## Step-by-Step Instructions

### Step 1: Create GitHub Personal Access Token

1. Go to: **https://github.com/settings/tokens**
2. Click: **"Generate new token (classic)"**
3. Fill in:
   - **Note**: `FitVibe Issues Creation`
   - **Expiration**: Choose your preference (90 days recommended)
   - **Scopes**: Check **`repo`** (Full control of private repositories)
4. Click: **"Generate token"**
5. **IMPORTANT**: Copy the token immediately (you won't see it again!)

### Step 2: Set Token in Your Terminal

**For Git Bash (current terminal):**

```bash
export GITHUB_TOKEN=your_token_here
```

**For PowerShell:**

```powershell
$env:GITHUB_TOKEN="your_token_here"
```

**For CMD:**

```cmd
set GITHUB_TOKEN=your_token_here
```

### Step 3: Verify Token is Set

```bash
# Check if token is set (will show first 10 chars)
echo ${GITHUB_TOKEN:0:10}...
```

### Step 4: Run the Script

```bash
python scripts/create_issues_via_api.py
```

The script will:

1. ✅ Load 65 issues from JSON
2. ✅ Ask for confirmation
3. ✅ Create all labels automatically
4. ✅ Create all 65 issues
5. ✅ Add issues to GitHub Project #1
6. ✅ Show progress and summary

### Expected Output

```
Loading issues from scripts/generated/github_issues.json...
Found 65 issues to create

Create 65 issues in Konstantinospil/FitVibe_demo? (yes/no): yes

Ensuring labels exist...
Created label: epic:profile-settings
Created label: priority:high
...

Getting project ID for project #1...
Found project ID: PVT_kwH...

Creating issues...
[1/65] ✓ Created issue: US-1.1: to edit my profile information... (#1)
  Added to project
[2/65] ✓ Created issue: US-1.2: to upload and manage my profile avatar... (#2)
  Added to project
...

Summary:
  Created: 65
  Failed: 0
  Total: 65
```

## Alternative: Manual Review First

If you want to review before creating:

1. **Review the issues:**

   ```bash
   # View JSON (first issue)
   cat scripts/generated/github_issues.json | python -m json.tool | head -50

   # View shell script (first few commands)
   head -20 scripts/generated/create_github_issues.sh
   ```

2. **Test with one issue first:**
   - Manually create one issue via GitHub web interface
   - Or modify the script to create only first issue

## Troubleshooting

### "GITHUB_TOKEN environment variable not set"

- Make sure you ran `export GITHUB_TOKEN=...` in the same terminal
- Verify with: `echo $GITHUB_TOKEN`

### "Bad credentials" or "401 Unauthorized"

- Token might be expired or invalid
- Make sure you selected `repo` scope
- Generate a new token

### "Not Found" (404)

- Repository might not exist or you don't have access
- Verify: https://github.com/Konstantinospil/FitVibe_demo

### "Project not found"

- Project might not exist
- Verify: https://github.com/users/Konstantinospil/projects/1
- Issues will still be created, just not added to project

### Rate Limiting

- GitHub allows 5000 requests/hour
- Script includes 0.5s delays between requests
- If you hit limits, wait 1 hour and retry

## What Gets Created

### Issues

- **65 user stories** as GitHub issues
- Each with proper title, body, labels
- Linked to epics and activities

### Labels (Auto-created)

- **Priority**: `priority:high`, `priority:medium`
- **Epic**: `epic:profile-settings`, `epic:exercise-library`, etc.
- **Type**: `type:backend`, `type:frontend`, `type:testing`, etc.

### Project Board

- All issues added to: https://github.com/users/Konstantinospil/projects/1
- Can be organized by epic, priority, or status

## Next Steps After Creation

1. ✅ Review issues in GitHub
2. ✅ Organize in project board
3. ✅ Fill in acceptance criteria
4. ✅ Assign to team members
5. ✅ Plan sprints based on story points

## Files Reference

- `USER_STORIES.md` - All 65 user stories
- `scripts/generated/github_issues.json` - Issue data
- `scripts/generated/create_github_issues.sh` - CLI commands (if you install gh CLI later)
- `scripts/create_issues_via_api.py` - Python API script (current method)
- `GITHUB_ISSUES_SETUP.md` - Full setup documentation

---

**Ready to create issues!** Follow Steps 1-4 above.
