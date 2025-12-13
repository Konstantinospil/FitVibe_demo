"""
Integration tests for workflow executor with Phase 1 components.

Version: 1.0
Last Updated: 2025-12-12
"""

import pytest
import sys
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from orchestration.workflow_executor import WorkflowExecutor
from orchestration.workflow_models import (
    WorkflowDefinition,
    WorkflowMetadata,
    WorkflowPhase,
    WorkflowStep,
    StepType,
    WorkflowStatus
)
from orchestration.event_log import EventLog
from orchestration.state_repository import AgentStateRepository
from orchestration.step_executor import StepExecutor


class TestWorkflowExecutorPhase1:
    """Integration tests for workflow executor with Phase 1 components."""
    
    @pytest.fixture
    def temp_dirs(self):
        """Create temporary directories for tests."""
        temp_path = Path(tempfile.mkdtemp())
        workflows_dir = temp_path / "workflows"
        agents_dir = temp_path / "agents"
        workflows_dir.mkdir()
        agents_dir.mkdir()
        
        yield {
            "workflows": str(workflows_dir),
            "agents": str(agents_dir),
            "temp": temp_path
        }
        
        shutil.rmtree(temp_path)
    
    @pytest.fixture
    def temp_db(self, temp_dirs):
        """Create temporary database paths."""
        temp_path = temp_dirs["temp"]
        return {
            "events": str(temp_path / "test_events.db"),
            "state": str(temp_path / "test_state.db")
        }
    
    @pytest.fixture
    def event_log(self, temp_db):
        """Create EventLog instance."""
        return EventLog(db_path=temp_db["events"])
    
    @pytest.fixture
    def state_repository(self, temp_db):
        """Create AgentStateRepository instance."""
        return AgentStateRepository(db_path=temp_db["state"])
    
    @pytest.fixture
    def mock_step_executor(self):
        """Create mock step executor."""
        return Mock(spec=StepExecutor)
    
    @pytest.fixture
    def workflow_executor(self, temp_dirs, event_log, state_repository, mock_step_executor):
        """Create WorkflowExecutor with Phase 1 components."""
        return WorkflowExecutor(
            workflows_dir=temp_dirs["workflows"],
            agents_dir=temp_dirs["agents"],
            event_log_instance=event_log,
            state_repository=state_repository,
            step_executor_instance=mock_step_executor
        )
    
    @pytest.fixture
    def sample_workflow_definition(self):
        """Create sample workflow definition."""
        return WorkflowDefinition(
            workflow_id="test-workflow",
            name="Test Workflow",
            description="Test workflow for Phase 1",
            metadata=WorkflowMetadata(
                version="1.0",
                last_updated="2025-12-12",
                status="Active",
                priority="Standard",
                workflow_id="test-workflow"
            ),
            phases=[
                WorkflowPhase(
                    phase_id="phase-1",
                    phase_number=1,
                    name="Phase 1",
                    description="First phase",
                    steps=[
                        WorkflowStep(
                            step_id="step-1",
                            step_number=1,
                            name="Step 1",
                            description="First step",
                            step_type=StepType.AGENT,
                            agent_id="test-agent"
                        )
                    ]
                )
            ]
        )
    
    def test_start_workflow_pins_version(self, workflow_executor, temp_dirs, sample_workflow_definition):
        """Test that workflow version is pinned on start."""
        # Create workflow file
        workflow_file = Path(temp_dirs["workflows"]) / "test-workflow.md"
        workflow_file.write_text("# Test Workflow\n\nVersion: 1.0\n")
        
        # Mock parser to return our sample workflow
        with patch.object(workflow_executor.parser, 'parse_workflow', return_value=sample_workflow_definition):
            execution = workflow_executor.start_workflow(
                workflow_id="test-workflow",
                input_data={"test": "data"}
            )
        
        # Verify version is pinned
        assert execution.workflow_version == "1.0"
        assert execution.workflow_id == "test-workflow"
    
    def test_start_workflow_emits_event(self, workflow_executor, temp_dirs, sample_workflow_definition, event_log):
        """Test that workflow start emits event."""
        # Create workflow file
        workflow_file = Path(temp_dirs["workflows"]) / "test-workflow.md"
        workflow_file.write_text("# Test Workflow\n\nVersion: 1.0\n")
        
        # Mock parser
        with patch.object(workflow_executor.parser, 'parse_workflow', return_value=sample_workflow_definition):
            execution = workflow_executor.start_workflow(
                workflow_id="test-workflow",
                input_data={}
            )
        
        # Verify event was emitted
        events = event_log.get_events(execution_id=execution.execution_id)
        assert len(events) >= 1
        assert any(e.event_type == "workflow_started" for e in events)
    
    def test_start_workflow_saves_state(self, workflow_executor, temp_dirs, sample_workflow_definition, state_repository):
        """Test that workflow start saves state."""
        # Create workflow file
        workflow_file = Path(temp_dirs["workflows"]) / "test-workflow.md"
        workflow_file.write_text("# Test Workflow\n\nVersion: 1.0\n")
        
        # Mock parser
        with patch.object(workflow_executor.parser, 'parse_workflow', return_value=sample_workflow_definition):
            execution = workflow_executor.start_workflow(
                workflow_id="test-workflow",
                input_data={}
            )
        
        # Verify state was saved
        state = state_repository.load_state(execution.execution_id)
        assert state is not None
        assert state.workflow_execution.workflow_id == "test-workflow"
        # workflow_version is stored in context dict
        assert state.workflow_execution.context.get("workflow_version") == "1.0"
    
    def test_workflow_version_parameter(self, workflow_executor, temp_dirs, sample_workflow_definition):
        """Test that workflow version can be specified."""
        # Create workflow file
        workflow_file = Path(temp_dirs["workflows"]) / "test-workflow.md"
        workflow_file.write_text("# Test Workflow\n\nVersion: 1.0\n")
        
        # Update sample workflow to have version 2.0
        sample_workflow_definition.metadata.version = "2.0"
        
        # Mock parser
        with patch.object(workflow_executor.parser, 'parse_workflow', return_value=sample_workflow_definition):
            execution = workflow_executor.start_workflow(
                workflow_id="test-workflow",
                input_data={},
                workflow_version="2.0"
            )
        
        # Verify specified version is used
        assert execution.workflow_version == "2.0"
    
    def test_execute_workflow_emits_phase_events(self, workflow_executor, temp_dirs, sample_workflow_definition, event_log, mock_step_executor):
        """Test that workflow execution emits phase events."""
        # Create workflow file
        workflow_file = Path(temp_dirs["workflows"]) / "test-workflow.md"
        workflow_file.write_text("# Test Workflow\n\nVersion: 1.0\n")
        
        # Mock step executor to return success
        from orchestration.step_executor import StepExecution as StepExecutionResult
        mock_step_executor.execute_step.return_value = StepExecutionResult(
            step_id="step-1",
            status=WorkflowStatus.COMPLETED,
            output_data={}
        )
        
        # Mock parser
        with patch.object(workflow_executor.parser, 'parse_workflow', return_value=sample_workflow_definition):
            execution = workflow_executor.start_workflow(
                workflow_id="test-workflow",
                input_data={}
            )
            
            workflow_executor.execute_workflow(execution.execution_id, workflow_def=sample_workflow_definition)
        
        # Verify phase events were emitted
        events = event_log.get_events(execution_id=execution.execution_id)
        event_types = [e.event_type for e in events]
        assert "phase_started" in event_types
        assert "phase_completed" in event_types
    
    def test_workflow_completion_emits_event(self, workflow_executor, temp_dirs, sample_workflow_definition, event_log, mock_step_executor):
        """Test that workflow completion emits event."""
        # Create workflow file
        workflow_file = Path(temp_dirs["workflows"]) / "test-workflow.md"
        workflow_file.write_text("# Test Workflow\n\nVersion: 1.0\n")
        
        # Mock step executor to return success
        from orchestration.step_executor import StepExecution as StepExecutionResult
        mock_step_executor.execute_step.return_value = StepExecutionResult(
            step_id="step-1",
            status=WorkflowStatus.COMPLETED,
            output_data={}
        )
        
        # Mock parser
        with patch.object(workflow_executor.parser, 'parse_workflow', return_value=sample_workflow_definition):
            execution = workflow_executor.start_workflow(
                workflow_id="test-workflow",
                input_data={}
            )
            
            workflow_executor.execute_workflow(execution.execution_id, workflow_def=sample_workflow_definition)
        
        # Verify completion event
        events = event_log.get_events(execution_id=execution.execution_id)
        assert any(e.event_type == "workflow_completed" for e in events)
        
        # Verify execution status
        final_execution = workflow_executor.get_execution(execution.execution_id)
        assert final_execution.status == WorkflowStatus.COMPLETED
    
    def test_workflow_failure_emits_event(self, workflow_executor, temp_dirs, sample_workflow_definition, event_log, mock_step_executor):
        """Test that workflow failure emits event."""
        # Create workflow file
        workflow_file = Path(temp_dirs["workflows"]) / "test-workflow.md"
        workflow_file.write_text("# Test Workflow\n\nVersion: 1.0\n")
        
        # Mock step executor to raise exception
        mock_step_executor.execute_step.side_effect = Exception("Step execution failed")
        
        # Mock parser
        with patch.object(workflow_executor.parser, 'parse_workflow', return_value=sample_workflow_definition):
            execution = workflow_executor.start_workflow(
                workflow_id="test-workflow",
                input_data={}
            )
            
            try:
                workflow_executor.execute_workflow(execution.execution_id, workflow_def=sample_workflow_definition)
            except Exception:
                pass  # Expected to fail
        
        # Verify failure event
        events = event_log.get_events(execution_id=execution.execution_id)
        assert any(e.event_type == "workflow_failed" for e in events)
        
        # Verify execution status
        final_execution = workflow_executor.get_execution(execution.execution_id)
        assert final_execution.status == WorkflowStatus.FAILED
    
    def test_phase_failure_emits_event(self, workflow_executor, temp_dirs, sample_workflow_definition, event_log, mock_step_executor):
        """Test that phase failure emits event."""
        # Create workflow file
        workflow_file = Path(temp_dirs["workflows"]) / "test-workflow.md"
        workflow_file.write_text("# Test Workflow\n\nVersion: 1.0\n")
        
        # Mock step executor to return failed step
        from orchestration.step_executor import StepExecution as StepExecutionResult
        mock_step_executor.execute_step.return_value = StepExecutionResult(
            step_id="step-1",
            status=WorkflowStatus.FAILED,
            output_data={},
            error="Step failed"
        )
        
        # Mock parser
        with patch.object(workflow_executor.parser, 'parse_workflow', return_value=sample_workflow_definition):
            execution = workflow_executor.start_workflow(
                workflow_id="test-workflow",
                input_data={}
            )
            
            workflow_executor.execute_workflow(execution.execution_id, workflow_def=sample_workflow_definition)
        
        # Verify phase failure event
        events = event_log.get_events(execution_id=execution.execution_id)
        phase_failed_events = [e for e in events if e.event_type == "phase_failed"]
        assert len(phase_failed_events) > 0
        
        # Verify event contains error information
        phase_failed_event = phase_failed_events[0]
        assert phase_failed_event.error is not None
        assert phase_failed_event.data is not None
        assert "failed_step_id" in phase_failed_event.data
