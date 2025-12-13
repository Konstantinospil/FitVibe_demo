"""
Workflow Debug Tools - Debugging utilities for workflow execution.

This module provides debugging tools for inspecting workflow state,
replaying events, and diagnosing execution issues.

Version: 1.0
Last Updated: 2025-01-21
"""

import json
import sys
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List

# Add .cursor to path if running as script
if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from orchestration.workflow_executor import WorkflowExecutor
from orchestration.event_log import event_log, WorkflowEvent
from orchestration.state_repository import AgentStateRepository
from orchestration.workflow_models import WorkflowStatus as WorkflowStatusModel


def format_timestamp(ts: Optional[str]) -> str:
    """Format ISO timestamp to readable string."""
    if not ts:
        return "N/A"
    
    try:
        dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except:
        return ts[:19] if len(ts) >= 19 else ts


def print_section(title: str):
    """Print section header."""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)


def inspect_execution(execution_id: str, verbose: bool = False):
    """
    Inspect a workflow execution in detail.
    
    Args:
        execution_id: Execution ID to inspect
        verbose: Whether to show verbose output
    """
    executor = WorkflowExecutor(workflows_dir="workflows", agents_dir="agents")
    
    print_section(f"Execution Inspection: {execution_id}")
    
    # Get execution
    execution = executor.get_execution(execution_id)
    
    if not execution:
        print(f"\n[ERROR] Execution '{execution_id}' not found")
        return
    
    # Basic info
    print(f"\nExecution ID:     {execution.execution_id}")
    print(f"Workflow ID:      {execution.workflow_id}")
    print(f"Workflow Version: {execution.workflow_version}")
    print(f"Status:           {execution.status.value if hasattr(execution.status, 'value') else execution.status}")
    print(f"Started At:       {format_timestamp(execution.started_at)}")
    print(f"Completed At:     {format_timestamp(execution.completed_at)}")
    
    if execution.duration_ms:
        print(f"Duration:         {execution.duration_ms / 1000:.2f} seconds")
    
    if execution.error:
        print(f"\nError: {execution.error}")
    
    # Phase executions
    print(f"\nPhases: {len(execution.phase_executions)}")
    for phase_exec in execution.phase_executions:
        print(f"\n  Phase: {phase_exec.phase_id}")
        print(f"    Status: {phase_exec.status.value if hasattr(phase_exec.status, 'value') else phase_exec.status}")
        print(f"    Started: {format_timestamp(phase_exec.started_at)}")
        print(f"    Completed: {format_timestamp(phase_exec.completed_at)}")
        if phase_exec.duration_ms:
            print(f"    Duration: {phase_exec.duration_ms / 1000:.2f} seconds")
        
        print(f"    Steps: {len(phase_exec.step_executions)}")
        for step_exec in phase_exec.step_executions:
            status = step_exec.status.value if hasattr(step_exec.status, 'value') else step_exec.status
            print(f"      - {step_exec.step_id}: {status}")
            if step_exec.error:
                print(f"        Error: {step_exec.error}")
            if step_exec.duration_ms:
                print(f"        Duration: {step_exec.duration_ms:.0f}ms")
            if verbose and step_exec.output_data:
                print(f"        Output: {json.dumps(step_exec.output_data, indent=8)}")
    
    # Events
    print_section("Events")
    events = event_log.get_events(execution_id=execution_id, limit=1000)
    
    if not events:
        print("\nNo events found.")
    else:
        print(f"\nTotal Events: {len(events)}")
        print(f"\n{'Timestamp':<20} {'Type':<25} {'Phase':<15} {'Step':<20} {'Status':<15}")
        print("-" * 95)
        
        for event in events[:50]:  # Show first 50 events
            timestamp = format_timestamp(event.timestamp)
            phase = event.phase_id or "-"
            step = event.step_id or "-"
            status = event.status
            print(f"{timestamp:<20} {event.event_type:<25} {phase:<15} {step:<20} {status:<15}")
            
            if event.error:
                print(f"  Error: {event.error}")
            
            if verbose and event.data:
                print(f"  Data: {json.dumps(event.data, indent=4)}")
    
    # State
    if verbose:
        print_section("State")
        state_repo = AgentStateRepository()
        state = state_repo.load_state(execution_id)
        
        if state:
            print(f"\nState ID: {state.state_id}")
            print(f"State Type: {state.state_type}")
            print(f"Version: {state.version}")
            print(f"Created At: {format_timestamp(state.created_at)}")
            print(f"Updated At: {format_timestamp(state.updated_at)}")
            
            if state.workflow_execution:
                print(f"\nWorkflow Execution State:")
                print(json.dumps(state.workflow_execution.to_dict() if hasattr(state.workflow_execution, 'to_dict') else state.workflow_execution.__dict__, indent=2, default=str))


