#!/usr/bin/env python3
"""
Requirements to Issues Pipeline

Complete automated pipeline from requirements to GitHub issues:
1. Generate requirements from AC_Master.md
2. Organize requirements by status
3. Generate epics/stories from requirements
4. Generate and upload GitHub issues

Usage:
    python scripts/requirements_to_issues_pipeline.py --git-token <token> [options]
"""

import argparse
import subprocess
import sys
from pathlib import Path


def run_command(cmd: list[str], description: str) -> int:
    """Run a command and return exit code."""
    print(f"\n{'='*60}")
    print(f"STEP: {description}")
    print(f"{'='*60}")
    print(f"Running: {' '.join(cmd)}")
    print()

    try:
        result = subprocess.run(cmd, check=False)
        if result.returncode != 0:
            print(f"\n[!] Command failed with exit code {result.returncode}")
        return result.returncode
    except Exception as e:
        print(f"\n[!] Error running command: {e}")
        return 1


def main():
    parser = argparse.ArgumentParser(
        description="Complete pipeline from requirements to GitHub issues"
    )
    parser.add_argument(
        "--git-token",
        type=str,
        required=True,
        help="GitHub personal access token (required for uploading issues)",
    )
    parser.add_argument(
        "--skip-generate",
        action="store_true",
        help="Skip requirement generation step (use existing requirements)",
    )
    parser.add_argument(
        "--skip-organize",
        action="store_true",
        help="Skip requirement organization step",
    )
    parser.add_argument(
        "--skip-planning",
        action="store_true",
        help="Skip project planning step (epics/stories generation)",
    )
    parser.add_argument(
        "--skip-upload",
        action="store_true",
        help="Skip GitHub issue upload (only generate issue files)",
    )
    parser.add_argument(
        "--plan-mode",
        type=str,
        choices=["epics", "stories", "ac", "issues"],
        default="issues",
        help="Project-planning agent mode (default: issues)",
    )

    args = parser.parse_args()

    script_dir = Path(__file__).parent
    repo_root = script_dir.parent

    print("=" * 60)
    print("REQUIREMENTS TO ISSUES PIPELINE")
    print("=" * 60)
    print(f"Repository: {repo_root}")
    print(f"GitHub Token: {'*' * 20}...{args.git_token[-4:] if len(args.git_token) > 4 else '****'}")
    print()

    steps_completed = 0
    steps_failed = 0

    # Step 1: Generate requirements
    if not args.skip_generate:
        cmd = [sys.executable, str(script_dir / "generate_requirements.py")]
        exit_code = run_command(cmd, "Generate Requirements from AC_Master.md")
        if exit_code != 0:
            print("\n[!] Requirement generation failed. Continuing anyway...")
            steps_failed += 1
        else:
            steps_completed += 1
    else:
        print("\n[SKIP] Requirement generation step")

    # Step 2: Organize requirements
    if not args.skip_organize:
        cmd = [sys.executable, str(script_dir / "organize_requirements.py")]
        exit_code = run_command(cmd, "Organize Requirements by Status")
        if exit_code != 0:
            print("\n[!] Requirement organization failed. Continuing anyway...")
            steps_failed += 1
        else:
            steps_completed += 1
    else:
        print("\n[SKIP] Requirement organization step")

    # Step 3: Project planning (generate epics/stories)
    if not args.skip_planning:
        cmd = [
            sys.executable,
            str(script_dir / "project_planning_agent.py"),
            "--mode",
            args.plan_mode,
        ]
        if args.plan_mode == "issues":
            cmd.extend(["--git-token", args.git_token])
            if not args.skip_upload:
                cmd.append("--auto-upload")
        exit_code = run_command(cmd, f"Project Planning: Generate {args.plan_mode}")
        if exit_code != 0:
            print("\n[!] Project planning failed. Continuing anyway...")
            steps_failed += 1
        else:
            steps_completed += 1
    else:
        print("\n[SKIP] Project planning step")

    # Summary
    print("\n" + "=" * 60)
    print("PIPELINE SUMMARY")
    print("=" * 60)
    print(f"Steps completed: {steps_completed}")
    if steps_failed > 0:
        print(f"Steps failed: {steps_failed}")
        print("\n[!] Some steps failed. Review output above.")
        return 1
    else:
        print("\n[OK] Pipeline completed successfully!")
        return 0


if __name__ == "__main__":
    exit(main())















