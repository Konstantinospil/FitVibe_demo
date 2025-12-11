#!/usr/bin/env python3
"""
Quota Status Dashboard

CLI tool showing real-time quota usage, circuit breaker state, and budget breakdowns.
"""

import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from observability.quota_tracker import get_quota_tracker


def format_percentage(value: float) -> str:
    """Format percentage with color indicators."""
    if value >= 0.95:
        indicator = "🔴"
    elif value >= 0.80:
        indicator = "🟡"
    else:
        indicator = "🟢"
    return f"{indicator} {value:.1%}"


def format_number(num: int) -> str:
    """Format large numbers with commas."""
    return f"{num:,}"


def print_status():
    """Print quota status dashboard."""
    tracker = get_quota_tracker()
    usage = tracker.check_usage()

    print("=" * 60)
    print("QUOTA STATUS DASHBOARD")
    print("=" * 60)
    print(f"Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print()

    # Circuit breaker state
    circuit_state = usage["circuit_state"]
    if circuit_state == "OPEN":
        print("🔴 CIRCUIT BREAKER: OPEN")
        if usage["circuit_reason"]:
            print(f"   Reason: {usage['circuit_reason']}")
        if usage["circuit_opened_at"]:
            print(f"   Opened: {usage['circuit_opened_at']}")
        print("   ⚠️  Operations are BLOCKED")
    else:
        print("🟢 CIRCUIT BREAKER: CLOSED")
    print()

    # Token usage
    print("TOKEN USAGE")
    print("-" * 60)

    # Daily tokens
    daily = usage["tokens_daily"]
    print(f"Daily:   {format_number(daily['used'])} / {format_number(daily['limit'])} "
          f"({format_percentage(daily['percentage'])})")
    print(f"         Remaining: {format_number(daily['remaining'])}")
    print()

    # Hourly tokens
    hourly = usage["tokens_hourly"]
    print(f"Hourly:  {format_number(hourly['used'])} / {format_number(hourly['limit'])} "
          f"({format_percentage(hourly['percentage'])})")
    print(f"         Remaining: {format_number(hourly['remaining'])}")
    print()

    # Message usage
    print("MESSAGE USAGE")
    print("-" * 60)
    msg_daily = usage["messages_daily"]
    msg_hourly = usage["messages_hourly"]
    print(f"Daily:   {format_number(msg_daily['used'])} / {format_number(msg_daily['limit'])} "
          f"(Remaining: {format_number(msg_daily['remaining'])})")
    print(f"Hourly:  {format_number(msg_hourly['used'])} / {format_number(msg_hourly['limit'])} "
          f"(Remaining: {format_number(msg_hourly['remaining'])})")
    print()

    # Budget breakdown
    print("BUDGET BREAKDOWN")
    print("-" * 60)

    budget_by_agent = tracker.get_budget_by_agent()
    if budget_by_agent:
        print("By Agent:")
        for agent_id, tokens in sorted(budget_by_agent.items(), key=lambda x: x[1], reverse=True):
            print(f"  {agent_id}: {format_number(tokens)} tokens")
        print()

    budget_by_task = tracker.get_budget_by_task_type()
    if budget_by_task:
        print("By Task Type:")
        for task_type, tokens in sorted(budget_by_task.items(), key=lambda x: x[1], reverse=True):
            print(f"  {task_type}: {format_number(tokens)} tokens")
        print()

    # Next reset times
    print("NEXT RESET")
    print("-" * 60)
    now = datetime.now(timezone.utc)
    next_hour = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    next_day = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    print(f"Hourly:  {next_hour.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"Daily:   {next_day.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print()

    print("=" * 60)


if __name__ == "__main__":
    try:
        print_status()
    except KeyboardInterrupt:
        print("\nInterrupted.")
        sys.exit(0)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

