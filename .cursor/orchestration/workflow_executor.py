"""
Workflow Executor - Executes workflows step-by-step.

This module provides the execution engine for workflows, coordinating
agent execution, handoffs, and state management.

Version: 1.0
Last Updated: 2025-01-21
"""

import logging
import time
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime
from pathlib import Path

from .workflow_models import (
    WorkflowDefinition,
    WorkflowExecution as WorkflowExecutionModel,
    PhaseExecution,
    StepExecution,
    WorkflowStatus as WorkflowStatusModel,
    StepType,
    HandoffType,
)
from .workflow_parser import get_workflow_parser
from .workflow_validator import get_workflow_validator
from .agent_executor import agent_executor
from .agent_state import agent_state_manager, AgentExecution, AgentStatus
from .error_handling import retry_handler, dead_letter_queue
from .audit_logger_fallback import _audit_logger_fallback as audit_logger

logger = logging.getLogger(__name__)


class WorkflowExecutor:
    """Executes workflows step-by-step."""
    
    def __init__(
        self,
        workflows_dir: str = ".cursor/workflows",
        agents_dir: str = ".cursor/agents"
    ):
        """
        Initialize workflow executor.
        
        Args:
            workflows_dir: Directory containing workflow definitions
            agents_dir: Directory containing agent definitions
        """
        self.workflows_dir = Path(workflows_dir)
        self.agents_dir = Path(agents_dir)
        self.parser = get_workflow_parser()
        self.validator = get_workflow_validator()
        self.active_executions: Dict[str, WorkflowExecutionModel] = {}
    
    def load_workflow(self, workflow_id: str) -> WorkflowDefinition:
        """
        Load a workflow definition by ID.
        
        Args:
            workflow_id: Workflow identifier (filename without .md)
        
        Returns:
            WorkflowDefinition object
        """
        # Find workflow file
        workflow_file = self.workflows_dir / f"{workflow_id}.md"
        
        if not workflow_file.exists():
            # Try with different separators
            workflow_file = self.workflows_dir / f"{workflow_id.replace('_', '-')}.md"
        
        if not workflow_file.exists():
            raise FileNotFoundError(f"Workflow '{workflow_id}' not found")
        
        # Parse workflow
        workflow = self.parser.parse_workflow(workflow_file)
        
        # Validate workflow
        if not self.validator.validate_execution_ready(workflow):
            logger.warning(f"Workflow '{workflow_id}' has validation errors but will attempt execution")
        
        return workflow
    
    def start_workflow(
        self,
        workflow_id: str,
        input_data: Dict[str, Any],
        request_id: Optional[str] = None
    ) -> WorkflowExecutionModel:
        """
        Start a workflow execution.
        
        Args:
            workflow_id: Workflow identifier
            input_data: Input data for the workflow
            request_id: Optional request ID for tracking
        
        Returns:
            WorkflowExecution object
        """
        # Load workflow definition
        workflow_def = self.load_workflow(workflow_id)
        
        # Create execution record
        execution_id = str(uuid.uuid4())
        if not request_id:
            request_id = f"req-{execution_id[:8]}"
        
        execution = WorkflowExecutionModel(
            execution_id=execution_id,
            workflow_id=workflow_id,
            status=WorkflowStatusModel.PENDING,
            started_at=datetime.utcnow().isoformat(),
            input_data=input_data,
            current_phase_id=workflow_def.phases[0].phase_id if workflow_def.phases else None
        )
        
        # Store active execution
        self.active_executions[execution_id] = execution
        
        # Log workflow start
        audit_logger.log_info(
            message=f"Workflow '{workflow_id}' started",
            agent_id="WorkflowExecutor",
            details={
                "execution_id": execution_id,
                "request_id": request_id,
                "workflow_id": workflow_id,
                "phases": len(workflow_def.phases)
            }
        )
        
        return execution
    
    def execute_workflow(
        self,
        execution_id: str,
        workflow_def: Optional[WorkflowDefinition] = None
    ) -> WorkflowExecutionModel:
        """
        Execute a workflow from start to finish.
        
        Args:
            execution_id: Execution ID
            workflow_def: Optional workflow definition (will load if not provided)
        
        Returns:
            Updated WorkflowExecution
        """
        execution = self.active_executions.get(execution_id)
        if not execution:
            raise ValueError(f"Execution '{execution_id}' not found")
        
        # Load workflow if not provided
        if not workflow_def:
            workflow_def = self.load_workflow(execution.workflow_id)
        
        # Update status
        execution.status = WorkflowStatusModel.RUNNING
        
        try:
            # Execute each phase
            for phase_def in workflow_def.phases:
                phase_execution = self._execute_phase(
                    execution,
                    phase_def,
                    workflow_def
                )
                
                execution.phase_executions.append(phase_execution)
                execution.current_phase_id = phase_def.phase_id
                
                # Check if phase failed
                if phase_execution.status == WorkflowStatus.FAILED:
                    execution.status = WorkflowStatusModel.FAILED
                    execution.error = f"Phase '{phase_def.phase_id}' failed"
                    break
                
                # Check if workflow was cancelled
                if execution.status == WorkflowStatus.CANCELLED:
                    break
            
            # Mark as completed if all phases succeeded
            if execution.status == WorkflowStatus.RUNNING:
                execution.status = WorkflowStatusModel.COMPLETED
                execution.completed_at = datetime.utcnow().isoformat()
                
                # Calculate duration
                start_time = datetime.fromisoformat(execution.started_at)
                end_time = datetime.fromisoformat(execution.completed_at)
                execution.duration_ms = (end_time - start_time).total_seconds() * 1000
            
        except Exception as e:
            execution.status = WorkflowStatusModel.FAILED
            execution.error = str(e)
            execution.completed_at = datetime.utcnow().isoformat()
            
            # Log error
            audit_logger.log_error(
                error_message=f"Workflow execution failed: {str(e)}",
                agent_id="WorkflowExecutor",
                context={
                    "execution_id": execution_id,
                    "workflow_id": execution.workflow_id
                }
            )
        
        # Save execution state
        self._save_execution_state(execution)
        
        return execution
    
    def _execute_phase(
        self,
        execution: WorkflowExecutionModel,
        phase_def,
        workflow_def: WorkflowDefinition
    ) -> PhaseExecution:
        """Execute a single phase."""
        phase_start_time = time.time()
        
        phase_execution = PhaseExecution(
            phase_id=phase_def.phase_id,
            status=WorkflowStatusModel.RUNNING,
            started_at=datetime.utcnow().isoformat(),
            current_step_id=phase_def.steps[0].step_id if phase_def.steps else None
        )
        
        execution.current_phase_id = phase_def.phase_id
        
        try:
            # Execute each step in the phase
            for step_def in phase_def.steps:
                step_execution = self._execute_step(
                    execution,
                    step_def,
                    workflow_def
                )
                
                phase_execution.step_executions.append(step_execution)
                phase_execution.current_step_id = step_def.step_id
                execution.current_step_id = step_def.step_id
                
                # Check if step failed
                if step_execution.status == WorkflowStatus.FAILED:
                    phase_execution.status = WorkflowStatus.FAILED
                    phase_execution.completed_at = datetime.utcnow().isoformat()
                    break
                
                # Handle handoffs
                if step_execution.status == WorkflowStatus.COMPLETED:
                    # Check if handoff is needed
                    if step_def.handoff_to and step_def.handoff_type != HandoffType.NEVER:
                        # Handoff will be handled by next step
                        pass
            
            # Mark phase as completed if all steps succeeded
            if phase_execution.status == WorkflowStatus.RUNNING:
                phase_execution.status = WorkflowStatusModel.COMPLETED
                phase_execution.completed_at = datetime.utcnow().isoformat()
                
                # Calculate duration
                phase_execution.duration_ms = (time.time() - phase_start_time) * 1000
        
        except Exception as e:
            phase_execution.status = WorkflowStatus.FAILED
            phase_execution.completed_at = datetime.utcnow().isoformat()
            logger.error(f"Phase '{phase_def.phase_id}' failed: {e}")
        
        return phase_execution
    
    def _execute_step(
        self,
        execution: WorkflowExecutionModel,
        step_def,
        workflow_def: WorkflowDefinition
    ) -> StepExecution:
        """Execute a single step."""
        step_start_time = time.time()
        
        step_execution = StepExecution(
            step_id=step_def.step_id,
            status=WorkflowStatusModel.RUNNING,
            started_at=datetime.utcnow().isoformat(),
            input_data=step_def.input_data.copy()
        )
        
        try:
            # Execute based on step type
            if step_def.step_type == StepType.AGENT:
                result = self._execute_agent_step(execution, step_def)
                step_execution.output_data = result.output_data
                step_execution.agent_execution_id = result.agent_id
                
                if result.status == "success" or result.status == "handoff":
                    step_execution.status = WorkflowStatusModel.COMPLETED
                else:
                    step_execution.status = WorkflowStatusModel.FAILED
                    step_execution.error = result.error
            
            elif step_def.step_type == StepType.SCRIPT:
                # TODO: Execute script
                logger.warning(f"Script execution not yet implemented for step '{step_def.step_id}'")
                step_execution.status = WorkflowStatus.COMPLETED
                step_execution.output_data = {"message": "Script execution placeholder"}
            
            elif step_def.step_type == StepType.MANUAL:
                # Manual intervention required
                logger.info(f"Manual intervention required for step '{step_def.step_id}'")
                step_execution.status = WorkflowStatusModel.PAUSED
                step_execution.output_data = {"message": "Waiting for manual intervention"}
            
            else:
                logger.warning(f"Unknown step type '{step_def.step_type}' for step '{step_def.step_id}'")
                step_execution.status = WorkflowStatus.COMPLETED
                step_execution.output_data = {"message": "Step type not implemented"}
            
            # Calculate duration
            step_execution.duration_ms = (time.time() - step_start_time) * 1000
            step_execution.completed_at = datetime.utcnow().isoformat()
        
        except Exception as e:
            step_execution.status = WorkflowStatus.FAILED
            step_execution.error = str(e)
            step_execution.completed_at = datetime.utcnow().isoformat()
            step_execution.duration_ms = (time.time() - step_start_time) * 1000
            
            logger.error(f"Step '{step_def.step_id}' failed: {e}")
        
        return step_execution
    
    def _execute_agent_step(
        self,
        execution: WorkflowExecutionModel,
        step_def
    ):
        """Execute an agent step."""
        if not step_def.agent_id:
            raise ValueError(f"Step '{step_def.step_id}' has no agent_id")
        
        # Prepare input data
        input_data = {
            **execution.input_data,
            **step_def.input_data,
            "step_id": step_def.step_id,
            "step_name": step_def.name,
            "workflow_id": execution.workflow_id,
            "execution_id": execution.execution_id
        }
        
        # Execute agent
        result = agent_executor.execute_agent(
            agent_id=step_def.agent_id,
            request_id=execution.execution_id,
            workflow_id=execution.workflow_id,
            input_data=input_data,
            workflow_state=None  # TODO: Pass workflow state
        )
        
        return result
    
    def _save_execution_state(self, execution: WorkflowExecutionModel):
        """Save workflow execution state."""
        # Save to agent state manager
        # TODO: Implement proper workflow state saving
        logger.debug(f"Saving execution state for '{execution.execution_id}'")
    
    def get_execution(self, execution_id: str) -> Optional[WorkflowExecutionModel]:
        """Get an execution by ID."""
        return self.active_executions.get(execution_id)
    
    def list_executions(self, workflow_id: Optional[str] = None) -> List[WorkflowExecutionModel]:
        """List all executions, optionally filtered by workflow."""
        executions = list(self.active_executions.values())
        
        if workflow_id:
            executions = [e for e in executions if e.workflow_id == workflow_id]
        
        return executions


# Global executor instance
_workflow_executor: Optional[WorkflowExecutor] = None


def get_workflow_executor() -> WorkflowExecutor:
    """Get or create global workflow executor instance."""
    global _workflow_executor
    
    if _workflow_executor is None:
        _workflow_executor = WorkflowExecutor()
    
    return _workflow_executor

