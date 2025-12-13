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
from .agent_state import agent_state_manager, AgentExecution, AgentStatus, AgentState
from .error_handling import retry_handler, dead_letter_queue, DeadLetterQueue, FailedTask, ErrorClassifier
from .audit_logger_fallback import _audit_logger_fallback as audit_logger
from .event_log import event_log, WorkflowEvent
from .step_executor import step_executor, ExecutionContext
from .state_repository import AgentStateRepository
from .handoff_generator import get_handoff_generator, HandoffGenerator
from .handoff_registry import get_handoff_registry, HandoffRegistry

logger = logging.getLogger(__name__)


class WorkflowExecutor:
    """Executes workflows step-by-step."""
    
    def __init__(
        self,
        workflows_dir: str = ".cursor/workflows",
        agents_dir: str = ".cursor/agents",
        event_log_instance=None,
        step_executor_instance=None,
        state_repository=None,
        handoff_generator_instance=None,
        handoff_registry_instance=None,
        dead_letter_queue_instance=None
    ):
        """
        Initialize workflow executor.
        
        Args:
            workflows_dir: Directory containing workflow definitions
            agents_dir: Directory containing agent definitions
            event_log_instance: EventLog instance (default: global event_log)
            step_executor_instance: StepExecutor instance (default: global step_executor)
            state_repository: AgentStateRepository instance (default: new instance)
            handoff_generator_instance: HandoffGenerator instance (default: global instance)
            handoff_registry_instance: HandoffRegistry instance (default: global instance)
            dead_letter_queue_instance: DeadLetterQueue instance (default: global dead_letter_queue)
        """
        self.workflows_dir = Path(workflows_dir)
        self.agents_dir = Path(agents_dir)
        self.parser = get_workflow_parser()
        self.validator = get_workflow_validator()
        self.active_executions: Dict[str, WorkflowExecutionModel] = {}
        
        # Phase 1 components
        self.event_log = event_log_instance or event_log
        self.step_executor = step_executor_instance or step_executor
        self.state_repository = state_repository or AgentStateRepository()
        
        # Phase 3 components
        self.handoff_generator = handoff_generator_instance or get_handoff_generator()
        self.handoff_registry = handoff_registry_instance or get_handoff_registry()
        
        # Phase 4 components
        self.dead_letter_queue = dead_letter_queue_instance or dead_letter_queue
        self.error_classifier = ErrorClassifier()
    
    def _emit_event_safe(self, event: WorkflowEvent) -> None:
        """
        Safely emit an event, catching and logging any errors.
        
        This ensures that event emission failures don't break workflow execution.
        
        Args:
            event: WorkflowEvent to emit
        """
        try:
            self.event_log.append_event(event)
        except Exception as e:
            logger.warning(f"Failed to emit event {event.event_type} for execution {event.execution_id}: {e}")
    
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
        request_id: Optional[str] = None,
        workflow_version: Optional[str] = None
    ) -> WorkflowExecutionModel:
        """
        Start a workflow execution.
        
        Args:
            workflow_id: Workflow identifier
            input_data: Input data for the workflow
            request_id: Optional request ID for tracking
            workflow_version: Optional workflow version (default: use version from definition)
        
        Returns:
            WorkflowExecution object
        """
        # Load workflow definition
        workflow_def = self.load_workflow(workflow_id)
        
        # Pin workflow version
        pinned_version = workflow_version or workflow_def.metadata.version
        
        # Create execution record
        execution_id = str(uuid.uuid4())
        if not request_id:
            request_id = f"req-{execution_id[:8]}"
        
        # Get current timestamp (NEVER hardcode)
        import subprocess
        result = subprocess.run(
            ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
            capture_output=True,
            text=True
        )
        started_at = result.stdout.strip() if result.returncode == 0 else datetime.utcnow().isoformat() + 'Z'
        
        execution = WorkflowExecutionModel(
            execution_id=execution_id,
            workflow_id=workflow_id,
            workflow_version=pinned_version,  # Pin workflow version
            status=WorkflowStatusModel.PENDING,
            started_at=started_at,
            input_data=input_data,
            current_phase_id=workflow_def.phases[0].phase_id if workflow_def.phases else None,
            metadata={"request_id": request_id}  # Store request_id in metadata
        )
        
        # Store active execution
        self.active_executions[execution_id] = execution
        
        # Save state to repository (use _save_execution_state to properly convert)
        self._save_execution_state(execution)
        
        # Emit workflow_started event
        self._emit_event_safe(WorkflowEvent(
            event_id="",
            event_type="workflow_started",
            execution_id=execution_id,
            workflow_id=workflow_id,
            timestamp=started_at,
            status="in_progress",
            data={"workflow_version": pinned_version}
        ))
        
        # Log workflow start
        audit_logger.log_info(
            message=f"Workflow '{workflow_id}' started",
            agent_id="WorkflowExecutor",
            details={
                "execution_id": execution_id,
                "request_id": request_id,
                "workflow_id": workflow_id,
                "workflow_version": pinned_version,
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
                if phase_execution.status == WorkflowStatusModel.FAILED:
                    execution.status = WorkflowStatusModel.FAILED
                    # Preserve the actual error from phase execution
                    phase_error = phase_execution.step_executions[-1].error if phase_execution.step_executions else None
                    execution.error = phase_error or f"Phase '{phase_def.phase_id}' failed"
                    break
                
                # Check if workflow was cancelled
                if execution.status == WorkflowStatusModel.CANCELLED:
                    break
            
            # Mark as completed if all phases succeeded
            if execution.status == WorkflowStatusModel.RUNNING:
                execution.status = WorkflowStatusModel.COMPLETED
                import subprocess
                result = subprocess.run(
                    ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
                    capture_output=True,
                    text=True
                )
                execution.completed_at = result.stdout.strip() if result.returncode == 0 else datetime.utcnow().isoformat() + 'Z'
                
                # Calculate duration
                start_time = datetime.fromisoformat(execution.started_at.replace('Z', '+00:00'))
                end_time = datetime.fromisoformat(execution.completed_at.replace('Z', '+00:00'))
                execution.duration_ms = (end_time - start_time).total_seconds() * 1000
                
                # Emit workflow_completed event
                self._emit_event_safe(WorkflowEvent(
                    event_id="",
                    event_type="workflow_completed",
                    execution_id=execution_id,
                    workflow_id=execution.workflow_id,
                    timestamp=execution.completed_at,
                    status="success",
                    data={
                        "duration_ms": execution.duration_ms,
                        "phases_completed": len(execution.phase_executions)
                    }
                ))
            elif execution.status == WorkflowStatusModel.FAILED:
                # Emit workflow_failed event for phase failure (not exception)
                import subprocess
                result = subprocess.run(
                    ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
                    capture_output=True,
                    text=True
                )
                execution.completed_at = result.stdout.strip() if result.returncode == 0 else datetime.utcnow().isoformat() + 'Z'
                
                # Add to dead-letter queue (Phase 4)
                # Create exception from error message
                error_msg = execution.error or "Workflow failed"
                self._handle_workflow_failure(execution, Exception(error_msg))
                
                self._emit_event_safe(WorkflowEvent(
                    event_id="",
                    event_type="workflow_failed",
                    execution_id=execution_id,
                    workflow_id=execution.workflow_id,
                    timestamp=execution.completed_at,
                    status="failed",
                    error=execution.error or "Workflow failed",
                    data={
                        "error_type": "PhaseFailure",
                        "phases_completed": len(execution.phase_executions)
                    }
                ))
            
        except Exception as e:
            execution.status = WorkflowStatusModel.FAILED
            execution.error = str(e)
            import subprocess
            result = subprocess.run(
                ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
                capture_output=True,
                text=True
            )
            execution.completed_at = result.stdout.strip() if result.returncode == 0 else datetime.utcnow().isoformat() + 'Z'
            
            # Add to dead-letter queue (Phase 4)
            self._handle_workflow_failure(execution, e)
            
            # Emit workflow_failed event
            self._emit_event_safe(WorkflowEvent(
                event_id="",
                event_type="workflow_failed",
                execution_id=execution_id,
                workflow_id=execution.workflow_id,
                timestamp=execution.completed_at,
                status="failed",
                error=str(e),
                data={
                    "error_type": type(e).__name__,
                    "phases_completed": len(execution.phase_executions)
                }
            ))
            
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
        import subprocess
        
        phase_start_time = time.time()
        
        # Get current timestamp
        result = subprocess.run(
            ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
            capture_output=True,
            text=True
        )
        started_at = result.stdout.strip() if result.returncode == 0 else datetime.utcnow().isoformat() + 'Z'
        
        phase_execution = PhaseExecution(
            phase_id=phase_def.phase_id,
            status=WorkflowStatusModel.RUNNING,
            started_at=started_at,
            current_step_id=phase_def.steps[0].step_id if phase_def.steps else None
        )
        
        execution.current_phase_id = phase_def.phase_id
        
        # Emit phase_started event
        self._emit_event_safe(WorkflowEvent(
            event_id="",
            event_type="phase_started",
            phase_id=phase_def.phase_id,
            execution_id=execution.execution_id,
            workflow_id=execution.workflow_id,
            timestamp=started_at,
            status="in_progress"
        ))
        
        try:
            # Execute each step in the phase
            for step_def in phase_def.steps:
                # Create execution context
                context = ExecutionContext(
                    execution_id=execution.execution_id,
                    workflow_id=execution.workflow_id,
                    phase_id=phase_def.phase_id,
                    workflow_execution=execution,
                    workflow_definition=workflow_def
                )
                
                # Execute step using step executor
                step_result = self.step_executor.execute_step(step_def, context)
                
                # Convert StepExecution from step_executor to workflow_models StepExecution
                step_execution = StepExecution(
                    step_id=step_result.step_id,
                    status=step_result.status,
                    output_data=step_result.output_data,
                    error=step_result.error,
                    duration_ms=step_result.duration_ms
                )
                
                phase_execution.step_executions.append(step_execution)
                phase_execution.current_step_id = step_def.step_id
                execution.current_step_id = step_def.step_id
                
                # Check if step failed
                if step_execution.status == WorkflowStatusModel.FAILED:
                    phase_execution.status = WorkflowStatusModel.FAILED
                    result = subprocess.run(
                        ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
                        capture_output=True,
                        text=True
                    )
                    phase_execution.completed_at = result.stdout.strip() if result.returncode == 0 else datetime.utcnow().isoformat() + 'Z'
                    
                    # Emit phase_failed event
                    self._emit_event_safe(WorkflowEvent(
                        event_id="",
                        event_type="phase_failed",
                        phase_id=phase_def.phase_id,
                        execution_id=execution.execution_id,
                        workflow_id=execution.workflow_id,
                        step_id=step_def.step_id,
                        timestamp=phase_execution.completed_at,
                        status="failed",
                        error=step_execution.error,
                        data={
                            "failed_step_id": step_def.step_id,
                            "steps_completed": len(phase_execution.step_executions)
                        }
                    ))
                    break
                
                # Handle handoffs
                if step_execution.status == WorkflowStatusModel.COMPLETED:
                    # Check if handoff is needed
                    if step_def.handoff_to and step_def.handoff_type != HandoffType.NEVER:
                        # Generate and save handoff
                        try:
                            handoff = self.handoff_generator.generate_handoff(
                                step_result,  # Use step_result from step_executor
                                step_def,
                                execution
                            )
                            
                            # Validate handoff
                            validation_errors = self.handoff_generator.validate_handoff(handoff)
                            if validation_errors:
                                logger.warning(f"Handoff validation errors: {validation_errors}")
                                # Continue anyway, but log the errors
                            
                            # Save handoff file
                            handoff_path = self.handoff_generator.save_handoff(handoff)
                            
                            # Register handoff in registry
                            self.handoff_registry.register_handoff(
                                handoff,
                                execution_id=execution.execution_id,
                                workflow_id=execution.workflow_id
                            )
                            
                            # Emit handoff_created event
                            self._emit_event_safe(WorkflowEvent(
                                event_id="",
                                event_type="handoff_created",
                                execution_id=execution.execution_id,
                                workflow_id=execution.workflow_id,
                                step_id=step_def.step_id,
                                phase_id=phase_def.phase_id,
                                agent_id=step_def.agent_id,
                                timestamp=handoff.timestamp,
                                status="pending",
                                data={
                                    "handoff_id": handoff.handoff_id,
                                    "from_agent": handoff.from_agent,
                                    "to_agent": handoff.to_agent,
                                    "handoff_type": handoff.handoff_type,
                                    "handoff_path": handoff_path
                                }
                            ))
                            
                            logger.info(f"Generated handoff {handoff.handoff_id} from {handoff.from_agent} to {handoff.to_agent}")
                            
                        except Exception as e:
                            logger.error(f"Failed to generate handoff for step {step_def.step_id}: {e}")
                            # Don't fail the workflow if handoff generation fails
                            # The workflow can continue without the handoff
            
            # Mark phase as completed if all steps succeeded
            if phase_execution.status == WorkflowStatusModel.RUNNING:
                phase_execution.status = WorkflowStatusModel.COMPLETED
                result = subprocess.run(
                    ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
                    capture_output=True,
                    text=True
                )
                phase_execution.completed_at = result.stdout.strip() if result.returncode == 0 else datetime.utcnow().isoformat() + 'Z'
                
                # Calculate duration
                phase_execution.duration_ms = (time.time() - phase_start_time) * 1000
                
                # Emit phase_completed event
                self._emit_event_safe(WorkflowEvent(
                    event_id="",
                    event_type="phase_completed",
                    phase_id=phase_def.phase_id,
                    execution_id=execution.execution_id,
                    workflow_id=execution.workflow_id,
                    timestamp=phase_execution.completed_at,
                    status="success"
                ))
        
        except Exception as e:
            phase_execution.status = WorkflowStatusModel.FAILED
            result = subprocess.run(
                ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
                capture_output=True,
                text=True
            )
            phase_execution.completed_at = result.stdout.strip() if result.returncode == 0 else datetime.utcnow().isoformat() + 'Z'
            
            # Emit phase_failed event
            self._emit_event_safe(WorkflowEvent(
                event_id="",
                event_type="phase_failed",
                phase_id=phase_def.phase_id,
                execution_id=execution.execution_id,
                workflow_id=execution.workflow_id,
                timestamp=phase_execution.completed_at,
                status="failed",
                error=str(e),
                data={
                    "error_type": type(e).__name__,
                    "steps_completed": len(phase_execution.step_executions)
                }
            ))
            
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
                step_execution.status = WorkflowStatusModel.COMPLETED
                step_execution.output_data = {"message": "Script execution placeholder"}
            
            elif step_def.step_type == StepType.MANUAL:
                # Manual intervention required
                logger.info(f"Manual intervention required for step '{step_def.step_id}'")
                step_execution.status = WorkflowStatusModel.PAUSED
                step_execution.output_data = {"message": "Waiting for manual intervention"}
            
            else:
                logger.warning(f"Unknown step type '{step_def.step_type}' for step '{step_def.step_id}'")
                step_execution.status = WorkflowStatusModel.COMPLETED
                step_execution.output_data = {"message": "Step type not implemented"}
            
            # Calculate duration
            step_execution.duration_ms = (time.time() - step_start_time) * 1000
            step_execution.completed_at = datetime.utcnow().isoformat()
        
        except Exception as e:
            step_execution.status = WorkflowStatusModel.FAILED
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
    
    def _emit_event_safe(self, event: WorkflowEvent) -> None:
        """
        Safely emit an event, catching and logging any errors.
        
        This ensures that event emission failures don't break workflow execution.
        
        Args:
            event: WorkflowEvent to emit
        """
        try:
            self.event_log.append_event(event)
        except Exception as e:
            logger.warning(f"Failed to emit event {event.event_type} for execution {event.execution_id}: {e}")
    
    def _save_execution_state(self, execution: WorkflowExecutionModel):
        """Save workflow execution state."""
        # Save to state repository
        import subprocess
        result = subprocess.run(
            ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
            capture_output=True,
            text=True
        )
        updated_at = result.stdout.strip() if result.returncode == 0 else datetime.utcnow().isoformat() + 'Z'
        
        # Convert WorkflowExecutionModel to agent_state.WorkflowExecution format
        from .agent_state import WorkflowExecution as AgentStateWorkflowExecution, WorkflowStatus
        from .workflow_models import WorkflowStatus as WorkflowStatusModel
        
        # Map WorkflowStatusModel to WorkflowStatus enum
        # Handle both enum and string values
        if isinstance(execution.status, WorkflowStatusModel):
            status_map = {
                WorkflowStatusModel.PENDING: WorkflowStatus.NOT_STARTED,
                WorkflowStatusModel.RUNNING: WorkflowStatus.IN_PROGRESS,
                WorkflowStatusModel.COMPLETED: WorkflowStatus.COMPLETE,
                WorkflowStatusModel.FAILED: WorkflowStatus.FAILED,
                WorkflowStatusModel.CANCELLED: WorkflowStatus.CANCELLED,
                WorkflowStatusModel.PAUSED: WorkflowStatus.IN_PROGRESS,  # Map PAUSED to IN_PROGRESS
            }
            mapped_status = status_map.get(execution.status, WorkflowStatus.IN_PROGRESS)
        else:
            # If it's a string or unknown, default to IN_PROGRESS
            mapped_status = WorkflowStatus.IN_PROGRESS
        
        # Safely extract metadata and workflow_version
        metadata = execution.metadata if hasattr(execution, 'metadata') and execution.metadata else {}
        workflow_version = getattr(execution, 'workflow_version', '1.0')  # Default to '1.0' if missing
        
        workflow_execution = AgentStateWorkflowExecution(
            workflow_id=execution.workflow_id,
            workflow_name=execution.workflow_id,  # Use workflow_id as name if not available
            status=mapped_status,
            started_at=execution.started_at,
            request_id=metadata.get('request_id', execution.execution_id),
            completed_at=getattr(execution, 'completed_at', None),
            agent_executions=[],  # Not storing agent executions in this format
            current_agent=getattr(execution, 'current_step_id', None),  # Map current_step_id to current_agent
            context={
                "execution_id": execution.execution_id,
                "workflow_version": workflow_version,
                "current_phase_id": getattr(execution, 'current_phase_id', None),
                "current_step_id": getattr(execution, 'current_step_id', None),
            },
            metadata={
                "duration_ms": getattr(execution, 'duration_ms', None),
                "error": getattr(execution, 'error', None),
            }
        )
        
        state = AgentState(
            state_id=execution.execution_id,
            state_type="workflow",
            created_at=execution.started_at,
            updated_at=updated_at,
            workflow_execution=workflow_execution
        )
        
        try:
            self.state_repository.save_state(state)
            logger.debug(f"Execution state saved for '{execution.execution_id}'")
        except Exception as e:
            logger.error(f"Error saving execution state for '{execution.execution_id}': {e}")
    
    def _handle_workflow_failure(self, execution: WorkflowExecutionModel, error: Exception) -> None:
        """
        Handle workflow failure by adding to dead-letter queue.
        
        Phase 4: Error Recovery
        
        Args:
            execution: The failed workflow execution
            error: The exception that caused the failure
        """
        try:
            # Determine agent_id from current step or use workflow_id
            agent_id = execution.current_step_id or execution.workflow_id or "WorkflowExecutor"
            
            # Count attempts (could be tracked in execution metadata)
            attempts = execution.metadata.get("attempts", 1) if execution.metadata else 1
            
            # Build context
            context = {
                "workflow_id": execution.workflow_id,
                "execution_id": execution.execution_id,
                "workflow_version": execution.workflow_version,
                "current_phase_id": execution.current_phase_id,
                "current_step_id": execution.current_step_id,
                "phases_completed": len(execution.phase_executions),
                "started_at": execution.started_at,
                "completed_at": execution.completed_at,
            }
            
            # Add to dead-letter queue
            self.dead_letter_queue.add_failed_task(
                task_id=execution.execution_id,
                agent_id=agent_id,
                workflow_id=execution.workflow_id,
                error=error,
                attempts=attempts,
                context=context
            )
            
            logger.info(f"Workflow failure added to dead-letter queue: {execution.execution_id}")
            
        except Exception as e:
            logger.error(f"Failed to add workflow to dead-letter queue: {e}")
            # Don't raise - this is a best-effort operation
    
    def resume_workflow(self, execution_id: str, workflow_def: Optional[WorkflowDefinition] = None) -> WorkflowExecutionModel:
        """
        Resume a failed workflow from the last completed step.
        
        Phase 4: Partial Failure Recovery
        
        Args:
            execution_id: Execution ID to resume
            workflow_def: Optional workflow definition (will load if not provided)
        
        Returns:
            Updated WorkflowExecution
        """
        execution = self.active_executions.get(execution_id)
        if not execution:
            # Try to load from state repository
            state = self.state_repository.load_state(execution_id)
            if state and state.workflow_execution:
                # Reconstruct execution from state
                workflow_exec = state.workflow_execution
                
                # Map status (WorkflowStatusModel is already imported at module level)
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
                
                # Restore phase executions from events if available
                # This is a simplified version - full implementation would reconstruct from events
                self.active_executions[execution_id] = execution
            else:
                raise ValueError(f"Execution '{execution_id}' not found")
        
        # Load workflow if not provided
        if not workflow_def:
            workflow_def = self.load_workflow(execution.workflow_id)
        
        # Find last completed step
        completed_step_ids = set()
        for phase_exec in execution.phase_executions:
            for step_exec in phase_exec.step_executions:
                if step_exec.status == WorkflowStatusModel.COMPLETED:
                    completed_step_ids.add(step_exec.step_id)
        
        # Update status to running
        execution.status = WorkflowStatusModel.RUNNING
        
        try:
            # Execute each phase, skipping completed steps
            for phase_def in workflow_def.phases:
                # Check if we should skip this phase (all steps completed)
                phase_all_completed = all(
                    step.step_id in completed_step_ids
                    for step in phase_def.steps
                )
                
                if phase_all_completed:
                    # Phase already completed, find or create phase execution
                    existing_phase = next(
                        (p for p in execution.phase_executions if p.phase_id == phase_def.phase_id),
                        None
                    )
                    if not existing_phase:
                        from .workflow_models import PhaseExecution
                        phase_execution = PhaseExecution(
                            phase_id=phase_def.phase_id,
                            status=WorkflowStatusModel.COMPLETED,
                            started_at=execution.started_at,
                            current_step_id=phase_def.steps[-1].step_id if phase_def.steps else None
                        )
                        execution.phase_executions.append(phase_execution)
                    continue
                
                # Execute phase (will skip completed steps internally)
                phase_execution = self._execute_phase_resume(
                    execution,
                    phase_def,
                    workflow_def,
                    completed_step_ids
                )
                
                # Update or add phase execution
                existing_phase_idx = next(
                    (i for i, p in enumerate(execution.phase_executions) if p.phase_id == phase_def.phase_id),
                    None
                )
                if existing_phase_idx is not None:
                    # Replace the existing phase with the updated one (which has merged steps)
                    execution.phase_executions[existing_phase_idx] = phase_execution
                else:
                    execution.phase_executions.append(phase_execution)
                
                execution.current_phase_id = phase_def.phase_id
                
                # Check if phase failed
                if phase_execution.status == WorkflowStatusModel.FAILED:
                    execution.status = WorkflowStatusModel.FAILED
                    execution.error = f"Phase '{phase_def.phase_id}' failed during resume"
                    break
                
                # Check if workflow was cancelled
                if execution.status == WorkflowStatusModel.CANCELLED:
                    break
            
            # Mark as completed if all phases succeeded
            if execution.status == WorkflowStatusModel.RUNNING:
                execution.status = WorkflowStatusModel.COMPLETED
                import subprocess
                result = subprocess.run(
                    ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
                    capture_output=True,
                    text=True
                )
                execution.completed_at = result.stdout.strip() if result.returncode == 0 else datetime.utcnow().isoformat() + 'Z'
                
                # Calculate duration
                start_time = datetime.fromisoformat(execution.started_at.replace('Z', '+00:00'))
                end_time = datetime.fromisoformat(execution.completed_at.replace('Z', '+00:00'))
                execution.duration_ms = (end_time - start_time).total_seconds() * 1000
                
                # Emit workflow_completed event
                self._emit_event_safe(WorkflowEvent(
                    event_id="",
                    event_type="workflow_completed",
                    execution_id=execution_id,
                    workflow_id=execution.workflow_id,
                    timestamp=execution.completed_at,
                    status="success",
                    data={
                        "duration_ms": execution.duration_ms,
                        "phases_completed": len(execution.phase_executions),
                        "resumed": True
                    }
                ))
            
        except Exception as e:
            execution.status = WorkflowStatusModel.FAILED
            execution.error = str(e)
            import subprocess
            result = subprocess.run(
                ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
                capture_output=True,
                text=True
            )
            execution.completed_at = result.stdout.strip() if result.returncode == 0 else datetime.utcnow().isoformat() + 'Z'
            
            # Add to dead-letter queue
            self._handle_workflow_failure(execution, e)
            
            # Emit workflow_failed event
            self._emit_event_safe(WorkflowEvent(
                event_id="",
                event_type="workflow_failed",
                execution_id=execution_id,
                workflow_id=execution.workflow_id,
                timestamp=execution.completed_at,
                status="failed",
                error=str(e),
                data={
                    "error_type": type(e).__name__,
                    "phases_completed": len(execution.phase_executions),
                    "resumed": True
                }
            ))
        
        # Save execution state
        self._save_execution_state(execution)
        
        return execution
    
    def _execute_phase_resume(
        self,
        execution: WorkflowExecutionModel,
        phase_def,
        workflow_def: WorkflowDefinition,
        completed_step_ids: set
    ) -> PhaseExecution:
        """
        Execute a phase, skipping already completed steps.
        
        Phase 4: Partial Failure Recovery
        
        Args:
            execution: Current workflow execution
            phase_def: Phase definition
            workflow_def: Workflow definition
            completed_step_ids: Set of completed step IDs to skip
        
        Returns:
            PhaseExecution result
        """
        import subprocess
        import time
        
        phase_start_time = time.time()
        
        # Get current timestamp
        result = subprocess.run(
            ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
            capture_output=True,
            text=True
        )
        started_at = result.stdout.strip() if result.returncode == 0 else datetime.utcnow().isoformat() + 'Z'
        
        # Find existing phase execution or create new
        existing_phase = next(
            (p for p in execution.phase_executions if p.phase_id == phase_def.phase_id),
            None
        )
        
        if existing_phase:
            phase_execution = existing_phase
            # Reset status to RUNNING if it was failed (we're retrying)
            if phase_execution.status == WorkflowStatusModel.FAILED:
                phase_execution.status = WorkflowStatusModel.RUNNING
            # Remove failed step executions for steps we'll retry
            # Keep only completed steps
            phase_execution.step_executions = [
                s for s in phase_execution.step_executions
                if s.status == WorkflowStatusModel.COMPLETED
            ]
        else:
            phase_execution = PhaseExecution(
                phase_id=phase_def.phase_id,
                status=WorkflowStatusModel.RUNNING,
                started_at=started_at,
                current_step_id=phase_def.steps[0].step_id if phase_def.steps else None
            )
        
        execution.current_phase_id = phase_def.phase_id
        
        # Emit phase_started event (or phase_resumed if resuming)
        event_type = "phase_resumed" if existing_phase else "phase_started"
        self._emit_event_safe(WorkflowEvent(
            event_id="",
            event_type=event_type,
            phase_id=phase_def.phase_id,
            execution_id=execution.execution_id,
            workflow_id=execution.workflow_id,
            timestamp=started_at,
            status="in_progress",
            data={
                "completed_steps": list(completed_step_ids),
                "resumed": existing_phase is not None
            }
        ))
        
        try:
            # Execute each step in the phase, skipping completed ones
            for step_def in phase_def.steps:
                # Skip if already completed
                if step_def.step_id in completed_step_ids:
                    logger.info(f"Skipping completed step: {step_def.step_id}")
                    continue
                
                # Create execution context
                context = ExecutionContext(
                    execution_id=execution.execution_id,
                    workflow_id=execution.workflow_id,
                    phase_id=phase_def.phase_id,
                    workflow_execution=execution,
                    workflow_definition=workflow_def
                )
                
                # Execute step using step executor
                step_result = self.step_executor.execute_step(step_def, context)
                
                # Convert StepExecution from step_executor to workflow_models StepExecution
                step_execution = StepExecution(
                    step_id=step_result.step_id,
                    status=step_result.status,
                    output_data=step_result.output_data,
                    error=step_result.error,
                    duration_ms=step_result.duration_ms
                )
                
                # Remove any existing step execution with same ID (from failed attempt)
                phase_execution.step_executions = [
                    s for s in phase_execution.step_executions 
                    if s.step_id != step_def.step_id
                ]
                
                # Add the new step execution
                phase_execution.step_executions.append(step_execution)
                
                # Sort step executions by step_id to maintain order
                phase_execution.step_executions.sort(key=lambda s: s.step_id)
                
                phase_execution.current_step_id = step_def.step_id
                execution.current_step_id = step_def.step_id
                
                # Check if step failed - but don't break immediately, let final status calculation handle it
                if step_execution.status == WorkflowStatusModel.FAILED:
                    # Mark phase as failed, but continue to final status calculation
                    phase_execution.status = WorkflowStatusModel.FAILED
                    result = subprocess.run(
                        ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
                        capture_output=True,
                        text=True
                    )
                    phase_execution.completed_at = result.stdout.strip() if result.returncode == 0 else datetime.utcnow().isoformat() + 'Z'
                    
                    # Emit phase_failed event
                    self._emit_event_safe(WorkflowEvent(
                        event_id="",
                        event_type="phase_failed",
                        phase_id=phase_def.phase_id,
                        execution_id=execution.execution_id,
                        workflow_id=execution.workflow_id,
                        step_id=step_def.step_id,
                        timestamp=phase_execution.completed_at,
                        status="failed",
                        error=step_execution.error,
                        data={
                            "failed_step_id": step_def.step_id,
                            "steps_completed": len(phase_execution.step_executions),
                            "resumed": True
                        }
                    ))
                    break
                
                # Handle handoffs (same as in _execute_phase)
                if step_execution.status == WorkflowStatusModel.COMPLETED:
                    if step_def.handoff_to and step_def.handoff_type != HandoffType.NEVER:
                        try:
                            handoff = self.handoff_generator.generate_handoff(
                                step_result,
                                step_def,
                                execution
                            )
                            
                            validation_errors = self.handoff_generator.validate_handoff(handoff)
                            if validation_errors:
                                logger.warning(f"Handoff validation errors: {validation_errors}")
                            
                            handoff_path = self.handoff_generator.save_handoff(handoff)
                            
                            self.handoff_registry.register_handoff(
                                handoff,
                                execution_id=execution.execution_id,
                                workflow_id=execution.workflow_id
                            )
                            
                            self._emit_event_safe(WorkflowEvent(
                                event_id="",
                                event_type="handoff_created",
                                execution_id=execution.execution_id,
                                workflow_id=execution.workflow_id,
                                step_id=step_def.step_id,
                                phase_id=phase_def.phase_id,
                                agent_id=step_def.agent_id,
                                timestamp=handoff.timestamp,
                                status="pending",
                                data={
                                    "handoff_id": handoff.handoff_id,
                                    "from_agent": handoff.from_agent,
                                    "to_agent": handoff.to_agent,
                                    "handoff_type": handoff.handoff_type,
                                    "handoff_path": handoff_path
                                }
                            ))
                            
                            logger.info(f"Generated handoff {handoff.handoff_id} from {handoff.from_agent} to {handoff.to_agent}")
                            
                        except Exception as e:
                            logger.error(f"Failed to generate handoff for step {step_def.step_id}: {e}")
            
            # Recalculate phase status based on all step executions
            all_steps_completed = all(
                s.status == WorkflowStatusModel.COMPLETED 
                for s in phase_execution.step_executions
            )
            any_step_failed = any(
                s.status == WorkflowStatusModel.FAILED 
                for s in phase_execution.step_executions
            )
            
            if any_step_failed:
                phase_execution.status = WorkflowStatusModel.FAILED
            elif all_steps_completed and len(phase_execution.step_executions) > 0:
                phase_execution.status = WorkflowStatusModel.COMPLETED
                result = subprocess.run(
                    ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
                    capture_output=True,
                    text=True
                )
                phase_execution.completed_at = result.stdout.strip() if result.returncode == 0 else datetime.utcnow().isoformat() + 'Z'
                
                # Calculate duration
                phase_execution.duration_ms = (time.time() - phase_start_time) * 1000
                
                # Emit phase_completed event
                self._emit_event_safe(WorkflowEvent(
                    event_id="",
                    event_type="phase_completed",
                    phase_id=phase_def.phase_id,
                    execution_id=execution.execution_id,
                    workflow_id=execution.workflow_id,
                    timestamp=phase_execution.completed_at,
                    status="success",
                    data={
                        "duration_ms": phase_execution.duration_ms,
                        "resumed": existing_phase is not None
                    }
                ))
        
        except Exception as e:
            phase_execution.status = WorkflowStatusModel.FAILED
            result = subprocess.run(
                ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
                capture_output=True,
                text=True
            )
            phase_execution.completed_at = result.stdout.strip() if result.returncode == 0 else datetime.utcnow().isoformat() + 'Z'
            
            # Emit phase_failed event
            self._emit_event_safe(WorkflowEvent(
                event_id="",
                event_type="phase_failed",
                phase_id=phase_def.phase_id,
                execution_id=execution.execution_id,
                workflow_id=execution.workflow_id,
                timestamp=phase_execution.completed_at,
                status="failed",
                error=str(e),
                data={
                    "error_type": type(e).__name__,
                    "steps_completed": len(phase_execution.step_executions),
                    "resumed": True
                }
            ))
            
            logger.error(f"Phase '{phase_def.phase_id}' failed: {e}")
        
        return phase_execution
    
    def get_execution(self, execution_id: str) -> Optional[WorkflowExecutionModel]:
        """
        Get an execution by ID.
        
        First checks active executions, then loads from state repository if not found.
        """
        # Check active executions first
        execution = self.active_executions.get(execution_id)
        if execution:
            return execution
        
        # Try loading from state repository
        state = self.state_repository.load_state(execution_id)
        if state and state.workflow_execution:
            # Reconstruct execution from state
            workflow_exec = state.workflow_execution
            
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
            
            # Restore phase executions if available
            # Note: This is a simplified version - full implementation would reconstruct from events
            # For now, phase_executions will be empty if loaded from state
            # The resume_workflow method handles this by reconstructing from events
            
            return execution
        
        return None
    
    def list_executions(self, workflow_id: Optional[str] = None) -> List[WorkflowExecutionModel]:
        """List all executions, optionally filtered by workflow."""
        executions = list(self.active_executions.values())
        
        if workflow_id:
            executions = [e for e in executions if e.workflow_id == workflow_id]
        
        return executions
    
    def cancel_workflow(self, execution_id: str, reason: Optional[str] = None) -> bool:
        """
        Cancel a running workflow execution.
        
        Args:
            execution_id: Execution ID to cancel
            reason: Optional cancellation reason
        
        Returns:
            True if cancellation was successful, False if execution not found or already completed
        """
        execution = self.get_execution(execution_id)
        
        if not execution:
            logger.warning(f"Cannot cancel execution '{execution_id}': not found")
            return False
        
        # Check if execution can be cancelled
        if execution.status in [WorkflowStatusModel.COMPLETED, WorkflowStatusModel.FAILED, WorkflowStatusModel.CANCELLED]:
            logger.info(f"Cannot cancel execution '{execution_id}': already {execution.status.value}")
            return False
        
        # Mark as cancelled
        execution.status = WorkflowStatusModel.CANCELLED
        execution.error = reason or "Cancelled by user"
        
        import subprocess
        result = subprocess.run(
            ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
            capture_output=True,
            text=True
        )
        execution.completed_at = result.stdout.strip() if result.returncode == 0 else datetime.utcnow().isoformat() + 'Z'
        
        # Calculate duration
        if execution.started_at:
            start_time = datetime.fromisoformat(execution.started_at.replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(execution.completed_at.replace('Z', '+00:00'))
            execution.duration_ms = (end_time - start_time).total_seconds() * 1000
        
        # Save state
        self._save_execution_state(execution)
        
        # Emit workflow_cancelled event
        self._emit_event_safe(WorkflowEvent(
            event_id="",
            event_type="workflow_cancelled",
            execution_id=execution_id,
            workflow_id=execution.workflow_id,
            timestamp=execution.completed_at,
            status="cancelled",
            error=execution.error,
            data={
                "reason": reason,
                "duration_ms": execution.duration_ms
            }
        ))
        
        logger.info(f"Workflow execution '{execution_id}' cancelled: {reason or 'No reason provided'}")
        return True


# Global executor instance
_workflow_executor: Optional[WorkflowExecutor] = None


def get_workflow_executor() -> WorkflowExecutor:
    """Get or create global workflow executor instance."""
    global _workflow_executor
    
    if _workflow_executor is None:
        _workflow_executor = WorkflowExecutor()
    
    return _workflow_executor

