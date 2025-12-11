#!/usr/bin/env python3
"""
Update USER_STORIES.md with acceptance criteria from AC_ALL_STORIES.md
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

def update_user_stories(stories_file: Path, ac_dict: Dict[str, List[Dict]]):
    """Update USER_STORIES.md with acceptance criteria."""
    with open(stories_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    lines = content.split("\n")
    output = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        output.append(line)
        
        # Match story header: ### US-X.X: Title
        story_match = re.match(r"^### (US-\d+\.\d+):", line)
        if story_match:
            story_id = story_match.group(1)
            
            # Find the end of this story (next ### or ---)
            story_end = i + 1
            while story_end < len(lines):
                if lines[story_end].startswith("### ") or lines[story_end].startswith("---"):
                    break
                story_end += 1
            
            # Read story content
            story_lines = lines[i+1:story_end]
            
            # Find where to insert AC (after Dependencies line or before ---)
            ac_insert_pos = len(story_lines)
            for j, sl in enumerate(story_lines):
                if sl.startswith("**Dependencies**:") or sl.startswith("**Dependencies**:"):
                    ac_insert_pos = j + 1
                    break
            
            # Add story content up to AC insert point
            output.extend(story_lines[:ac_insert_pos])
            
            # Add acceptance criteria if available
            if story_id in ac_dict and ac_dict[story_id]:
                output.append("")
                output.append("**Acceptance Criteria:**")
                output.append("")
                for ac in ac_dict[story_id]:
                    output.append(f"- **{ac['id']}**: {ac['criterion']}")
                    output.append(f"  - Test Method: {ac['test_method']}")
                    output.append(f"  - Evidence: {ac['evidence']}")
                    output.append("")
            
            # Add remaining story content
            output.extend(story_lines[ac_insert_pos:])
            
            # Skip the lines we've already processed
            i = story_end - 1
        
        i += 1
    
    # Write updated content
    with open(stories_file, "w", encoding="utf-8") as f:
        f.write("\n".join(output))

def main():
    """Main function."""
    root_dir = Path(__file__).parent.parent
    ac_file = root_dir / "AC_ALL_STORIES.md"
    stories_file = root_dir / "USER_STORIES.md"
    
    if not ac_file.exists():
        print(f"Error: {ac_file} not found")
        return 1
    
    if not stories_file.exists():
        print(f"Error: {stories_file} not found")
        return 1
    
    # Parse AC file
    ac_dict = parse_ac_file(ac_file)
    print(f"Parsed acceptance criteria for {len(ac_dict)} stories")
    
    # Update USER_STORIES.md
    update_user_stories(stories_file, ac_dict)
    print(f"Updated {stories_file}")
    
    return 0

if __name__ == "__main__":
    exit(main())

