"""
Agent State Management - Manages agent execution state, handoffs, and workflow progress.

This module provides state persistence, versioning, and backup/restore capabilities
for the multi-agent system.

Version: 1.0
Last Updated: 2025-01-21
"""

import os
import json
import shutil
import hashlib
import logging
from typing import Dict, Any, Optional, List, Literal
from dataclasses import dataclass, asdict, field
from datetime import datetime
from enum import Enum
from pathlib import Path

# Import with fallback for testing
try:
    from ..observability.audit_logger import audit_logger, EventType
except ImportError:
    from .audit_logger_fallback import _audit_logger_fallback as audit_logger
    from enum import Enum
    EventType = Enum("EventType", ["TOOL_CALL", "INFO", "ERROR", "WARNING"])


class StateVersionConflict(Exception):
    """Raised when state version conflict is detected during optimistic locking."""
    pass


class AgentStatus(Enum):
    """Agent execution status."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETE = "complete"
    BLOCKED = "blocked"
    FAILED = "failed"
    CANCELLED = "cancelled"


class WorkflowStatus(Enum):
    """Workflow execution status."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETE = "complete"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class HandoffRecord:
    """Records an agent handoff."""
    from_agent: str
    to_agent: str
    handoff_id: str
    timestamp: str
    handoff_type: str  # "standard", "escalation", "collaboration", "error_recovery"
    status: str  # "pending", "in_progress", "complete", "blocked", "failed"
    work_summary: str
    deliverables: List[str] = field(default_factory=list)
    blockers: List[str] = field(default_factory=list)
    notes: Optional[str] = None


@dataclass
class AgentExecution:
    """Records agent execution details."""
    agent_id: str
    status: AgentStatus
    started_at: str
    completed_at: Optional[str] = None
    duration_ms: Optional[float] = None
    input_data: Dict[str, Any] = field(default_factory=dict)
    output_data: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    handoffs: List[HandoffRecord] = field(default_factory=list)


