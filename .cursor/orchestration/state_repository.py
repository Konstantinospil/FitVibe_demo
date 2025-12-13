"""
State Repository - SQLite-based state persistence with optimistic locking.

This module provides a repository pattern for state persistence using SQLite,
with optimistic locking and transaction support.

Version: 1.0
Last Updated: 2025-12-12
"""

import json
import logging
import sqlite3
import subprocess
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

from .agent_state import AgentState, StateVersionConflict

logger = logging.getLogger(__name__)


class AgentStateRepository:
    """
    SQLite-based repository for agent state persistence.
    
    Features:
    - Optimistic locking with version numbers
    - Transaction support for atomic operations
    - Efficient querying with indexes
    - Automatic database initialization
    """
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize state repository.
        
        Args:
            db_path: Path to SQLite database file (default: .cursor/data/workflow_state.db)
        """
        # Load from config if available
        try:
            from .config_loader import config_loader
            workflow_config = config_loader.get_section("workflow_engine") or {}
            default_path = workflow_config.get("state_db_path", ".cursor/data/workflow_state.db")
        except ImportError:
            default_path = ".cursor/data/workflow_state.db"
        
        self.db_path = Path(db_path or default_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        self._init_db()
        
        logger.info(f"AgentStateRepository initialized with database: {self.db_path}")
    
    def _init_db(self):
        """Initialize SQLite database schema."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_states (
                    state_id TEXT PRIMARY KEY,
                    state_type TEXT NOT NULL,
                    version INTEGER NOT NULL DEFAULT 1,
                    state_data TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    checksum TEXT
                )
            """)
            
            # Create indexes for efficient querying
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_state_type 
                ON agent_states(state_type)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_updated_at 
                ON agent_states(updated_at)
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
    
    def _calculate_checksum(self, state_data: str) -> str:
        """Calculate SHA256 checksum for state data."""
        import hashlib
        return hashlib.sha256(state_data.encode()).hexdigest()
    
    def save_state(self, state: AgentState, create_backup: bool = True) -> str:
        """
        Save state with optimistic locking.
        
        Args:
            state: AgentState to save
            create_backup: Whether to create a backup (not implemented for SQLite yet)
        
        Returns:
            State ID
        
        Raises:
            StateVersionConflict: If version conflict detected
        """
        with sqlite3.connect(self.db_path) as conn:
            # Start transaction
            conn.execute("BEGIN TRANSACTION")
            
            try:
                # Load current state to check version
                current = self._load_state_internal(conn, state.state_id)
                
                if current and current.version != state.version:
                    conn.rollback()
                    raise StateVersionConflict(
                        f"State version conflict: expected {current.version}, "
                        f"got {state.version} for state_id={state.state_id}"
                    )
                
                # Increment version
                state.version = (current.version if current else 0) + 1
                
                # Update timestamp
                now = self._get_current_timestamp()
                if not state.created_at:
                    state.created_at = now
                state.updated_at = now
                
                # Serialize state
                state_dict = state.to_dict()
                state_json = json.dumps(state_dict, indent=2, sort_keys=True)
                checksum = self._calculate_checksum(state_json)
                
                # Save state (INSERT OR REPLACE handles both insert and update)
                conn.execute("""
                    INSERT OR REPLACE INTO agent_states
                    (state_id, state_type, version, state_data, created_at, updated_at, checksum)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    state.state_id,
                    state.state_type,
                    state.version,
                    state_json,
                    state.created_at,
                    state.updated_at,
                    checksum
                ))
                
                # Commit transaction
                conn.commit()
                
                logger.debug(f"State saved: {state.state_id} (version {state.version})")
                
                return state.state_id
                
            except Exception as e:
                conn.rollback()
                logger.error(f"Error saving state {state.state_id}: {e}")
                raise
    
    def load_state(self, state_id: str) -> Optional[AgentState]:
        """
        Load state by ID.
        
        Args:
            state_id: State ID to load
        
        Returns:
            AgentState if found, None otherwise
        """
        with sqlite3.connect(self.db_path) as conn:
            return self._load_state_internal(conn, state_id)
    
    def _load_state_internal(self, conn: sqlite3.Connection, state_id: str) -> Optional[AgentState]:
        """Internal method to load state from database connection."""
        row = conn.execute(
            "SELECT state_data, checksum FROM agent_states WHERE state_id = ?",
            (state_id,)
        ).fetchone()
        
        if not row:
            return None
        
        state_json, stored_checksum = row
        
        # Verify checksum
        if stored_checksum:
            calculated_checksum = self._calculate_checksum(state_json)
            if stored_checksum != calculated_checksum:
                logger.warning(f"State checksum mismatch for {state_id}, data may be corrupted")
        
        # Deserialize state
        try:
            state_data = json.loads(state_json)
            state = AgentState.from_dict(state_data)
            return state
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error(f"Error deserializing state {state_id}: {e}")
            return None
    
    def load_state_summary(self, state_id: str) -> Optional[Dict[str, Any]]:
        """
        Load only metadata, not full state.
        
        Args:
            state_id: State ID to load
        
        Returns:
            Dictionary with metadata (state_id, version, updated_at, state_type) or None
        """
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT state_id, version, updated_at, state_type FROM agent_states WHERE state_id = ?",
                (state_id,)
            ).fetchone()
            
            if not row:
                return None
            
            return {
                "state_id": row[0],
                "version": row[1],
                "updated_at": row[2],
                "state_type": row[3]
            }
    
    def delete_state(self, state_id: str) -> bool:
        """
        Delete state by ID.
        
        Args:
            state_id: State ID to delete
        
        Returns:
            True if deleted, False if not found
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("DELETE FROM agent_states WHERE state_id = ?", (state_id,))
            conn.commit()
            
            deleted = cursor.rowcount > 0
            if deleted:
                logger.debug(f"State deleted: {state_id}")
            
            return deleted
    
    def list_states(
        self,
        state_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        List states with optional filtering.
        
        Args:
            state_type: Filter by state type ("agent" or "workflow")
            limit: Maximum number of states to return
        
        Returns:
            List of state metadata dictionaries
        """
        query = "SELECT state_id, state_type, version, updated_at FROM agent_states WHERE 1=1"
        params = []
        
        if state_type:
            query += " AND state_type = ?"
            params.append(state_type)
        
        query += " ORDER BY updated_at DESC LIMIT ?"
        params.append(limit)
        
        states = []
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(query, params).fetchall()
            
            for row in rows:
                states.append({
                    "state_id": row[0],
                    "state_type": row[1],
                    "version": row[2],
                    "updated_at": row[3]
                })
        
        return states


# Import StateVersionConflict from agent_state
from .agent_state import StateVersionConflict
