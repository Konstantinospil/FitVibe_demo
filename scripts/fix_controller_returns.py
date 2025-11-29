#!/usr/bin/env python3
"""
Script to fix return statements in controller files to comply with Promise<void> return type.
Changes `return res.status().json()` to `res.status().json(); return;`
"""

import re
import sys
from pathlib import Path

def fix_return_statements(content: str) -> str:
    """Fix return statements that return response objects"""
    lines = content.split('\n')
    fixed_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Match patterns like:
        #   return res.status(XXX).json(...);
        #   return res.json(...);
        #   return res.status(XXX).send();
        #   return res.send();
        
        # Check if line contains a return statement with res.
        if re.search(r'^\s*return\s+res\.', line):
            # Extract the res call
            match = re.match(r'^(\s*)return\s+(res\.[^;]+);?\s*$', line)
            if match:
                indent = match.group(1)
                res_call = match.group(2).rstrip(';')
                # Replace with: res.call(); return;
                fixed_lines.append(f"{indent}{res_call};")
                fixed_lines.append(f"{indent}return;")
                i += 1
                continue
        
        fixed_lines.append(line)
        i += 1
    
    return '\n'.join(fixed_lines)

def process_file(file_path: Path) -> bool:
    """Process a single file and fix return statements"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        fixed = fix_return_statements(content)
        
        if original != fixed:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(fixed)
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main function"""
    if len(sys.argv) > 1:
        # Process specific file
        file_path = Path(sys.argv[1])
        if file_path.exists():
            changed = process_file(file_path)
            if changed:
                print(f"Fixed: {file_path}")
            else:
                print(f"No changes: {file_path}")
        else:
            print(f"File not found: {file_path}")
    else:
        # Process all controller files
        base_path = Path("apps/backend/src/modules")
        controller_files = list(base_path.rglob("*.controller.ts"))
        
        changed_count = 0
        for file_path in controller_files:
            if process_file(file_path):
                changed_count += 1
                print(f"Fixed: {file_path}")
        
        print(f"\nFixed {changed_count} files")

if __name__ == '__main__':
    main()













