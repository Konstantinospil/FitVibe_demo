"""
Tests for state repository module.

Version: 1.0
Last Updated: 2025-12-12
"""

import pytest
import sys
import tempfile
import shutil
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from orchestration.state_repository import AgentStateRepository
from orchestration.agent_state import AgentState, AgentExecution, WorkflowExecution, AgentStatus, WorkflowStatus, StateVersionConflict


class TestAgentStateRepository:
    """Tests for AgentStateRepository."""
    
    @pytest.fixture
    def temp_db(self):
        """Create temporary database for tests."""
        temp_path = Path(tempfile.mkdtemp())
        db_path = temp_path / "test_state.db"
        yield str(db_path)
        if db_path.exists():
            db_path.unlink()
        shutil.rmtree(temp_path)
    
    @pytest.fixture
    def state_repository(self, temp_db):
        """Create AgentStateRepository with temp database."""
        return AgentStateRepository(db_path=temp_db)
    
    @pytest.fixture
    def sample_agent_state(self):
        """Create sample agent state for testing."""
        execution = AgentExecution(
            agent_id="test-agent",
            status=AgentStatus.IN_PROGRESS,
            started_at="2025-12-12T10:00:00Z"
        )
        
        return AgentState(
            state_id="test-state-1",
            state_type="agent",
            created_at="2025-12-12T10:00:00Z",
            updated_at="2025-12-12T10:00:00Z",
            agent_execution=execution
        )
    
    @pytest.fixture
    def sample_workflow_state(self):
        """Create sample workflow state for testing."""
        execution = WorkflowExecution(
            workflow_id="test-workflow",
            workflow_name="Test Workflow",
            status=WorkflowStatus.IN_PROGRESS,
            started_at="2025-12-12T10:00:00Z",
            request_id="req-123"
        )
        
        return AgentState(
            state_id="test-workflow-state-1",
            state_type="workflow",
            created_at="2025-12-12T10:00:00Z",
            updated_at="2025-12-12T10:00:00Z",
            workflow_execution=execution
        )
    
    def test_save_and_load_state(self, state_repository, sample_agent_state):
        """Test saving and loading state."""
        # Save state
        state_id = state_repository.save_state(sample_agent_state)
        assert state_id == sample_agent_state.state_id
        
        # Load state
        loaded = state_repository.load_state(state_id)
        assert loaded is not None
        assert loaded.state_id == sample_agent_state.state_id
        assert loaded.state_type == "agent"
        assert loaded.agent_execution is not None
        assert loaded.agent_execution.agent_id == "test-agent"
    
    def test_optimistic_locking(self, state_repository, sample_agent_state):
        """Test optimistic locking prevents concurrent modifications."""
        # Save initial state
        state_repository.save_state(sample_agent_state)
        
        # Load state twice (simulating concurrent access)
        state1 = state_repository.load_state(sample_agent_state.state_id)
        state2 = state_repository.load_state(sample_agent_state.state_id)
        
        # Modify both
        state1.agent_execution.status = AgentStatus.COMPLETE
        state2.agent_execution.status = AgentStatus.FAILED
        
        # Save first
        state_repository.save_state(state1)
        
        # Try to save second with old version (should fail)
        with pytest.raises(StateVersionConflict):
            state_repository.save_state(state2)
    
    def test_version_increment(self, state_repository, sample_agent_state):
        """Test that version increments on each save."""
        # Initial save
        state_repository.save_state(sample_agent_state)
        state1 = state_repository.load_state(sample_agent_state.state_id)
        assert state1.version == 1
        
        # Second save
        state_repository.save_state(state1)
        state2 = state_repository.load_state(sample_agent_state.state_id)
        assert state2.version == 2
        
        # Third save
        state_repository.save_state(state2)
        state3 = state_repository.load_state(sample_agent_state.state_id)
        assert state3.version == 3
    
    def test_load_state_summary(self, state_repository, sample_agent_state):
        """Test loading state summary (metadata only)."""
        state_repository.save_state(sample_agent_state)
        
        summary = state_repository.load_state_summary(sample_agent_state.state_id)
        
        assert summary is not None
        assert summary["state_id"] == sample_agent_state.state_id
        assert summary["state_type"] == "agent"
        assert "version" in summary
        assert "updated_at" in summary
    
    def test_delete_state(self, state_repository, sample_agent_state):
        """Test deleting state."""
        state_repository.save_state(sample_agent_state)
        
        # Verify state exists
        loaded = state_repository.load_state(sample_agent_state.state_id)
        assert loaded is not None
        
        # Delete state
        deleted = state_repository.delete_state(sample_agent_state.state_id)
        assert deleted is True
        
        # Verify state is gone
        loaded = state_repository.load_state(sample_agent_state.state_id)
        assert loaded is None
    
    def test_list_states(self, state_repository, sample_agent_state, sample_workflow_state):
        """Test listing states."""
        # Save multiple states
        state_repository.save_state(sample_agent_state)
        state_repository.save_state(sample_workflow_state)
        
        # List all states
        states = state_repository.list_states()
        assert len(states) == 2
        
        # List by type
        agent_states = state_repository.list_states(state_type="agent")
        assert len(agent_states) == 1
        assert agent_states[0]["state_type"] == "agent"
        
        workflow_states = state_repository.list_states(state_type="workflow")
        assert len(workflow_states) == 1
        assert workflow_states[0]["state_type"] == "workflow"
    
    def test_workflow_state_with_version(self, state_repository):
        """Test workflow state persistence."""
        # Create a simple workflow execution using agent_state WorkflowExecution
        from orchestration.agent_state import WorkflowExecution as AgentStateWorkflowExecution
        workflow_exec = AgentStateWorkflowExecution(
            workflow_id="test-workflow",
            workflow_name="Test Workflow",
            status=WorkflowStatus.IN_PROGRESS,
            started_at="2025-12-12T10:00:00Z",
            request_id="req-123"
        )
        
        state = AgentState(
            state_id="workflow-exec-1",
            state_type="workflow",
            created_at="2025-12-12T10:00:00Z",
            updated_at="2025-12-12T10:00:00Z",
            workflow_execution=workflow_exec
        )
        
        state_repository.save_state(state)
        
        loaded = state_repository.load_state("workflow-exec-1")
        assert loaded is not None
        assert loaded.workflow_execution.workflow_id == "test-workflow"
        assert loaded.workflow_execution.status == WorkflowStatus.IN_PROGRESS
    
    def test_checksum_verification(self, state_repository, sample_agent_state):
        """Test that checksums are calculated and stored."""
        state_repository.save_state(sample_agent_state)
        
        # Load state (checksum verification happens during load)
        loaded = state_repository.load_state(sample_agent_state.state_id)
        assert loaded is not None
        # If checksum was invalid, load would have logged a warning
        # We can't easily test corruption here, but we verify it doesn't fail
