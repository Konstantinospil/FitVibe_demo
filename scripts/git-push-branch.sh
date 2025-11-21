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

# If still no branch found, exit with message
if [ -z "$TARGET_BRANCH" ]; then
  echo -e "${YELLOW}No branch directive found in commit message.${NC}"
  echo -e "${YELLOW}Use format: [push:dev], [push:stage], or [push:main]${NC}"
  echo -e "${YELLOW}Or include: 'push to dev', 'push to stage', or 'push to main'${NC}"
  exit 0
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# If already on target branch, just push
if [ "$CURRENT_BRANCH" = "$TARGET_BRANCH" ]; then
  echo -e "${GREEN}Already on $TARGET_BRANCH branch. Pushing...${NC}"
  git push origin "$TARGET_BRANCH"
  exit 0
fi

# Check if target branch exists locally
if git show-ref --verify --quiet refs/heads/"$TARGET_BRANCH"; then
  echo -e "${GREEN}Switching to existing local branch: $TARGET_BRANCH${NC}"
  git checkout "$TARGET_BRANCH"
else
  # Check if branch exists on remote
  if git ls-remote --heads origin "$TARGET_BRANCH" | grep -q "$TARGET_BRANCH"; then
    echo -e "${GREEN}Branch $TARGET_BRANCH exists on remote. Checking out...${NC}"
    git fetch origin "$TARGET_BRANCH"
    git checkout -b "$TARGET_BRANCH" "origin/$TARGET_BRANCH"
  else
    echo -e "${GREEN}Creating new branch: $TARGET_BRANCH${NC}"
    git checkout -b "$TARGET_BRANCH"
  fi
fi

# Cherry-pick the commit if not already on this branch
if ! git log --oneline | grep -q "$COMMIT_SHA"; then
  echo -e "${GREEN}Applying commit $COMMIT_SHA to $TARGET_BRANCH...${NC}"
  git cherry-pick "$COMMIT_SHA" || {
    echo -e "${RED}Failed to cherry-pick commit. You may need to resolve conflicts manually.${NC}"
    exit 1
  }
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

