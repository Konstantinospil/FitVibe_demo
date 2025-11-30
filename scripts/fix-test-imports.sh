#!/bin/bash

# Script to fix import paths in test files
# Converts relative imports to point to apps/backend/src/

cd tests/backend

# Find all test files and update imports
find . -name "*.test.ts" -type f | while read file; do
  # Calculate depth (number of directories from tests/backend/)
  depth=$(echo "$file" | tr -cd '/' | wc -c)
  depth=$((depth - 1))  # Subtract 1 for the filename
  
  # Build the prefix path (../../ repeated depth times, then apps/backend/src/)
  prefix=""
  for ((i=0; i<depth; i++)); do
    prefix="../$prefix"
  done
  prefix="${prefix}apps/backend/src/"
  
  # Get the directory of the test file
  dir=$(dirname "$file")
  
  # Update imports: replace relative paths with absolute paths to apps/backend/src/
  # Pattern: from "../../something" -> from "../../../apps/backend/src/something"
  # We need to resolve the relative path and convert it
  
  # This is complex - let's use a Python script instead
  python3 <<PYTHON
import re
import os
from pathlib import Path

file_path = "$file"
depth = $depth
prefix = "$prefix"

# Read file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

original = content
dir_path = os.path.dirname(file_path)

def resolve_import(match):
    dots = match.group(1)
    import_path = match.group(2)
    
    # Count ../ in dots
    dot_count = dots.count('../')
    
    # Resolve the path relative to the test file's directory
    test_dir = os.path.join('tests/backend', dir_path)
    resolved = os.path.normpath(os.path.join(test_dir, dots + import_path))
    
    # Calculate relative path from resolved to apps/backend/src/
    source_base = os.path.normpath('apps/backend/src')
    try:
        rel_path = os.path.relpath(resolved, source_base)
        # Convert to forward slashes and ensure it starts with ./
        rel_path = rel_path.replace('\\\\', '/').replace('\\', '/')
        if not rel_path.startswith('.'):
            rel_path = './' + rel_path
        return f'from "{rel_path}"'
    except ValueError:
        # Path is outside source, use absolute from root
        return f'from "../../{prefix}{import_path}"'

# Update import statements
content = re.sub(r'from\s+["\']((?:\.\./)+)([^"\']+)["\']', resolve_import, content)

# Update jest.mock() calls
content = re.sub(r'jest\.mock\(["\']((?:\.\./)+)([^"\']+)["\']', 
                 lambda m: f'jest.mock("{resolve_import(m)}'.replace('from "', '').replace('"', '"'), 
                 content)

if content != original:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated: $file")

PYTHON

done

echo "Done updating imports"

