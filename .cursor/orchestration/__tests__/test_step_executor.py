"""
Tests for step executor module.

Version: 1.0
Last Updated: 2025-12-12
"""

import pytest
import sys
import time
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from orchestration.step_executor import StepExecutor, StepExecution, ExecutionContext
from orchestration.workflow_models import WorkflowStep, StepType, WorkflowStatus
from orchestration.event_log import EventLog, WorkflowEvent


class TestStepExecutor:
    """Tests for StepExecutor."""
    
    @pytest.fixture
    def mock_event_log(self):
        """Create mock event log."""
        return Mock(spec=EventLog)
    
    @pytest.fixture
    def mock_agent_executor(self):
        """Create mock agent executor."""
        return Mock()
    
    @pytest.fixture
    def step_executor(self, mock_event_log, mock_agent_executor):
        """Create StepExecutor with mocks."""
        return StepExecutor(
            event_log_instance=mock_event_log,
            agent_executor_instance=mock_agent_executor
        )
    
    @pytest.fixture
    def execution_context(self):
        """Create execution context."""
        return ExecutionContext(
            execution_id="exec-1",
            workflow_id="workflow-1",
            phase_id="phase-1"
        )
    
    @pytest.fixture
    def agent_step(self):
        """Create agent step definition."""
        return WorkflowStep(
            step_id="step-1",
            step_number=1,
            name="Test Step",
            description="Test step description",
            step_type=StepType.AGENT,
            agent_id="test-agent",
            input_data={"key": "value"}
        )
    
    def test_execute_step_emits_events(self, step_executor, agent_step, execution_context):
        """Test that step execution emits events."""
        # Mock agent executor to return success
        step_executor.agent_executor.execute_agent.return_value = Mock(
            output_data={"result": "success"}
        )
        
        # Execute step
        result = step_executor.execute_step(agent_step, execution_context)
        
        # Verify events were emitted
        assert step_executor.event_log.append_event.call_count >= 2  # step_started and step_completed
        
        # Check first event (step_started)
        first_call = step_executor.event_log.append_event.call_args_list[0]
        event = first_call[0][0]
        assert event.event_type == "step_started"
        assert event.step_id == "step-1"
        
        # Check second event (step_completed)
        second_call = step_executor.event_log.append_event.call_args_list[1]
        event = second_call[0][0]
        assert event.event_type == "step_completed"
        assert event.status == "success"
    
    def test_execute_step_handles_error(self, step_executor, agent_step, execution_context):
        """Test that step execution handles errors and emits failure event."""
        # Mock agent executor to raise exception
        step_executor.agent_executor.execute_agent.side_effect = Exception("Test error")
        
        # Execute step
        result = step_executor.execute_step(agent_step, execution_context)
        
        # Verify result indicates failure
        assert result.status == WorkflowStatus.FAILED
        assert result.error == "Test error"
        
        # Verify failure event was emitted
        calls = step_executor.event_log.append_event.call_args_list
        failure_events = [call[0][0] for call in calls if call[0][0].event_type == "step_failed"]
        assert len(failure_events) == 1
        assert failure_events[0].error == "Test error"
    
    def test_execute_step_with_timeout(self, step_executor, agent_step, execution_context):
        """Test step execution with timeout."""
        # Mock agent executor to take longer than timeout
        def slow_execution(*args, **kwargs):
            time.sleep(2)  # Sleep longer than timeout
            return Mock(output_data={})
        
        step_executor.agent_executor.execute_agent.side_effect = slow_execution
        
        # Execute with short timeout
        result = step_executor.execute_step_with_timeout(agent_step, execution_context, timeout=0.5)
        
        # Verify timeout occurred
        assert result.status == WorkflowStatus.FAILED
        assert "timed out" in result.error.lower()
    
    def test_execute_agent_step_success(self, step_executor, agent_step, execution_context):
        """Test successful agent step execution."""
        # Mock agent executor
        mock_result = Mock()
        mock_result.output_data = {"result": "success", "data": "test"}
        step_executor.agent_executor.execute_agent.return_value = mock_result
        
        # Execute
        result = step_executor._execute_agent_internal(agent_step, execution_context)
        
        # Verify result
        assert result.status == WorkflowStatus.COMPLETED
        assert result.output_data == {"result": "success", "data": "test"}
        
        # Verify agent executor was called correctly
        step_executor.agent_executor.execute_agent.assert_called_once()
        call_args = step_executor.agent_executor.execute_agent.call_args
        assert call_args[1]["agent_id"] == "test-agent"
        assert call_args[1]["request_id"] == "exec-1"
        assert call_args[1]["workflow_id"] == "workflow-1"
    
    def test_execute_script_step(self, step_executor, execution_context, tmp_path):
        """Test script step execution."""
        # Create a test script
        script_path = tmp_path / "test_script.sh"
        script_path.write_text("#!/bin/bash\necho 'test output'\nexit 0\n")
        script_path.chmod(0o755)
        
        script_step = WorkflowStep(
            step_id="script-step-1",
            step_number=1,
            name="Script Step",
            description="Test script",
            step_type=StepType.SCRIPT,
            script_path=str(script_path)
        )
        
        # Execute script step
        result = step_executor._execute_script_internal(script_step, execution_context)
        
        # Verify result
        assert result.status == WorkflowStatus.COMPLETED
        assert "test output" in result.output_data.get("stdout", "")
        assert result.output_data.get("returncode") == 0
    
    def test_execute_condition_step(self, step_executor, execution_context):
        """Test condition step execution."""
        condition_step = WorkflowStep(
            step_id="condition-step-1",
            step_number=1,
            name="Condition Step",
            description="Test condition",
            step_type=StepType.CONDITION
        )
        
        # Execute condition step
        result = step_executor._execute_condition_step(condition_step, execution_context)
        
        # Verify result
        assert result.status == WorkflowStatus.COMPLETED
        assert "condition_result" in result.output_data
    
    def test_step_execution_duration(self, step_executor, agent_step, execution_context):
        """Test that step execution records duration."""
        # Mock agent executor with delay
        def delayed_execution(*args, **kwargs):
            time.sleep(0.1)
            return Mock(output_data={})
        
        step_executor.agent_executor.execute_agent.side_effect = delayed_execution
        
        # Execute step
        result = step_executor.execute_step(agent_step, execution_context)
        
        # Verify duration is recorded
        assert result.duration_ms is not None
        assert result.duration_ms >= 100  # At least 100ms
    
    def test_step_execution_with_metadata_timeout(self, step_executor, agent_step, execution_context):
        """Test step execution respects timeout from step metadata."""
        # Set timeout in step metadata
        agent_step.metadata["timeout_seconds"] = 0.5
        
        # Mock agent executor to be slow
        def slow_execution(*args, **kwargs):
            time.sleep(1)
            return Mock(output_data={})
        
        step_executor.agent_executor.execute_agent.side_effect = slow_execution
        
        # Execute with timeout from metadata
        result = step_executor.execute_step_with_timeout(agent_step, execution_context)
        
        # Verify timeout occurred
        assert result.status == WorkflowStatus.FAILED
        assert "timed out" in result.error.lower()
