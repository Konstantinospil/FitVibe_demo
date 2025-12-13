"""
Event Log - Persistent event log for workflow events using SQLite.

This module provides an append-only event log for tracking workflow execution events.
Uses SQLite for efficient querying and event replay.

Version: 1.0
Last Updated: 2025-12-12
"""

import json
import logging
import sqlite3
import subprocess
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

from .workflow_models import WorkflowExecution as WorkflowExecutionModel

logger = logging.getLogger(__name__)


@dataclass
class WorkflowEvent:
    """Represents a workflow execution event."""
    event_id: str
    event_type: str  # step_started, step_completed, handoff_created, etc.
    execution_id: str
    workflow_id: str
    timestamp: str = ""  # ISO 8601 - will be set by append_event if empty
    step_id: Optional[str] = None
    phase_id: Optional[str] = None
    agent_id: Optional[str] = None
    status: str = "in_progress"  # success, failed, in_progress
    data: Dict[str, Any] = None  # Event-specific data
    error: Optional[str] = None
    
    def __post_init__(self):
        """Initialize default values."""
        if self.data is None:
            self.data = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "WorkflowEvent":
        """Create event from dictionary."""
        return cls(**data)


class EventLog:
    """
    Persistent event log for workflow events using SQLite.
    
    Features:
    - Append-only event storage
    - Efficient querying with indexes
    - Event replay capability
    - Automatic database initialization
    """
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize event log.
        
        Args:
            db_path: Path to SQLite database file (default: .cursor/data/workflow_events.db)
        """
        # Load from config if available
        try:
            from .config_loader import config_loader
            workflow_config = config_loader.get_section("workflow_engine") or {}
            default_path = workflow_config.get("event_log_db_path", ".cursor/data/workflow_events.db")
        except ImportError:
            default_path = ".cursor/data/workflow_events.db"
        
        self.db_path = Path(db_path or default_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        self._init_db()
        
        logger.info(f"EventLog initialized with database: {self.db_path}")
    
    def _init_db(self):
        """Initialize SQLite database schema."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS workflow_events (
                    event_id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    execution_id TEXT NOT NULL,
                    workflow_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    step_id TEXT,
                    phase_id TEXT,
                    agent_id TEXT,
                    status TEXT NOT NULL,
                    data TEXT,
                    error TEXT
                )
            """)
            
            # Create indexes for efficient querying
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_execution_id 
                ON workflow_events(execution_id)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_timestamp 
                ON workflow_events(timestamp)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_event_type 
                ON workflow_events(event_type)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_workflow_id 
                ON workflow_events(workflow_id)
            """)
            
            conn.commit()
    
    def _get_current_timestamp(self) -> str:
        """
        Get current UTC timestamp (NEVER hardcode dates).
        
        Returns:
            ISO 8601 formatted timestamp string
        """
        result = subprocess.run(
            ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            return result.stdout.strip()
        # Fallback to Python datetime if date command fails
        return datetime.utcnow().isoformat() + 'Z'
    
    def append_event(self, event: WorkflowEvent) -> None:
        """
        Append event to log (append-only).
        
        Args:
            event: WorkflowEvent to append
        """
        # Ensure event has ID and timestamp
        if not event.event_id:
            event.event_id = str(uuid.uuid4())
        if not event.timestamp:
            event.timestamp = self._get_current_timestamp()
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO workflow_events 
                (event_id, event_type, execution_id, workflow_id, timestamp,
                 step_id, phase_id, agent_id, status, data, error)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id,
                event.event_type,
                event.execution_id,
                event.workflow_id,
                event.timestamp,
                event.step_id,
                event.phase_id,
                event.agent_id,
                event.status,
                json.dumps(event.data) if event.data else None,
                event.error
            ))
            conn.commit()
        
        logger.debug(f"Event appended: {event.event_type} for execution {event.execution_id}")
    
    def get_events(
        self,
        execution_id: Optional[str] = None,
        event_type: Optional[str] = None,
        workflow_id: Optional[str] = None,
        limit: int = 100
    ) -> List[WorkflowEvent]:
        """
        Query events with filters.
        
        Args:
            execution_id: Filter by execution ID
            event_type: Filter by event type
            workflow_id: Filter by workflow ID
            limit: Maximum number of events to return
        
        Returns:
            List of WorkflowEvent objects
        """
        query = "SELECT * FROM workflow_events WHERE 1=1"
        params = []
        
        if execution_id:
            query += " AND execution_id = ?"
            params.append(execution_id)
        
        if event_type:
            query += " AND event_type = ?"
            params.append(event_type)
        
        if workflow_id:
            query += " AND workflow_id = ?"
            params.append(workflow_id)
        
        query += " ORDER BY timestamp ASC LIMIT ?"
        params.append(limit)
        
        events = []
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(query, params).fetchall()
            
            for row in rows:
                event = WorkflowEvent(
                    event_id=row["event_id"],
                    event_type=row["event_type"],
                    execution_id=row["execution_id"],
                    workflow_id=row["workflow_id"],
                    timestamp=row["timestamp"],
                    step_id=row["step_id"],
                    phase_id=row["phase_id"],
                    agent_id=row["agent_id"],
                    status=row["status"],
                    data=json.loads(row["data"]) if row["data"] else {},
                    error=row["error"]
                )
                events.append(event)
        
        return events
    
    def replay_execution(self, execution_id: str) -> Optional[WorkflowExecutionModel]:
        """
        Reconstruct execution from events.
        
        Args:
            execution_id: Execution ID to replay
        
        Returns:
            Reconstructed WorkflowExecution or None if not found
        """
        events = self.get_events(execution_id=execution_id, limit=10000)
        
        if not events:
            return None
        
        # Sort by timestamp
        events.sort(key=lambda e: e.timestamp)
        
        # Find workflow_started event
        started_event = next((e for e in events if e.event_type == "workflow_started"), None)
        if not started_event:
            logger.warning(f"No workflow_started event found for execution {execution_id}")
            return None
        
        # Reconstruct execution state from events
        # This is a simplified reconstruction - full implementation would
        # need to track all state changes
        from .workflow_models import WorkflowStatus
        
        # Get workflow version from started event data or default to "1.0"
        workflow_version = started_event.data.get("workflow_version", "1.0") if started_event.data else "1.0"
        
        execution = WorkflowExecutionModel(
            execution_id=execution_id,
            workflow_id=started_event.workflow_id,
            workflow_version=workflow_version,
            status=WorkflowStatus.COMPLETED if any(
                e.event_type == "workflow_completed" for e in events
            ) else WorkflowStatus.FAILED if any(
                e.event_type == "workflow_failed" for e in events
            ) else WorkflowStatus.RUNNING,
            started_at=started_event.timestamp,
            # Additional fields would be reconstructed from events
        )
        
        return execution
    
    def get_latest_events(
        self,
        workflow_id: Optional[str] = None,
        limit: int = 100
    ) -> List[WorkflowEvent]:
        """
        Get latest events across all executions.
        
        Args:
            workflow_id: Optional filter by workflow ID
            limit: Maximum number of events to return
        
        Returns:
            List of latest WorkflowEvent objects
        """
        query = "SELECT * FROM workflow_events WHERE 1=1"
        params = []
        
        if workflow_id:
            query += " AND workflow_id = ?"
            params.append(workflow_id)
        
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        events = []
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(query, params).fetchall()
            
            for row in rows:
                event = WorkflowEvent(
                    event_id=row["event_id"],
                    event_type=row["event_type"],
                    execution_id=row["execution_id"],
                    workflow_id=row["workflow_id"],
                    timestamp=row["timestamp"],
                    step_id=row["step_id"],
                    phase_id=row["phase_id"],
                    agent_id=row["agent_id"],
                    status=row["status"],
                    data=json.loads(row["data"]) if row["data"] else {},
                    error=row["error"]
                )
                events.append(event)
        
        return events


# Global instance for easy access
event_log = EventLog()
