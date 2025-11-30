#!/usr/bin/env python3
"""
Upload only missing GitHub issues.

This script checks which issues are already on GitHub and uploads only the missing ones.
"""

import json
import os
import sys
import requests
from pathlib import Path
from typing import List, Dict, Optional, Set

# Import functions from create_issues_via_api
sys.path.insert(0, str(Path(__file__).parent))
from create_issues_via_api import (
    get_github_token,
    ensure_labels_exist,
    create_issue,
    add_issue_to_project,
    get_project_id,
    REPO,
    PROJECT_NUMBER,
    API_BASE,
)


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
            "state": "all",
            "per_page": per_page,
            "page": page,
        }
        response = session.get(url, headers=headers, params=params)

        if response.status_code != 200:
            print(f"Error fetching issues: {response.status_code}")
            break

        issues = response.json()
        if not issues:
            break

        # Filter out pull requests
        issues = [issue for issue in issues if "pull_request" not in issue]
        all_issues.extend(issues)

        if len(issues) < per_page:
            break

        page += 1

    return all_issues


def extract_story_id(title: str) -> Optional[str]:
    """Extract story ID from issue title."""
    if ":" in title:
        prefix = title.split(":")[0].strip()
        if prefix.startswith("US-") and "." in prefix:
            return prefix
    return None


def filter_missing_issues(expected_issues: List[Dict], existing_issues: List[Dict]) -> List[Dict]:
    """Filter expected issues to only include those not already on GitHub."""
    existing_story_ids: Set[str] = set()
    for issue in existing_issues:
        story_id = extract_story_id(issue["title"])
        if story_id:
            existing_story_ids.add(story_id)

    missing = []
    for issue in expected_issues:
        story_id = extract_story_id(issue["title"])
        if story_id and story_id not in existing_story_ids:
            missing.append(issue)

    return missing


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

    print(f"Loading issues from {json_file}...")
    with open(json_file, "r", encoding="utf-8") as f:
        all_issues = json.load(f)

    print(f"Found {len(all_issues)} total issues in JSON")

    # Get existing issues from GitHub
    print(f"\nFetching existing issues from GitHub repository {REPO}...")
    session = requests.Session()
    existing_issues = get_all_issues(session, token)
    print(f"Found {len(existing_issues)} existing issues in repository")

    # Filter to only missing issues
    missing_issues = filter_missing_issues(all_issues, existing_issues)
    print(f"\nFound {len(missing_issues)} missing issues to create")

    if not missing_issues:
        print("\n[OK] All issues are already on GitHub!")
        return 0

    # Show what will be created
    print("\nIssues to create:")
    for issue in missing_issues:
        story_id = extract_story_id(issue["title"])
        print(f"  - {story_id}: {issue['title']}")

    # Confirm
    response = input(f"\nCreate {len(missing_issues)} missing issues in {REPO}? (yes/no): ")
    if response.lower() not in ["yes", "y"]:
        print("Cancelled")
        return 0

    # Ensure labels exist
    ensure_labels_exist(session, token, missing_issues)

    # Get project ID if project number is set
    project_id = None
    if PROJECT_NUMBER:
        print(f"\nGetting project ID for project #{PROJECT_NUMBER}...")
        project_id = get_project_id(session, token, PROJECT_NUMBER)
        if project_id:
            print(f"Found project ID: {project_id}")
        else:
            print("Warning: Could not find project ID. Issues will not be added to project.")

    # Create issues
    print(f"\nCreating {len(missing_issues)} issues...")
    created = 0
    failed = 0

    for i, issue in enumerate(missing_issues, 1):
        story_id = extract_story_id(issue["title"])
        print(f"[{i}/{len(missing_issues)}] {story_id}: ", end="")
        result = create_issue(session, token, issue)

        if result:
            created += 1
            # Add to project if project ID is available
            if project_id:
                add_issue_to_project(session, token, result["number"], project_id)
        else:
            failed += 1

        # Rate limiting
        import time
        time.sleep(0.5)

    print(f"\nSummary:")
    print(f"  Created: {created}")
    print(f"  Failed: {failed}")
    print(f"  Total: {len(missing_issues)}")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    exit(main())



