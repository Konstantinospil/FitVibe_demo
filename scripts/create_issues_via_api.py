#!/usr/bin/env python3
"""
Create GitHub issues via API from generated JSON.

This script uses the GitHub API to create issues in bulk.
Requires a GitHub personal access token with 'repo' scope.
"""

import json
import os
import sys
import requests
from pathlib import Path
from typing import List, Dict, Optional

# GitHub repository
REPO = "Konstantinospil/FitVibe_demo"
PROJECT_NUMBER = 1  # Update if needed

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


def create_label_if_not_exists(session: requests.Session, token: str, label: str, color: str = "0e8a16"):
    """Create a label if it doesn't exist."""
    url = f"{API_BASE}/repos/{REPO}/labels/{label}"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }

    # Check if label exists
    response = session.get(url, headers=headers)
    if response.status_code == 200:
        return  # Label exists

    # Create label
    data = {
        "name": label,
        "color": color,
        "description": f"Label for {label}",
    }
    response = session.post(
        f"{API_BASE}/repos/{REPO}/labels",
        headers=headers,
        json=data
    )
    if response.status_code == 201:
        print(f"Created label: {label}")
    elif response.status_code != 422:  # 422 means label already exists
        print(f"Warning: Could not create label {label}: {response.status_code}")


def ensure_labels_exist(session: requests.Session, token: str, issues: List[Dict]):
    """Ensure all labels exist in the repository."""
    labels = set()
    for issue in issues:
        labels.update(issue.get("labels", []))

    # Color mapping for label types
    label_colors = {
        "priority:high": "d73a4a",
        "priority:medium": "fbca04",
        "priority:low": "0e8a16",
        "type:backend": "1d76db",
        "type:frontend": "0e8a16",
        "type:testing": "b60205",
        "type:infrastructure": "5319e7",
        "type:documentation": "c5def5",
        "type:user-story": "0052cc",
    }

    # Default color for epic labels
    epic_color = "7057ff"

    print("Ensuring labels exist...")
    for label in sorted(labels):
        if label.startswith("epic:"):
            color = epic_color
        else:
            color = label_colors.get(label, "0e8a16")
        create_label_if_not_exists(session, token, label, color)


def create_issue(session: requests.Session, token: str, issue: Dict) -> Optional[Dict]:
    """Create a GitHub issue."""
    url = f"{API_BASE}/repos/{REPO}/issues"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }

    data = {
        "title": issue["title"],
        "body": issue["body"],
        "labels": issue["labels"],
    }

    response = session.post(url, headers=headers, json=data)

    if response.status_code == 201:
        issue_data = response.json()
        print(f"✓ Created issue: {issue['title']} (#{issue_data['number']})")
        return issue_data
    else:
        print(f"✗ Failed to create issue: {issue['title']}")
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.text}")
        return None


def add_issue_to_project(session: requests.Session, token: str, issue_number: int, project_id: str):
    """Add an issue to a GitHub project."""
    # This requires GraphQL API
    query = """
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
        item {
          id
        }
      }
    }
    """

    # Get issue node ID first
    issue_query = """
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $number) {
          id
        }
      }
    }
    """

    graphql_url = "https://api.github.com/graphql"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json",
    }

    # Extract owner and repo
    owner, repo = REPO.split("/")

    # Get issue node ID
    variables = {
        "owner": owner,
        "repo": repo,
        "number": issue_number,
    }

    response = session.post(
        graphql_url,
        headers=headers,
        json={"query": issue_query, "variables": variables}
    )

    if response.status_code != 200:
        print(f"  Warning: Could not get issue node ID: {response.status_code}")
        return

    data = response.json()
    if "errors" in data:
        print(f"  Warning: GraphQL errors: {data['errors']}")
        return

    issue_node_id = data.get("data", {}).get("repository", {}).get("issue", {}).get("id")
    if not issue_node_id:
        print(f"  Warning: Could not find issue node ID")
        return

    # Add to project
    variables = {
        "projectId": project_id,
        "contentId": issue_node_id,
    }

    response = session.post(
        graphql_url,
        headers=headers,
        json={"query": query, "variables": variables}
    )

    if response.status_code == 200:
        print(f"  Added to project")
    else:
        print(f"  Warning: Could not add to project: {response.status_code}")


def get_project_id(session: requests.Session, token: str, project_number: int) -> Optional[str]:
    """Get project ID from project number."""
    # This requires GraphQL API
    query = """
    query($owner: String!, $number: Int!) {
      organization(login: $owner) {
        projectV2(number: $number) {
          id
        }
      }
      user(login: $owner) {
        projectV2(number: $number) {
          id
        }
      }
    }
    """

    graphql_url = "https://api.github.com/graphql"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json",
    }

    owner = REPO.split("/")[0]

    variables = {
        "owner": owner,
        "number": project_number,
    }

    response = session.post(
        graphql_url,
        headers=headers,
        json={"query": query, "variables": variables}
    )

    if response.status_code != 200:
        return None

    data = response.json()
    if "errors" in data:
        return None

    # Try organization first, then user
    org_project = data.get("data", {}).get("organization", {}).get("projectV2")
    if org_project:
        return org_project.get("id")

    user_project = data.get("data", {}).get("user", {}).get("projectV2")
    if user_project:
        return user_project.get("id")

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

    print(f"Loading issues from {json_file}...")
    with open(json_file, "r", encoding="utf-8") as f:
        issues = json.load(f)

    print(f"Found {len(issues)} issues to create")

    # Confirm
    response = input(f"\nCreate {len(issues)} issues in {REPO}? (yes/no): ")
    if response.lower() not in ["yes", "y"]:
        print("Cancelled")
        return 0

    # Create session
    session = requests.Session()

    # Ensure labels exist
    ensure_labels_exist(session, token, issues)

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
    print(f"\nCreating issues...")
    created = 0
    failed = 0

    for i, issue in enumerate(issues, 1):
        print(f"[{i}/{len(issues)}] ", end="")
        result = create_issue(session, token, issue)

        if result:
            created += 1
            # Add to project if project ID is available
            if project_id:
                add_issue_to_project(session, token, result["number"], project_id)
        else:
            failed += 1

        # Rate limiting: GitHub allows 5000 requests/hour for authenticated users
        # We'll add a small delay to be safe
        import time
        time.sleep(0.5)

    print(f"\nSummary:")
    print(f"  Created: {created}")
    print(f"  Failed: {failed}")
    print(f"  Total: {len(issues)}")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    exit(main())