def replay_execution(execution_id: str):
    """
    Replay a workflow execution from events.
    
    Args:
        execution_id: Execution ID to replay
    """
    print_section(f"Replay Execution: {execution_id}")
    
    try:
        replayed = event_log.replay_execution(execution_id)
        
        if not replayed:
            print(f"\n[ERROR] Could not replay execution '{execution_id}'")
            return
        
        print(f"\nReplayed Execution:")
        print(f"  Execution ID: {replayed.execution_id}")
        print(f"  Workflow ID: {replayed.workflow_id}")
        print(f"  Status: {replayed.status.value if hasattr(replayed.status, 'value') else replayed.status}")
        print(f"  Started At: {format_timestamp(replayed.started_at)}")
        print(f"  Completed At: {format_timestamp(replayed.completed_at)}")
        
        if hasattr(replayed, 'phase_executions'):
            print(f"\n  Phases: {len(replayed.phase_executions)}")
            for phase in replayed.phase_executions:
                print(f"    - {phase.phase_id}: {phase.status.value if hasattr(phase.status, 'value') else phase.status}")
    
    except Exception as e:
        print(f"\n[ERROR] Failed to replay execution: {e}")
        import traceback
        traceback.print_exc()


def compare_executions(execution_id1: str, execution_id2: str):
    """
    Compare two workflow executions.
    
    Args:
        execution_id1: First execution ID
        execution_id2: Second execution ID
    """
    executor = WorkflowExecutor(workflows_dir="workflows", agents_dir="agents")
    
    print_section(f"Compare Executions: {execution_id1} vs {execution_id2}")
    
    exec1 = executor.get_execution(execution_id1)
    exec2 = executor.get_execution(execution_id2)
    
    if not exec1:
        print(f"\n[ERROR] Execution '{execution_id1}' not found")
        return
    
    if not exec2:
        print(f"\n[ERROR] Execution '{execution_id2}' not found")
        return
    
    print(f"\n{'Property':<30} {'Execution 1':<30} {'Execution 2':<30}")
    print("-" * 90)
    
    print(f"{'Workflow ID':<30} {exec1.workflow_id:<30} {exec2.workflow_id:<30}")
    print(f"{'Status':<30} {str(exec1.status.value if hasattr(exec1.status, 'value') else exec1.status):<30} {str(exec2.status.value if hasattr(exec2.status, 'value') else exec2.status):<30}")
    print(f"{'Duration (ms)':<30} {str(exec1.duration_ms or 'N/A'):<30} {str(exec2.duration_ms or 'N/A'):<30}")
    print(f"{'Phases':<30} {str(len(exec1.phase_executions)):<30} {str(len(exec2.phase_executions)):<30}")
    
    # Compare phases
    phases1 = {p.phase_id: p for p in exec1.phase_executions}
    phases2 = {p.phase_id: p for p in exec2.phase_executions}
    
    all_phases = set(phases1.keys()) | set(phases2.keys())
    
    if all_phases:
        print(f"\nPhase Comparison:")
        print(f"{'Phase ID':<30} {'Execution 1 Status':<30} {'Execution 2 Status':<30}")
        print("-" * 90)
        
        for phase_id in sorted(all_phases):
            status1 = phases1[phase_id].status.value if phase_id in phases1 and hasattr(phases1[phase_id].status, 'value') else "N/A"
            status2 = phases2[phase_id].status.value if phase_id in phases2 and hasattr(phases2[phase_id].status, 'value') else "N/A"
            print(f"{phase_id:<30} {str(status1):<30} {str(status2):<30}")


