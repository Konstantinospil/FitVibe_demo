#!/usr/bin/env bash
# Script to push commits to specified branch based on commit message directive
# Usage: ./scripts/git-push-branch.sh
# Commit message format: [push:dev], [push:stage], or [push:main]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the latest commit message
COMMIT_MSG=$(git log -1 --pretty=%B)
COMMIT_SHA=$(git rev-parse HEAD)

# Parse commit message for branch directive
TARGET_BRANCH=""
if echo "$COMMIT_MSG" | grep -qE '\[push:(dev|stage|main)\]'; then
  TARGET_BRANCH=$(echo "$COMMIT_MSG" | grep -oE '\[push:(dev|stage|main)\]' | sed 's/\[push://;s/\]//')
fi

# If no directive found, check for alternative formats
if [ -z "$TARGET_BRANCH" ]; then
  if echo "$COMMIT_MSG" | grep -qiE '(push to dev|deploy to dev)'; then
    TARGET_BRANCH="dev"
  elif echo "$COMMIT_MSG" | grep -qiE '(push to stage|deploy to stage|push to staging|deploy to staging)'; then
    TARGET_BRANCH="stage"
  elif echo "$COMMIT_MSG" | grep -qiE '(push to main|deploy to main|push to prod|deploy to prod|push to production|deploy to production)'; then
    TARGET_BRANCH="main"
  fi
fi

# If still no branch found, exit with message and failure status
if [ -z "$TARGET_BRANCH" ]; then
  echo -e "${YELLOW}No branch directive found in commit message.${NC}"
  echo -e "${YELLOW}Use format: [push:dev], [push:stage], or [push:main]${NC}"
  echo -e "${YELLOW}Or include: 'push to dev', 'push to stage', or 'push to main'${NC}"
  exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# If already on target branch, just push
if [ "$CURRENT_BRANCH" = "$TARGET_BRANCH" ]; then
  echo -e "${GREEN}Already on $TARGET_BRANCH branch. Pushing...${NC}"
  git push origin "$TARGET_BRANCH"
  exit 0
fi

# Store the original branch name before any checkout operations
ORIGINAL_BRANCH="$CURRENT_BRANCH"

# Fetch latest from remote to ensure we have up-to-date branch info
echo -e "${GREEN}Fetching latest from origin...${NC}"
git fetch origin "$TARGET_BRANCH" 2>/dev/null || true

# Check if target branch exists locally or on remote
TARGET_EXISTS_LOCALLY=false
TARGET_EXISTS_REMOTE=false

if git show-ref --verify --quiet refs/heads/"$TARGET_BRANCH"; then
  TARGET_EXISTS_LOCALLY=true
fi

if git ls-remote --heads origin "$TARGET_BRANCH" | grep -q "$TARGET_BRANCH"; then
  TARGET_EXISTS_REMOTE=true
fi

# Check if commit is already in target branch history (prevents duplicates)
COMMIT_IN_TARGET=false
if [ "$TARGET_EXISTS_LOCALLY" = true ]; then
  if git branch --contains "$COMMIT_SHA" 2>/dev/null | grep -q "\b$TARGET_BRANCH\b"; then
    COMMIT_IN_TARGET=true
  fi
elif [ "$TARGET_EXISTS_REMOTE" = true ]; then
  if git branch -r --contains "$COMMIT_SHA" 2>/dev/null | grep -q "origin/$TARGET_BRANCH"; then
    COMMIT_IN_TARGET=true
  fi
fi

# If commit is already in target branch, just push
if [ "$COMMIT_IN_TARGET" = true ]; then
  echo -e "${GREEN}Commit $COMMIT_SHA is already in $TARGET_BRANCH branch.${NC}"
  # Switch to target branch to push
  if [ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]; then
    if [ "$TARGET_EXISTS_LOCALLY" = true ]; then
      git checkout "$TARGET_BRANCH"
    else
      git checkout -b "$TARGET_BRANCH" "origin/$TARGET_BRANCH"
    fi
  fi
  git push origin "$TARGET_BRANCH" || {
    echo -e "${RED}Failed to push to $TARGET_BRANCH. Check your permissions and remote configuration.${NC}"
    exit 1
  }
  # Switch back to original branch
  if [ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]; then
    git checkout "$CURRENT_BRANCH"
  fi
  echo -e "${GREEN}✓ Successfully pushed to $TARGET_BRANCH branch${NC}"
  exit 0
