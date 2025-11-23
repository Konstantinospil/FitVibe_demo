#!/bin/bash
# Helper script to create GitHub issues
# Usage: ./scripts/create_issues.sh [token]
#   Or: GITHUB_TOKEN=your_token ./scripts/create_issues.sh

if [ -z "$GITHUB_TOKEN" ] && [ -n "$1" ]; then
    export GITHUB_TOKEN="$1"
fi

if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GITHUB_TOKEN not set"
    echo ""
    echo "Usage:"
    echo "  GITHUB_TOKEN=your_token python scripts/create_issues_via_api.py"
    echo "  Or: python scripts/create_issues_via_api.py (will prompt for token)"
    echo ""
    echo "To create a token:"
    echo "  1. Visit: https://github.com/settings/tokens"
    echo "  2. Click 'Generate new token (classic)'"
    echo "  3. Select 'repo' scope"
    echo "  4. Copy the token"
    exit 1
fi

python scripts/create_issues_via_api.py

