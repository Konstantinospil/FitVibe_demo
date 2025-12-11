#!/usr/bin/env python3
"""
Update GitHub issues with implementation status based on codebase analysis.
"""

import json
import os
import sys
import requests
from pathlib import Path
from typing import Dict, List, Optional

# GitHub repository
REPO = "Konstantinospil/FitVibe_demo"
API_BASE = "https://api.github.com"

# Status mapping
STATUS_LABELS = {
    "done": "status:done",
    "in_progress": "status:in-progress",
    "not_started": "status:not-started",
}

# Story status from analysis
STORY_STATUS = {
    # Epic 1
    "US-1.1": "in_progress",
    "US-1.2": "done",
    "US-1.3": "in_progress",
    # Epic 2
    "US-2.1": "done",
    "US-2.2": "done",
    "US-2.3": "in_progress",
    "US-2.4": "done",
    "US-2.5": "in_progress",
    "US-2.6": "in_progress",
    # Epic 3
    "US-3.1": "done",
    "US-3.2": "done",
    "US-3.3": "done",
    "US-3.4": "done",
    "US-3.5": "done",
    "US-3.6": "done",
    "US-3.7": "in_progress",
    "US-3.8": "in_progress",
    # Epic 4
    "US-4.1": "done",
    "US-4.2": "in_progress",
    "US-4.3": "in_progress",
    "US-4.4": "not_started",
    "US-4.5": "in_progress",
    # Epic 5
    "US-5.1": "done",
    "US-5.2": "not_started",
    "US-5.3": "not_started",
    "US-5.4": "in_progress",
    "US-5.5": "not_started",
    "US-5.6": "not_started",
    # Epic 6
    "US-6.1": "done",
    "US-6.2": "done",
    "US-6.3": "in_progress",
    "US-6.4": "in_progress",
    "US-6.5": "done",
    "US-6.6": "in_progress",
    # Epic 7
    "US-7.1": "in_progress",
    "US-7.2": "in_progress",
    "US-7.3": "in_progress",
    "US-7.4": "in_progress",
    "US-7.5": "in_progress",
    "US-7.6": "in_progress",
    "US-7.7": "in_progress",
    "US-7.8": "in_progress",
    # Epic 8
    "US-8.1": "in_progress",
    "US-8.2": "in_progress",
    "US-8.3": "in_progress",
    "US-8.4": "in_progress",
    "US-8.5": "in_progress",
    "US-8.6": "in_progress",
    "US-8.7": "in_progress",
    # Epic 9
    "US-9.1": "in_progress",
    "US-9.2": "in_progress",
    "US-9.3": "in_progress",
    "US-9.4": "in_progress",
    "US-9.5": "in_progress",
    "US-9.6": "in_progress",
    # Epic 10
    "US-10.1": "in_progress",
    "US-10.2": "in_progress",
    "US-10.3": "in_progress",
    "US-10.4": "done",
    "US-10.5": "in_progress",
    # Epic 11
    "US-11.1": "done",
    "US-11.2": "in_progress",
    "US-11.3": "done",
    "US-11.4": "done",
    "US-11.5": "in_progress",
}


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


def create_label_if_not_exists(session: requests.Session, token: str, label: str, color: str):
    """Create a label if it doesn't exist."""
    url = f"{API_BASE}/repos/{REPO}/labels/{label}"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }
    
    response = session.get(url, headers=headers)
    if response.status_code == 200:
        return
    
    data = {
        "name": label,
        "color": color,
        "description": f"Status: {label.replace('status:', '').replace('-', ' ').title()}",
    }
    response = session.post(
        f"{API_BASE}/repos/{REPO}/labels",
        headers=headers,
        json=data
    )
    if response.status_code == 201:
        print(f"Created label: {label}")
    elif response.status_code != 422:
        print(f"Warning: Could not create label {label}: {response.status_code}")