fi

# Checkout target branch (create if needed)
if [ "$TARGET_EXISTS_LOCALLY" = true ]; then
  echo -e "${GREEN}Switching to existing local branch: $TARGET_BRANCH${NC}"
  git checkout "$TARGET_BRANCH"
  git pull origin "$TARGET_BRANCH" 2>/dev/null || true
elif [ "$TARGET_EXISTS_REMOTE" = true ]; then
  echo -e "${GREEN}Branch $TARGET_BRANCH exists on remote. Checking out...${NC}"
  git checkout -b "$TARGET_BRANCH" "origin/$TARGET_BRANCH" 2>/dev/null || git checkout "$TARGET_BRANCH"
  git pull origin "$TARGET_BRANCH" 2>/dev/null || true
else
  echo -e "${GREEN}Creating new branch: $TARGET_BRANCH${NC}"
  git checkout -b "$TARGET_BRANCH"
fi

# Apply the commit using the best strategy to avoid duplicates
echo -e "${GREEN}Applying commit $COMMIT_SHA to $TARGET_BRANCH...${NC}"

# Check if commit is already an ancestor of current HEAD (double-check after checkout)
if git merge-base --is-ancestor "$COMMIT_SHA" HEAD 2>/dev/null; then
  echo -e "${GREEN}✓ Commit is already in branch history${NC}"
else
  # Strategy 1: Try fast-forward merge first (cleanest, preserves linear history)
  if git merge --ff-only "$ORIGINAL_BRANCH" 2>/dev/null; then
    echo -e "${GREEN}✓ Successfully fast-forwarded $TARGET_BRANCH${NC}"
  # Strategy 2: Try regular merge (creates merge commit, preserves original commit SHA)
  elif git merge --no-edit --no-ff "$ORIGINAL_BRANCH" 2>/dev/null; then
    echo -e "${GREEN}✓ Successfully merged $ORIGINAL_BRANCH into $TARGET_BRANCH${NC}"
  # Strategy 3: Cherry-pick only the specific commit as last resort
  else
    echo -e "${YELLOW}Merge not possible (branches may have diverged).${NC}"
    echo -e "${YELLOW}Attempting to cherry-pick only the specified commit...${NC}"

    # Check if we can cherry-pick from original branch
    if git cherry-pick "$COMMIT_SHA" 2>/dev/null; then
      echo -e "${YELLOW}⚠ Applied commit via cherry-pick (creates duplicate commit SHA).${NC}"
      echo -e "${YELLOW}Consider using 'git merge' or 'git rebase' for a cleaner history.${NC}"
    else
      # Cherry-pick failed, provide helpful error message
      echo -e "${RED}Failed to apply commit to $TARGET_BRANCH.${NC}"
      echo -e "${RED}You may need to resolve conflicts manually.${NC}"
      echo -e "${YELLOW}To resolve conflicts:${NC}"
      echo -e "${YELLOW}  1. Resolve conflicts in the files${NC}"
      echo -e "${YELLOW}  2. Stage resolved files: git add <files>${NC}"
      echo -e "${YELLOW}  3. Continue: git cherry-pick --continue${NC}"
      echo -e "${YELLOW}  4. Or abort: git cherry-pick --abort${NC}"
      exit 1
    fi
  fi
fi

# Push to remote
echo -e "${GREEN}Pushing to origin/$TARGET_BRANCH...${NC}"
git push origin "$TARGET_BRANCH" || {
  echo -e "${RED}Failed to push to $TARGET_BRANCH. Check your permissions and remote configuration.${NC}"
  exit 1
}

echo -e "${GREEN}✓ Successfully pushed to $TARGET_BRANCH branch${NC}"

# Switch back to original branch if different
if [ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]; then
  echo -e "${GREEN}Switching back to $CURRENT_BRANCH...${NC}"
  git checkout "$CURRENT_BRANCH"
fi

