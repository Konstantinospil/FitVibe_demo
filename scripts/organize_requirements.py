#!/usr/bin/env python3
"""
Organize Requirements by Implementation Status

Analyzes the codebase to determine implementation status and moves requirement
documents to appropriate subfolders: done, progressing, or open.
"""

import os
import shutil
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

    for filename, status in STATUS_MAP.items():
        source = requirements_dir / filename
        if not source.exists():
            print(f"Warning: File not found: {source}")
            continue

        dest = requirements_dir / status / filename

        if source.parent == dest.parent:
            print(f"Already in correct location: {filename}")
            continue

        try:
            shutil.move(str(source), str(dest))
            print(f"Moved {filename} → {status}/")
            moved_count[status] += 1
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

    return 0


if __name__ == "__main__":
    exit(organize_requirements())













