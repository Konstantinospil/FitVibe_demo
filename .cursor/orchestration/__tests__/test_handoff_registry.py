"""
Unit tests for handoff registry.

Version: 1.0
Last Updated: 2025-12-12
"""

import pytest
import sys
import tempfile
import shutil
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from orchestration.handoff_registry import HandoffRegistry
from orchestration.agent_state import HandoffRecord


class TestHandoffRegistry:
    """Unit tests for HandoffRegistry."""
    
    @pytest.fixture
    def temp_db(self):
        """Create temporary database path."""
        temp_path = Path(tempfile.mkdtemp())
        db_path = temp_path / "test_handoffs.db"
        
        yield str(db_path)
        
        shutil.rmtree(temp_path)
    
    @pytest.fixture
    def registry(self, temp_db):
        """Create HandoffRegistry instance."""
        return HandoffRegistry(db_path=temp_db)
    
    @pytest.fixture
    def sample_handoff(self):
        """Create sample handoff."""
        return HandoffRecord(
            handoff_id="handoff-123",
            from_agent="agent-1",
            to_agent="agent-2",
            timestamp="2025-12-12T00:00:00Z",
            handoff_type="standard",
            status="pending",
            work_summary="Test handoff",
            deliverables=["file1.txt"]
        )
    
    def test_register_handoff(self, registry, sample_handoff):
        """Test registering a handoff."""
        registry.register_handoff(
            sample_handoff,
            execution_id="exec-123",
            workflow_id="workflow-1"
        )
        
        # Verify handoff can be retrieved
        handoff = registry.get_handoff(sample_handoff.handoff_id)
        assert handoff is not None
        assert handoff.handoff_id == sample_handoff.handoff_id
        assert handoff.from_agent == "agent-1"
        assert handoff.to_agent == "agent-2"
    
    def test_get_handoffs_by_execution_id(self, registry, sample_handoff):
        """Test querying handoffs by execution_id."""
        registry.register_handoff(
            sample_handoff,
            execution_id="exec-123",
            workflow_id="workflow-1"
        )
        
        handoffs = registry.get_handoffs(execution_id="exec-123")
        assert len(handoffs) == 1
        assert handoffs[0].handoff_id == sample_handoff.handoff_id
    
    def test_get_handoffs_by_status(self, registry, sample_handoff):
        """Test querying handoffs by status."""
        registry.register_handoff(
            sample_handoff,
            execution_id="exec-123",
            workflow_id="workflow-1"
        )
        
        handoffs = registry.get_handoffs(status="pending")
        assert len(handoffs) == 1
        assert handoffs[0].status == "pending"
    
    def test_update_handoff_status(self, registry, sample_handoff):
        """Test updating handoff status."""
        registry.register_handoff(
            sample_handoff,
            execution_id="exec-123",
            workflow_id="workflow-1"
        )
        
        # Update status
        success = registry.update_handoff_status(sample_handoff.handoff_id, "complete")
        assert success is True
        
        # Verify status updated
        handoff = registry.get_handoff(sample_handoff.handoff_id)
        assert handoff.status == "complete"
    
    def test_update_handoff_status_invalid(self, registry):
        """Test updating handoff status with invalid status."""
        with pytest.raises(ValueError, match="Invalid status"):
            registry.update_handoff_status("handoff-123", "invalid_status")
    
    def test_update_handoff_status_not_found(self, registry):
        """Test updating non-existent handoff."""
        success = registry.update_handoff_status("non-existent", "complete")
        assert success is False
    
    def test_get_handoff_stats(self, registry, sample_handoff):
        """Test getting handoff statistics."""
        registry.register_handoff(
            sample_handoff,
            execution_id="exec-123",
            workflow_id="workflow-1"
        )
        
        stats = registry.get_handoff_stats(execution_id="exec-123")
        assert stats["total"] == 1
        assert stats["pending"] == 1
        assert stats["by_status"]["pending"] == 1
    
    def test_get_handoff_not_found(self, registry):
        """Test getting non-existent handoff."""
        handoff = registry.get_handoff("non-existent")
        assert handoff is None
