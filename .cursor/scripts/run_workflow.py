#!/usr/bin/env python3
"""
Workflow CLI - Command-line interface for running workflows.

Usage:
    python run_workflow.py list                    # List available workflows
    python run_workflow.py run <workflow-id>       # Run a workflow
    python run_workflow.py status <execution-id>   # Check execution status
    python run_workflow.py list-executions         # List all executions
    python run_workflow.py resume <execution-id>   # Resume a failed workflow
    python run_workflow.py events <execution-id>   # View workflow events
    python run_workflow.py dlq [options]           # Manage dead-letter queue
"""

import sys
import json
import argparse
import os
from pathlib import Path
from typing import Dict, Any, Optional

# Load .env file if it exists
try:
    from dotenv import load_dotenv
    # Load .env from .cursor directory
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        print(f"Loaded environment variables from {env_path}")
except ImportError:
    # python-dotenv not installed, try manual loading
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

# Add .cursor to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from orchestration.workflow_parser import WorkflowParser
from orchestration.workflow_validator import WorkflowValidator
from orchestration.workflow_executor import WorkflowExecutor
from orchestration.workflow_models import WorkflowStatus as WorkflowStatusModel
from orchestration.event_log import event_log
from orchestration.error_handling import dead_letter_queue
from orchestration.workflow_metrics import get_metrics_collector
from orchestration.workflow_dashboard import show_dashboard
from orchestration.workflow_debug import (
    inspect_execution as debug_inspect,
    replay_execution as debug_replay,
    compare_executions as debug_compare,
    trace_execution as debug_trace,
    validate_state as debug_validate
)
from orchestration.agent_discovery import resolve_agents_dir, resolve_workflows_dir


def format_status(status: str) -> str:
    """Format status with color/icon."""
    status_map = {
        "pending": ("[PENDING]", "yellow"),
        "running": ("[RUNNING]", "blue"),
        "paused": ("[PAUSED]", "yellow"),
        "completed": ("[COMPLETED]", "green"),
        "failed": ("[FAILED]", "red"),
        "cancelled": ("[CANCELLED]", "gray"),
    }
    
    formatted, color = status_map.get(status.lower(), (f"[{status.upper()}]", "white"))
    return formatted


def list_workflows():
    """List all available workflows."""
    # Use path resolution utility
    workflows_dir = resolve_workflows_dir()
    parser = WorkflowParser(workflows_dir=workflows_dir)
    workflows = parser.list_workflows()
    
    if not workflows:
        print("No workflows found.")
        return
    
    print(f"\nAvailable Workflows ({len(workflows)}):")
    print("=" * 70)
    
    for workflow_file in workflows:
        try:
            workflow = parser.parse_workflow(workflow_file)
            print(f"\n{workflow.name}")
            print(f"  ID: {workflow.workflow_id}")
            print(f"  Description: {workflow.description[:80]}...")
            print(f"  Phases: {len(workflow.phases)}")
            print(f"  Steps: {sum(len(p.steps) for p in workflow.phases)}")
            print(f"  Status: {workflow.metadata.status}")
            print(f"  Priority: {workflow.metadata.priority}")
        except Exception as e:
            print(f"\n{workflow_file.name}")
            print(f"  [ERROR] Failed to parse: {e}")


