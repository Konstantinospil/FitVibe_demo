#!/usr/bin/env python3
"""
Script to fix broken links after folder renaming in Product Requirements.

Old structure:
- requirements/ → a.Requirements/
- epics/ → b.Epics/
- activities/ → c.Activities/
- user-stories/ → d.User_stories/
- acceptance-criteria/ → e.Acceptance_Criteria/
"""

import os
import re
from pathlib import Path

# Mapping of old folder names to new folder names
FOLDER_MAPPING = {
    "requirements": "a.Requirements",
    "epics": "b.Epics",
    "activities": "c.Activities",
    "user-stories": "d.User_stories",
    "acceptance-criteria": "e.Acceptance_Criteria",
}

# Base directory for Product Requirements
BASE_DIR = Path(__file__).parent


def fix_links_in_content(content: str) -> str:
    """Fix all broken links in markdown content."""
    modified = content
    
    # Pattern to match markdown links: [text](path/to/file.md)
    # This will match both ../folder/file.md and folder/file.md patterns
    link_pattern = r'(\[([^\]]+)\]\(([^)]+)\))'
    
    def replace_link(match):
        full_match = match.group(0)
        link_text = match.group(2)
        link_path = match.group(3)
        
        # Skip if it's not a markdown file link or external link
        if not link_path.endswith('.md') or link_path.startswith('http'):
            return full_match
        
        # Fix the path
        fixed_path = fix_path(link_path)
        
        # Return the fixed link
        return f"[{link_text}]({fixed_path})"
    
    # Replace all markdown links
    modified = re.sub(link_pattern, replace_link, modified)
    
    return modified


def fix_path(path: str) -> str:
    """Fix a single file path by replacing old folder names with new ones."""
    # Handle relative paths (../folder/file.md or folder/file.md)
    for old_folder, new_folder in FOLDER_MAPPING.items():
        # Pattern 1: ../old_folder/file.md
        pattern1 = f"../{old_folder}/"
        if pattern1 in path:
            path = path.replace(pattern1, f"../{new_folder}/")
        
        # Pattern 2: old_folder/file.md (no ../)
        pattern2 = f"{old_folder}/"
        if pattern2 in path and f"../{new_folder}/" not in path:
            # Only replace if it's at the start or after a /
            path = re.sub(rf'(^|/){re.escape(old_folder)}/', rf'\1{new_folder}/', path)
    
    return path


def process_file(file_path: Path) -> bool:
    """Process a single markdown file and fix links. Returns True if modified."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()
        
        fixed_content = fix_links_in_content(original_content)
        
        if original_content != fixed_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False


def main():
    """Main function to process all markdown files."""
    print("Analyzing folder structure and fixing broken links...")
    print(f"Base directory: {BASE_DIR}")
    print()
    
    # Find all markdown files
    md_files = list(BASE_DIR.rglob("*.md"))
    
    # Exclude this script file
    md_files = [f for f in md_files if f.name != "fix_links.py"]
    
    print(f"Found {len(md_files)} markdown files to process")
    print()
    
    modified_count = 0
    modified_files = []
    
    for md_file in sorted(md_files):
        relative_path = md_file.relative_to(BASE_DIR)
        was_modified = process_file(md_file)
        
        if was_modified:
            modified_count += 1
            modified_files.append(str(relative_path))
            print(f"[FIXED] {relative_path}")
    
    print()
    print(f"Summary:")
    print(f"  Total files processed: {len(md_files)}")
    print(f"  Files modified: {modified_count}")
    
    if modified_files:
        print()
        print("Modified files:")
        for f in modified_files[:20]:  # Show first 20
            print(f"  - {f}")
        if len(modified_files) > 20:
            print(f"  ... and {len(modified_files) - 20} more")
    
    print()
    print("Link fixing complete!")


if __name__ == "__main__":
    main()

