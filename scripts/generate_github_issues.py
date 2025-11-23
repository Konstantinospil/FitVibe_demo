#!/usr/bin/env python3
"""
Generate GitHub issues from user stories.

This script reads USER_STORIES.md and generates GitHub issue creation commands
that can be executed via GitHub CLI or used to create issues via the API.
"""

import re
import json
from pathlib import Path
from typing import List, Dict, Optional

# GitHub repository and project
REPO = "Konstantinospil/FitVibe_demo"
PROJECT_NUMBER = 1  # Update if needed

# Priority to label mapping
PRIORITY_LABELS = {
    "High": "priority:high",
    "Medium": "priority:medium",
    "Low": "priority:low",
}

# Epic to label mapping
EPIC_LABELS = {
    "Epic 1": "epic:profile-settings",
    "Epic 2": "epic:exercise-library",
    "Epic 3": "epic:sharing-community",
    "Epic 4": "epic:planner",
    "Epic 5": "epic:logging-import",
    "Epic 6": "epic:privacy-gdpr",
    "Epic 7": "epic:performance",
    "Epic 8": "epic:accessibility",
    "Epic 9": "epic:observability",
    "Epic 10": "epic:availability-backups",
    "Epic 11": "epic:technical-debt",
}

# Type labels based on story content
TYPE_LABELS = {
    "backend": "type:backend",
    "frontend": "type:frontend",
    "testing": "type:testing",
    "infrastructure": "type:infrastructure",
    "documentation": "type:documentation",
}


def parse_user_stories(file_path: Path) -> List[Dict]:
    """Parse user stories from markdown file."""
    stories = []
    current_story = None
    current_epic = None

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Split by epic sections
    epic_sections = re.split(r"^## (Epic \d+.*)$", content, flags=re.MULTILINE)

    for i in range(1, len(epic_sections), 2):
        if i + 1 >= len(epic_sections):
            break

        epic_title = epic_sections[i]
        epic_content = epic_sections[i + 1]

        # Extract epic number
        epic_match = re.match(r"Epic (\d+)", epic_title)
        if epic_match:
            current_epic = f"Epic {epic_match.group(1)}"

        # Parse stories in this epic
        story_blocks = re.split(r"^### (US-\d+\.\d+.*)$", epic_content, flags=re.MULTILINE)

        for j in range(1, len(story_blocks), 2):
            if j + 1 >= len(story_blocks):
                break

            story_title = story_blocks[j]
            story_content = story_blocks[j + 1]

            # Extract story ID
            story_id_match = re.match(r"US-(\d+)\.(\d+)", story_title)
            if not story_id_match:
                continue

            epic_num = story_id_match.group(1)
            story_num = story_id_match.group(2)
            story_id = f"US-{epic_num}.{story_num}"

            # Parse story details
            story = {
                "id": story_id,
                "title": story_title,
                "epic": current_epic,
                "content": story_content,
            }

            # Extract user story format
            as_match = re.search(r"\*\*As a\*\* (.+?)\s*\*\*I want\*\* (.+?)\s*\*\*So that\*\* (.+?)(?:\n\n|\*\*)", story_content, re.DOTALL)
            if as_match:
                story["as_a"] = as_match.group(1).strip()
                story["i_want"] = as_match.group(2).strip()
                story["so_that"] = as_match.group(3).strip()

            # Extract activities
            activities_match = re.search(r"\*\*Activities:\*\*\s*\n((?:- E\d+-A\d+.*\n?)+)", story_content)
            if activities_match:
                activities = re.findall(r"E\d+-A\d+", activities_match.group(1))
                story["activities"] = activities

            # Extract story points
            sp_match = re.search(r"\*\*Story Points\*\*: (\d+)", story_content)
            if sp_match:
                story["story_points"] = int(sp_match.group(1))

            # Extract priority
            priority_match = re.search(r"\*\*Priority\*\*: (High|Medium|Low)", story_content)
            if priority_match:
                story["priority"] = priority_match.group(1)

            # Extract dependencies
            deps_match = re.search(r"\*\*Dependencies\*\*: (.+)", story_content)
            if deps_match:
                deps = [d.strip() for d in deps_match.group(1).split(",")]
                story["dependencies"] = deps

            # Extract acceptance criteria
            # Match from "**Acceptance Criteria:**" until "---" or end of story
            ac_match = re.search(
                r"\*\*Acceptance Criteria:\*\*\s*\n((?:(?!---).)*?)(?=\n---|\Z)",
                story_content,
                re.DOTALL,
            )
            if ac_match:
                ac_text = ac_match.group(1).strip()
                # Parse individual AC items
                ac_items = []
                # Find all AC items using finditer to capture all matches including first one
                # Pattern: "- **US-X.Y-AC##**: description\n  - Test Method: ...\n  - Evidence: ..."
                # Note: First AC may not have newline before it
                ac_pattern = r"(?:^|\n)- \*\*(US-\d+\.\d+-AC\d+)\*\*: (.+?)(?=\n- \*\*US-|\n---|\Z)"
                for ac_item_match in re.finditer(ac_pattern, ac_text, re.DOTALL):
                    ac_id = ac_item_match.group(1)
                    ac_content = ac_item_match.group(2).strip()
                    # Extract description (first line, before test method/evidence)
                    lines = ac_content.split("\n")
                    description = lines[0].strip()
                    # Extract test method and evidence
                    test_method = None
                    evidence = None
                    for line in lines[1:]:
                        line = line.strip()
                        if line.startswith("- Test Method:"):
                            test_method = line.replace("- Test Method:", "").strip()
                        elif line.startswith("- Evidence:"):
                            evidence = line.replace("- Evidence:", "").strip()
                    ac_items.append({
                        "id": ac_id,
                        "description": description,
                        "test_method": test_method,
                        "evidence": evidence,
                    })
                story["acceptance_criteria"] = ac_items

            stories.append(story)

    return stories


