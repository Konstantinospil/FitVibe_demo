"""
Tests for event log module.

Version: 1.0
Last Updated: 2025-12-12
"""

import pytest
import sys
import tempfile
import shutil
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from orchestration.event_log import EventLog, WorkflowEvent


class TestEventLog:
    """Tests for EventLog."""
    
    @pytest.fixture
    def temp_db(self):
        """Create temporary database for tests."""
        temp_path = Path(tempfile.mkdtemp())
        db_path = temp_path / "test_events.db"
        yield str(db_path)
        if db_path.exists():
            db_path.unlink()
        shutil.rmtree(temp_path)
    
    @pytest.fixture
    def event_log(self, temp_db):
        """Create EventLog instance with temp database."""
        return EventLog(db_path=temp_db)
    
    def test_append_event(self, event_log):
        """Test appending event to log."""
        event = WorkflowEvent(
            event_id="test-event-1",
            event_type="workflow_started",
            execution_id="exec-1",
            workflow_id="workflow-1",
            timestamp="2025-12-12T10:00:00Z",
            status="in_progress"
        )
        
        event_log.append_event(event)
        
        # Query events
        events = event_log.get_events(execution_id="exec-1")
        assert len(events) == 1
        assert events[0].event_id == "test-event-1"
        assert events[0].event_type == "workflow_started"
    
    def test_query_events_by_execution_id(self, event_log):
        """Test querying events by execution ID."""
        # Add multiple events
        for i in range(3):
            event = WorkflowEvent(
                event_id=f"event-{i}",
                event_type="step_started",
                execution_id="exec-1",
                workflow_id="workflow-1",
                timestamp=f"2025-12-12T10:00:{i:02d}Z",
                step_id=f"step-{i}",
                status="in_progress"
            )
            event_log.append_event(event)
        
        # Add event for different execution
        event = WorkflowEvent(
            event_id="event-other",
            event_type="step_started",
            execution_id="exec-2",
            workflow_id="workflow-1",
            timestamp="2025-12-12T10:00:10Z",
            status="in_progress"
        )
        event_log.append_event(event)
        
        # Query by execution_id
        events = event_log.get_events(execution_id="exec-1")
        assert len(events) == 3
        assert all(e.execution_id == "exec-1" for e in events)
    
    def test_query_events_by_event_type(self, event_log):
        """Test querying events by event type."""
        # Add different event types
        event_log.append_event(WorkflowEvent(
            event_id="event-1",
            event_type="workflow_started",
            execution_id="exec-1",
            workflow_id="workflow-1",
            timestamp="2025-12-12T10:00:00Z",
            status="in_progress"
        ))
        
        event_log.append_event(WorkflowEvent(
            event_id="event-2",
            event_type="step_started",
            execution_id="exec-1",
            workflow_id="workflow-1",
            timestamp="2025-12-12T10:00:01Z",
            status="in_progress"
        ))
        
        event_log.append_event(WorkflowEvent(
            event_id="event-3",
            event_type="step_completed",
            execution_id="exec-1",
            workflow_id="workflow-1",
            timestamp="2025-12-12T10:00:02Z",
            status="success"
        ))
        
        # Query by event type
        events = event_log.get_events(event_type="step_started")
        assert len(events) == 1
        assert events[0].event_type == "step_started"
    
    def test_query_events_by_workflow_id(self, event_log):
        """Test querying events by workflow ID."""
        # Add events for different workflows
        for workflow_id in ["workflow-1", "workflow-2"]:
            event_log.append_event(WorkflowEvent(
                event_id=f"event-{workflow_id}",
                event_type="workflow_started",
                execution_id=f"exec-{workflow_id}",
                workflow_id=workflow_id,
                timestamp="2025-12-12T10:00:00Z",
                status="in_progress"
            ))
        
        # Query by workflow_id
        events = event_log.get_events(workflow_id="workflow-1")
        assert len(events) == 1
        assert events[0].workflow_id == "workflow-1"
    
    def test_event_with_data(self, event_log):
        """Test event with data field."""
        event = WorkflowEvent(
            event_id="event-1",
            event_type="step_completed",
            execution_id="exec-1",
            workflow_id="workflow-1",
            timestamp="2025-12-12T10:00:00Z",
            status="success",
            data={"output": "test output", "duration_ms": 1000}
        )
        
        event_log.append_event(event)
        
        events = event_log.get_events(execution_id="exec-1")
        assert len(events) == 1
        assert events[0].data == {"output": "test output", "duration_ms": 1000}
    
    def test_event_with_error(self, event_log):
        """Test event with error field."""
        event = WorkflowEvent(
            event_id="event-1",
            event_type="step_failed",
            execution_id="exec-1",
            workflow_id="workflow-1",
            timestamp="2025-12-12T10:00:00Z",
            status="failed",
            error="Test error message"
        )
        
        event_log.append_event(event)
        
        events = event_log.get_events(execution_id="exec-1")
        assert len(events) == 1
        assert events[0].error == "Test error message"
    
    def test_replay_execution(self, event_log):
        """Test replaying execution from events."""
        # Add workflow lifecycle events
        events_to_add = [
            ("workflow_started", "2025-12-12T10:00:00Z"),
            ("phase_started", "2025-12-12T10:00:01Z"),
            ("step_started", "2025-12-12T10:00:02Z"),
            ("step_completed", "2025-12-12T10:00:03Z"),
            ("phase_completed", "2025-12-12T10:00:04Z"),
            ("workflow_completed", "2025-12-12T10:00:05Z"),
        ]
        
        for i, (event_type, timestamp) in enumerate(events_to_add):
            event_log.append_event(WorkflowEvent(
                event_id=f"event-{i}",
                event_type=event_type,
                execution_id="exec-1",
                workflow_id="workflow-1",
                timestamp=timestamp,
                status="success" if "completed" in event_type else "in_progress"
            ))
        
        # Replay execution
        execution = event_log.replay_execution("exec-1")
        
        assert execution is not None
        assert execution.execution_id == "exec-1"
        assert execution.workflow_id == "workflow-1"
        # Status should be COMPLETED since we have workflow_completed event
        from orchestration.workflow_models import WorkflowStatus
        assert execution.status == WorkflowStatus.COMPLETED
    
    def test_get_latest_events(self, event_log):
        """Test getting latest events."""
        # Add events with different timestamps
        for i in range(5):
            event_log.append_event(WorkflowEvent(
                event_id=f"event-{i}",
                event_type="step_started",
                execution_id=f"exec-{i}",
                workflow_id="workflow-1",
                timestamp=f"2025-12-12T10:00:{i:02d}Z",
                status="in_progress"
            ))
        
        # Get latest events
        latest = event_log.get_latest_events(limit=3)
        
        assert len(latest) == 3
        # Should be in descending order (newest first)
        assert latest[0].event_id == "event-4"
        assert latest[1].event_id == "event-3"
        assert latest[2].event_id == "event-2"
    
    def test_event_auto_timestamp(self, event_log):
        """Test that event gets timestamp if not provided."""
        event = WorkflowEvent(
            event_id="event-1",
            event_type="workflow_started",
            execution_id="exec-1",
            workflow_id="workflow-1",
            timestamp="",  # Empty timestamp
            status="in_progress"
        )
        
        event_log.append_event(event)
        
        events = event_log.get_events(execution_id="exec-1")
        assert len(events) == 1
        # Timestamp should be set
        assert events[0].timestamp
        assert "T" in events[0].timestamp  # ISO format
