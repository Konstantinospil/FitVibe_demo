#!/usr/bin/env python3
"""
Test script for workflow parser.
"""

import sys
from pathlib import Path

# Add .cursor to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from orchestration.workflow_parser import WorkflowParser
from orchestration.workflow_validator import get_workflow_validator

def main():
    print("Testing Workflow Parser...")
    print("-" * 50)
    
    # Initialize parser
    parser = WorkflowParser(workflows_dir="workflows")
    
    # List workflows
    workflows = parser.list_workflows()
    print(f"Found {len(workflows)} workflow files")
    
    if not workflows:
        print("No workflows found. Exiting.")
        return
    
    # Parse first workflow
    workflow_file = workflows[0]
    print(f"\nParsing: {workflow_file.name}")
    
    try:
        workflow = parser.parse_workflow(workflow_file)
        
        print(f"\nWorkflow: {workflow.name}")
        print(f"  ID: {workflow.workflow_id}")
        print(f"  Description: {workflow.description[:100]}...")
        print(f"  Phases: {len(workflow.phases)}")
        print(f"  Total Steps: {sum(len(p.steps) for p in workflow.phases)}")
        
        # Show phases
        for phase in workflow.phases:
            print(f"\n  Phase {phase.phase_number}: {phase.name}")
            print(f"    Steps: {len(phase.steps)}")
            for step in phase.steps[:3]:  # Show first 3 steps
                agent_info = f" -> {step.agent_id}" if step.agent_id else ""
                print(f"      {step.step_number}. {step.name}{agent_info}")
            if len(phase.steps) > 3:
                print(f"      ... and {len(phase.steps) - 3} more steps")
        
        # Validate workflow
        print("\n" + "-" * 50)
        print("Validating workflow...")
        validator = get_workflow_validator()
        errors = validator.validate(workflow)
        
        if errors:
            print(f"[ERROR] Found {len(errors)} validation errors:")
            for error in errors[:5]:  # Show first 5 errors
                print(f"  - {error}")
            if len(errors) > 5:
                print(f"  ... and {len(errors) - 5} more errors")
        else:
            print("[OK] Workflow validation passed!")
        
    except Exception as e:
        print(f"[ERROR] Failed to parse workflow: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()













