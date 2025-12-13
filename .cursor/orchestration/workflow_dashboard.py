"""
Workflow Dashboard - CLI dashboard for monitoring workflow execution.

This module provides a real-time dashboard view of workflow execution status,
metrics, and system health.

Version: 1.0
Last Updated: 2025-01-21
"""

import sys
import time
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any

# Add .cursor to path if running as script
if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from orchestration.workflow_metrics import get_metrics_collector, WorkflowMetrics, SystemMetrics
from orchestration.workflow_executor import WorkflowExecutor
from orchestration.event_log import event_log
from orchestration.error_handling import dead_letter_queue


def format_duration(ms: Optional[float]) -> str:
    """Format duration in milliseconds to human-readable string."""
    if ms is None:
        return "N/A"
    
    if ms < 1000:
        return f"{ms:.0f}ms"
    elif ms < 60000:
        return f"{ms/1000:.1f}s"
    elif ms < 3600000:
        return f"{ms/60000:.1f}m"
    else:
        return f"{ms/3600000:.1f}h"


def format_percentage(value: float) -> str:
    """Format percentage value."""
    return f"{value * 100:.1f}%"


def format_timestamp(ts: Optional[str]) -> str:
    """Format ISO timestamp to readable string."""
    if not ts:
        return "Never"
    
    try:
        dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except:
        return ts[:19] if len(ts) >= 19 else ts


def clear_screen():
    """Clear terminal screen."""
    print("\033[2J\033[H", end="")


def print_header(title: str):
    """Print section header."""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)


def print_system_overview(metrics: SystemMetrics):
    """Print system-wide overview."""
    print_header("System Overview")
    
    print(f"\nTotal Workflows:        {metrics.total_workflows}")
    print(f"Total Executions:      {metrics.total_executions}")
    print(f"Active Executions:     {metrics.active_executions}")
    print(f"\nSuccess Rate:          {format_percentage(metrics.overall_success_rate)}")
    print(f"Average Duration:      {format_duration(metrics.average_duration_ms)}")
    
    print(f"\nExecutions (Last 24h): {metrics.executions_last_24h}")
    print(f"Executions (Last 7d):  {metrics.executions_last_7d}")
    
    print(f"\nSuccessful:            {metrics.successful_executions}")
    print(f"Failed:                {metrics.failed_executions}")
    print(f"Cancelled:             {metrics.cancelled_executions}")


def print_workflow_metrics(metrics: WorkflowMetrics):
    """Print workflow-specific metrics."""
    print_header(f"Workflow: {metrics.workflow_id}")
    
    print(f"\nTotal Executions:      {metrics.total_executions}")
    print(f"Success Rate:          {format_percentage(metrics.success_rate)}")
    print(f"Failure Rate:          {format_percentage(metrics.failure_rate)}")
    print(f"Average Duration:      {format_duration(metrics.average_duration_ms)}")
    
    print(f"\nSuccessful:            {metrics.successful_executions}")
    print(f"Failed:                {metrics.failed_executions}")
    print(f"Cancelled:             {metrics.cancelled_executions}")
    
    print(f"\nLast Execution:       {format_timestamp(metrics.last_execution_at)}")
    print(f"Last Success:          {format_timestamp(metrics.last_success_at)}")
    print(f"Last Failure:          {format_timestamp(metrics.last_failure_at)}")


def print_top_workflows(metrics: SystemMetrics):
    """Print top workflows by execution count."""
    if not metrics.top_workflows:
        return
    
    print_header("Top Workflows (by Execution Count)")
    
    print(f"\n{'Workflow ID':<30} {'Executions':<15}")
    print("-" * 45)
    
    for wf in metrics.top_workflows[:10]:
        print(f"{wf['workflow_id']:<30} {wf['execution_count']:<15}")


def print_recent_executions(executor: WorkflowExecutor, limit: int = 10):
    """Print recent executions."""
    print_header("Recent Executions")
    
    executions = executor.list_executions()
    
    # Sort by started_at (most recent first)
    executions.sort(
        key=lambda e: e.started_at or "",
        reverse=True
    )
    
    if not executions:
        print("\nNo executions found.")
        return
    
    print(f"\n{'Execution ID':<30} {'Workflow':<20} {'Status':<15} {'Started':<20}")
    print("-" * 85)
    
    for exec in executions[:limit]:
        status = exec.status.value if hasattr(exec.status, 'value') else str(exec.status)
        started = format_timestamp(exec.started_at)
        print(f"{exec.execution_id:<30} {exec.workflow_id:<20} {status:<15} {started:<20}")


