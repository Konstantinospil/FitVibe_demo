#!/usr/bin/env bash
# Convenience script to commit and push to specified branch
# Usage: ./scripts/git-commit-and-push.sh "commit message" [dev|stage|main]
# Or: ./scripts/git-commit-and-push.sh "commit message [push:dev]"

set -euo pipefail

COMMIT_MSG="$1"
TARGET_BRANCH="${2:-}"

# If target branch is provided as second arg, add directive to commit message
if [ -n "$TARGET_BRANCH" ]; then
  COMMIT_MSG="$COMMIT_MSG [push:$TARGET_BRANCH]"
fi

# Stage all changes
echo "📦 Staging changes..."
git add -A

# Commit
echo "💾 Committing changes..."
git commit -m "$COMMIT_MSG"

# Push using the branch push script
echo "🚀 Pushing to specified branch..."
./scripts/git-push-branch.sh

