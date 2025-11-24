#!/usr/bin/env python3
"""
Update GitHub issues with acceptance criteria from user stories.
"""

import json
import os
import re
import sys
import requests
from pathlib import Path
from typing import Dict, List, Optional

# GitHub repository
REPO = "Konstantinospil/FitVibe_demo"
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


def parse_acceptance_criteria(stories_file: Path) -> Dict[str, List[Dict]]:
    """Parse acceptance criteria from docs/USER_STORIES.md."""
    with open(stories_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    story_ac_map = {}
    current_story = None
    current_ac = None
    in_ac_section = False
    
    for line in content.split("\n"):
        # Match story header: ### US-X.X: Title
        story_match = re.match(r"^### (US-\d+\.\d+):", line)
        if story_match:
            current_story = story_match.group(1)
            story_ac_map[current_story] = []
            in_ac_section = False
            continue
        
        # Match Acceptance Criteria section
        if line.strip() == "**Acceptance Criteria:**":
            in_ac_section = True
            continue
        
        # Match AC line: - **US-X.X-ACXX**: Criterion...
        if in_ac_section and current_story and line.strip().startswith("- **"):
            ac_match = re.match(r"^- \*\*(US-\d+\.\d+-AC\d+)\*\*: (.+)$", line.strip())
            if ac_match:
                current_ac = {
                    "id": ac_match.group(1),
                    "criterion": ac_match.group(2).strip(),
                    "test_method": "",
                    "evidence": ""
                }
                story_ac_map[current_story].append(current_ac)
                continue
        
        # Match test method line
        if current_ac and line.strip().startswith("- Test Method:"):
            current_ac["test_method"] = line.strip().replace("- Test Method:", "").strip()
            continue
        
        # Match evidence line
        if current_ac and line.strip().startswith("- Evidence:"):
            current_ac["evidence"] = line.strip().replace("- Evidence:", "").strip()
            # Reset current_ac after evidence
            current_ac = None
            continue
        
        # Reset if we hit a new section
        if line.startswith("---") or (line.startswith("###") and not line.startswith("### US-")):
            in_ac_section = False
            current_ac = None
    
    return story_ac_map


def format_acceptance_criteria(acs: List[Dict]) -> str:
    """Format acceptance criteria as markdown."""
    if not acs:
        return ""
    
    lines = ["## Acceptance Criteria", ""]
    for ac in acs:
        lines.append(f"### {ac['id']}")
        lines.append("")
        lines.append(f"**Criterion**: {ac['criterion']}")
        lines.append("")
        if ac.get('test_method'):
            lines.append(f"- **Test Method**: {ac['test_method']}")
        if ac.get('evidence'):
            lines.append(f"- **Evidence Required**: {ac['evidence']}")
        lines.append("")
    
    return "\n".join(lines)


def fetch_issues(session: requests.Session, token: str) -> List[Dict]:
    """Fetch all issues from the repository."""
    url = f"{API_BASE}/repos/{REPO}/issues"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }
    
    issues = []
    page = 1
    per_page = 100
    
    while True:
        params = {
            "state": "all",
            "page": page,
            "per_page": per_page
        }
        response = session.get(url, headers=headers, params=params)
        
        if response.status_code != 200:
            print(f"Error fetching issues: {response.status_code}")
            print(f"Response: {response.text}")
            break
        
        page_issues = response.json()
        if not page_issues:
            break
        
        # Filter out pull requests
        issues.extend([issue for issue in page_issues if "pull_request" not in issue])
        
        if len(page_issues) < per_page:
            break
        
        page += 1
    
    return issues


def extract_story_id_from_issue(issue: Dict) -> Optional[str]:
    """Extract story ID from issue title or body."""
    title = issue.get("title", "")
    body = issue.get("body", "")
    
    # Try to find US-X.X pattern in title
    match = re.search(r"(US-\d+\.\d+)", title)
    if match:
        return match.group(1)
    
    # Try to find in body
    match = re.search(r"(US-\d+\.\d+)", body)
    if match:
        return match.group(1)
    
    return None


def update_issue_with_ac(session: requests.Session, token: str, issue: Dict, ac_text: str):
    """Update an issue with acceptance criteria."""
    issue_number = issue["number"]
    current_body = issue.get("body", "")
    
    # Check if AC section already exists
    if "## Acceptance Criteria" in current_body:
        # Replace existing AC section
        # Find the start and end of AC section
        ac_start = current_body.find("## Acceptance Criteria")
        if ac_start != -1:
            # Find the next ## section or end of body
            next_section = current_body.find("\n## ", ac_start + 1)
            if next_section != -1:
                new_body = current_body[:ac_start] + ac_text + "\n\n" + current_body[next_section:]
            else:
                new_body = current_body[:ac_start] + ac_text
        else:
            new_body = current_body + "\n\n" + ac_text
    else:
        # Append AC section
        new_body = current_body + "\n\n" + ac_text
    
    # Update issue
    url = f"{API_BASE}/repos/{REPO}/issues/{issue_number}"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }
    
    data = {
        "body": new_body
    }
    
    response = session.patch(url, headers=headers, json=data)
    
    if response.status_code == 200:
        print(f"✓ Updated issue #{issue_number} ({issue.get('title', 'N/A')})")
        return True
    else:
        print(f"✗ Failed to update issue #{issue_number}: {response.status_code}")
        print(f"  Response: {response.text}")
        return False


def main():
    """Main function."""
    root_dir = Path(__file__).parent.parent
    stories_file = root_dir / "docs" / "USER_STORIES.md"
    
    if not stories_file.exists():
        print(f"Error: {stories_file} not found")
        return 1
    
    # Get GitHub token
    token = get_github_token()
    if not token:
        return 1
    
    # Parse acceptance criteria
    print("Parsing acceptance criteria from USER_STORIES.md...")
    story_ac_map = parse_acceptance_criteria(stories_file)
    print(f"Found acceptance criteria for {len(story_ac_map)} stories")
    
    # Fetch issues
    print("\nFetching issues from GitHub...")
    session = requests.Session()
    issues = fetch_issues(session, token)
    print(f"Found {len(issues)} issues")
    
    # Update issues
    print("\nUpdating issues with acceptance criteria...")
    updated_count = 0
    not_found_count = 0
    
    for issue in issues:
        story_id = extract_story_id_from_issue(issue)
        if not story_id:
            continue
        
        if story_id in story_ac_map:
            ac_text = format_acceptance_criteria(story_ac_map[story_id])
            if ac_text and update_issue_with_ac(session, token, issue, ac_text):
                updated_count += 1
        else:
            not_found_count += 1
            print(f"⚠ No AC found for {story_id} (issue #{issue['number']})")
    
    print(f"\n✓ Updated {updated_count} issues")
    if not_found_count > 0:
        print(f"⚠ {not_found_count} issues had no matching acceptance criteria")
    
    return 0


if __name__ == "__main__":
    exit(main())