def get_all_issues(session: requests.Session, token: str) -> List[Dict]:
    """Get all issues from the repository."""
    url = f"{API_BASE}/repos/{REPO}/issues"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }
    
    issues = []
    page = 1
    per_page = 100
    
    while True:
        params = {"state": "all", "page": page, "per_page": per_page}
        response = session.get(url, headers=headers, params=params)
        
        if response.status_code != 200:
            print(f"Error fetching issues: {response.status_code}")
            break
        
        page_issues = response.json()
        if not page_issues:
            break
        
        issues.extend(page_issues)
        
        if len(page_issues) < per_page:
            break
        
        page += 1
    
    return issues


def extract_story_id(title: str) -> Optional[str]:
    """Extract story ID from issue title."""
    match = re.match(r"US-(\d+)\.(\d+)", title)
    if match:
        return f"US-{match.group(1)}.{match.group(2)}"
    return None


def update_issue_labels(session: requests.Session, token: str, issue_number: int, story_id: str):
    """Update issue labels with status."""
    if story_id not in STORY_STATUS:
        return
    
    status = STORY_STATUS[story_id]
    status_label = STATUS_LABELS[status]
    
    # Get current issue
    url = f"{API_BASE}/repos/{REPO}/issues/{issue_number}"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }
    
    response = session.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Error fetching issue #{issue_number}: {response.status_code}")
        return
    
    issue = response.json()
    current_labels = [label["name"] for label in issue.get("labels", [])]
    
    # Remove old status labels
    new_labels = [l for l in current_labels if not l.startswith("status:")]
    new_labels.append(status_label)
    
    # Update issue
    data = {"labels": new_labels}
    response = session.patch(url, headers=headers, json=data)
    
    if response.status_code == 200:
        print(f"✓ Updated issue #{issue_number} ({story_id}): {status_label}")
    else:
        print(f"✗ Failed to update issue #{issue_number}: {response.status_code}")


def add_status_comment(session: requests.Session, token: str, issue_number: int, story_id: str, status: str):
    """Add a comment with implementation status."""
    if story_id not in STORY_STATUS:
        return
    
    status_emoji = {
        "done": "✅",
        "in_progress": "🚧",
        "not_started": "❌",
    }
    
    emoji = status_emoji.get(status, "📝")
    comment = f"""{emoji} **Implementation Status: {status.replace('_', ' ').title()}**

This issue has been analyzed against the current codebase. Status updated based on implementation review.

See [STORY_IMPLEMENTATION_STATUS.md](../../STORY_IMPLEMENTATION_STATUS.md) for detailed analysis.
"""
    
    url = f"{API_BASE}/repos/{REPO}/issues/{issue_number}/comments"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }
    
    data = {"body": comment}
    response = session.post(url, headers=headers, json=data)
    
    if response.status_code == 201:
        print(f"  Added status comment")
    else:
        print(f"  Warning: Could not add comment: {response.status_code}")


def main():
    """Main function."""
    token = get_github_token()
    if not token:
        return 1
    
    session = requests.Session()
    
    # Ensure status labels exist
    print("Ensuring status labels exist...")
    label_colors = {
        "status:done": "0e8a16",  # Green
        "status:in-progress": "fbca04",  # Yellow
        "status:not-started": "d73a4a",  # Red
    }
    
    for label, color in label_colors.items():
        create_label_if_not_exists(session, token, label, color)
    
    # Get all issues
    print("\nFetching issues...")
    issues = get_all_issues(session, token)
    print(f"Found {len(issues)} issues")
    
    # Match issues to stories
    print("\nUpdating issue statuses...")
    updated = 0
    not_found = []
    
    for issue in issues:
        title = issue.get("title", "")
        story_id = extract_story_id(title)
        
        if story_id and story_id in STORY_STATUS:
            status = STORY_STATUS[story_id]
            update_issue_labels(session, token, issue["number"], story_id)
            # Optionally add comment (commented out to avoid spam)
            # add_status_comment(session, token, issue["number"], story_id, status)
            updated += 1
            import time
            time.sleep(0.3)  # Rate limiting
        elif story_id:
            not_found.append(story_id)
    
    print(f"\nSummary:")
    print(f"  Updated: {updated} issues")
    if not_found:
        print(f"  Not found in status map: {len(not_found)} stories")
        for story_id in not_found[:5]:
            print(f"    - {story_id}")
    
    return 0


if __name__ == "__main__":
    import re
    exit(main())

