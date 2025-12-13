"""
Handoff Registry - Tracks and manages handoffs between agents.

This module provides a registry for tracking handoff status, querying handoffs
by execution or status, and updating handoff states.

Version: 1.0
Last Updated: 2025-12-12
"""

import logging
import sqlite3
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import asdict

from .agent_state import HandoffRecord

logger = logging.getLogger(__name__)


class HandoffRegistry:
    """
    Registry for tracking handoffs between agents.
    
    Uses SQLite for persistence and querying.
    """
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize handoff registry.
        
        Args:
            db_path: Path to SQLite database (default: .cursor/data/handoff_registry.db)
        """
        if db_path is None:
            default_path = ".cursor/data/handoff_registry.db"
        else:
            default_path = db_path
        
        self.db_path = Path(default_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        self._init_db()
        
        logger.info(f"HandoffRegistry initialized with database: {self.db_path}")
    
    def _init_db(self):
        """Initialize SQLite database schema."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS handoffs (
                    handoff_id TEXT PRIMARY KEY,
                    execution_id TEXT NOT NULL,
                    workflow_id TEXT NOT NULL,
                    from_agent TEXT NOT NULL,
                    to_agent TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    handoff_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    handoff_data TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            
            # Create indexes for efficient querying
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_execution_id 
                ON handoffs(execution_id)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_workflow_id 
                ON handoffs(workflow_id)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_status 
                ON handoffs(status)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_to_agent 
                ON handoffs(to_agent)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_timestamp 
                ON handoffs(timestamp)
            """)
            
            conn.commit()
    
    def _get_current_timestamp(self) -> str:
        """
        Get current UTC timestamp (NEVER hardcode dates).
        
        Returns:
            ISO 8601 formatted timestamp string
        """
        import subprocess
        result = subprocess.run(
            ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            return result.stdout.strip()
        # Fallback to Python datetime if date command fails
        from datetime import datetime
        return datetime.utcnow().isoformat() + 'Z'
    
    def register_handoff(
        self,
        handoff: HandoffRecord,
        execution_id: str,
        workflow_id: str
    ) -> None:
        """
        Register handoff in registry.
        
        Args:
            handoff: HandoffRecord to register
            execution_id: Workflow execution ID
            workflow_id: Workflow ID
        """
        timestamp = self._get_current_timestamp()
        
        # Serialize handoff data
        handoff_dict = asdict(handoff)
        handoff_json = json.dumps(handoff_dict, indent=2, sort_keys=True)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO handoffs
                (handoff_id, execution_id, workflow_id, from_agent, to_agent,
                 timestamp, handoff_type, status, handoff_data, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                handoff.handoff_id,
                execution_id,
                workflow_id,
                handoff.from_agent,
                handoff.to_agent,
                handoff.timestamp,
                handoff.handoff_type,
                handoff.status,
                handoff_json,
                timestamp,
                timestamp
            ))
            conn.commit()
        
        logger.debug(f"Registered handoff {handoff.handoff_id} for execution {execution_id}")
    
    def get_handoffs(
        self,
        execution_id: Optional[str] = None,
        workflow_id: Optional[str] = None,
        status: Optional[str] = None,
        to_agent: Optional[str] = None,
        limit: int = 100
    ) -> List[HandoffRecord]:
        """
        Query handoffs by various filters.
        
        Args:
            execution_id: Filter by execution ID
            workflow_id: Filter by workflow ID
            status: Filter by status
            to_agent: Filter by target agent
            limit: Maximum number of results
        
        Returns:
            List of HandoffRecord objects
        """
        query = "SELECT handoff_data FROM handoffs WHERE 1=1"
        params = []
        
        if execution_id:
            query += " AND execution_id = ?"
            params.append(execution_id)
        
        if workflow_id:
            query += " AND workflow_id = ?"
            params.append(workflow_id)
        
        if status:
            query += " AND status = ?"
            params.append(status)
        
        if to_agent:
            query += " AND to_agent = ?"
            params.append(to_agent)
        
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        handoffs = []
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(query, params).fetchall()
            
            for (handoff_json,) in rows:
                try:
                    handoff_dict = json.loads(handoff_json)
                    handoff = HandoffRecord(**handoff_dict)
                    handoffs.append(handoff)
                except (json.JSONDecodeError, TypeError, KeyError) as e:
                    logger.warning(f"Error deserializing handoff: {e}")
                    continue
        
        return handoffs
    
    def get_handoff(self, handoff_id: str) -> Optional[HandoffRecord]:
        """
        Get a specific handoff by ID.
        
        Args:
            handoff_id: Handoff ID
        
        Returns:
            HandoffRecord if found, None otherwise
        """
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute("""
                SELECT handoff_data FROM handoffs WHERE handoff_id = ?
            """, (handoff_id,)).fetchone()
            
            if not row:
                return None
            
            try:
                handoff_dict = json.loads(row[0])
                handoff = HandoffRecord(**handoff_dict)
                return handoff
            except (json.JSONDecodeError, TypeError, KeyError) as e:
                logger.warning(f"Error deserializing handoff {handoff_id}: {e}")
                return None
    
    def update_handoff_status(self, handoff_id: str, status: str) -> bool:
        """
        Update handoff status.
        
        Args:
            handoff_id: Handoff ID
            status: New status
        
        Returns:
            True if updated, False if handoff not found
        """
        # Validate status
        valid_statuses = ["pending", "in_progress", "complete", "blocked", "failed"]
        if status not in valid_statuses:
            raise ValueError(f"Invalid status: {status}. Must be one of {valid_statuses}")
        
        updated_at = self._get_current_timestamp()
        
        with sqlite3.connect(self.db_path) as conn:
            # First, get the current handoff data
            row = conn.execute("""
                SELECT handoff_data FROM handoffs WHERE handoff_id = ?
            """, (handoff_id,)).fetchone()
            
            if not row:
                logger.warning(f"Handoff {handoff_id} not found for status update")
                return False
            
            # Update the handoff data JSON with new status
            try:
                handoff_dict = json.loads(row[0])
                handoff_dict["status"] = status
                updated_handoff_json = json.dumps(handoff_dict, indent=2, sort_keys=True)
            except (json.JSONDecodeError, KeyError) as e:
                logger.error(f"Error updating handoff data for {handoff_id}: {e}")
                # Still update the status column even if JSON update fails
                updated_handoff_json = row[0]
            
            # Update both status column and handoff_data JSON
            cursor = conn.execute("""
                UPDATE handoffs
                SET status = ?, updated_at = ?, handoff_data = ?
                WHERE handoff_id = ?
            """, (status, updated_at, updated_handoff_json, handoff_id))
            
            conn.commit()
            
            if cursor.rowcount > 0:
                logger.debug(f"Updated handoff {handoff_id} status to {status}")
                return True
            else:
                logger.warning(f"Handoff {handoff_id} not found for status update")
                return False
    
    def get_handoff_stats(
        self,
        execution_id: Optional[str] = None,
        workflow_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get statistics about handoffs.
        
        Args:
            execution_id: Filter by execution ID
            workflow_id: Filter by workflow ID
        
        Returns:
            Dictionary with handoff statistics
        """
        query = "SELECT status, COUNT(*) as count FROM handoffs WHERE 1=1"
        params = []
        
        if execution_id:
            query += " AND execution_id = ?"
            params.append(execution_id)
        
        if workflow_id:
            query += " AND workflow_id = ?"
            params.append(workflow_id)
        
        query += " GROUP BY status"
        
        stats = {
            "total": 0,
            "by_status": {},
            "pending": 0,
            "in_progress": 0,
            "complete": 0,
            "blocked": 0,
            "failed": 0
        }
        
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(query, params).fetchall()
            
            for status, count in rows:
                stats["by_status"][status] = count
                stats[status] = count
                stats["total"] += count
        
        return stats


# Global handoff registry instance
_handoff_registry: Optional[HandoffRegistry] = None


def get_handoff_registry() -> HandoffRegistry:
    """Get or create global handoff registry instance."""
    global _handoff_registry
    
    if _handoff_registry is None:
        _handoff_registry = HandoffRegistry()
    
    return _handoff_registry
