#!/usr/bin/env python3
"""
Validate setup before creating GitHub issues.
"""

import os
import sys
import json
from pathlib import Path

def check_token():
    """Check if GitHub token is set."""
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        print(f"[OK] GITHUB_TOKEN is set (length: {len(token)})")
        return True
    else:
        print("[X] GITHUB_TOKEN is not set")
        print("   Set it with: export GITHUB_TOKEN=your_token")
        return False

def check_files():
    """Check if required files exist."""
    root_dir = Path(__file__).parent.parent
    required_files = [
        "USER_STORIES.md",
        "scripts/generated/github_issues.json",
        "scripts/create_issues_via_api.py",
    ]

    all_exist = True
    for file_path in required_files:
        full_path = root_dir / file_path
        if full_path.exists():
            print(f"[OK] {file_path} exists")
        else:
            print(f"[X] {file_path} not found")
            all_exist = False

    return all_exist

def check_json():
    """Check if JSON file is valid and has issues."""
    root_dir = Path(__file__).parent.parent
    json_file = root_dir / "scripts" / "generated" / "github_issues.json"

    if not json_file.exists():
        print("[X] JSON file not found")
        return False

    try:
        with open(json_file, "r", encoding="utf-8") as f:
            issues = json.load(f)

        if isinstance(issues, list) and len(issues) > 0:
            print(f"[OK] JSON file is valid with {len(issues)} issues")
            return True
        else:
            print("[X] JSON file is empty or invalid")
            return False
    except json.JSONDecodeError as e:
        print(f"[X] JSON file is invalid: {e}")
        return False

def check_python_packages():
    """Check if required Python packages are available."""
    try:
        import requests
        print("[OK] requests package is available")
        return True
    except ImportError:
        print("[X] requests package not found")
        print("   Install with: pip install requests")
        return False

def main():
    """Run all checks."""
    print("Validating setup for GitHub issues creation...\n")

    checks = [
        ("GitHub Token", check_token),
        ("Required Files", check_files),
        ("JSON File", check_json),
        ("Python Packages", check_python_packages),
    ]

    results = []
    for name, check_func in checks:
        print(f"\n{name}:")
        result = check_func()
        results.append(result)

    print("\n" + "="*50)
    if all(results):
        print("[OK] All checks passed! Ready to create issues.")
        print("\nNext step: Run 'python scripts/create_issues_via_api.py'")
        return 0
    else:
        print("[X] Some checks failed. Please fix the issues above.")
        return 1

if __name__ == "__main__":
    exit(main())

