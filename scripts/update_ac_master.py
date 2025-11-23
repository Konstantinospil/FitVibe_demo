#!/usr/bin/env python3
"""
Update AC_Master.md with all acceptance criteria from user stories.
"""

import re
from pathlib import Path
from typing import Dict, List

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

# Map stories to requirements
STORY_TO_REQ = {
    "US-1.1": ("FR-009", "Profile & Settings"),
    "US-1.2": ("FR-009", "Profile & Settings"),
    "US-1.3": ("FR-009", "Profile & Settings"),
    "US-2.1": ("FR-010", "Exercise Library"),
    "US-2.2": ("FR-010", "Exercise Library"),
    "US-2.3": ("FR-010", "Exercise Library"),
    "US-2.4": ("FR-010", "Exercise Library"),
    "US-2.5": ("FR-010", "Exercise Library"),
    "US-2.6": ("FR-010", "Exercise Library"),
    "US-3.1": ("FR-011", "Sharing & Community"),
    "US-3.2": ("FR-011", "Sharing & Community"),
    "US-3.3": ("FR-011", "Sharing & Community"),
    "US-3.4": ("FR-011", "Sharing & Community"),
    "US-3.5": ("FR-011", "Sharing & Community"),
    "US-3.6": ("FR-011", "Sharing & Community"),
    "US-3.7": ("FR-011", "Sharing & Community"),
    "US-3.8": ("FR-011", "Sharing & Community"),
    "US-4.1": ("FR-004", "Planner"),
    "US-4.2": ("FR-004", "Planner"),
    "US-4.3": ("FR-004", "Planner"),
    "US-4.4": ("FR-004", "Planner"),
    "US-4.5": ("FR-004", "Planner"),
    "US-5.1": ("FR-005", "Logging & Import"),
    "US-5.2": ("FR-005", "Logging & Import"),
    "US-5.3": ("FR-005", "Logging & Import"),
    "US-5.4": ("FR-005", "Logging & Import"),
    "US-5.5": ("FR-005", "Logging & Import"),
    "US-5.6": ("FR-005", "Logging & Import"),
    "US-6.1": ("NFR-002", "Privacy"),
    "US-6.2": ("NFR-002", "Privacy"),
    "US-6.3": ("NFR-002", "Privacy"),
    "US-6.4": ("NFR-002", "Privacy"),
    "US-6.5": ("NFR-002", "Privacy"),
    "US-6.6": ("NFR-002", "Privacy"),
    "US-7.1": ("NFR-003", "Performance"),
    "US-7.2": ("NFR-003", "Performance"),
    "US-7.3": ("NFR-003", "Performance"),
    "US-7.4": ("NFR-003", "Performance"),
    "US-7.5": ("NFR-003", "Performance"),
    "US-7.6": ("NFR-003", "Performance"),
    "US-7.7": ("NFR-003", "Performance"),
    "US-7.8": ("NFR-003", "Performance"),
    "US-8.1": ("NFR-004", "Accessibility"),
    "US-8.2": ("NFR-004", "Accessibility"),
    "US-8.3": ("NFR-004", "Accessibility"),
    "US-8.4": ("NFR-004", "Accessibility"),
    "US-8.5": ("NFR-004", "Accessibility"),
    "US-8.6": ("NFR-004", "Accessibility"),
    "US-8.7": ("NFR-004", "Accessibility"),
    "US-9.1": ("NFR-007", "Observability"),
    "US-9.2": ("NFR-007", "Observability"),
    "US-9.3": ("NFR-007", "Observability"),
    "US-9.4": ("NFR-007", "Observability"),
    "US-9.5": ("NFR-007", "Observability"),
    "US-9.6": ("NFR-007", "Observability"),
    "US-10.1": ("NFR-005", "Availability & Backups"),
    "US-10.2": ("NFR-005", "Availability & Backups"),
    "US-10.3": ("NFR-005", "Availability & Backups"),
    "US-10.4": ("NFR-005", "Availability & Backups"),
    "US-10.5": ("NFR-005", "Availability & Backups"),
}

