#!/usr/bin/env python3
"""
Workflow CLI - Command-line interface for running workflows.

Usage:
    python run_workflow.py list                    # List available workflows
    python run_workflow.py run <workflow-id>       # Run a workflow
    python run_workflow.py status <execution-id>   # Check execution status
    python run_workflow.py list-executions         # List all executions
"""

import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any, Optional

# Add .cursor to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from orchestration.workflow_parser import WorkflowParser
from orchestration.workflow_validator import WorkflowValidator
from orchestration.workflow_executor import WorkflowExecutor
from orchestration.workflow_models import WorkflowStatus as WorkflowStatusModel


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
    parser = WorkflowParser(workflows_dir="workflows")
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
    executor = WorkflowExecutor(workflows_dir="workflows", agents_dir="agents")
    validator = WorkflowValidator(agents_dir="agents")
    
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
    executor = WorkflowExecutor(workflows_dir="workflows", agents_dir="agents")
    
    execution = executor.get_execution(execution_id)
    
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
    executor = WorkflowExecutor(workflows_dir="workflows", agents_dir="agents")
    executions = executor.list_executions(workflow_id)
    
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

