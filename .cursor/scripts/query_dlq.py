#!/usr/bin/env python3
"""
Query Dead-Letter Queue - CLI tool to view and manage failed tasks.

Usage:
    python .cursor/scripts/query_dlq.py [--agent AGENT_ID] [--retryable] [--limit N]
"""

import sys
import argparse
from pathlib import Path

# Add .cursor to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from orchestration.error_handling import dead_letter_queue


def main():
    parser = argparse.ArgumentParser(description="Query dead-letter queue")
    parser.add_argument("--agent", help="Filter by agent ID")
    parser.add_argument("--retryable", action="store_true", help="Show only retryable tasks")
    parser.add_argument("--non-retryable", action="store_true", help="Show only non-retryable tasks")
    parser.add_argument("--limit", type=int, default=50, help="Maximum number of tasks to show")
    parser.add_argument("--remove", help="Remove a specific task by ID")

    args = parser.parse_args()

    if args.remove:
        if dead_letter_queue.remove_task(args.remove):
            print(f"✅ Removed task {args.remove} from dead-letter queue")
        else:
            print(f"❌ Task {args.remove} not found")
        return

    can_retry = None
    if args.retryable:
        can_retry = True
    elif args.non_retryable:
        can_retry = False

    tasks = dead_letter_queue.get_failed_tasks(
        agent_id=args.agent,
        can_retry=can_retry,
        limit=args.limit
    )

    if not tasks:
        print("No failed tasks in dead-letter queue")
        return

    print(f"\n📋 Dead-Letter Queue ({len(tasks)} tasks)\n")
    print(f"{'Task ID':<30} {'Agent':<20} {'Category':<15} {'Attempts':<10} {'Failed At':<20}")
    print("-" * 95)

    for task in tasks:
        retryable_marker = "🔄" if task.can_retry else "❌"
        print(
            f"{task.task_id:<30} {task.agent_id:<20} "
            f"{task.error.category.value:<15} {task.attempts:<10} "
            f"{task.failed_at[:19]:<20} {retryable_marker}"
        )

    print(f"\n💡 Use --remove TASK_ID to remove a task from the queue")


if __name__ == "__main__":
    main()
















