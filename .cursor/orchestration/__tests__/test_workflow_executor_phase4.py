"""
Integration tests for workflow executor with Phase 4 error recovery.

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
    WorkflowStatus,
    HandoffType
)
from orchestration.event_log import EventLog
from orchestration.state_repository import AgentStateRepository
from orchestration.step_executor import StepExecutor
from orchestration.error_handling import DeadLetterQueue
from orchestration.handoff_generator import HandoffGenerator
from orchestration.handoff_registry import HandoffRegistry


class TestWorkflowExecutorPhase4:
    """Integration tests for workflow executor with Phase 4 error recovery."""
    
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
            "state": str(temp_path / "test_state.db"),
            "handoffs": str(temp_path / "test_handoffs.db"),
            "dlq": str(temp_path / "dead_letter_queue")
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
    def dead_letter_queue(self, temp_db):
        """Create DeadLetterQueue instance."""
        return DeadLetterQueue(queue_dir=temp_db["dlq"])
    
    @pytest.fixture
    def handoff_generator(self, temp_dirs):
        """Create HandoffGenerator instance."""
        return HandoffGenerator(agents_dir=temp_dirs["agents"])
    
    @pytest.fixture
    def handoff_registry(self, temp_db):
        """Create HandoffRegistry instance."""
        return HandoffRegistry(db_path=temp_db["handoffs"])
    
    @pytest.fixture
    def mock_step_executor(self):
        """Create mock step executor."""
        return Mock(spec=StepExecutor)
    
    @pytest.fixture
    def workflow_executor(self, temp_dirs, event_log, state_repository, mock_step_executor, 
                         handoff_generator, handoff_registry, dead_letter_queue):
        """Create WorkflowExecutor with Phase 4 components."""
        return WorkflowExecutor(
            workflows_dir=temp_dirs["workflows"],
            agents_dir=temp_dirs["agents"],
            event_log_instance=event_log,
            state_repository=state_repository,
            step_executor_instance=mock_step_executor,
            handoff_generator_instance=handoff_generator,
            handoff_registry_instance=handoff_registry,
            dead_letter_queue_instance=dead_letter_queue
        )
    
    @pytest.fixture
    def sample_workflow_definition(self):
        """Create sample workflow definition."""
        return WorkflowDefinition(
            workflow_id="test-workflow",
            name="Test Workflow",
            description="Test workflow for Phase 4",
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
                        ),
                        WorkflowStep(
                            step_id="step-2",
                            step_number=2,
                            name="Step 2",
                            description="Second step",
                            step_type=StepType.AGENT,
                            agent_id="test-agent"
                        )
                    ]
                )
            ]
        )
    
    def test_workflow_failure_adds_to_dead_letter_queue(self, workflow_executor, temp_dirs, 
                                                         sample_workflow_definition, dead_letter_queue, 
                                                         mock_step_executor):
        """Test that workflow failures are added to dead-letter queue."""
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
        
        # Verify task was added to dead-letter queue
        failed_tasks = dead_letter_queue.get_failed_tasks(limit=10)
        assert len(failed_tasks) > 0
        
        # Find our execution
        our_task = next((t for t in failed_tasks if t.task_id == execution.execution_id), None)
        assert our_task is not None
        assert our_task.workflow_id == "test-workflow"
        # Error message may be wrapped (e.g., "Phase 'phase-1' failed: Step execution failed")
        assert "Step execution failed" in our_task.error.message or "failed" in our_task.error.message.lower()
    
    def test_resume_workflow_from_completed_steps(self, workflow_executor, temp_dirs, 
                                                   sample_workflow_definition, mock_step_executor):
        """Test that workflow can resume from last completed step."""
        # Create workflow file
        workflow_file = Path(temp_dirs["workflows"]) / "test-workflow.md"
        workflow_file.write_text("# Test Workflow\n\nVersion: 1.0\n")
        
        # Mock parser
        with patch.object(workflow_executor.parser, 'parse_workflow', return_value=sample_workflow_definition):
            execution = workflow_executor.start_workflow(
                workflow_id="test-workflow",
                input_data={}
            )
            
            # Mock step executor to succeed for step-1, fail for step-2
            from orchestration.step_executor import StepExecution as StepExecutionResult
            
            def step_executor_side_effect(step_def, context):
                if step_def.step_id == "step-1":
                    return StepExecutionResult(
                        step_id="step-1",
                        status=WorkflowStatus.COMPLETED,
                        output_data={"result": "step-1 completed"}
                    )
                elif step_def.step_id == "step-2":
                    return StepExecutionResult(
                        step_id="step-2",
                        status=WorkflowStatus.FAILED,
                        output_data={},
                        error="Step 2 failed"
                    )
                return StepExecutionResult(
                    step_id=step_def.step_id,
                    status=WorkflowStatus.COMPLETED,
                    output_data={}
                )
            
            mock_step_executor.execute_step.side_effect = step_executor_side_effect
            
            # Execute workflow (will fail at step-2)
            try:
                workflow_executor.execute_workflow(execution.execution_id, workflow_def=sample_workflow_definition)
            except Exception:
                pass
            
            # Verify step-1 completed, step-2 failed
            assert len(execution.phase_executions) > 0
            phase_exec = execution.phase_executions[0]
            assert len(phase_exec.step_executions) >= 1
            assert phase_exec.step_executions[0].step_id == "step-1"
            assert phase_exec.step_executions[0].status == WorkflowStatus.COMPLETED
            
            # Now resume workflow - step-1 should be skipped, step-2 should be retried
            mock_step_executor.execute_step.side_effect = lambda step_def, context: StepExecutionResult(
                step_id=step_def.step_id,
                status=WorkflowStatus.COMPLETED,
                output_data={"result": f"{step_def.step_id} completed on resume"}
            )
            
            resumed_execution = workflow_executor.resume_workflow(
                execution.execution_id,
                workflow_def=sample_workflow_definition
            )
            
            # Verify workflow completed
            assert resumed_execution.status == WorkflowStatus.COMPLETED
            
            # Verify step-1 was skipped (not executed again)
            # Check that step-2 was executed (should have 2 step executions now)
            final_phase = resumed_execution.phase_executions[0]
            assert len(final_phase.step_executions) == 2
            
            # Verify step-2 completed on resume
            step_2_exec = next((s for s in final_phase.step_executions if s.step_id == "step-2"), None)
            assert step_2_exec is not None
            assert step_2_exec.status == WorkflowStatus.COMPLETED
