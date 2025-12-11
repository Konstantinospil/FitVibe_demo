#!/usr/bin/env python3
"""
Organize Requirements by Implementation Status

Analyzes the codebase to determine implementation status and moves requirement
documents to appropriate subfolders: done, progressing, or open.
"""

import os
import shutil
import sys
from pathlib import Path
from typing import Dict, Literal

# Implementation status mapping based on codebase analysis
STATUS_MAP: Dict[str, Literal["done", "progressing", "open"]] = {
    # Functional Requirements
    "FR-001-user-registration.md": "done",  # Full implementation with tests
    "FR-002-login-and-session.md": "done",  # Full implementation with JWT, 2FA, refresh tokens
    "FR-003-authwall.md": "done",  # ADR exists, middleware implemented
    "FR-004-planner.md": "progressing",  # UI exists but drag-and-drop/conflict detection may be incomplete
    "FR-005-logging-and-import.md": "progressing",  # Logger UI exists but GPX/FIT import may be incomplete
    "FR-006-gamification.md": "done",  # Points, badges, leaderboard fully implemented
    "FR-007-analytics-and-export.md": "done",  # Analytics and export endpoints implemented
    "FR-008-admin-and-rbac.md": "done",  # RBAC middleware and admin routes implemented

    # Non-Functional Requirements
    "NFR-001-security.md": "done",  # Security headers, rate limiting, CSP configured
    "NFR-002-privacy.md": "progressing",  # GDPR docs exist, export works, deletion workflow may be incomplete
    "NFR-003-performance.md": "progressing",  # Lighthouse CI configured but may not meet all targets
    "NFR-004-a11y.md": "progressing",  # ADR exists but full WCAG compliance in progress
    "NFR-005-ops.md": "progressing",  # Health checks and backup scripts exist but SLO monitoring incomplete
    "NFR-006-i18n.md": "done",  # i18n system with EN/DE fully implemented
}


def organize_requirements():
    """Organize requirement files into status-based subfolders."""
    import argparse
    import subprocess

    parser = argparse.ArgumentParser(description="Organize requirement files by implementation status")
    parser.add_argument(
        "--auto-plan",
        action="store_true",
        help="Automatically trigger project-planning agent after organizing requirements",
    )
    parser.add_argument(
        "--git-token",
        type=str,
        help="GitHub token for project-planning agent (required if --auto-plan is used with issues mode)",
    )
    parser.add_argument(
        "--plan-mode",
        type=str,
        choices=["epics", "stories", "ac", "issues"],
        default="stories",
        help="Project-planning agent mode (default: stories)",
    )
    parser.add_argument(
        "--auto-upload",
        action="store_true",
        help="Auto-upload issues to GitHub (only for issues mode)",
    )
    args = parser.parse_args()

    script_dir = Path(__file__).parent
    repo_root = script_dir.parent
    requirements_dir = repo_root / "docs" / "1.Product_Requirements" / "Requirements"

    if not requirements_dir.exists():
        print(f"Requirements directory not found: {requirements_dir}")
        return 1

    # Create subfolders
    for status in ["done", "progressing", "open"]:
        subfolder = requirements_dir / status
        subfolder.mkdir(exist_ok=True)
        print(f"Created/verified folder: {subfolder}")

    # Move files based on status
    moved_count = {"done": 0, "progressing": 0, "open": 0}
    new_open_requirements = False

    for filename, status in STATUS_MAP.items():
        source = requirements_dir / filename
        if not source.exists():
            # Check in subfolders
            for subfolder in ["done", "progressing", "open"]:
                potential_source = requirements_dir / subfolder / filename
                if potential_source.exists():
                    source = potential_source
                    break
            if not source.exists():
                print(f"Warning: File not found: {filename}")
                continue

        dest = requirements_dir / status / filename

        if source.parent == dest.parent:
            print(f"Already in correct location: {filename}")
            continue

        try:
            shutil.move(str(source), str(dest))
            print(f"Moved {filename} → {status}/")
            moved_count[status] += 1
            if status == "open":
                new_open_requirements = True
        except Exception as e:
            print(f"Error moving {filename}: {e}")
            return 1

    # Check for any remaining files that weren't in our map
    remaining_files = [
        f for f in requirements_dir.iterdir()
        if f.is_file() and f.suffix == ".md" and f.name not in STATUS_MAP
    ]

    if remaining_files:
        print(f"\nWarning: Found {len(remaining_files)} unmapped requirement files:")
        for f in remaining_files:
            print(f"  - {f.name}")
            # Move to 'open' by default
            dest = requirements_dir / "open" / f.name
            try:
                shutil.move(str(f), str(dest))
                print(f"  → Moved to open/")
                moved_count["open"] += 1
                new_open_requirements = True
            except Exception as e:
                print(f"  → Error: {e}")

    # Summary
    print(f"\n{'='*60}")
    print("Organization Summary:")
    print(f"{'='*60}")
    print(f"Done:        {moved_count['done']} files")
    print(f"Progressing: {moved_count['progressing']} files")
    print(f"Open:        {moved_count['open']} files")
    print(f"{'='*60}")

    # Auto-trigger project-planning agent if requested
    if args.auto_plan:
        print("\n" + "=" * 60)
        print("AUTO-TRIGGERING PROJECT-PLANNING AGENT")
        print("=" * 60)
        planning_agent = script_dir / "project_planning_agent.py"
        if not planning_agent.exists():
            print(f"Warning: Project-planning agent not found at {planning_agent}")
            return 0

        cmd = [sys.executable, str(planning_agent), "--mode", args.plan_mode]
        if args.git_token:
            cmd.extend(["--git-token", args.git_token])
        if args.auto_upload:
            cmd.append("--auto-upload")

        try:
            result = subprocess.run(cmd, check=False, cwd=repo_root)
            return result.returncode
        except Exception as e:
            print(f"Error running project-planning agent: {e}")
            return 1

    return 0


if __name__ == "__main__":
    import sys
    exit(organize_requirements())














