#!/usr/bin/env python3
"""
Script to update the Methods inventory by scanning all TypeScript files
in the backend modules and extracting function signatures.
"""

import re
import os
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

@dataclass
class MethodInfo:
    """Information about a method"""
    id: int
    name: str
    description: str
    arguments: str
    file_path: str
    test_file: Optional[str] = None
    category: str = ""  # controller, service, repository, middleware, utility

def extract_function_signature(line: str, file_lines: List[str], line_num: int) -> Optional[Dict]:
    """Extract function signature from a line"""
    # Match export async function, export function, or export const
    patterns = [
        r'^export\s+async\s+function\s+(\w+)\s*\(([^)]*)\)',
        r'^export\s+function\s+(\w+)\s*\(([^)]*)\)',
        r'^export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)',
    ]
    
    for pattern in patterns:
        match = re.match(pattern, line.strip())
        if match:
            name = match.group(1)
            args = match.group(2)
            
            # Try to get full signature if it spans multiple lines
            full_args = args
            if args.strip().endswith(',') or not args.strip().endswith(')'):
                # Multi-line signature
                brace_count = args.count('(') - args.count(')')
                for i in range(line_num, min(line_num + 10, len(file_lines))):
                    full_args += ' ' + file_lines[i].strip()
                    brace_count += file_lines[i].count('(') - file_lines[i].count(')')
                    if brace_count == 0:
                        break
            
            return {
                'name': name,
                'args': full_args,
                'line': line_num
            }
    
    return None

def extract_arguments_string(args: str) -> str:
    """Format arguments for the inventory table"""
    if not args or args.strip() == '':
        return '—'
    
    # Clean up the arguments
    args = args.strip()
    
    # Remove trailing commas and clean up
    args = args.rstrip(',').strip()
    
    # Remove return type annotations if present
    if '):' in args:
        args = args.split('):')[0] + ')'
    
    # Split by comma, but be careful with nested generics
    # Simple approach: split by comma and clean each param
    params = []
    current_param = ''
    depth = 0
    
    for char in args:
        if char in '<([':
            depth += 1
            current_param += char
        elif char in '>)]':
            depth -= 1
            current_param += char
        elif char == ',' and depth == 0:
            if current_param.strip():
                params.append(current_param.strip())
            current_param = ''
        else:
            current_param += char
    
    if current_param.strip():
        params.append(current_param.strip())
    
    # Clean each parameter: keep name and type, format nicely
    cleaned_params = []
    for param in params:
        param = param.strip()
        if not param:
            continue
        
        # Keep type annotations but format them
        # Convert to HTML entities for special chars
        param = param.replace('|', ' &#124; ')
        param = param.replace('<', '&lt;')
        param = param.replace('>', '&gt;')
        cleaned_params.append(param)
    
    if not cleaned_params:
        return '—'
    
    # Join with <br> for HTML table
    return '<br>'.join(cleaned_params)

def get_category_from_path(file_path: str) -> str:
    """Determine category from file path"""
    if '.controller.ts' in file_path:
        return 'controller'
    elif '.service.ts' in file_path:
        return 'service'
    elif '.repository.ts' in file_path:
        return 'repository'
    elif '.middleware.ts' in file_path:
        return 'middleware'
    elif '.util.ts' in file_path or 'passwordPolicy' in file_path:
        return 'utility'
    elif '.routes.ts' in file_path or '.router.ts' in file_path:
        return 'route'
    return 'unknown'

def get_module_name(file_path: str) -> str:
    """Extract module name from file path"""
    # Path format: apps/backend/src/modules/{module}/{file}
    parts = file_path.replace('\\', '/').split('/')
    if 'modules' in parts:
        idx = parts.index('modules')
        if idx + 1 < len(parts):
            return parts[idx + 1]
    return 'unknown'

def get_description(name: str, category: str, file_path: str) -> str:
    """Generate description based on method name and category"""
    module = get_module_name(file_path)
    
    # Clean up method name for description
    clean_name = name.replace('Handler', '').replace('Service', '').replace('Repository', '')
    
    if category == 'controller':
        action = clean_name.lower().replace('handler', '')
        return f"Express handler covering {action} flows in the {module} module."
    elif category == 'service':
        return f"Business logic implementing {clean_name.lower()} in the {module} module."
    elif category == 'repository':
        return f"Repository helper {clean_name.lower()} for the {module} module."
    elif category == 'middleware':
        return f"Express middleware enforcing {clean_name.lower()} within the {module} module."
    elif category == 'utility':
        return f"Utility helper supporting {clean_name.lower()} in the {module} module."
    else:
        return f"Function handling {clean_name.lower()} in the {module} module."