def trace_execution(execution_id: str, step_id: Optional[str] = None):
    """
    Trace execution flow for debugging.
    
    Args:
        execution_id: Execution ID to trace
        step_id: Optional step ID to focus on
    """
    print_section(f"Execution Trace: {execution_id}")
    
    events = event_log.get_events(execution_id=execution_id, limit=1000)
    
    if not events:
        print("\nNo events found.")
        return
    
    # Filter by step if specified
    if step_id:
        events = [e for e in events if e.step_id == step_id]
        print(f"\nFiltered to step: {step_id}")
    
    # Group by phase
    phases: Dict[str, List[WorkflowEvent]] = {}
    for event in events:
        phase_id = event.phase_id or "unknown"
        if phase_id not in phases:
            phases[phase_id] = []
        phases[phase_id].append(event)
    
    print(f"\nTotal Events: {len(events)}")
    print(f"Phases: {len(phases)}")
    
    for phase_id, phase_events in sorted(phases.items()):
        print(f"\n  Phase: {phase_id}")
        print(f"    Events: {len(phase_events)}")
        
        # Show event timeline
        for event in sorted(phase_events, key=lambda e: e.timestamp):
            timestamp = format_timestamp(event.timestamp)
            print(f"      [{timestamp}] {event.event_type} - {event.status}")
            if event.error:
                print(f"        Error: {event.error}")


def validate_state(execution_id: str):
    """
    Validate execution state integrity.
    
    Args:
        execution_id: Execution ID to validate
    """
    print_section(f"State Validation: {execution_id}")
    
    state_repo = AgentStateRepository()
    state = state_repo.load_state(execution_id)
    
    if not state:
        print(f"\n[ERROR] State not found for execution '{execution_id}'")
        return
    
    print(f"\nState ID: {state.state_id}")
    print(f"State Type: {state.state_type}")
    print(f"Version: {state.version}")
    
    # Validate checksum
    print("\nValidating checksum...")
    # Note: Checksum validation is done internally by state_repository
    
    # Validate workflow execution state
    if state.workflow_execution:
        print("\nWorkflow Execution State:")
        wf_exec = state.workflow_execution
        print(f"  Workflow ID: {wf_exec.workflow_id}")
        print(f"  Status: {wf_exec.status.value if hasattr(wf_exec.status, 'value') else wf_exec.status}")
        print(f"  Started At: {format_timestamp(wf_exec.started_at)}")
        print(f"  Completed At: {format_timestamp(wf_exec.completed_at)}")
        
        # Check for inconsistencies
        issues = []
        
        if wf_exec.status.value == "complete" and not wf_exec.completed_at:
            issues.append("Status is 'complete' but completed_at is missing")
        
        if wf_exec.status.value == "failed" and not wf_exec.metadata.get("error"):
            issues.append("Status is 'failed' but error is missing")
        
        if issues:
            print("\n[WARNING] State validation issues found:")
            for issue in issues:
                print(f"  - {issue}")
        else:
            print("\n[OK] State validation passed")
    else:
        print("\n[WARNING] No workflow execution state found")


def main():
    """CLI entry point for debug tools."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Workflow debugging tools")
    subparsers = parser.add_subparsers(dest='command', help='Debug command')
    
    # Inspect command
    inspect_parser = subparsers.add_parser('inspect', help='Inspect execution details')
    inspect_parser.add_argument('execution_id', help='Execution ID')
    inspect_parser.add_argument('--verbose', action='store_true', help='Verbose output')
    
    # Replay command
    replay_parser = subparsers.add_parser('replay', help='Replay execution from events')
    replay_parser.add_argument('execution_id', help='Execution ID')
    
    # Compare command
    compare_parser = subparsers.add_parser('compare', help='Compare two executions')
    compare_parser.add_argument('execution_id1', help='First execution ID')
    compare_parser.add_argument('execution_id2', help='Second execution ID')
    
    # Trace command
    trace_parser = subparsers.add_parser('trace', help='Trace execution flow')
    trace_parser.add_argument('execution_id', help='Execution ID')
    trace_parser.add_argument('--step-id', help='Filter by step ID')
    
    # Validate command
    validate_parser = subparsers.add_parser('validate', help='Validate execution state')
    validate_parser.add_argument('execution_id', help='Execution ID')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    try:
        if args.command == 'inspect':
            inspect_execution(args.execution_id, verbose=args.verbose)
        
        elif args.command == 'replay':
            replay_execution(args.execution_id)
        
        elif args.command == 'compare':
            compare_executions(args.execution_id1, args.execution_id2)
        
        elif args.command == 'trace':
            trace_execution(args.execution_id, step_id=args.step_id)
        
        elif args.command == 'validate':
            validate_state(args.execution_id)
    
    except KeyboardInterrupt:
        print("\n\nInterrupted.")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
