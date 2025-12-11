#!/usr/bin/env python3
"""
CLI Approval Interface

Interactive CLI for approving/rejecting pending approval requests.
"""

import argparse
import sys
from pathlib import Path
from typing import List

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from approval.approval_manager import get_approval_manager, ApprovalRequest, ActionType


def format_request(req: ApprovalRequest) -> str:
    """Format approval request for display."""
    lines = [
        f"Request ID: {req.request_id}",
        f"Agent:      {req.agent_id}",
        f"Action:     {req.action_type.value}",
        f"Risk Level: {req.risk_level.upper()}",
        f"Timestamp:  {req.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"Timeout:    {req.timeout_at.strftime('%Y-%m-%d %H:%M:%S UTC')}",
    ]

    # Action details
    if req.action_details:
        lines.append("\nAction Details:")
        for key, value in req.action_details.items():
            if isinstance(value, dict):
                lines.append(f"  {key}:")
                for k, v in value.items():
                    lines.append(f"    {k}: {v}")
            else:
                lines.append(f"  {key}: {value}")

    return "\n".join(lines)


def print_requests(requests: List[ApprovalRequest]):
    """Print list of requests."""
    if not requests:
        print("No pending approval requests.")
        return

    print(f"\n{'='*60}")
    print(f"PENDING APPROVAL REQUESTS ({len(requests)})")
    print(f"{'='*60}\n")

    for i, req in enumerate(requests, 1):
        print(f"[{i}] {req.request_id}")
        print(f"    Agent: {req.agent_id} | Action: {req.action_type.value} | Risk: {req.risk_level}")
        print()


def interactive_approve():
    """Interactive approval interface."""
    manager = get_approval_manager()
    pending = manager.get_pending()

    if not pending:
        print("No pending approval requests.")
        return

    print_requests(pending)

    while True:
        try:
            choice = input(
                "\nEnter request number to review (or 'q' to quit, 'a' to approve all): "
            ).strip()

            if choice.lower() == "q":
                break

            if choice.lower() == "a":
                confirm = input("Approve ALL pending requests? (yes/no): ").strip().lower()
                if confirm == "yes":
                    approved_by = input("Your name/ID: ").strip() or "admin"
                    for req in pending:
                        manager.approve(req.request_id, approved_by)
                    print(f"Approved {len(pending)} requests.")
                break

            try:
                index = int(choice) - 1
                if 0 <= index < len(pending):
                    req = pending[index]
                    print("\n" + "=" * 60)
                    print(format_request(req))
                    print("=" * 60)

                    action = input("\n[a]pprove, [r]eject, [d]efer, [b]ack: ").strip().lower()

                    if action == "a":
                        approved_by = input("Your name/ID: ").strip() or "admin"
                        if manager.approve(req.request_id, approved_by):
                            print(f"✓ Approved request {req.request_id}")
                            pending = manager.get_pending()
                            if not pending:
                                print("No more pending requests.")
                                break
                        else:
                            print("✗ Failed to approve (request may have been processed)")

                    elif action == "r":
                        reason = input("Rejection reason: ").strip() or "Rejected by admin"
                        rejected_by = input("Your name/ID: ").strip() or "admin"
                        if manager.reject(req.request_id, rejected_by, reason):
                            print(f"✓ Rejected request {req.request_id}")
                            pending = manager.get_pending()
                            if not pending:
                                print("No more pending requests.")
                                break
                        else:
                            print("✗ Failed to reject (request may have been processed)")

                    elif action == "d":
                        print("Deferring request (will remain pending)")
                        continue

                    elif action == "b":
                        continue

                else:
                    print(f"Invalid choice. Enter 1-{len(pending)}")

            except ValueError:
                print("Invalid input. Enter a number or 'q' to quit.")

        except KeyboardInterrupt:
            print("\n\nInterrupted.")
            break


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description="Approve pending requests")
    parser.add_argument(
        "--list",
        action="store_true",
        help="List pending requests and exit",
    )
    parser.add_argument(
        "--approve",
        help="Approve request by ID",
    )
    parser.add_argument(
        "--reject",
        help="Reject request by ID",
    )
    parser.add_argument(
        "--reason",
        help="Rejection reason (required with --reject)",
    )
    parser.add_argument(
        "--approved-by",
        default="admin",
        help="Name/ID of approver (default: admin)",
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Interactive approval interface (default)",
    )

    args = parser.parse_args()

    manager = get_approval_manager()

    if args.list:
        pending = manager.get_pending()
        print_requests(pending)
        sys.exit(0)

    if args.approve:
        if manager.approve(args.approve, args.approved_by):
            print(f"✓ Approved request {args.approve}")
            sys.exit(0)
        else:
            print(f"✗ Failed to approve request {args.approve}", file=sys.stderr)
            sys.exit(1)

    if args.reject:
        reason = args.reason or "Rejected by admin"
        if manager.reject(args.reject, args.approved_by, reason):
            print(f"✓ Rejected request {args.reject}")
            sys.exit(0)
        else:
            print(f"✗ Failed to reject request {args.reject}", file=sys.stderr)
            sys.exit(1)

    # Default: interactive mode
    interactive_approve()


if __name__ == "__main__":
    main()