@dataclass
class WorkflowExecution:
    """Records workflow execution details."""
    workflow_id: str
    workflow_name: str
    status: WorkflowStatus
    started_at: str
    request_id: str
    completed_at: Optional[str] = None
    agent_executions: List[AgentExecution] = field(default_factory=list)
    current_agent: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentState:
    """
    Represents the complete state of an agent execution or workflow.
    
    This state can be persisted, versioned, and restored.
    """
    # Identification
    state_id: str
    state_type: Literal["agent", "workflow"]
    
    # Timestamps
    created_at: str
    updated_at: str
    
    # Versioning
    version: int = 1
    
    # State content
    agent_execution: Optional[AgentExecution] = None
    workflow_execution: Optional[WorkflowExecution] = None
    
    # Metadata
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Converts state to dictionary for serialization."""
        data = asdict(self)
        # Convert enums to values
        if self.agent_execution:
            data["agent_execution"]["status"] = self.agent_execution.status.value
        if self.workflow_execution:
            data["workflow_execution"]["status"] = self.workflow_execution.status.value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AgentState":
        """Creates state from dictionary."""
        # Convert enum values back to enums
        if "agent_execution" in data and data["agent_execution"]:
            if "status" in data["agent_execution"]:
                data["agent_execution"]["status"] = AgentStatus(data["agent_execution"]["status"])
        if "workflow_execution" in data and data["workflow_execution"]:
            if "status" in data["workflow_execution"]:
                status_value = data["workflow_execution"]["status"]
                # Handle both enum values and string values
                if isinstance(status_value, str):
                    # Map string values to enum (case-insensitive)
                    status_map = {
                        "not_started": WorkflowStatus.NOT_STARTED,
                        "in_progress": WorkflowStatus.IN_PROGRESS,
                        "running": WorkflowStatus.IN_PROGRESS,  # Alias
                        "complete": WorkflowStatus.COMPLETE,
                        "completed": WorkflowStatus.COMPLETE,  # Alias
                        "failed": WorkflowStatus.FAILED,
                        "cancelled": WorkflowStatus.CANCELLED
                    }
                    data["workflow_execution"]["status"] = status_map.get(status_value.lower(), WorkflowStatus.NOT_STARTED)
                else:
                    data["workflow_execution"]["status"] = WorkflowStatus(status_value)
        
        # Reconstruct nested objects
        if data.get("agent_execution"):
            agent_data = data["agent_execution"]
            handoffs = [HandoffRecord(**h) for h in agent_data.get("handoffs", [])]
            agent_data["handoffs"] = handoffs
            data["agent_execution"] = AgentExecution(**agent_data)
        
        if data.get("workflow_execution"):
            workflow_data = data["workflow_execution"]
            agent_executions = []
            for ae_data in workflow_data.get("agent_executions", []):
                handoffs = [HandoffRecord(**h) for h in ae_data.get("handoffs", [])]
                ae_data["handoffs"] = handoffs
                agent_executions.append(AgentExecution(**ae_data))
            workflow_data["agent_executions"] = agent_executions
            
            # Filter to only include fields that exist in WorkflowExecution
            valid_fields = {
                "workflow_id", "workflow_name", "status", "started_at", "request_id",
                "completed_at", "agent_executions", "current_agent", "context", "metadata"
            }
            filtered_data = {k: v for k, v in workflow_data.items() if k in valid_fields}
            
            # Ensure required fields have defaults
            if "workflow_name" not in filtered_data:
                filtered_data["workflow_name"] = filtered_data.get("workflow_id", "unknown")
            if "request_id" not in filtered_data:
                filtered_data["request_id"] = ""
            
            data["workflow_execution"] = WorkflowExecution(**filtered_data)
        
        return cls(**data)


class AgentStateManager:
    """
    Manages agent state persistence, versioning, and backup/restore.
    
    Features:
    - State persistence to JSON files
    - State versioning (keeps history)
    - Backup and restore capabilities
    - State integrity checks (checksums)
    - State querying and filtering
    """
    
    def __init__(
        self,
        state_dir: Optional[str] = None,
        backup_dir: Optional[str] = None,
        max_versions: Optional[int] = None
    ):
        # Load from config if available
        try:
            from .config_loader import config_loader
            state_config = config_loader.get_section("state_management") or {}
            self.state_dir = Path(state_dir or state_config.get("state_dir", ".cursor/data/agent_states"))
            self.backup_dir = Path(backup_dir or state_config.get("backup_dir", ".cursor/data/agent_states/backups"))
            self.max_versions = max_versions or state_config.get("max_versions", 10)
        except ImportError:
            self.state_dir = Path(state_dir or ".cursor/data/agent_states")
            self.backup_dir = Path(backup_dir or ".cursor/data/agent_states/backups")
            self.max_versions = max_versions or 10
        
        # Ensure directories exist
        self.state_dir.mkdir(parents=True, exist_ok=True)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        audit_logger.log_info(
            agent_id="AgentStateManager",
            message="AgentStateManager initialized",
            details={"state_dir": str(self.state_dir), "backup_dir": str(self.backup_dir)}
        )
    
    def save_state(self, state: AgentState, create_backup: bool = True) -> str:
        """
        Saves agent state to disk with versioning.
        
        Args:
            state: AgentState to save
            create_backup: Whether to create a backup before saving
        
        Returns:
            Path to saved state file
        """
        # Update timestamp
        state.updated_at = datetime.utcnow().isoformat()
        
        # Create backup if requested
        if create_backup:
            self._create_backup(state.state_id)
        
        # Save current state
        state_file = self._get_state_file(state.state_id)
        state_data = state.to_dict()
        
        # Add checksum for integrity
        state_json = json.dumps(state_data, indent=2, sort_keys=True)
        checksum = hashlib.sha256(state_json.encode()).hexdigest()
        state_data["_checksum"] = checksum
        
        with open(state_file, 'w') as f:
            json.dump(state_data, f, indent=2, sort_keys=True)
        
        # Save version history
        self._save_version(state)
        
        audit_logger.log_tool_call(
            agent_id="AgentStateManager",
            tool_name="save_state",
            params={"state_id": state.state_id, "state_type": state.state_type, "version": state.version},
            output_summary=f"State saved to {state_file}",
            duration_ms=0,
            status="success"
        )
        
        return str(state_file)
    
    def load_state(self, state_id: str, version: Optional[int] = None) -> Optional[AgentState]:
        """
        Loads agent state from disk.
        
        Args:
            state_id: ID of state to load
            version: Specific version to load (None for latest)
        
        Returns:
            AgentState if found, None otherwise
        """
        if version is not None:
            # Load specific version
            version_file = self._get_version_file(state_id, version)
            if not version_file.exists():
                return None
            state_file = version_file
        else:
            # Load latest
            state_file = self._get_state_file(state_id)
            if not state_file.exists():
                return None
        
        try:
            with open(state_file, 'r') as f:
                state_data = json.load(f)
            
            # Verify checksum
            checksum = state_data.pop("_checksum", None)
            if checksum:
                state_json = json.dumps(state_data, indent=2, sort_keys=True)
                calculated_checksum = hashlib.sha256(state_json.encode()).hexdigest()
                if checksum != calculated_checksum:
                    logging.warning(f"State checksum mismatch for {state_id}, data may be corrupted")
            
            state = AgentState.from_dict(state_data)
            
            audit_logger.log_tool_call(
                agent_id="AgentStateManager",
                tool_name="load_state",
                params={"state_id": state_id, "version": version},
                output_summary=f"State loaded from {state_file}",
                duration_ms=0,
                status="success"
            )
            
            return state
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logging.error(f"Error loading state {state_id}: {e}")
            return None
    
    def _get_state_file(self, state_id: str) -> Path:
        """Gets path to state file."""
        return self.state_dir / f"{state_id}.json"
    
    def _get_version_file(self, state_id: str, version: int) -> Path:
        """Gets path to version file."""
        versions_dir = self.state_dir / "versions" / state_id
        versions_dir.mkdir(parents=True, exist_ok=True)
        return versions_dir / f"v{version}.json"
    
    def _save_version(self, state: AgentState):
        """Saves a version of the state."""
        version_file = self._get_version_file(state.state_id, state.version)
        version_file.parent.mkdir(parents=True, exist_ok=True)
        
        state_data = state.to_dict()
        state_json = json.dumps(state_data, indent=2, sort_keys=True)
        checksum = hashlib.sha256(state_json.encode()).hexdigest()
        state_data["_checksum"] = checksum
        
        with open(version_file, 'w') as f:
            json.dump(state_data, f, indent=2, sort_keys=True)
        
        # Clean up old versions
        self._cleanup_old_versions(state.state_id)
    
    def _cleanup_old_versions(self, state_id: str):
        """Removes old versions beyond max_versions."""
        versions_dir = self.state_dir / "versions" / state_id
        if not versions_dir.exists():
            return
        
        version_files = sorted(versions_dir.glob("v*.json"), key=lambda p: int(p.stem[1:]))
        if len(version_files) > self.max_versions:
            # Remove oldest versions
            for old_file in version_files[:-self.max_versions]:
                old_file.unlink()
    
    def _create_backup(self, state_id: str):
        """Creates a backup of the current state."""
        state_file = self._get_state_file(state_id)
        if not state_file.exists():
            return
        
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_file = self.backup_dir / f"{state_id}_{timestamp}.json"
        
        shutil.copy2(state_file, backup_file)
        
        # Clean up old backups (keep last 10)
        backups = sorted(self.backup_dir.glob(f"{state_id}_*.json"))
        if len(backups) > 10:
            for old_backup in backups[:-10]:
                old_backup.unlink()
    
    def restore_state(self, state_id: str, backup_timestamp: Optional[str] = None) -> bool:
        """
        Restores state from backup.
        
        Args:
            state_id: ID of state to restore
            backup_timestamp: Specific backup timestamp (None for latest)
        
        Returns:
            True if restore successful, False otherwise
        """
        if backup_timestamp:
            backup_file = self.backup_dir / f"{state_id}_{backup_timestamp}.json"
        else:
            # Find latest backup
            backups = sorted(self.backup_dir.glob(f"{state_id}_*.json"))
            if not backups:
                return False
            backup_file = backups[-1]
        
        if not backup_file.exists():
            return False
        
        state_file = self._get_state_file(state_id)
        shutil.copy2(backup_file, state_file)
        
        audit_logger.log_tool_call(
            agent_id="AgentStateManager",
            tool_name="restore_state",
            params={"state_id": state_id, "backup_timestamp": backup_timestamp},
            output_summary=f"State restored from {backup_file}",
            duration_ms=0,
            status="success"
        )
        
        return True
    
    def list_states(
        self,
        state_type: Optional[Literal["agent", "workflow"]] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Lists all saved states with optional filtering.
        
        Args:
            state_type: Filter by state type
            status: Filter by status (agent or workflow status)
        
        Returns:
            List of state metadata
        """
        states = []
        
        for state_file in self.state_dir.glob("*.json"):
            if state_file.name.startswith("_"):
                continue  # Skip metadata files
            
            try:
                state = self.load_state(state_file.stem)
                if not state:
                    continue
                
                # Apply filters
                if state_type and state.state_type != state_type:
                    continue
                
                if status:
                    if state.agent_execution and state.agent_execution.status.value != status:
                        continue
                    if state.workflow_execution and state.workflow_execution.status.value != status:
                        continue
                
                states.append({
                    "state_id": state.state_id,
                    "state_type": state.state_type,
                    "version": state.version,
                    "created_at": state.created_at,
                    "updated_at": state.updated_at,
                    "status": (
                        state.agent_execution.status.value if state.agent_execution
                        else state.workflow_execution.status.value if state.workflow_execution
                        else "unknown"
                    )
                })
            except Exception as e:
                logging.warning(f"Error reading state file {state_file}: {e}")
                continue
        
        return sorted(states, key=lambda s: s["updated_at"], reverse=True)
    
    def delete_state(self, state_id: str, delete_versions: bool = False) -> bool:
        """
        Deletes a state and optionally its versions.
        
        Args:
            state_id: ID of state to delete
            delete_versions: Whether to delete version history
        
        Returns:
            True if deleted, False otherwise
        """
        state_file = self._get_state_file(state_id)
        if state_file.exists():
            state_file.unlink()
        
        if delete_versions:
            versions_dir = self.state_dir / "versions" / state_id
            if versions_dir.exists():
                shutil.rmtree(versions_dir)
        
        # Delete backups
        for backup_file in self.backup_dir.glob(f"{state_id}_*.json"):
            backup_file.unlink()
        
        audit_logger.log_tool_call(
            agent_id="AgentStateManager",
            tool_name="delete_state",
            params={"state_id": state_id, "delete_versions": delete_versions},
            output_summary=f"State {state_id} deleted",
            duration_ms=0,
            status="success"
        )
        
        return True
    
    def get_state_history(self, state_id: str) -> List[Dict[str, Any]]:
        """
        Gets version history for a state.
        
        Args:
            state_id: ID of state
        
        Returns:
            List of version metadata
        """
        versions_dir = self.state_dir / "versions" / state_id
        if not versions_dir.exists():
            return []
        
        history = []
        for version_file in sorted(versions_dir.glob("v*.json")):
            version_num = int(version_file.stem[1:])
            try:
                with open(version_file, 'r') as f:
                    state_data = json.load(f)
                history.append({
                    "version": version_num,
                    "updated_at": state_data.get("updated_at", ""),
                    "state_type": state_data.get("state_type", ""),
                })
            except Exception as e:
                logging.warning(f"Error reading version file {version_file}: {e}")
        
        return sorted(history, key=lambda h: h["version"], reverse=True)


# Global instance for easy access
agent_state_manager = AgentStateManager()

