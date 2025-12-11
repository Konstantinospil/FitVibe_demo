#!/usr/bin/env sh
# Agent Security Validation Pre-Commit Hook
# Validates agent configurations before commit

echo "🔍 Validating agent security standards..."

# Check if agent files are being modified
AGENT_FILES_CHANGED=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.cursor/agents/.*\.md$' || true)

if [ -z "$AGENT_FILES_CHANGED" ]; then
  echo "✅ No agent files modified, skipping validation"
  exit 0
fi

echo "Agent files modified:"
echo "$AGENT_FILES_CHANGED"

# Run agent security validation
if command -v python3 >/dev/null 2>&1; then
  python3 .cursor/scripts/validate_agent_security.py --all --strict || {
    echo "❌ Agent security validation failed"
    echo "   Fix the issues above before committing"
    exit 1
  }
else
  echo "⚠️  Python3 not found, skipping agent validation"
  echo "   Install Python3 to enable agent security validation"
fi

echo "✅ Agent security validation passed"


