def determine_type_labels(story: Dict) -> List[str]:
    """Determine type labels based on story content."""
    labels = []
    content_lower = story.get("content", "").lower()

    if any(word in content_lower for word in ["api", "backend", "endpoint", "server"]):
        labels.append("type:backend")
    if any(word in content_lower for word in ["ui", "frontend", "component", "page"]):
        labels.append("type:frontend")
    if "test" in content_lower or "testing" in content_lower:
        labels.append("type:testing")
    if any(word in content_lower for word in ["infrastructure", "backup", "monitoring", "observability"]):
        labels.append("type:infrastructure")
    if "documentation" in content_lower or "document" in content_lower:
        labels.append("type:documentation")

    return labels


def generate_issue_body(story: Dict) -> str:
    """Generate GitHub issue body from user story."""
    body_parts = []

    # User story format
    if "as_a" in story:
        body_parts.append("## User Story")
        body_parts.append(f"**As a** {story['as_a']}")
        body_parts.append(f"**I want** {story['i_want']}")
        body_parts.append(f"**So that** {story['so_that']}")
        body_parts.append("")

    # Story details
    body_parts.append("## Details")
    if "story_points" in story:
        body_parts.append(f"- **Story Points**: {story['story_points']}")
    if "priority" in story:
        body_parts.append(f"- **Priority**: {story['priority']}")
    if "epic" in story:
        body_parts.append(f"- **Epic**: {story['epic']}")
    body_parts.append("")

    # Activities
    if "activities" in story and story["activities"]:
        body_parts.append("## Activities")
        for activity in story["activities"]:
            body_parts.append(f"- {activity}")
        body_parts.append("")

    # Dependencies
    if "dependencies" in story and story["dependencies"]:
        body_parts.append("## Dependencies")
        for dep in story["dependencies"]:
            body_parts.append(f"- {dep}")
        body_parts.append("")

    # Acceptance Criteria
    body_parts.append("## Acceptance Criteria")
    if "acceptance_criteria" in story and story["acceptance_criteria"]:
        for ac in story["acceptance_criteria"]:
            body_parts.append(f"- [ ] **{ac['id']}**: {ac['description']}")
            if ac.get("test_method"):
                body_parts.append(f"  - Test Method: {ac['test_method']}")
            if ac.get("evidence"):
                body_parts.append(f"  - Evidence: {ac['evidence']}")
    else:
        body_parts.append("- [ ] TBD")
    body_parts.append("")

    # Related Documentation
    body_parts.append("## Related Documentation")
    body_parts.append(f"- [USER_STORIES.md](../../USER_STORIES.md)")
    body_parts.append(f"- [PROJECT_EPICS_AND_ACTIVITIES.md](../../PROJECT_EPICS_AND_ACTIVITIES.md)")

    return "\n".join(body_parts)


