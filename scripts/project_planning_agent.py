#!/usr/bin/env python3
"""
Project Planning Agent

Automatically reads requirements from the requirements manager and generates:
- Epics from requirements
- User stories from epics/requirements
- Acceptance criteria from requirements
- GitHub issues from generated stories

Usage:
    python scripts/project_planning_agent.py --mode <epics|stories|ac|issues> --git-token <token> [options]
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Optional, Set
from datetime import datetime

# Import existing scripts
sys.path.insert(0, str(Path(__file__).parent))
from generate_github_issues import (
    parse_user_stories,
    generate_gh_cli_commands,
    generate_json_export,
    EPIC_LABELS,
    PRIORITY_LABELS,
)
from upload_missing_issues import (
    get_all_issues,
    extract_story_id,
    filter_missing_issues,
    get_github_token,
    ensure_labels_exist,
    create_issue,
    add_issue_to_project,
    get_project_id,
    REPO,
    PROJECT_NUMBER,
    API_BASE,
)
import requests

# Requirements paths
REQUIREMENTS_DIR = Path(__file__).parent.parent / "docs" / "1.Product_Requirements" / "Requirements"
REQUIREMENTS_CATALOGUE = Path(__file__).parent.parent / "docs" / "1.Product_Requirements" / "Requirements_Catalogue.md"
USER_STORIES_FILE = Path(__file__).parent.parent / "docs" / "USER_STORIES.md"
PROJECT_EPICS_FILE = Path(__file__).parent.parent / "docs" / "PROJECT_EPICS_AND_ACTIVITIES.md"


def parse_requirement_file(file_path: Path) -> Optional[Dict]:
    """Parse a single requirement markdown file."""
    if not file_path.exists():
        return None

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    requirement = {
        "id": None,
        "title": None,
        "type": None,
        "status": None,
        "priority": None,
        "gate": None,
        "owner": None,
        "acceptance_criteria": [],
        "content": content,
    }

    # Extract metadata from frontmatter or headers
    id_match = re.search(r"\*\*Requirement ID\*\*:\s*(\S+)", content)
    if id_match:
        requirement["id"] = id_match.group(1)

    title_match = re.search(r"\*\*Title\*\*:\s*(.+)", content)
    if title_match:
        requirement["title"] = title_match.group(1).strip()

    type_match = re.search(r"\*\*Type\*\*:\s*(.+)", content)
    if type_match:
        requirement["type"] = type_match.group(1).strip()

    status_match = re.search(r"\*\*Status\*\*:\s*(.+)", content)
    if status_match:
        requirement["status"] = status_match.group(1).strip()

    priority_match = re.search(r"\*\*Priority\*\*:\s*(.+)", content)
    if priority_match:
        requirement["priority"] = priority_match.group(1).strip()

    gate_match = re.search(r"\*\*Gate\*\*:\s*(.+)", content)
    if gate_match:
        requirement["gate"] = gate_match.group(1).strip()

    owner_match = re.search(r"\*\*Owner\*\*:\s*(.+)", content)
    if owner_match:
        requirement["owner"] = owner_match.group(1).strip()

    # Extract acceptance criteria
    ac_section = re.search(r"## Acceptance Criteria\s*\n(.*?)(?=\n##|\Z)", content, re.DOTALL)
    if ac_section:
        ac_text = ac_section.group(1)
        # Find all AC items
        ac_items = re.findall(r"###\s*(\S+)\s*\n\s*\*\*Criterion\*\*:\s*(.+?)(?=\n-|\n###|\Z)", ac_text, re.DOTALL)
        for ac_id, ac_desc in ac_items:
            requirement["acceptance_criteria"].append({
                "id": ac_id.strip(),
                "description": ac_desc.strip(),
            })

    return requirement if requirement["id"] else None


def get_all_requirements(status_filter: Optional[str] = None) -> List[Dict]:
    """Get all requirements from the requirements directory."""
    requirements = []

    status_dirs = ["open", "progressing", "done"]
    if status_filter:
        status_dirs = [status_filter] if status_filter in status_dirs else status_dirs

    for status_dir in status_dirs:
        status_path = REQUIREMENTS_DIR / status_dir
        if not status_path.exists():
            continue

        for req_file in status_path.glob("*.md"):
            if req_file.name == "README.md":
                continue

            requirement = parse_requirement_file(req_file)
            if requirement:
                requirements.append(requirement)

    return requirements


def generate_epic_from_requirement(requirement: Dict) -> Dict:
    """Generate an epic structure from a requirement."""
    req_id = requirement["id"]
    title = requirement["title"]
    priority = requirement.get("priority", "Medium")
    gate = requirement.get("gate", "SILVER")
    status = requirement.get("status", "Open")

    # Estimate story points based on number of ACs
    ac_count = len(requirement.get("acceptance_criteria", []))
    estimated_sp = max(5, min(20, ac_count * 2))

    epic = {
        "id": f"Epic {req_id}",
        "title": title,
        "requirement_id": req_id,
        "status": status,
        "priority": priority,
        "gate": gate,
        "estimated_sp": estimated_sp,
        "activities": [],
    }

    # Generate activities from acceptance criteria
    for idx, ac in enumerate(requirement.get("acceptance_criteria", []), 1):
        activity = {
            "id": f"E{req_id}-A{idx}",
            "description": ac["description"][:100] + "..." if len(ac["description"]) > 100 else ac["description"],
            "difficulty": 2,  # Default to Easy
            "dependencies": [req_id],
        }
        epic["activities"].append(activity)

    return epic


def generate_stories_from_requirement(requirement: Dict, epic_num: int) -> List[Dict]:
    """Generate user stories from a requirement."""
    stories = []
    req_id = requirement["id"]
    title = requirement["title"]
    acs = requirement.get("acceptance_criteria", [])

    if not acs:
        # Create a single story if no ACs
        story = {
            "id": f"US-{epic_num}.1",
            "title": f"Implement {title}",
            "as_a": "user",
            "i_want": f"to use {title.lower()}",
            "so_that": "I can benefit from this feature",
            "epic": f"Epic {epic_num}",
            "story_points": 5,
            "priority": requirement.get("priority", "Medium"),
            "dependencies": [req_id],
            "acceptance_criteria": [],
            "activities": [],
        }
        stories.append(story)
        return stories

    # Group ACs into logical stories (max 5 ACs per story)
    ac_groups = [acs[i:i + 5] for i in range(0, len(acs), 5)]

    for story_num, ac_group in enumerate(ac_groups, 1):
        story_id = f"US-{epic_num}.{story_num}"
        story = {
            "id": story_id,
            "title": f"{title} - Part {story_num}" if len(ac_groups) > 1 else title,
            "as_a": "user",
            "i_want": f"to use {title.lower()}",
            "so_that": "I can benefit from this feature",
            "epic": f"Epic {epic_num}",
            "story_points": min(8, max(2, len(ac_group) * 2)),
            "priority": requirement.get("priority", "Medium"),
            "dependencies": [req_id],
            "acceptance_criteria": ac_group,
            "activities": [f"E{epic_num}-A{i+1}" for i in range(len(ac_group))],
        }
        stories.append(story)

    return stories


def mode_epics(git_token: Optional[str] = None, status_filter: Optional[str] = None):
    """Generate epics from requirements."""
    print("=" * 60)
    print("GENERATING EPICS FROM REQUIREMENTS")
    print("=" * 60)

    requirements = get_all_requirements(status_filter)
    print(f"\nFound {len(requirements)} requirements")

    epics = []
    for req in requirements:
        if req.get("status") == "Done":
            continue  # Skip done requirements

        epic = generate_epic_from_requirement(req)
        epics.append(epic)
        print(f"\nGenerated Epic: {epic['id']} - {epic['title']}")
        print(f"  Status: {epic['status']}")
        print(f"  Priority: {epic['priority']}")
        print(f"  Estimated SP: {epic['estimated_sp']}")
        print(f"  Activities: {len(epic['activities'])}")

    # Save to file
    output_file = Path(__file__).parent.parent / "docs" / "Implementation" / "generated_epics.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(epics, f, indent=2, ensure_ascii=False)

    print(f"\n[OK] Generated {len(epics)} epics")
    print(f"Saved to: {output_file}")

    return 0


def mode_stories(git_token: Optional[str] = None, status_filter: Optional[str] = None):
    """Generate user stories from requirements."""
    print("=" * 60)
    print("GENERATING USER STORIES FROM REQUIREMENTS")
    print("=" * 60)

    requirements = get_all_requirements(status_filter)
    print(f"\nFound {len(requirements)} requirements")

    # Get existing epics to determine next epic number
    existing_epics = set()
    if PROJECT_EPICS_FILE.exists():
        with open(PROJECT_EPICS_FILE, "r", encoding="utf-8") as f:
            content = f.read()
            epic_matches = re.findall(r"## Epic (\d+):", content)
            existing_epics = {int(m) for m in epic_matches}

    next_epic_num = max(existing_epics, default=0) + 1

    all_stories = []
    for req in requirements:
        if req.get("status") == "Done":
            continue

        stories = generate_stories_from_requirement(req, next_epic_num)
        all_stories.extend(stories)
        next_epic_num += 1

        print(f"\nGenerated {len(stories)} stories for {req['id']}: {req['title']}")

    # Save to file
    output_file = Path(__file__).parent.parent / "docs" / "Implementation" / "generated_stories.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_stories, f, indent=2, ensure_ascii=False)

    print(f"\n[OK] Generated {len(all_stories)} user stories")
    print(f"Saved to: {output_file}")

    return 0


def mode_acceptance_criteria(git_token: Optional[str] = None, status_filter: Optional[str] = None):
    """Extract and display acceptance criteria from requirements."""
    print("=" * 60)
    print("EXTRACTING ACCEPTANCE CRITERIA FROM REQUIREMENTS")
    print("=" * 60)

    requirements = get_all_requirements(status_filter)
    print(f"\nFound {len(requirements)} requirements")

    total_ac = 0
    for req in requirements:
        acs = req.get("acceptance_criteria", [])
        total_ac += len(acs)
        print(f"\n{req['id']}: {req['title']}")
        print(f"  Acceptance Criteria: {len(acs)}")
        for ac in acs[:3]:  # Show first 3
            print(f"    - {ac['id']}: {ac['description'][:80]}...")

    print(f"\n[OK] Total acceptance criteria: {total_ac}")

    return 0


def mode_issues(git_token: Optional[str] = None, status_filter: Optional[str] = None, auto_upload: bool = False):
    """Generate and upload GitHub issues from user stories."""
    print("=" * 60)
    print("GENERATING AND UPLOADING GITHUB ISSUES")
    print("=" * 60)

    if not git_token:
        print("[X] Error: --git-token is required for issues mode")
        return 1

    # First, regenerate issues from USER_STORIES.md
    print("\nStep 1: Regenerating issues from USER_STORIES.md...")
    if not USER_STORIES_FILE.exists():
        print(f"[X] Error: {USER_STORIES_FILE} not found")
        return 1

    stories = parse_user_stories(USER_STORIES_FILE)
    print(f"Found {len(stories)} user stories")

    # Generate JSON export
    output_dir = Path(__file__).parent / "generated"
    output_dir.mkdir(parents=True, exist_ok=True)
    json_file = output_dir / "github_issues.json"

    print(f"\nStep 2: Generating GitHub issues JSON...")
    generate_json_export(stories, json_file)
    print(f"Generated {len(stories)} issues in {json_file}")

    if not auto_upload:
        print("\n[OK] Issues generated. Use --auto-upload to upload to GitHub")
        return 0

    # Upload missing issues
    print(f"\nStep 3: Uploading missing issues to GitHub...")
    os.environ["GITHUB_TOKEN"] = git_token

    with open(json_file, "r", encoding="utf-8") as f:
        all_issues = json.load(f)

    session = requests.Session()
    existing_issues = get_all_issues(session, git_token)
    print(f"Found {len(existing_issues)} existing issues in repository")

    missing_issues = filter_missing_issues(all_issues, existing_issues)
    print(f"Found {len(missing_issues)} missing issues to create")

    if not missing_issues:
        print("\n[OK] All issues are already on GitHub!")
        return 0

    # Show what will be created
    print("\nIssues to create:")
    for issue in missing_issues[:10]:  # Show first 10
        story_id = extract_story_id(issue["title"])
        print(f"  - {story_id}: {issue['title']}")
    if len(missing_issues) > 10:
        print(f"  ... and {len(missing_issues) - 10} more")

    # Ensure labels exist
    ensure_labels_exist(session, git_token, missing_issues)

    # Get project ID
    project_id = None
    if PROJECT_NUMBER:
        project_id = get_project_id(session, git_token, PROJECT_NUMBER)

    # Create issues
    print(f"\nCreating {len(missing_issues)} issues...")
    created = 0
    failed = 0

    for i, issue in enumerate(missing_issues, 1):
        story_id = extract_story_id(issue["title"])
        print(f"[{i}/{len(missing_issues)}] {story_id}: ", end="")
        result = create_issue(session, git_token, issue)

        if result:
            created += 1
            if project_id:
                add_issue_to_project(session, git_token, result["number"], project_id)
        else:
            failed += 1

        import time
        time.sleep(0.5)

    print(f"\nSummary:")
    print(f"  Created: {created}")
    print(f"  Failed: {failed}")
    print(f"  Total: {len(missing_issues)}")

    return 0 if failed == 0 else 1


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Project Planning Agent - Generate epics, stories, ACs, and GitHub issues from requirements",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate epics from open requirements
  python scripts/project_planning_agent.py --mode epics

  # Generate stories from all requirements
  python scripts/project_planning_agent.py --mode stories

  # Extract acceptance criteria
  python scripts/project_planning_agent.py --mode ac

  # Generate and upload GitHub issues
  python scripts/project_planning_agent.py --mode issues --git-token <token> --auto-upload

  # Filter by status
  python scripts/project_planning_agent.py --mode epics --status-filter open
        """
    )

    parser.add_argument(
        "--mode",
        choices=["epics", "stories", "ac", "issues"],
        required=True,
        help="Mode: epics (generate epics), stories (generate stories), ac (extract ACs), issues (generate/upload GitHub issues)"
    )

    parser.add_argument(
        "--git-token",
        type=str,
        help="GitHub personal access token (required for issues mode)"
    )

    parser.add_argument(
        "--status-filter",
        choices=["open", "progressing", "done"],
        help="Filter requirements by status (default: all)"
    )

    parser.add_argument(
        "--auto-upload",
        action="store_true",
        help="Automatically upload issues to GitHub (requires --git-token)"
    )

    args = parser.parse_args()

    # Validate arguments
    if args.mode == "issues" and not args.git_token:
        parser.error("--git-token is required for issues mode")

    # Run the appropriate mode
    if args.mode == "epics":
        return mode_epics(args.git_token, args.status_filter)
    elif args.mode == "stories":
        return mode_stories(args.git_token, args.status_filter)
    elif args.mode == "ac":
        return mode_acceptance_criteria(args.git_token, args.status_filter)
    elif args.mode == "issues":
        return mode_issues(args.git_token, args.status_filter, args.auto_upload)

    return 1


if __name__ == "__main__":
    exit(main())