def generate_ac_master_table(story_ac_map: Dict[str, List[Dict]]) -> List[str]:
    """Generate AC Master table rows."""
    rows = []
    
    # Group by requirement
    req_stories = {}
    for story_id, acs in story_ac_map.items():
        if story_id in STORY_TO_REQ:
            req_id, req_title = STORY_TO_REQ[story_id]
            if req_id not in req_stories:
                req_stories[req_id] = {"title": req_title, "stories": {}}
            req_stories[req_id]["stories"][story_id] = acs
    
    # Generate table rows
    for req_id in sorted(req_stories.keys()):
        req_title = req_stories[req_id]["title"]
        req_type = "FR" if req_id.startswith("FR-") else "NFR"
        
        for story_id in sorted(req_stories[req_id]["stories"].keys()):
            for ac in req_stories[req_id]["stories"][story_id]:
                # Determine priority and gate based on requirement
                priority = "High" if req_id in ["FR-001", "FR-002", "FR-003", "NFR-001", "NFR-002"] else "Medium"
                gate = "GOLD" if priority == "High" else "SILVER"
                
                row = [
                    req_type,
                    req_id,
                    req_title,
                    ac["id"],
                    ac["criterion"],
                    ac["test_method"],
                    ac["evidence"],
                    "ENG/QA",
                    priority,
                    gate,
                    "Proposed",
                    f"PRD §{req_title}",
                    f"TDD §{req_title}"
                ]
                rows.append("| " + " | ".join(row) + " |")
    
    return rows

def main():
    """Main function."""
    root_dir = Path(__file__).parent.parent
    ac_file = root_dir / "AC_ALL_STORIES.md"
    ac_master_file = root_dir / "docs" / "1.Product_Requirements" / "AC_Master.md"
    
    if not ac_file.exists():
        print(f"Error: {ac_file} not found")
        return 1
    
    if not ac_master_file.exists():
        print(f"Error: {ac_master_file} not found")
        return 1
    
    # Parse AC file
    story_ac_map = parse_ac_file(ac_file)
    print(f"Parsed acceptance criteria for {len(story_ac_map)} stories")
    
    # Read existing AC_Master.md
    with open(ac_master_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Find where to insert new ACs (after existing table or at end)
    lines = content.split("\n")
    output = []
    i = 0
    in_table = False
    table_end = None
    
    # Find the end of existing tables
    while i < len(lines):
        line = lines[i]
        
        # Check if we're in a table section
        if re.match(r"^\|\s*Type\s*\|", line):
            in_table = True
            # Find the end of this table section
            j = i
            while j < len(lines) and (lines[j].startswith("|") or lines[j].strip() == ""):
                j += 1
            table_end = j
            # Keep existing table
            output.extend(lines[i:j])
            i = j
            continue
        
        if not in_table:
            output.append(line)
        
        i += 1
    
    # Add new ACs section
    output.append("")
    output.append("### New User Story Acceptance Criteria")
    output.append("")
    output.append("| Type | Requirement ID | Requirement Title | AC ID | Acceptance Criteria (SMART) | Test Method | Evidence | Owner | Priority | Gate | Status | Trace → PRD | Trace → TDD |")
    output.append("| :--- | :------------- | :---------------- | :---- | :-------------------------- | :---------- | :------- | :---- | :------- | :--- | :----- | :---------- | :---------- |")
    
    # Generate table rows
    table_rows = generate_ac_master_table(story_ac_map)
    output.extend(table_rows)
    
    # Write updated content
    with open(ac_master_file, "w", encoding="utf-8") as f:
        f.write("\n".join(output))
    
    print(f"Updated {ac_master_file} with {len(table_rows)} new acceptance criteria")
    
    return 0

if __name__ == "__main__":
    exit(main())

