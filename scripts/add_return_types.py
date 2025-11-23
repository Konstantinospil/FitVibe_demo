#!/usr/bin/env python3
"""
Script to add explicit return types to functions missing them.
Focuses on service and repository functions.
"""

import re
import sys
from pathlib import Path
from typing import Optional

def infer_return_type(func_name: str, file_path: str, lines: list[str], start_line: int) -> Optional[str]:
    """Try to infer return type from function body"""
    # Look for return statements in the function body
    depth = 0
    brace_count = 0
    in_function = False
    
    for i in range(start_line, min(start_line + 200, len(lines))):
        line = lines[i]
        
        # Track braces to find function end
        brace_count += line.count('{') - line.count('}')
        if brace_count > 0 and not in_function:
            in_function = True
        
        if in_function and brace_count == 0:
            break
        
        # Look for return statements
        if re.search(r'\breturn\s+', line):
            # Check what's being returned
            if 'Promise<' in line or ': Promise<' in line:
                # Already has Promise type somewhere
                match = re.search(r'Promise<([^>]+)>', line)
                if match:
                    return f"Promise<{match.group(1)}>"
            
            # Check for common patterns
            if 'await' in line:
                return "Promise<void>"  # Default for async functions
            if 'res.json' in line or 'res.status' in line:
                return None  # Controller function, should be Promise<void>
            if 'throw' in line or 'Error' in line:
                return None  # Can't infer from error throws
    
    # Default inference
    if 'async' in lines[start_line]:
        return "Promise<void>"
    return None

def add_return_type_to_function(line: str, lines: list[str], line_num: int, file_path: str) -> Optional[str]:
    """Add return type to a function signature if missing"""
    # Check if already has return type
    if ': Promise<' in line or ': ' in line and ')' in line.split(':')[0]:
        return None
    
    # Match function signature
    # export async function name(...) {
    # export function name(...) {
    match = re.match(r'^(export\s+(async\s+)?function\s+\w+\s*\([^)]*\))\s*\{', line)
    if not match:
        return None
    
    signature = match.group(1)
    
    # Try to infer return type
    return_type = infer_return_type('', file_path, lines, line_num)
    if not return_type:
        # Default for async functions
        if 'async' in line:
            return_type = "Promise<void>"
        else:
            return None
    
    # Insert return type
    new_line = f"{signature}: {return_type} {{"
    return new_line

def process_file(file_path: Path) -> bool:
    """Process a file and add missing return types"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        modified = False
        new_lines = []
        
        for i, line in enumerate(lines):
            # Check if this is a function that needs a return type
            if re.match(r'^export\s+(async\s+)?function\s+\w+', line):
                new_line = add_return_type_to_function(line, lines, i, str(file_path))
                if new_line and new_line != line:
                    new_lines.append(new_line + '\n')
                    modified = True
                    continue
            
            new_lines.append(line)
        
        if modified:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main function"""
    if len(sys.argv) > 1:
        file_path = Path(sys.argv[1])
        if file_path.exists():
            changed = process_file(file_path)
            print(f"{'Fixed' if changed else 'No changes'}: {file_path}")
        else:
            print(f"File not found: {file_path}")
    else:
        base_path = Path("apps/backend/src/modules")
        service_files = list(base_path.rglob("*.service.ts"))
        repo_files = list(base_path.rglob("*.repository.ts"))
        
        all_files = service_files + repo_files
        
        changed_count = 0
        for file_path in all_files:
            if process_file(file_path):
                changed_count += 1
                print(f"Fixed: {file_path}")
        
        print(f"\nFixed {changed_count} files")

if __name__ == '__main__':
    main()