def run_workflow(workflow_id: str, input_data: Optional[Dict[str, Any]] = None):
    """Run a workflow."""
    # Use path resolution utilities
    workflows_dir = resolve_workflows_dir()
    agents_dir = resolve_agents_dir()
    executor = WorkflowExecutor(
        workflows_dir=str(workflows_dir),
        agents_dir=str(agents_dir)
    )
    validator = WorkflowValidator(agents_dir=agents_dir)
    
    print(f"\nStarting workflow: {workflow_id}")
    print("=" * 70)
    
    try:
        # Load and validate workflow
        workflow = executor.load_workflow(workflow_id)
        
        print(f"Workflow: {workflow.name}")
        print(f"Phases: {len(workflow.phases)}")
        print(f"Total Steps: {sum(len(p.steps) for p in workflow.phases)}")
        
        # Validate
        errors = validator.validate(workflow)
        if errors:
            print(f"\n[WARNING] Found {len(errors)} validation errors:")
            for error in errors[:5]:
                print(f"  - {error}")
            if len(errors) > 5:
                print(f"  ... and {len(errors) - 5} more errors")
            
            response = input("\nContinue anyway? (y/N): ")
            if response.lower() != 'y':
                print("Cancelled.")
                return
        
        # Prepare input data
        if not input_data:
            input_data = {}
        
        # Prompt for required inputs if not provided
        if not input_data.get("task") and not input_data.get("description"):
            task = input("\nEnter task/description (or press Enter to skip): ").strip()
            if task:
                input_data["task"] = task
        
        # Start workflow
        print("\nStarting workflow execution...")
        execution = executor.start_workflow(
            workflow_id=workflow_id,
            input_data=input_data
        )
        
        print(f"Execution ID: {execution.execution_id}")
        print(f"Status: {format_status(execution.status.value)}")
        print(f"Started at: {execution.started_at}")
        
        # Execute workflow
        print("\nExecuting workflow...")
        print("-" * 70)
        
        execution = executor.execute_workflow(execution.execution_id, workflow)
        
        # Display results
        print("\n" + "=" * 70)
        print("Execution Complete")
        print("=" * 70)
        print(f"Status: {format_status(execution.status.value)}")
        
        if execution.completed_at:
            print(f"Completed at: {execution.completed_at}")
            if execution.duration_ms:
                print(f"Duration: {execution.duration_ms / 1000:.2f} seconds")
        
        if execution.error:
            print(f"Error: {execution.error}")
        
        # Show phase summary
        print(f"\nPhases: {len(execution.phase_executions)}")
        for phase_exec in execution.phase_executions:
            completed_steps = len([s for s in phase_exec.step_executions if s.status.value == "completed"])
            total_steps = len(phase_exec.step_executions)
            print(f"  {phase_exec.phase_id}: {format_status(phase_exec.status.value)} "
                  f"({completed_steps}/{total_steps} steps)")
        
        # Show step details for failed steps
        failed_steps = []
        for phase_exec in execution.phase_executions:
            for step_exec in phase_exec.step_executions:
                if step_exec.status.value == "failed":
                    failed_steps.append((phase_exec.phase_id, step_exec))
        
        if failed_steps:
            print(f"\nFailed Steps ({len(failed_steps)}):")
            for phase_id, step_exec in failed_steps:
                print(f"  {phase_id}/{step_exec.step_id}: {step_exec.error}")
        
        print(f"\nExecution ID: {execution.execution_id}")
        print("Use 'python run_workflow.py status <execution-id>' to view details")
        
    except FileNotFoundError as e:
        print(f"[ERROR] Workflow not found: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Failed to execute workflow: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def show_status(execution_id: str):
    """Show execution status."""
    # Use path resolution utilities
    workflows_dir = resolve_workflows_dir()
    agents_dir = resolve_agents_dir()
    executor = WorkflowExecutor(
        workflows_dir=str(workflows_dir),
        agents_dir=str(agents_dir)
    )
    
    execution = executor.get_execution(execution_id)
    
    # Try loading from state repository if not in active executions
    if not execution:
        state = executor.state_repository.load_state(execution_id)
        if state and state.workflow_execution:
            # Reconstruct execution from state
            workflow_exec = state.workflow_execution
            from orchestration.workflow_models import WorkflowExecution as WorkflowExecutionModel
            
            status_map = {
                "not_started": WorkflowStatusModel.PENDING,
                "in_progress": WorkflowStatusModel.RUNNING,
                "complete": WorkflowStatusModel.COMPLETED,
                "failed": WorkflowStatusModel.FAILED,
                "cancelled": WorkflowStatusModel.CANCELLED,
            }
            
            execution = WorkflowExecutionModel(
                execution_id=workflow_exec.context.get("execution_id", execution_id),
                workflow_id=workflow_exec.workflow_id,
                workflow_version=workflow_exec.context.get("workflow_version", "1.0"),
                status=status_map.get(workflow_exec.status.value, WorkflowStatusModel.FAILED),
                started_at=workflow_exec.started_at,
                completed_at=workflow_exec.completed_at,
                current_phase_id=workflow_exec.context.get("current_phase_id"),
                current_step_id=workflow_exec.context.get("current_step_id"),
                error=workflow_exec.metadata.get("error"),
                metadata=workflow_exec.metadata
            )
    
    if not execution:
        print(f"[ERROR] Execution '{execution_id}' not found")
        sys.exit(1)
    
    print(f"\nExecution Status: {execution_id}")
    print("=" * 70)
    print(f"Workflow: {execution.workflow_id}")
    print(f"Status: {format_status(execution.status.value)}")
    print(f"Started at: {execution.started_at}")
    
    if execution.completed_at:
        print(f"Completed at: {execution.completed_at}")
        if execution.duration_ms:
            print(f"Duration: {execution.duration_ms / 1000:.2f} seconds")
    
    if execution.error:
        print(f"Error: {execution.error}")
    
    # Show phase details
    print(f"\nPhases ({len(execution.phase_executions)}):")
    for phase_exec in execution.phase_executions:
        print(f"\n  Phase: {phase_exec.phase_id}")
        print(f"    Status: {format_status(phase_exec.status.value)}")
        if phase_exec.started_at:
            print(f"    Started: {phase_exec.started_at}")
        if phase_exec.completed_at:
            print(f"    Completed: {phase_exec.completed_at}")
        if phase_exec.duration_ms:
            print(f"    Duration: {phase_exec.duration_ms / 1000:.2f} seconds")
        
        # Show steps
        print(f"    Steps ({len(phase_exec.step_executions)}):")
        for step_exec in phase_exec.step_executions:
            status_icon = format_status(step_exec.status.value)
            print(f"      {step_exec.step_id}: {status_icon}")
            if step_exec.error:
                print(f"        Error: {step_exec.error}")
            if step_exec.agent_execution_id:
                print(f"        Agent: {step_exec.agent_execution_id}")
            if step_exec.duration_ms:
                print(f"        Duration: {step_exec.duration_ms:.0f}ms")


def list_executions(workflow_id: Optional[str] = None):
    """List all executions."""
    # Use path resolution utilities
    workflows_dir = resolve_workflows_dir()
    agents_dir = resolve_agents_dir()
    executor = WorkflowExecutor(
        workflows_dir=str(workflows_dir),
        agents_dir=str(agents_dir)
    )
    
    # Get active executions
    active_executions = executor.list_executions(workflow_id)
    
    # Also load from state repository
    all_execution_ids = set()
    for exec in active_executions:
        all_execution_ids.add(exec.execution_id)
    
    # Query state repository for all workflow execution states
    import sqlite3
    from pathlib import Path
    
    # Get state DB path from config or default
    try:
        from orchestration.config_loader import config_loader
        workflow_config = config_loader.get_section("workflow_engine") or {}
        state_db_path = workflow_config.get("state_db_path", ".cursor/data/workflow_state.db")
    except ImportError:
        state_db_path = ".cursor/data/workflow_state.db"
    
    state_db = Path(state_db_path)
    if state_db.exists():
        with sqlite3.connect(state_db) as conn:
            query = "SELECT state_id FROM agent_states WHERE state_type = 'workflow_execution'"
            if workflow_id:
                # Filter by workflow_id in state_data JSON
                query += " AND state_data LIKE ?"
                params = [f'%"workflow_id"%"{workflow_id}"%']
            else:
                params = []
            
            rows = conn.execute(query, params).fetchall()
            for row in rows:
                all_execution_ids.add(row[0])
    
    # Load all executions
    executions = []
    for exec_id in all_execution_ids:
        exec_obj = executor.get_execution(exec_id)
        if not exec_obj:
            # Try loading from state repository
            state = executor.state_repository.load_state(exec_id)
            if state and state.workflow_execution:
                workflow_exec = state.workflow_execution
                from orchestration.workflow_models import WorkflowExecution as WorkflowExecutionModel
                
                status_map = {
                    "not_started": WorkflowStatusModel.PENDING,
                    "in_progress": WorkflowStatusModel.RUNNING,
                    "complete": WorkflowStatusModel.COMPLETED,
                    "failed": WorkflowStatusModel.FAILED,
                    "cancelled": WorkflowStatusModel.CANCELLED,
                }
                
                exec_obj = WorkflowExecutionModel(
                    execution_id=workflow_exec.context.get("execution_id", exec_id),
                    workflow_id=workflow_exec.workflow_id,
                    workflow_version=workflow_exec.context.get("workflow_version", "1.0"),
                    status=status_map.get(workflow_exec.status.value, WorkflowStatusModel.FAILED),
                    started_at=workflow_exec.started_at,
                    completed_at=workflow_exec.completed_at,
                    current_phase_id=workflow_exec.context.get("current_phase_id"),
                    current_step_id=workflow_exec.context.get("current_step_id"),
                    error=workflow_exec.metadata.get("error"),
                    metadata=workflow_exec.metadata
                )
        
        if exec_obj:
            if not workflow_id or exec_obj.workflow_id == workflow_id:
                executions.append(exec_obj)
    
    if not executions:
        print("No executions found.")
        return
    
    print(f"\nExecutions ({len(executions)}):")
    print("=" * 70)
    
    for execution in executions:
        status_icon = format_status(execution.status.value)
        print(f"\n{execution.execution_id}")
        print(f"  Workflow: {execution.workflow_id}")
        print(f"  Status: {status_icon}")
        print(f"  Started: {execution.started_at}")
        if execution.completed_at:
            print(f"  Completed: {execution.completed_at}")
        if execution.duration_ms:
            print(f"  Duration: {execution.duration_ms / 1000:.2f} seconds")
        
        # Show progress
        completed_phases = len([p for p in execution.phase_executions if p.status.value == "completed"])
        total_phases = len(execution.phase_executions)
        if total_phases > 0:
            print(f"  Progress: {completed_phases}/{total_phases} phases completed")


def resume_workflow(execution_id: str):
    """Resume a failed workflow."""
    # Use path resolution utilities
    workflows_dir = resolve_workflows_dir()
    agents_dir = resolve_agents_dir()
    executor = WorkflowExecutor(
        workflows_dir=str(workflows_dir),
        agents_dir=str(agents_dir)
    )
    
    print(f"\nResuming workflow execution: {execution_id}")
    print("=" * 70)
    
    try:
        # Resume workflow
        execution = executor.resume_workflow(execution_id)
        
        print(f"Status: {format_status(execution.status.value)}")
        
        if execution.completed_at:
            print(f"Completed at: {execution.completed_at}")
            if execution.duration_ms:
                print(f"Duration: {execution.duration_ms / 1000:.2f} seconds")
        
        if execution.error:
            print(f"Error: {execution.error}")
        
        # Show phase summary
        print(f"\nPhases: {len(execution.phase_executions)}")
        for phase_exec in execution.phase_executions:
            completed_steps = len([s for s in phase_exec.step_executions if s.status.value == "completed"])
            total_steps = len(phase_exec.step_executions)
            print(f"  {phase_exec.phase_id}: {format_status(phase_exec.status.value)} "
                  f"({completed_steps}/{total_steps} steps)")
        
        print(f"\nExecution ID: {execution.execution_id}")
        print("Use 'python run_workflow.py status <execution-id>' to view details")
        
    except ValueError as e:
        print(f"[ERROR] {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Failed to resume workflow: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def show_events(execution_id: str, event_type: Optional[str] = None, limit: int = 100):
    """Show workflow events for an execution."""
    print(f"\nWorkflow Events: {execution_id}")
    print("=" * 70)
    
    events = event_log.get_events(
        execution_id=execution_id,
        event_type=event_type,
        limit=limit
    )
    
    if not events:
        print("No events found.")
        return
    
    print(f"\nEvents ({len(events)}):\n")
    print(f"{'Timestamp':<20} {'Type':<25} {'Status':<12} {'Phase':<15} {'Step':<20}")
    print("-" * 95)
    
    for event in events:
        phase = event.phase_id or "-"
        step = event.step_id or "-"
        status_icon = format_status(event.status)
        print(f"{event.timestamp[:19]:<20} {event.event_type:<25} {status_icon:<12} {phase:<15} {step:<20}")
        
        if event.error:
            print(f"  Error: {event.error}")
        
        if event.data and len(event.data) > 0:
            # Show key data fields
            data_str = ", ".join([f"{k}={v}" for k, v in list(event.data.items())[:3]])
            if len(event.data) > 3:
                data_str += "..."
            if data_str:
                print(f"  Data: {data_str}")


def handle_dlq(args):
    """Handle dead-letter queue commands."""
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
    
    print(f"\n💡 Use 'run_workflow.py dlq --remove TASK_ID' to remove a task from the queue")
    print(f"💡 Use 'run_workflow.py resume TASK_ID' to resume a failed workflow")
    
    print(f"\n💡 Use 'run_workflow.py dlq --remove TASK_ID' to remove a task from the queue")
    print(f"💡 Use 'run_workflow.py resume TASK_ID' to resume a failed workflow")


def show_metrics(workflow_id: Optional[str] = None):
    """Show workflow metrics."""
    metrics_collector = get_metrics_collector()
    
    if workflow_id:
        # Show workflow-specific metrics
        metrics = metrics_collector.get_workflow_metrics(workflow_id)
        print(f"\nWorkflow Metrics: {workflow_id}")
        print("=" * 70)
        print(f"Total Executions:      {metrics.total_executions}")
        print(f"Successful:             {metrics.successful_executions}")
        print(f"Failed:                {metrics.failed_executions}")
        print(f"Cancelled:             {metrics.cancelled_executions}")
        print(f"Success Rate:          {metrics.success_rate * 100:.1f}%")
        print(f"Failure Rate:           {metrics.failure_rate * 100:.1f}%")
        if metrics.average_duration_ms:
            print(f"Average Duration:       {metrics.average_duration_ms / 1000:.2f} seconds")
        print(f"Last Execution:         {metrics.last_execution_at or 'Never'}")
        print(f"Last Success:           {metrics.last_success_at or 'Never'}")
        print(f"Last Failure:           {metrics.last_failure_at or 'Never'}")
    else:
        # Show system-wide metrics
        metrics = metrics_collector.get_system_metrics()
        print(f"\nSystem Metrics")
        print("=" * 70)
        print(f"Total Workflows:        {metrics.total_workflows}")
        print(f"Total Executions:      {metrics.total_executions}")
        print(f"Active Executions:     {metrics.active_executions}")
        print(f"Success Rate:           {metrics.overall_success_rate * 100:.1f}%")
        if metrics.average_duration_ms:
            print(f"Average Duration:       {metrics.average_duration_ms / 1000:.2f} seconds")
        print(f"Executions (Last 24h):  {metrics.executions_last_24h}")
        print(f"Executions (Last 7d):   {metrics.executions_last_7d}")
        
        if metrics.top_workflows:
            print(f"\nTop Workflows:")
            for wf in metrics.top_workflows[:10]:
                print(f"  {wf['workflow_id']}: {wf['execution_count']} executions")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Workflow CLI - Run and manage workflows",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_workflow.py list
  python run_workflow.py run bug-fix
  python run_workflow.py run feature-development --input '{"task": "Add user profile"}'
  python run_workflow.py status <execution-id>
  python run_workflow.py list-executions
  python run_workflow.py cancel <execution-id> [--reason "Reason"]
  python run_workflow.py resume <execution-id>
  python run_workflow.py events <execution-id>
  python run_workflow.py dlq --retryable
  python run_workflow.py metrics --workflow-id bug-fix
  python run_workflow.py dashboard --continuous
  python run_workflow.py debug inspect <execution-id>
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # List workflows
    list_parser = subparsers.add_parser('list', help='List available workflows')
    
    # Run workflow
    run_parser = subparsers.add_parser('run', help='Run a workflow')
    run_parser.add_argument('workflow_id', help='Workflow ID to run')
    run_parser.add_argument('--input', type=str, help='Input data as JSON string')
    run_parser.add_argument('--input-file', type=str, help='Input data from JSON file')
    
    # Show status
    status_parser = subparsers.add_parser('status', help='Show execution status')
    status_parser.add_argument('execution_id', help='Execution ID')
    
    # List executions
    list_exec_parser = subparsers.add_parser('list-executions', help='List all executions')
    list_exec_parser.add_argument('--workflow-id', help='Filter by workflow ID')
    
    # Cancel workflow
    cancel_parser = subparsers.add_parser('cancel', help='Cancel a running workflow')
    cancel_parser.add_argument('execution_id', help='Execution ID to cancel')
    cancel_parser.add_argument('--reason', help='Cancellation reason')
    
    # Resume workflow
    resume_parser = subparsers.add_parser('resume', help='Resume a failed workflow')
    resume_parser.add_argument('execution_id', help='Execution ID to resume')
    
    # Show events
    events_parser = subparsers.add_parser('events', help='View workflow events')
    events_parser.add_argument('execution_id', help='Execution ID')
    events_parser.add_argument('--type', help='Filter by event type')
    events_parser.add_argument('--limit', type=int, default=100, help='Maximum number of events to show')
    
    # Dead-letter queue
    dlq_parser = subparsers.add_parser('dlq', help='Manage dead-letter queue')
    dlq_parser.add_argument('--agent', help='Filter by agent ID')
    dlq_parser.add_argument('--retryable', action='store_true', help='Show only retryable tasks')
    dlq_parser.add_argument('--non-retryable', action='store_true', help='Show only non-retryable tasks')
    dlq_parser.add_argument('--limit', type=int, default=50, help='Maximum number of tasks to show')
    dlq_parser.add_argument('--remove', help='Remove a specific task by ID')
    
    # Metrics (Phase 6)
    metrics_parser = subparsers.add_parser('metrics', help='Show workflow metrics')
    metrics_parser.add_argument('--workflow-id', help='Show metrics for specific workflow')
    
    # Dashboard (Phase 6)
    dashboard_parser = subparsers.add_parser('dashboard', help='Show workflow dashboard')
    dashboard_parser.add_argument('--workflow-id', help='Show metrics for specific workflow')
    dashboard_parser.add_argument('--refresh', type=int, default=5, help='Refresh interval in seconds')
    dashboard_parser.add_argument('--continuous', action='store_true', help='Continuously refresh dashboard')
    
    # Debug (Phase 6)
    debug_parser = subparsers.add_parser('debug', help='Debug workflow execution')
    debug_subparsers = debug_parser.add_subparsers(dest='debug_command', help='Debug command')
    
    debug_inspect_parser = debug_subparsers.add_parser('inspect', help='Inspect execution details')
    debug_inspect_parser.add_argument('execution_id', help='Execution ID')
    debug_inspect_parser.add_argument('--verbose', action='store_true', help='Verbose output')
    
    debug_replay_parser = debug_subparsers.add_parser('replay', help='Replay execution from events')
    debug_replay_parser.add_argument('execution_id', help='Execution ID')
    
    debug_compare_parser = debug_subparsers.add_parser('compare', help='Compare two executions')
    debug_compare_parser.add_argument('execution_id1', help='First execution ID')
    debug_compare_parser.add_argument('execution_id2', help='Second execution ID')
    
    debug_trace_parser = debug_subparsers.add_parser('trace', help='Trace execution flow')
    debug_trace_parser.add_argument('execution_id', help='Execution ID')
    debug_trace_parser.add_argument('--step-id', help='Filter by step ID')
    
    debug_validate_parser = debug_subparsers.add_parser('validate', help='Validate execution state')
    debug_validate_parser.add_argument('execution_id', help='Execution ID')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    try:
        if args.command == 'list':
            list_workflows()
        
        elif args.command == 'run':
            input_data = {}
            
            # Parse input data
            if args.input:
                try:
                    input_data = json.loads(args.input)
                except json.JSONDecodeError as e:
                    print(f"[ERROR] Invalid JSON in --input: {e}")
                    sys.exit(1)
            
            elif args.input_file:
                try:
                    with open(args.input_file, 'r') as f:
                        input_data = json.load(f)
                except FileNotFoundError:
                    print(f"[ERROR] Input file not found: {args.input_file}")
                    sys.exit(1)
                except json.JSONDecodeError as e:
                    print(f"[ERROR] Invalid JSON in input file: {e}")
                    sys.exit(1)
            
            run_workflow(args.workflow_id, input_data)
        
        elif args.command == 'status':
            show_status(args.execution_id)
        
        elif args.command == 'list-executions':
            list_executions(args.workflow_id)
        
        elif args.command == 'cancel':
            cancel_workflow(args.execution_id, reason=args.reason)
        
        elif args.command == 'resume':
            resume_workflow(args.execution_id)
        
        elif args.command == 'events':
            show_events(args.execution_id, event_type=args.type, limit=args.limit)
        
        elif args.command == 'dlq':
            handle_dlq(args)
        
        elif args.command == 'metrics':
            show_metrics(args.workflow_id)
        
        elif args.command == 'dashboard':
            show_dashboard(
                workflow_id=args.workflow_id,
                refresh_interval=args.refresh,
                continuous=args.continuous
            )
        
        elif args.command == 'debug':
            if not args.debug_command:
                debug_parser.print_help()
                sys.exit(1)
            
            if args.debug_command == 'inspect':
                debug_inspect(args.execution_id, verbose=args.verbose)
            
            elif args.debug_command == 'replay':
                debug_replay(args.execution_id)
            
            elif args.debug_command == 'compare':
                debug_compare(args.execution_id1, args.execution_id2)
            
            elif args.debug_command == 'trace':
                debug_trace(args.execution_id, step_id=args.step_id)
            
            elif args.debug_command == 'validate':
                debug_validate(args.execution_id)
        
    except KeyboardInterrupt:
        print("\n\nCancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

