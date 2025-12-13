"""
Integration tests for workflow executor with Phase 3 handoff automation.

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
    HandoffType,
    WorkflowStatus
)
from orchestration.event_log import EventLog
from orchestration.state_repository import AgentStateRepository
from orchestration.step_executor import StepExecutor
from orchestration.handoff_generator import HandoffGenerator
from orchestration.handoff_registry import HandoffRegistry


class TestWorkflowExecutorPhase3:
    """Integration tests for workflow executor with Phase 3 handoff automation."""
    
    @pytest.fixture
    def temp_dirs(self):
        """Create temporary directories for tests."""
        temp_path = Path(tempfile.mkdtemp())
        workflows_dir = temp_path / "workflows"
        agents_dir = temp_path / "agents"
        handoffs_dir = temp_path / "handoffs"
        workflows_dir.mkdir()
        agents_dir.mkdir()
        handoffs_dir.mkdir()
        
        # Create dummy agent files
        (agents_dir / "agent-1.md").write_text("# Agent 1\n")
        (agents_dir / "agent-2.md").write_text("# Agent 2\n")
        
        yield {
            "workflows": str(workflows_dir),
            "agents": str(agents_dir),
            "handoffs": str(handoffs_dir),
            "temp": temp_path
        }
        
        shutil.rmtree(temp_path)
    
    @pytest.fixture
    def temp_db(self, temp_dirs):
        """Create temporary database paths."""
        temp_path = temp_dirs["temp"]
        return {
            "events": str(temp_path / "test_events.db"),
            "state": str(temp_path / "test_state.db"),
            "handoffs": str(temp_path / "test_handoffs.db")
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
    def handoff_registry(self, temp_db):
        """Create HandoffRegistry instance."""
        return HandoffRegistry(db_path=temp_db["handoffs"])
    
    @pytest.fixture
    def handoff_generator(self, temp_dirs):
        """Create HandoffGenerator instance."""
        return HandoffGenerator(
            agents_dir=temp_dirs["agents"],
            handoffs_dir=temp_dirs["handoffs"]
        )
    
    @pytest.fixture
    def mock_step_executor(self):
        """Create mock step executor."""
        return Mock(spec=StepExecutor)
    
    @pytest.fixture
    def workflow_executor(self, temp_dirs, event_log, state_repository, mock_step_executor, handoff_generator, handoff_registry):
        """Create WorkflowExecutor with Phase 3 components."""
        return WorkflowExecutor(
            workflows_dir=temp_dirs["workflows"],
            agents_dir=temp_dirs["agents"],
            event_log_instance=event_log,
            state_repository=state_repository,
            step_executor_instance=mock_step_executor,
            handoff_generator_instance=handoff_generator,
            handoff_registry_instance=handoff_registry
        )
    
    @pytest.fixture
    def sample_workflow_definition_with_handoff(self):
        """Create sample workflow definition with handoff."""
        return WorkflowDefinition(
            workflow_id="test-workflow",
            name="Test Workflow",
            description="Test workflow with handoff",
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
                            agent_id="agent-1",
                            handoff_to="agent-2",
                            handoff_type=HandoffType.ALWAYS
                        )
                    ]
                )
            ]
        )
    
    def test_handoff_generation_during_execution(
        self,
        workflow_executor,
        temp_dirs,
        sample_workflow_definition_with_handoff,
        event_log,
        mock_step_executor,
        handoff_generator,
        handoff_registry,
        temp_db
    ):
        """Test that handoff is generated during workflow execution."""
        # Create workflow file
        workflow_file = Path(temp_dirs["workflows"]) / "test-workflow.md"
        workflow_file.write_text("# Test Workflow\n\nVersion: 1.0\n")
        
        # Mock step executor to return success with output data
        from orchestration.step_executor import StepExecution as StepExecutionResult
        mock_step_executor.execute_step.return_value = StepExecutionResult(
            step_id="step-1",
            status=WorkflowStatus.COMPLETED,
            output_data={
                "summary": "Step completed",
                "deliverables": ["file1.txt"]
            }
        )
        
        # Mock parser
        with patch.object(workflow_executor.parser, 'parse_workflow', return_value=sample_workflow_definition_with_handoff):
            execution = workflow_executor.start_workflow(
                workflow_id="test-workflow",
                input_data={}
            )
            
            workflow_executor.execute_workflow(execution.execution_id, workflow_def=sample_workflow_definition_with_handoff)
        
        # Verify handoff was created
        handoff_files = list(Path(temp_dirs["handoffs"]).glob("*.json"))
        assert len(handoff_files) > 0
        
        # Verify handoff was registered
        handoffs = handoff_registry.get_handoffs(execution_id=execution.execution_id)
        assert len(handoffs) > 0
        assert handoffs[0].from_agent == "agent-1"
        assert handoffs[0].to_agent == "agent-2"
        
        # Verify handoff_created event was emitted
        events = event_log.get_events(execution_id=execution.execution_id)
        handoff_events = [e for e in events if e.event_type == "handoff_created"]
        assert len(handoff_events) > 0
        assert handoff_events[0].data["from_agent"] == "agent-1"
        assert handoff_events[0].data["to_agent"] == "agent-2"
    
    def test_handoff_not_generated_when_never(self, workflow_executor, temp_dirs, event_log, mock_step_executor, handoff_registry):
        """Test that handoff is not generated when handoff_type is NEVER."""
        # Create workflow with NEVER handoff type
        workflow_def = WorkflowDefinition(
            workflow_id="test-workflow",
            name="Test Workflow",
            description="Test workflow",
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
                            agent_id="agent-1",
                            handoff_to="agent-2",
                            handoff_type=HandoffType.NEVER  # Never handoff
                        )
                    ]
                )
            ]
        )
        
        workflow_file = Path(temp_dirs["workflows"]) / "test-workflow.md"
        workflow_file.write_text("# Test Workflow\n\nVersion: 1.0\n")
        
        # Mock step executor
        from orchestration.step_executor import StepExecution as StepExecutionResult
        mock_step_executor.execute_step.return_value = StepExecutionResult(
            step_id="step-1",
            status=WorkflowStatus.COMPLETED,
            output_data={}
        )
        
        # Mock parser
        with patch.object(workflow_executor.parser, 'parse_workflow', return_value=workflow_def):
            execution = workflow_executor.start_workflow(
                workflow_id="test-workflow",
                input_data={}
            )
            
            workflow_executor.execute_workflow(execution.execution_id, workflow_def=workflow_def)
        
        # Verify no handoff was created
        handoffs = handoff_registry.get_handoffs(execution_id=execution.execution_id)
        assert len(handoffs) == 0
        
        # Verify no handoff_created event
        events = event_log.get_events(execution_id=execution.execution_id)
        handoff_events = [e for e in events if e.event_type == "handoff_created"]
        assert len(handoff_events) == 0
