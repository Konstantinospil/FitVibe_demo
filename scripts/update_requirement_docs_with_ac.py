#!/usr/bin/env python3
"""
Update requirement documents with detailed acceptance criteria from user stories.
"""

import re
from pathlib import Path
from typing import Dict, List, Tuple

# Map user stories to requirement documents
STORY_TO_REQ = {
    "US-1.1": "FR-009",
    "US-1.2": "FR-009",
    "US-1.3": "FR-009",
    "US-2.1": "FR-010",
    "US-2.2": "FR-010",
    "US-2.3": "FR-010",
    "US-2.4": "FR-010",
    "US-2.5": "FR-010",
    "US-2.6": "FR-010",
    "US-3.1": "FR-011",
    "US-3.2": "FR-011",
    "US-3.3": "FR-011",
    "US-3.4": "FR-011",
    "US-3.5": "FR-011",
    "US-3.6": "FR-011",
    "US-3.7": "FR-011",
    "US-3.8": "FR-011",
    "US-4.1": "FR-004",
    "US-4.2": "FR-004",
    "US-4.3": "FR-004",
    "US-4.4": "FR-004",
    "US-4.5": "FR-004",
    "US-5.1": "FR-005",
    "US-5.2": "FR-005",
    "US-5.3": "FR-005",
    "US-5.4": "FR-005",
    "US-5.5": "FR-005",
    "US-5.6": "FR-005",
    "US-6.1": "NFR-002",
    "US-6.2": "NFR-002",
    "US-6.3": "NFR-002",
    "US-6.4": "NFR-002",
    "US-6.5": "NFR-002",
    "US-6.6": "NFR-002",
}