def generate_gh_cli_commands(stories: List[Dict], output_file: Optional[Path] = None):
    """Generate GitHub CLI commands for creating issues."""
    commands = []

    for story in stories:
        # Build labels
        labels = []

        # Epic label
        if story.get("epic"):
            epic_num = re.match(r"Epic (\d+)", story["epic"])
            if epic_num:
                epic_key = f"Epic {epic_num.group(1)}"
                if epic_key in EPIC_LABELS:
                    labels.append(EPIC_LABELS[epic_key])

        # Priority label
        if story.get("priority") in PRIORITY_LABELS:
            labels.append(PRIORITY_LABELS[story["priority"]])

        # Type labels
        type_labels = determine_type_labels(story)
        labels.extend(type_labels)

        # Add user story label
        labels.append("type:user-story")

        # Build title
        title = f"{story['id']}: {story.get('i_want', story['title'])}"
        if len(title) > 100:
            title = title[:97] + "..."

        # Build body
        body = generate_issue_body(story)

        # Escape for shell
        title_escaped = title.replace('"', '\\"')
        body_escaped = body.replace('"', '\\"').replace('\n', '\\n')
        labels_str = ",".join(labels)

        # Generate command
        cmd = f'gh issue create --repo {REPO} --title "{title_escaped}" --body "{body_escaped}" --label "{labels_str}"'

        # Add to project if project number is set
        if PROJECT_NUMBER:
            cmd += f' --project {PROJECT_NUMBER}'

        commands.append({
            "story_id": story["id"],
            "title": title,
            "command": cmd,
            "labels": labels,
        })

    if output_file:
        with open(output_file, "w", encoding="utf-8") as f:
            f.write("#!/bin/bash\n")
            f.write("# Generated GitHub issue creation commands\n")
            f.write("# Run with: bash generate_github_issues.sh\n\n")
            for item in commands:
                f.write(f"# {item['story_id']}: {item['title']}\n")
                f.write(f"{item['command']}\n")
                f.write("\n")

    return commands


def generate_json_export(stories: List[Dict], output_file: Path):
    """Generate JSON export for bulk import."""
    issues = []

    for story in stories:
        # Build labels
        labels = []

        # Epic label
        if story.get("epic"):
            epic_num = re.match(r"Epic (\d+)", story["epic"])
            if epic_num:
                epic_key = f"Epic {epic_num.group(1)}"
                if epic_key in EPIC_LABELS:
                    labels.append(EPIC_LABELS[epic_key])

        # Priority label
        if story.get("priority") in PRIORITY_LABELS:
            labels.append(PRIORITY_LABELS[story["priority"]])

        # Type labels
        type_labels = determine_type_labels(story)
        labels.extend(type_labels)

        # Add user story label
        labels.append("type:user-story")

        # Build title
        title = f"{story['id']}: {story.get('i_want', story['title'])}"
        if len(title) > 100:
            title = title[:97] + "..."

        # Build body
        body = generate_issue_body(story)

        issue = {
            "title": title,
            "body": body,
            "labels": labels,
        }

        issues.append(issue)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(issues, f, indent=2, ensure_ascii=False)

    return issues


def main():
    """Main function."""
    root_dir = Path(__file__).parent.parent
    stories_file = root_dir / "USER_STORIES.md"

    if not stories_file.exists():
        print(f"Error: {stories_file} not found")
        return 1

    print(f"Parsing {stories_file}...")
    stories = parse_user_stories(stories_file)
    print(f"Found {len(stories)} user stories")

    # Generate CLI commands
    output_dir = root_dir / "scripts" / "generated"
    output_dir.mkdir(parents=True, exist_ok=True)

    cli_file = output_dir / "create_github_issues.sh"
    print(f"Generating CLI commands to {cli_file}...")
    commands = generate_gh_cli_commands(stories, cli_file)
    print(f"Generated {len(commands)} issue creation commands")

    # Generate JSON export
    json_file = output_dir / "github_issues.json"
    print(f"Generating JSON export to {json_file}...")
    generate_json_export(stories, json_file)
    print(f"Generated JSON export with {len(stories)} issues")

    # Print summary
    print("\nSummary:")
    print(f"  Total stories: {len(stories)}")
    print(f"  CLI commands: {cli_file}")
    print(f"  JSON export: {json_file}")
    print("\nTo create issues:")
    print(f"  1. Review {cli_file}")
    print(f"  2. Run: bash {cli_file}")
    print(f"  OR use the JSON file with GitHub API")

    return 0


if __name__ == "__main__":
    exit(main())

