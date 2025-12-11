"""
Tests for agent state management module.

Version: 1.0
Last Updated: 2025-01-21
"""

import pytest
import json
import sys
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from orchestration.agent_state import (
    AgentStateManager,
    AgentState,
    AgentExecution,
    WorkflowExecution,
    AgentStatus,
    WorkflowStatus,
)


class TestAgentStateManager:
    """Tests for AgentStateManager."""
    
    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory for tests."""
        temp_path = Path(tempfile.mkdtemp())
        yield temp_path
        shutil.rmtree(temp_path)
    
    @pytest.fixture
    def state_manager(self, temp_dir):
        """Create AgentStateManager with temp directory."""
        return AgentStateManager(
            state_dir=str(temp_dir / "states"),
            backup_dir=str(temp_dir / "backups"),
            max_versions=5
        )
    
    def test_save_and_load_state(self, state_manager):
        """Test saving and loading state."""
        execution = AgentExecution(
            agent_id="test-agent",
            status=AgentStatus.COMPLETE,
            started_at=datetime.utcnow().isoformat(),
            completed_at=datetime.utcnow().isoformat()
        )
        
        state = AgentState(
            state_id="test-state-1",
            state_type="agent",
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
            agent_execution=execution
        )
        
        # Save
        state_manager.save_state(state)
        
        # Load
        loaded = state_manager.load_state("test-state-1")
        
        assert loaded is not None
        assert loaded.state_id == "test-state-1"
        assert loaded.agent_execution.agent_id == "test-agent"
        assert loaded.agent_execution.status == AgentStatus.COMPLETE
    
    def test_state_versioning(self, state_manager):
        """Test state versioning."""
        execution = AgentExecution(
            agent_id="test-agent",
            status=AgentStatus.IN_PROGRESS,
            started_at=datetime.utcnow().isoformat()
        )
        
        state = AgentState(
            state_id="test-state-2",
            state_type="agent",
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
            agent_execution=execution
        )
        
        # Save multiple versions
        state_manager.save_state(state)
        state.version = 2
        state.updated_at = datetime.utcnow().isoformat()
        state_manager.save_state(state)
        
        # Load specific version
        loaded_v1 = state_manager.load_state("test-state-2", version=1)
        loaded_v2 = state_manager.load_state("test-state-2", version=2)
        
        assert loaded_v1 is not None
        assert loaded_v2 is not None
        assert loaded_v1.version == 1
        assert loaded_v2.version == 2
    
    def test_backup_and_restore(self, state_manager):
        """Test backup and restore."""
        execution = AgentExecution(
            agent_id="test-agent",
            status=AgentStatus.COMPLETE,
            started_at=datetime.utcnow().isoformat(),
            completed_at=datetime.utcnow().isoformat()
        )
        
        state = AgentState(
            state_id="test-state-3",
            state_type="agent",
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
            agent_execution=execution
        )
        
        # Save (creates backup)
        state_manager.save_state(state, create_backup=True)
        
        # Modify state
        state.agent_execution.status = AgentStatus.FAILED
        state_manager.save_state(state)
        
        # Restore from backup
        restored = state_manager.restore_state("test-state-3")
        assert restored is True
        
        # Verify restored state
        loaded = state_manager.load_state("test-state-3")
        assert loaded.agent_execution.status == AgentStatus.COMPLETE
    
    def test_list_states(self, state_manager):
        """Test listing states with filters."""
        # Create multiple states
        for i in range(3):
            execution = AgentExecution(
                agent_id=f"agent-{i}",
                status=AgentStatus.COMPLETE,
                started_at=datetime.utcnow().isoformat(),
                completed_at=datetime.utcnow().isoformat()
            )
            
            state = AgentState(
                state_id=f"state-{i}",
                state_type="agent",
                created_at=datetime.utcnow().isoformat(),
                updated_at=datetime.utcnow().isoformat(),
                agent_execution=execution
            )
            state_manager.save_state(state)
        
        # List all
        all_states = state_manager.list_states()
        assert len(all_states) == 3
        
        # Filter by agent
        filtered = state_manager.list_states(status="complete")
        assert len(filtered) == 3
















