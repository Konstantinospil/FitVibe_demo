"""
Step Executor - Executes individual workflow steps with timeout handling.

This module provides step execution with timeout, event emission, and error handling.

Version: 1.0
Last Updated: 2025-12-12
"""

import logging
import subprocess
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from dataclasses import dataclass
from typing import Dict, Any, Optional

from .workflow_models import WorkflowStep, WorkflowStatus, StepType
from .agent_executor import agent_executor
from .event_log import event_log, WorkflowEvent

logger = logging.getLogger(__name__)


@dataclass
class ExecutionContext:
    """Context for step execution."""
    execution_id: str
    workflow_id: str
    phase_id: Optional[str] = None
    workflow_execution: Any = None  # WorkflowExecutionModel
    workflow_definition: Any = None  # WorkflowDefinition


@dataclass
class StepExecution:
    """Result of step execution."""
    step_id: str
    status: WorkflowStatus
    output_data: Dict[str, Any] = None
    error: Optional[str] = None
    duration_ms: Optional[float] = None
    
    def __post_init__(self):
        """Initialize default values."""
        if self.output_data is None:
            self.output_data = {}


class StepExecutor:
    """
    Executes individual workflow steps with timeout and event emission.
    
    Features:
    - Step execution with timeout
    - Event emission for step lifecycle
    - Error handling and reporting
    - Support for different step types (agent, script, condition)
    """
    
    def __init__(self, event_log_instance=None, agent_executor_instance=None):
        """
        Initialize step executor.
        
        Args:
            event_log_instance: EventLog instance (default: global event_log)
            agent_executor_instance: AgentExecutor instance (default: global agent_executor)
        """
        self.event_log = event_log_instance or event_log
        self.agent_executor = agent_executor_instance or agent_executor
    
    def execute_step(
        self,
        step_def: WorkflowStep,
        context: ExecutionContext
    ) -> StepExecution:
        """
        Execute step with timeout and event emission.
        
        Args:
            step_def: WorkflowStep definition
            context: Execution context
        
        Returns:
            StepExecution result
        """
        import time
        
        # Emit step_started event
        import subprocess
        result = subprocess.run(
            ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
            capture_output=True,
            text=True
        )
        timestamp = result.stdout.strip() if result.returncode == 0 else ""
        
        self.event_log.append_event(WorkflowEvent(
            event_id="",
            event_type="step_started",
            step_id=step_def.step_id,
            phase_id=context.phase_id,
            execution_id=context.execution_id,
            workflow_id=context.workflow_id,
            agent_id=step_def.agent_id,
            timestamp=timestamp,
            status="in_progress"
        ))
        
        start_time = time.time()
        
        try:
            # Execute with timeout
            result = self.execute_step_with_timeout(step_def, context)
            
            duration_ms = (time.time() - start_time) * 1000
            result.duration_ms = duration_ms
            
            # Emit step_completed event
            self.event_log.append_event(WorkflowEvent(
                event_id="",
                event_type="step_completed",
                step_id=step_def.step_id,
                phase_id=context.phase_id,
                execution_id=context.execution_id,
                workflow_id=context.workflow_id,
                agent_id=step_def.agent_id,
                status="success",
                data={"output": result.output_data}
            ))
            
            return result
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            
            # Emit step_failed event
            self.event_log.append_event(WorkflowEvent(
                event_id="",
                event_type="step_failed",
                step_id=step_def.step_id,
                phase_id=context.phase_id,
                execution_id=context.execution_id,
                workflow_id=context.workflow_id,
                agent_id=step_def.agent_id,
                status="failed",
                error=str(e)
            ))
            
            return StepExecution(
                step_id=step_def.step_id,
                status=WorkflowStatus.FAILED,
                error=str(e),
                duration_ms=duration_ms
            )
    
    def execute_step_with_timeout(
        self,
        step_def: WorkflowStep,
        context: ExecutionContext,
        timeout: Optional[int] = None
    ) -> StepExecution:
        """
        Execute step with timeout.
        
        Args:
            step_def: WorkflowStep definition
            context: Execution context
            timeout: Timeout in seconds (default: 3600 or from step definition)
        
        Returns:
            StepExecution result
        
        Raises:
            TimeoutError: If step execution times out
        """
        # Determine timeout
        if timeout is None:
            # Try to get from step metadata
            timeout = step_def.metadata.get("timeout_seconds", 3600)
        
        # Execute based on step type
        if step_def.step_type == StepType.AGENT:
            return self._execute_agent_step(step_def, context, timeout)
        elif step_def.step_type == StepType.SCRIPT:
            return self._execute_script_step(step_def, context, timeout)
        elif step_def.step_type == StepType.CONDITION:
            return self._execute_condition_step(step_def, context)
        else:
            raise ValueError(f"Unsupported step type: {step_def.step_type}")
    
    def _execute_agent_step(
        self,
        step_def: WorkflowStep,
        context: ExecutionContext,
        timeout: int
    ) -> StepExecution:
        """Execute agent step with timeout."""
        if not step_def.agent_id:
            raise ValueError("Agent ID required for agent step")
        
        # Use ThreadPoolExecutor for timeout
        with ThreadPoolExecutor() as executor:
            future = executor.submit(
                self._execute_agent_internal,
                step_def,
                context
            )
            
            try:
                result = future.result(timeout=timeout)
                return result
            except FutureTimeoutError:
                future.cancel()
                return StepExecution(
                    step_id=step_def.step_id,
                    status=WorkflowStatus.FAILED,
                    error=f"Step timed out after {timeout} seconds"
                )
    
    def _execute_agent_internal(
        self,
        step_def: WorkflowStep,
        context: ExecutionContext
    ) -> StepExecution:
        """Internal method to execute agent."""
        try:
            # Execute agent using agent_executor
            # Prepare input data combining step input and context
            input_data = {
                **step_def.input_data,
                "execution_id": context.execution_id,
                "workflow_id": context.workflow_id,
                "step_id": step_def.step_id
            }
            
            agent_result = self.agent_executor.execute_agent(
                agent_id=step_def.agent_id,
                request_id=context.execution_id,
                workflow_id=context.workflow_id,
                input_data=input_data,
                workflow_state=None  # Could pass workflow state here if needed
            )
            
            # Extract output data from agent result
            output_data = {}
            if hasattr(agent_result, 'output_data'):
                output_data = agent_result.output_data
            elif isinstance(agent_result, dict):
                output_data = agent_result.get("output_data", {})
            
            return StepExecution(
                step_id=step_def.step_id,
                status=WorkflowStatus.COMPLETED,
                output_data=output_data
            )
        except Exception as e:
            logger.error(f"Error executing agent step {step_def.step_id}: {e}")
            raise
    
    def _execute_script_step(
        self,
        step_def: WorkflowStep,
        context: ExecutionContext,
        timeout: int
    ) -> StepExecution:
        """Execute script step with timeout."""
        if not step_def.script_path:
            raise ValueError("Script path required for script step")
        
        # Use ThreadPoolExecutor for timeout
        with ThreadPoolExecutor() as executor:
            future = executor.submit(
                self._execute_script_internal,
                step_def,
                context
            )
            
            try:
                result = future.result(timeout=timeout)
                return result
            except FutureTimeoutError:
                future.cancel()
                return StepExecution(
                    step_id=step_def.step_id,
                    status=WorkflowStatus.FAILED,
                    error=f"Script step timed out after {timeout} seconds"
                )
    
    def _execute_script_internal(
        self,
        step_def: WorkflowStep,
        context: ExecutionContext
    ) -> StepExecution:
        """Internal method to execute script."""
        import subprocess
        from pathlib import Path
        
        script_path = Path(step_def.script_path)
        if not script_path.exists():
            raise FileNotFoundError(f"Script not found: {script_path}")
        
        try:
            # Execute script
            result = subprocess.run(
                [str(script_path)],
                capture_output=True,
                text=True,
                timeout=3600  # Additional safety timeout
            )
            
            if result.returncode != 0:
                raise RuntimeError(f"Script failed with return code {result.returncode}: {result.stderr}")
            
            return StepExecution(
                step_id=step_def.step_id,
                status=WorkflowStatus.COMPLETED,
                output_data={
                    "stdout": result.stdout,
                    "returncode": result.returncode
                }
            )
        except subprocess.TimeoutExpired:
            raise TimeoutError("Script execution timed out")
        except Exception as e:
            logger.error(f"Error executing script step {step_def.step_id}: {e}")
            raise
    
    def _execute_condition_step(
        self,
        step_def: WorkflowStep,
        context: ExecutionContext
    ) -> StepExecution:
        """Execute condition step."""
        # For now, condition evaluation is simplified
        # Full implementation would evaluate condition expressions
        condition_result = True  # Placeholder
        
        return StepExecution(
            step_id=step_def.step_id,
            status=WorkflowStatus.COMPLETED,
            output_data={
                "condition_result": condition_result
            }
        )


# Global instance for easy access
step_executor = StepExecutor()