def print_dead_letter_queue():
    """Print dead-letter queue status."""
    print_header("Dead-Letter Queue")
    
    tasks = dead_letter_queue.get_failed_tasks(limit=10)
    
    if not tasks:
        print("\nNo failed tasks in dead-letter queue.")
        return
    
    print(f"\n{'Task ID':<30} {'Agent':<20} {'Category':<15} {'Failed At':<20}")
    print("-" * 85)
    
    for task in tasks[:10]:
        retryable = "🔄" if task.can_retry else "❌"
        failed_at = format_timestamp(task.failed_at)
        print(
            f"{task.task_id:<30} {task.agent_id:<20} "
            f"{task.error.category.value:<15} {failed_at:<20} {retryable}"
        )


def print_recent_events(limit: int = 20):
    """Print recent workflow events."""
    print_header("Recent Events")
    
    events = event_log.get_events(limit=limit)
    
    if not events:
        print("\nNo events found.")
        return
    
    # Sort by timestamp (most recent first)
    events.sort(key=lambda e: e.timestamp, reverse=True)
    
    print(f"\n{'Timestamp':<20} {'Type':<25} {'Workflow':<20} {'Status':<15}")
    print("-" * 80)
    
    for event in events[:limit]:
        timestamp = format_timestamp(event.timestamp)
        status = event.status
        print(f"{timestamp:<20} {event.event_type:<25} {event.workflow_id:<20} {status:<15}")


def show_dashboard(
    workflow_id: Optional[str] = None,
    refresh_interval: int = 5,
    continuous: bool = False
):
    """
    Show workflow execution dashboard.
    
    Args:
        workflow_id: Optional workflow ID to show specific metrics
        refresh_interval: Refresh interval in seconds (for continuous mode)
        continuous: Whether to continuously refresh the dashboard
    """
    executor = WorkflowExecutor(workflows_dir="workflows", agents_dir="agents")
    metrics_collector = get_metrics_collector()
    
    try:
        while True:
            clear_screen()
            
            # Get current timestamp
            result = subprocess.run(
                ['date', '-u', '+%Y-%m-%d %H:%M:%S UTC'],
                capture_output=True,
                text=True
            )
            current_time = result.stdout.strip() if result.returncode == 0 else datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
            
            print(f"\nWorkflow Dashboard - {current_time}")
            
            # System overview
            system_metrics = metrics_collector.get_system_metrics()
            print_system_overview(system_metrics)
            
            # Workflow-specific metrics if specified
            if workflow_id:
                try:
                    workflow_metrics = metrics_collector.get_workflow_metrics(workflow_id)
                    print_workflow_metrics(workflow_metrics)
                except Exception as e:
                    print(f"\n[ERROR] Failed to get workflow metrics: {e}")
            
            # Top workflows
            print_top_workflows(system_metrics)
            
            # Recent executions
            print_recent_executions(executor, limit=10)
            
            # Dead-letter queue
            print_dead_letter_queue()
            
            # Recent events
            print_recent_events(limit=10)
            
            if not continuous:
                break
            
            print(f"\n\nRefreshing in {refresh_interval} seconds... (Press Ctrl+C to exit)")
            time.sleep(refresh_interval)
    
    except KeyboardInterrupt:
        print("\n\nDashboard stopped.")


def main():
    """CLI entry point for dashboard."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Workflow execution dashboard")
    parser.add_argument('--workflow-id', help='Show metrics for specific workflow')
    parser.add_argument('--refresh', type=int, default=5, help='Refresh interval in seconds (default: 5)')
    parser.add_argument('--continuous', action='store_true', help='Continuously refresh dashboard')
    
    args = parser.parse_args()
    
    show_dashboard(
        workflow_id=args.workflow_id,
        refresh_interval=args.refresh,
        continuous=args.continuous
    )


if __name__ == "__main__":
    main()