def find_test_file(file_path: str) -> Optional[str]:
    """Find corresponding test file"""
    # Convert to test path
    test_path = file_path.replace('.ts', '.test.ts')
    test_path = test_path.replace('.ts', '.spec.ts')
    
    # Check in __tests__ directory
    parts = test_path.split('/')
    if '__tests__' not in parts:
        # Insert __tests__ before filename
        filename = parts[-1]
        parts[-1] = '__tests__'
        parts.append(filename)
        test_path = '/'.join(parts)
    
    # Check if file exists
    if os.path.exists(test_path):
        return test_path
    
    return None

def scan_file(file_path: str) -> List[MethodInfo]:
    """Scan a TypeScript file for exported functions"""
    methods = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return methods
    
    category = get_category_from_path(file_path)
    test_file = find_test_file(file_path)
    
    for i, line in enumerate(lines):
        func_info = extract_function_signature(line, lines, i)
        if func_info:
            name = func_info['name']
            args = func_info['args']
            
            # Skip if it's a Router or similar constant
            if name.endswith('Router') or name.endswith('router'):
                continue
            
            description = get_description(name, category, file_path)
            args_str = extract_arguments_string(args)
            
            methods.append(MethodInfo(
                id=0,  # Will be assigned later
                name=name,
                description=description,
                arguments=args_str,
                file_path=file_path,
                test_file=test_file,
                category=category
            ))
    
    return methods

def scan_modules_directory(base_path: str = 'apps/backend/src/modules') -> List[MethodInfo]:
    """Scan all modules for methods"""
    all_methods = []
    
    if not os.path.exists(base_path):
        print(f"Directory {base_path} not found")
        return all_methods
    
    # Files to scan
    patterns = [
        '**/*.controller.ts',
        '**/*.service.ts',
        '**/*.repository.ts',
        '**/*.middleware.ts',
        '**/*.util.ts',
        '**/passwordPolicy.ts',
    ]
    
    for pattern in patterns:
        for file_path in Path(base_path).rglob(pattern):
            # Skip test files
            if '__tests__' in str(file_path) or 'test' in str(file_path).lower():
                continue
            
            methods = scan_file(str(file_path))
            all_methods.extend(methods)
    
    return all_methods

def format_method_row(method: MethodInfo) -> str:
    """Format a method as a table row"""
    test_file = method.test_file if method.test_file else '—'
    # Convert Windows paths to forward slashes for consistency
    file_path = method.file_path.replace('\\', '/')
    test_file = test_file.replace('\\', '/') if test_file != '—' else '—'
    
    return f"| {method.id} | {method.name} | {method.description} | {method.arguments} | {file_path} | {test_file} |"

def main():
    """Main function"""
    print("Scanning modules for methods...")
    methods = scan_modules_directory()
    
    print(f"Found {len(methods)} methods")
    
    # Sort by file path, then by name
    methods.sort(key=lambda m: (m.file_path, m.name))
    
    # Assign IDs starting from 1
    for i, method in enumerate(methods, start=1):
        method.id = i
    
    # Generate markdown table
    print("\nGenerating inventory table...")
    
    # Write to a temporary file first
    output_lines = [
        "| ID  | Name                              | Description                                                                                    | Arguments                                                                                                                                                                                                         | Relative path                                                           | Unit test                                                               |",
        "| --- | --------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |",
    ]
    
    for method in methods:
        output_lines.append(format_method_row(method))
    
    # Write to file
    output_file = 'docs/2.Technical_Design_Document/Methods_inventory_new.md'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_lines))
    
    print(f"\nInventory written to {output_file}")
    print(f"Total methods: {len(methods)}")
    
    # Print summary by category
    by_category = {}
    for method in methods:
        by_category[method.category] = by_category.get(method.category, 0) + 1
    
    print("\nSummary by category:")
    for category, count in sorted(by_category.items()):
        print(f"  {category}: {count}")

if __name__ == '__main__':
    main()

