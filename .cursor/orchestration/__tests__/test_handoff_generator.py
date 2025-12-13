"""
Unit tests for handoff generator.

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

from orchestration.handoff_generator import HandoffGenerator
from orchestration.agent_state import HandoffRecord
from orchestration.workflow_models import WorkflowStep, WorkflowExecution, StepType, HandoffType, WorkflowStatus
from orchestration.step_executor import StepExecution


class TestHandoffGenerator:
    """Unit tests for HandoffGenerator."""
    
    @pytest.fixture
    def temp_dirs(self):
        """Create temporary directories for tests."""
        temp_path = Path(tempfile.mkdtemp())
        agents_dir = temp_path / "agents"
        handoffs_dir = temp_path / "handoffs"
        agents_dir.mkdir()
        handoffs_dir.mkdir()
        
        # Create a dummy agent file
        (agents_dir / "test-agent.md").write_text("# Test Agent\n")
        (agents_dir / "next-agent.md").write_text("# Next Agent\n")
        
        yield {
            "agents": str(agents_dir),
            "handoffs": str(handoffs_dir),
            "temp": temp_path
        }
        
        shutil.rmtree(temp_path)
    
    @pytest.fixture
    def handoff_generator(self, temp_dirs):
        """Create HandoffGenerator instance."""
        return HandoffGenerator(
            agents_dir=temp_dirs["agents"],
            handoffs_dir=temp_dirs["handoffs"]
        )
    
    @pytest.fixture
    def sample_step_execution(self):
        """Create sample step execution."""
        return StepExecution(
            step_id="step-1",
            status=WorkflowStatus.COMPLETED,
            output_data={
                "summary": "Step completed successfully",
                "deliverables": ["file1.txt", "file2.txt"],
                "notes": "All tests passed"
            }
        )
    
    @pytest.fixture
    def sample_step_definition(self):
        """Create sample step definition."""
        return WorkflowStep(
            step_id="step-1",
            step_number=1,
            name="Test Step",
            description="A test step",
            step_type=StepType.AGENT,
            agent_id="test-agent",
            handoff_to="next-agent",
            handoff_type=HandoffType.ALWAYS
        )
    
    @pytest.fixture
    def sample_workflow_execution(self):
        """Create sample workflow execution."""
        return WorkflowExecution(
            execution_id="exec-123",
            workflow_id="test-workflow",
            workflow_version="1.0",
            status=WorkflowStatus.RUNNING,
            started_at="2025-12-12T00:00:00Z",
            metadata={"request_id": "req-123"}
        )
    
    def test_generate_handoff(self, handoff_generator, sample_step_execution, sample_step_definition, sample_workflow_execution):
        """Test handoff generation."""
        handoff = handoff_generator.generate_handoff(
            sample_step_execution,
            sample_step_definition,
            sample_workflow_execution
        )
        
        assert handoff.from_agent == "test-agent"
        assert handoff.to_agent == "next-agent"
        assert handoff.status == "pending"
        assert handoff.handoff_type == "standard"
        assert handoff.work_summary == "Step completed successfully"
        assert len(handoff.deliverables) == 2
        assert handoff.handoff_id is not None
        assert handoff.timestamp is not None
    
    def test_generate_handoff_missing_handoff_to(self, handoff_generator, sample_step_execution, sample_workflow_execution):
        """Test handoff generation fails when handoff_to is missing."""
        step_def = WorkflowStep(
            step_id="step-1",
            step_number=1,
            name="Test Step",
            description="A test step",
            step_type=StepType.AGENT,
            agent_id="test-agent",
            handoff_to=None,  # No handoff_to
            handoff_type=HandoffType.ALWAYS
        )
        
        with pytest.raises(ValueError, match="no handoff_to specified"):
            handoff_generator.generate_handoff(
                sample_step_execution,
                step_def,
                sample_workflow_execution
            )
    
    def test_validate_handoff_valid(self, handoff_generator, sample_step_execution, sample_step_definition, sample_workflow_execution):
        """Test handoff validation with valid handoff."""
        handoff = handoff_generator.generate_handoff(
            sample_step_execution,
            sample_step_definition,
            sample_workflow_execution
        )
        
        errors = handoff_generator.validate_handoff(handoff)
        assert len(errors) == 0
    
    def test_validate_handoff_missing_agent(self, handoff_generator):
        """Test handoff validation with non-existent agent."""
        handoff = HandoffRecord(
            handoff_id="test-id",
            from_agent="test-agent",
            to_agent="non-existent-agent",
            timestamp="2025-12-12T00:00:00Z",
            handoff_type="standard",
            status="pending",
            work_summary="Test"
        )
        
        errors = handoff_generator.validate_handoff(handoff)
        assert len(errors) > 0
        assert any("non-existent-agent" in error for error in errors)
    
    def test_validate_handoff_invalid_type(self, handoff_generator):
        """Test handoff validation with invalid handoff_type."""
        handoff = HandoffRecord(
            handoff_id="test-id",
            from_agent="test-agent",
            to_agent="next-agent",
            timestamp="2025-12-12T00:00:00Z",
            handoff_type="invalid_type",
            status="pending",
            work_summary="Test"
        )
        
        errors = handoff_generator.validate_handoff(handoff)
        assert len(errors) > 0
        assert any("Invalid handoff_type" in error for error in errors)
    
    def test_save_handoff(self, handoff_generator, sample_step_execution, sample_step_definition, sample_workflow_execution, temp_dirs):
        """Test saving handoff to file."""
        handoff = handoff_generator.generate_handoff(
            sample_step_execution,
            sample_step_definition,
            sample_workflow_execution
        )
        
        handoff_path = handoff_generator.save_handoff(handoff)
        
        assert Path(handoff_path).exists()
        assert handoff.handoff_id in handoff_path
        
        # Verify file contents
        import json
        with open(handoff_path, 'r') as f:
            data = json.load(f)
            assert data["handoff_id"] == handoff.handoff_id
            assert data["from_agent"] == "test-agent"
            assert data["to_agent"] == "next-agent"
    
    def test_save_handoff_invalid(self, handoff_generator, temp_dirs):
        """Test saving invalid handoff fails."""
        handoff = HandoffRecord(
            handoff_id="test-id",
            from_agent="test-agent",
            to_agent="non-existent-agent",  # Invalid agent
            timestamp="2025-12-12T00:00:00Z",
            handoff_type="standard",
            status="pending",
            work_summary="Test"
        )
        
        with pytest.raises(ValueError, match="validation failed"):
            handoff_generator.save_handoff(handoff)
    
    def test_generate_and_save_handoff(self, handoff_generator, sample_step_execution, sample_step_definition, sample_workflow_execution, temp_dirs):
        """Test generate and save in one call."""
        handoff_path = handoff_generator.generate_and_save_handoff(
            sample_step_execution,
            sample_step_definition,
            sample_workflow_execution
        )
        
        assert Path(handoff_path).exists()
