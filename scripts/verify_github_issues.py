#!/usr/bin/env python3
"""
Verify which GitHub issues have been created.

This script compares the expected issues from github_issues.json
with the actual issues in the GitHub repository.
"""

import json
import os
import requests
from pathlib import Path
from typing import List, Dict, Set, Optional

# GitHub repository
REPO = "Konstantinospil/FitVibe_demo"

# API base URL
API_BASE = "https://api.github.com"


def get_github_token() -> Optional[str]:
    """Get GitHub token from environment or prompt."""
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        print("GITHUB_TOKEN environment variable not set.")
        print("\nTo create a token:")
        print("1. Visit: https://github.com/settings/tokens")
        print("2. Click 'Generate new token (classic)'")
        print("3. Select 'repo' scope")
        print("4. Copy the token")
        print("\nYou can either:")
        print("  - Set it: export GITHUB_TOKEN=your_token")
        print("  - Or enter it now (will not be saved):")

        try:
            token = input("\nEnter your GitHub token: ").strip()
            if not token:
                print("No token provided. Exiting.")
                return None
            return token
        except (EOFError, KeyboardInterrupt):
            print("\nCancelled.")
            return None
    return token


def get_all_issues(session: requests.Session, token: str) -> List[Dict]:
    """Get all issues from the repository."""
    url = f"{API_BASE}/repos/{REPO}/issues"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }

    all_issues = []
    page = 1
    per_page = 100

    while True:
        params = {
            "state": "all",  # Get both open and closed issues
            "per_page": per_page,
            "page": page,
        }
        response = session.get(url, headers=headers, params=params)

        if response.status_code != 200:
            print(f"Error fetching issues: {response.status_code}")
            print(f"Response: {response.text}")
            break

        issues = response.json()
        if not issues:
            break

        # Filter out pull requests (they appear in issues endpoint)
        issues = [issue for issue in issues if "pull_request" not in issue]
        all_issues.extend(issues)

        if len(issues) < per_page:
            break

        page += 1

    return all_issues


def extract_story_id(title: str) -> Optional[str]:
    """Extract story ID from issue title (e.g., 'US-1.1' from 'US-1.1: ...')."""
    if ":" in title:
        prefix = title.split(":")[0].strip()
        if prefix.startswith("US-") and "." in prefix:
            return prefix
    return None


def main():
    """Main function."""
    token = get_github_token()
    if not token:
        return 1

    root_dir = Path(__file__).parent.parent
    json_file = root_dir / "scripts" / "generated" / "github_issues.json"

    if not json_file.exists():
        print(f"Error: {json_file} not found")
        print("Run generate_github_issues.py first")
        return 1

    print(f"Loading expected issues from {json_file}...")
    with open(json_file, "r", encoding="utf-8") as f:
        expected_issues = json.load(f)

    # Extract story IDs from expected issues
    expected_story_ids: Set[str] = set()
    expected_titles: Dict[str, str] = {}
    for issue in expected_issues:
        story_id = extract_story_id(issue["title"])
        if story_id:
            expected_story_ids.add(story_id)
            expected_titles[story_id] = issue["title"]

    print(f"Found {len(expected_story_ids)} expected user stories")

    # Get actual issues from GitHub
    print(f"\nFetching issues from GitHub repository {REPO}...")
    session = requests.Session()
    actual_issues = get_all_issues(session, token)

    print(f"Found {len(actual_issues)} issues in repository")

    # Extract story IDs from actual issues
    actual_story_ids: Set[str] = set()
    actual_titles: Dict[str, str] = {}
    for issue in actual_issues:
        story_id = extract_story_id(issue["title"])
        if story_id:
            actual_story_ids.add(story_id)
            actual_titles[story_id] = issue["title"]

    # Compare
    print("\n" + "=" * 60)
    print("VERIFICATION RESULTS")
    print("=" * 60)

    created = expected_story_ids & actual_story_ids
    missing = expected_story_ids - actual_story_ids
    extra = actual_story_ids - expected_story_ids

    print(f"\n[OK] Created: {len(created)}/{len(expected_story_ids)}")
    print(f"[X] Missing: {len(missing)}/{len(expected_story_ids)}")
    if extra:
        print(f"[!] Extra (not in expected list): {len(extra)}")

    if missing:
        print("\n" + "=" * 60)
        print("MISSING ISSUES (not yet created on GitHub):")
        print("=" * 60)
        for story_id in sorted(missing):
            print(f"  - {story_id}: {expected_titles[story_id]}")

    if created:
        print("\n" + "=" * 60)
        print("CREATED ISSUES (already on GitHub):")
        print("=" * 60)
        for story_id in sorted(created):
            print(f"  [OK] {story_id}: {actual_titles[story_id]}")

    if extra:
        print("\n" + "=" * 60)
        print("EXTRA ISSUES (on GitHub but not in expected list):")
        print("=" * 60)
        for story_id in sorted(extra):
            print(f"  [!] {story_id}: {actual_titles[story_id]}")

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total expected: {len(expected_story_ids)}")
    print(f"Total created: {len(created)}")
    print(f"Total missing: {len(missing)}")
    print(f"Completion: {len(created) * 100 // len(expected_story_ids) if expected_story_ids else 0}%")

    if missing:
        print("\n[!] Not all stories have been uploaded to GitHub!")
        print(f"   Run 'python scripts/create_issues_via_api.py' to create the missing {len(missing)} issues.")
        return 1
    else:
        print("\n[OK] All stories have been uploaded to GitHub!")
        return 0


if __name__ == "__main__":
    exit(main())

