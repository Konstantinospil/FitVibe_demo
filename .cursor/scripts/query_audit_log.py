#!/usr/bin/env python3
"""
Audit Log Query Tool

CLI tool for querying and filtering audit logs with various filters:
- --correlation-id: Filter by correlation ID
- --time-range: Filter by time range
- --event-type: Filter by event type
- --agent-id: Filter by agent ID
- --output: Output format (json, human-readable)
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from observability.audit_logger import EventType


def parse_time_range(time_str: str) -> tuple[Optional[datetime], Optional[datetime]]:
    """
    Parse time range string.

    Formats:
    - "2025-01-20" (single day)
    - "2025-01-20:2025-01-21" (date range)
    - "2025-01-20T10:00:2025-01-20T12:00" (datetime range)
    """
    if ":" in time_str and not time_str.startswith("T"):
        parts = time_str.split(":", 1)
        start_str, end_str = parts[0], parts[1]
    else:
        start_str = time_str
        end_str = None

    start = None
    end = None

    if start_str:
        try:
            if "T" in start_str:
                start = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
            else:
                start = datetime.fromisoformat(f"{start_str}T00:00:00+00:00")
        except ValueError:
            print(f"Error: Invalid start time format: {start_str}", file=sys.stderr)
            sys.exit(1)

    if end_str:
        try:
            if "T" in end_str:
                end = datetime.fromisoformat(end_str.replace("Z", "+00:00"))
            else:
                end = datetime.fromisoformat(f"{end_str}T23:59:59+00:00")
        except ValueError:
            print(f"Error: Invalid end time format: {end_str}", file=sys.stderr)
            sys.exit(1)

    return start, end


def load_audit_logs(log_dir: str = ".cursor/logs") -> List[Dict[str, Any]]:
    """Load all audit logs from directory."""
    log_path = Path(log_dir)
    if not log_path.exists():
        return []

    logs = []
    # Load all JSONL files
    for log_file in sorted(log_path.glob("audit-*.jsonl*")):
        try:
            if log_file.suffix == ".gz":
                import gzip

                with gzip.open(log_file, "rt", encoding="utf-8") as f:
                    for line in f:
                        if line.strip():
                            logs.append(json.loads(line))
            else:
                with open(log_file, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip():
                            logs.append(json.loads(line))
        except Exception as e:
            print(f"Warning: Error reading {log_file}: {e}", file=sys.stderr)

    return logs


def filter_logs(
    logs: List[Dict[str, Any]],
    correlation_id: Optional[str] = None,
    time_range: Optional[tuple[Optional[datetime], Optional[datetime]]] = None,
    event_type: Optional[str] = None,
    agent_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Filter logs based on criteria."""
    filtered = logs

    if correlation_id:
        filtered = [log for log in filtered if log.get("correlation_id") == correlation_id]

    if time_range:
        start, end = time_range
        filtered = [
            log
            for log in filtered
            if (
                (start is None or datetime.fromisoformat(log["timestamp"]) >= start)
                and (end is None or datetime.fromisoformat(log["timestamp"]) <= end)
            )
        ]

    if event_type:
        filtered = [log for log in filtered if log.get("event_type") == event_type]

    if agent_id:
        filtered = [log for log in filtered if log.get("agent_id") == agent_id]

    return filtered


def format_human_readable(log: Dict[str, Any]) -> str:
    """Format log entry for human-readable output."""
    timestamp = log.get("timestamp", "")
    event_type = log.get("event_type", "")
    status = log.get("status", "")
    correlation_id = log.get("correlation_id", "")[:8]  # Short ID

    lines = [
        f"[{timestamp}] {event_type} ({status})",
        f"  Correlation ID: {correlation_id}",
    ]

    if "agent_id" in log:
        lines.append(f"  Agent: {log['agent_id']}")

    if "tool_name" in log:
        lines.append(f"  Tool: {log['tool_name']}")

    if "duration_ms" in log:
        lines.append(f"  Duration: {log['duration_ms']}ms")

    if "error" in log:
        lines.append(f"  Error: {log['error']}")

    if "output_summary" in log:
        summary = log["output_summary"][:200]
        lines.append(f"  Summary: {summary}")

    return "\n".join(lines)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description="Query audit logs")
    parser.add_argument(
        "--correlation-id",
        help="Filter by correlation ID",
    )
    parser.add_argument(
        "--time-range",
        help="Filter by time range (format: YYYY-MM-DD or YYYY-MM-DD:YYYY-MM-DD)",
    )
    parser.add_argument(
        "--event-type",
        choices=[e.value for e in EventType],
        help="Filter by event type",
    )
    parser.add_argument(
        "--agent-id",
        help="Filter by agent ID",
    )
    parser.add_argument(
        "--output",
        choices=["json", "human"],
        default="human",
        help="Output format",
    )
    parser.add_argument(
        "--log-dir",
        default=".cursor/logs",
        help="Audit log directory",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Limit number of results",
    )

    args = parser.parse_args()

    # Load logs
    logs = load_audit_logs(args.log_dir)

    # Parse time range
    time_range = None
    if args.time_range:
        time_range = parse_time_range(args.time_range)

    # Filter logs
    filtered = filter_logs(
        logs,
        correlation_id=args.correlation_id,
        time_range=time_range,
        event_type=args.event_type,
        agent_id=args.agent_id,
    )

    # Apply limit
    if args.limit:
        filtered = filtered[-args.limit :]  # Most recent N

    # Output
    if args.output == "json":
        print(json.dumps(filtered, indent=2, ensure_ascii=False))
    else:
        if not filtered:
            print("No matching log entries found.")
        else:
            print(f"Found {len(filtered)} log entries:\n")
            for log in filtered:
                print(format_human_readable(log))
                print()


if __name__ == "__main__":
    main()