def parse_ac_file(ac_file: Path) -> Dict[str, List[Dict]]:
    """Parse AC_ALL_STORIES.md and return dict of story_id -> ACs."""
    with open(ac_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    stories = {}
    current_story = None
    current_ac = None
    
    for line in content.split("\n"):
        # Match story header: ## US-X.X
        story_match = re.match(r"^## (US-\d+\.\d+)$", line)
        if story_match:
            current_story = story_match.group(1)
            stories[current_story] = []
            continue
        
        # Match AC header: ### US-X.X-ACXX
        ac_match = re.match(r"^### (US-\d+\.\d+-AC\d+)$", line)
        if ac_match and current_story:
            current_ac = {
                "id": ac_match.group(1),
                "criterion": "",
                "test_method": "",
                "evidence": ""
            }
            stories[current_story].append(current_ac)
            continue
        
        # Match criterion line
        if current_ac and line.startswith("**Criterion**: "):
            current_ac["criterion"] = line.replace("**Criterion**: ", "").strip()
            continue
        
        # Match test method line
        if current_ac and line.startswith("- **Test Method**: "):
            current_ac["test_method"] = line.replace("- **Test Method**: ", "").strip()
            continue
        
        # Match evidence line
        if current_ac and line.startswith("- **Evidence Required**: "):
            current_ac["evidence"] = line.replace("- **Evidence Required**: ", "").strip()
            continue
    
    return stories

def find_req_file(req_id: str, req_dir: Path) -> Path:
    """Find requirement file by ID."""
    # Check all subdirectories
    for subdir in ["done", "open", "progressing"]:
        subdir_path = req_dir / subdir
        if subdir_path.exists():
            for file in subdir_path.glob(f"{req_id}*.md"):
                return file
    return None

def update_req_doc(req_file: Path, req_id: str, story_ac_map: Dict[str, List[Dict]]):
    """Update requirement document with detailed ACs from user stories."""
    with open(req_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Find stories for this requirement
    stories_for_req = [story_id for story_id, req in STORY_TO_REQ.items() if req == req_id]
    
    if not stories_for_req:
        print(f"No stories found for {req_id}")
        return
    
    # Collect all ACs for this requirement
    all_ac = []
    for story_id in sorted(stories_for_req):
        if story_id in story_ac_map:
            for ac in story_ac_map[story_id]:
                all_ac.append({
                    "id": ac["id"],
                    "criterion": ac["criterion"],
                    "test_method": ac["test_method"],
                    "evidence": ac["evidence"],
                    "story": story_id
                })
    
    if not all_ac:
        print(f"No ACs found for {req_id}")
        return
    
    # Find the Acceptance Criteria section
    lines = content.split("\n")
    output = []
    i = 0
    ac_section_found = False
    ac_section_start = None
    
    while i < len(lines):
        line = lines[i]
        
        # Find Acceptance Criteria section
        if re.match(r"^## Acceptance Criteria", line, re.IGNORECASE):
            ac_section_found = True
            ac_section_start = i
            output.append(line)
            output.append("")
            output.append("Each acceptance criterion must be met for this requirement to be considered complete.")
            output.append("")
            
            # Add all ACs
            for ac in all_ac:
                output.append(f"### {ac['id']}")
                output.append("")
                output.append(f"**Criterion**: {ac['criterion']}")
                output.append("")
                output.append(f"- **Test Method**: {ac['test_method']}")
                output.append(f"- **Evidence Required**: {ac['evidence']}")
                output.append(f"- **Related Story**: {ac['story']}")
                output.append("")
            
            # Skip existing AC section
            i += 1
            while i < len(lines) and not re.match(r"^## ", lines[i]):
                i += 1
            i -= 1  # Back up to keep the next section header
            continue
        
        output.append(line)
        i += 1
    
    # If no AC section found, add it before Test Strategy or at end
    if not ac_section_found:
        # Find Test Strategy section or end of file
        insert_pos = len(output)
        for j, line in enumerate(output):
            if re.match(r"^## Test Strategy", line, re.IGNORECASE):
                insert_pos = j
                break
        
        # Insert AC section
        new_section = [
            "## Acceptance Criteria",
            "",
            "Each acceptance criterion must be met for this requirement to be considered complete.",
            ""
        ]
        
        for ac in all_ac:
            new_section.extend([
                f"### {ac['id']}",
                "",
                f"**Criterion**: {ac['criterion']}",
                "",
                f"- **Test Method**: {ac['test_method']}",
                f"- **Evidence Required**: {ac['evidence']}",
                f"- **Related Story**: {ac['story']}",
                ""
            ])
        
        output[insert_pos:insert_pos] = new_section
    
    # Write updated content
    with open(req_file, "w", encoding="utf-8") as f:
        f.write("\n".join(output))
    
    print(f"Updated {req_file} with {len(all_ac)} acceptance criteria")

def main():
    """Main function."""
    root_dir = Path(__file__).parent.parent
    ac_file = root_dir / "AC_ALL_STORIES.md"
    req_dir = root_dir / "docs" / "1.Product_Requirements" / "Requirements"
    
    if not ac_file.exists():
        print(f"Error: {ac_file} not found")
        return 1
    
    if not req_dir.exists():
        print(f"Error: {req_dir} not found")
        return 1
    
    # Parse AC file
    story_ac_map = parse_ac_file(ac_file)
    print(f"Parsed acceptance criteria for {len(story_ac_map)} stories")
    
    # Group ACs by requirement
    req_ac_map = {}
    for story_id, acs in story_ac_map.items():
        if story_id in STORY_TO_REQ:
            req_id = STORY_TO_REQ[story_id]
            if req_id not in req_ac_map:
                req_ac_map[req_id] = {}
            req_ac_map[req_id][story_id] = acs
    
    # Update each requirement document
    for req_id in sorted(req_ac_map.keys()):
        req_file = find_req_file(req_id, req_dir)
        if req_file:
            update_req_doc(req_file, req_id, story_ac_map)
        else:
            print(f"Warning: Requirement file not found for {req_id}")
    
    return 0

if __name__ == "__main__":
    exit(main())

