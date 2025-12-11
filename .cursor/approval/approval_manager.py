"""
Human-in-the-Loop (HITL) Approval Gates

This module provides approval gates for high-risk operations requiring human review
before execution.

Features:
- Approval request queue
- High-risk action detection
- Allowlist for safe operations
- Timeout handling
- Approval audit trail
"""

import json
import logging
import threading
import time
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Callable
from queue import Queue, Empty

logger = logging.getLogger(__name__)


class ActionType(Enum):
    """High-risk action types requiring approval."""

    FILE_WRITE = "FILE_WRITE"  # Writing files outside temp dirs
    DEPENDENCY_INSTALL = "DEPENDENCY_INSTALL"  # Installing packages
    DATABASE_MIGRATION = "DATABASE_MIGRATION"  # Running migrations
    SHELL_COMMAND = "SHELL_COMMAND"  # Executing shell commands
    API_KEY_USAGE = "API_KEY_USAGE"  # Using API keys
    DATA_DELETION = "DATA_DELETION"  # Deleting data
    CONFIG_CHANGE = "CONFIG_CHANGE"  # Changing configuration


class ApprovalStatus(Enum):
    """Approval request status."""

    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    TIMEOUT = "TIMEOUT"
    DEFERRED = "DEFERRED"


@dataclass
class ApprovalRequest:
    """Approval request data structure."""

    request_id: str
    timestamp: datetime
    agent_id: str
    action_type: ActionType
    action_details: Dict[str, Any]
    risk_level: str  # "low", "medium", "high", "critical"
    timeout_seconds: int = 60
    status: ApprovalStatus = ApprovalStatus.PENDING
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    timeout_at: Optional[datetime] = None

    def __post_init__(self):
        if self.timeout_at is None:
            self.timeout_at = self.timestamp + timedelta(seconds=self.timeout_seconds)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        data = asdict(self)
        data["timestamp"] = self.timestamp.isoformat()
        data["action_type"] = self.action_type.value
        data["status"] = self.status.value
        if self.approved_at:
            data["approved_at"] = self.approved_at.isoformat()
        if self.timeout_at:
            data["timeout_at"] = self.timeout_at.isoformat()
        return data

    def is_expired(self) -> bool:
        """Check if request has expired."""
        if self.status != ApprovalStatus.PENDING:
            return False
        return datetime.now(timezone.utc) >= self.timeout_at


class ApprovalManager:
    """Manages approval requests and gates."""

    def __init__(
        self,
        state_file: str = ".cursor/approval_state.json",
        allowlist_file: str = ".cursor/approval_allowlist.yaml",
    ):
        """
        Initialize approval manager.

        Args:
            state_file: Path to state file for persistence
            allowlist_file: Path to allowlist configuration
        """
        self.state_file = Path(state_file)
        self.state_file.parent.mkdir(parents=True, exist_ok=True)

        self._lock = threading.Lock()
        self._queue: Queue[ApprovalRequest] = Queue()
        self._requests: Dict[str, ApprovalRequest] = {}
        self._callbacks: Dict[str, Callable[[ApprovalRequest, bool], None]] = {}

        # Load allowlists
        self._allowlist = self._load_allowlist(allowlist_file)

        # Load persisted requests
        self._load_state()

        # Start timeout checker
        self._start_timeout_checker()

    def _load_allowlist(self, allowlist_file: str) -> Dict[str, List[str]]:
        """Load allowlist configuration."""
        allowlist_path = Path(allowlist_file)
        if not allowlist_path.exists():
            # Default allowlist
            return {
                "safe_paths": [
                    ".cursor/logs/",
                    ".cursor/tmp/",
                    "/tmp/",
                    "node_modules/.cache/",
                ],
                "safe_commands": [
                    "ls",
                    "cat",
                    "grep",
                    "head",
                    "tail",
                    "wc",
                    "find",
                    "pwd",
                ],
            }

        try:
            import yaml

            with open(allowlist_path, "r") as f:
                return yaml.safe_load(f) or {}
        except Exception as e:
            logger.warning(f"Error loading allowlist: {e}")
            return {}

    def _load_state(self):
        """Load persisted approval requests."""
        if self.state_file.exists():
            try:
                with open(self.state_file, "r") as f:
                    data = json.load(f)

                for req_data in data.get("requests", []):
                    if req_data.get("status") == "PENDING":
                        # Only reload pending requests
                        request = ApprovalRequest(
                            request_id=req_data["request_id"],
                            timestamp=datetime.fromisoformat(req_data["timestamp"]),
                            agent_id=req_data["agent_id"],
                            action_type=ActionType(req_data["action_type"]),
                            action_details=req_data["action_details"],
                            risk_level=req_data["risk_level"],
                            timeout_seconds=req_data.get("timeout_seconds", 60),
                            status=ApprovalStatus.PENDING,
                            timeout_at=datetime.fromisoformat(req_data.get("timeout_at", "")),
                        )
                        self._requests[request.request_id] = request
                        self._queue.put(request)

            except Exception as e:
                logger.warning(f"Error loading approval state: {e}")

    def _save_state(self):
        """Save approval requests to file."""
        try:
            with self._lock:
                data = {
                    "requests": [req.to_dict() for req in self._requests.values()],
                }

            with open(self.state_file, "w") as f:
                json.dump(data, f, indent=2)

        except Exception as e:
            logger.error(f"Error saving approval state: {e}")

    def _start_timeout_checker(self):
        """Start background thread to check for timeouts."""

        def check_timeouts():
            while True:
                time.sleep(5)  # Check every 5 seconds
                self._check_timeouts()

        thread = threading.Thread(target=check_timeouts, daemon=True)
        thread.start()

    def _check_timeouts(self):
        """Check for expired requests and auto-reject them."""
        with self._lock:
            expired = [
                req
                for req in self._requests.values()
                if req.is_expired() and req.status == ApprovalStatus.PENDING
            ]

            for request in expired:
                request.status = ApprovalStatus.TIMEOUT
                request.rejection_reason = "Request timed out after timeout period"
                logger.warning(
                    f"Approval request {request.request_id} timed out",
                    extra={"request_id": request.request_id, "agent_id": request.agent_id},
                )

                # Notify callback if registered
                if request.request_id in self._callbacks:
                    try:
                        self._callbacks[request.request_id](request, False)
                    except Exception as e:
                        logger.error(f"Error in approval callback: {e}")

                self._save_state()

    def is_allowlisted(self, action_type: ActionType, action_details: Dict[str, Any]) -> bool:
        """
        Check if action is allowlisted and can bypass approval.

        Args:
            action_type: Type of action
            action_details: Action details

        Returns:
            True if allowlisted, False otherwise
        """
        if action_type == ActionType.FILE_WRITE:
            path = action_details.get("path", "")
            safe_paths = self._allowlist.get("safe_paths", [])
            return any(path.startswith(safe) for safe in safe_paths)

        elif action_type == ActionType.SHELL_COMMAND:
            command = action_details.get("command", "")
            safe_commands = self._allowlist.get("safe_commands", [])
            return any(command.startswith(cmd) for cmd in safe_commands)

        return False

    def request_approval(
        self,
        agent_id: str,
        action_type: ActionType,
        action_details: Dict[str, Any],
        risk_level: str = "medium",
        timeout_seconds: int = 60,
        callback: Optional[Callable[[ApprovalRequest, bool], None]] = None,
    ) -> ApprovalRequest:
        """
        Request approval for a high-risk operation.

        Args:
            agent_id: ID of agent requesting approval
            action_type: Type of action
            action_details: Details of the action
            risk_level: Risk level ("low", "medium", "high", "critical")
            timeout_seconds: Timeout in seconds
            callback: Optional callback function (request, approved)

        Returns:
            ApprovalRequest object
        """
        # Check if allowlisted
        if self.is_allowlisted(action_type, action_details):
            logger.info(f"Action allowlisted, bypassing approval: {action_type.value}")
            request = ApprovalRequest(
                request_id=str(uuid.uuid4()),
                timestamp=datetime.now(timezone.utc),
                agent_id=agent_id,
                action_type=action_type,
                action_details=action_details,
                risk_level=risk_level,
                timeout_seconds=0,
                status=ApprovalStatus.APPROVED,
                approved_by="allowlist",
                approved_at=datetime.now(timezone.utc),
            )
            return request

        # Create approval request
        request = ApprovalRequest(
            request_id=str(uuid.uuid4()),
            timestamp=datetime.now(timezone.utc),
            agent_id=agent_id,
            action_type=action_type,
            action_details=action_details,
            risk_level=risk_level,
            timeout_seconds=timeout_seconds,
        )

        with self._lock:
            self._requests[request.request_id] = request
            self._queue.put(request)

            if callback:
                self._callbacks[request.request_id] = callback

        self._save_state()

        logger.info(
            f"Approval request created: {request.request_id}",
            extra={
                "request_id": request.request_id,
                "agent_id": agent_id,
                "action_type": action_type.value,
                "risk_level": risk_level,
            },
        )

        return request

    def approve(self, request_id: str, approved_by: str) -> bool:
        """
        Approve an approval request.

        Args:
            request_id: Request ID to approve
            approved_by: ID of person/system approving

        Returns:
            True if approved, False if request not found or already processed
        """
        with self._lock:
            request = self._requests.get(request_id)
            if not request:
                return False

            if request.status != ApprovalStatus.PENDING:
                return False

            request.status = ApprovalStatus.APPROVED
            request.approved_by = approved_by
            request.approved_at = datetime.now(timezone.utc)

        self._save_state()

        logger.info(
            f"Approval request approved: {request_id}",
            extra={"request_id": request_id, "approved_by": approved_by},
        )

        # Notify callback
        if request_id in self._callbacks:
            try:
                self._callbacks[request_id](request, True)
            except Exception as e:
                logger.error(f"Error in approval callback: {e}")

        return True

    def reject(self, request_id: str, rejected_by: str, reason: str) -> bool:
        """
        Reject an approval request.

        Args:
            request_id: Request ID to reject
            rejected_by: ID of person/system rejecting
            reason: Rejection reason

        Returns:
            True if rejected, False if request not found or already processed
        """
        with self._lock:
            request = self._requests.get(request_id)
            if not request:
                return False

            if request.status != ApprovalStatus.PENDING:
                return False

            request.status = ApprovalStatus.REJECTED
            request.approved_by = rejected_by  # Reusing field for rejector
            request.approved_at = datetime.now(timezone.utc)
            request.rejection_reason = reason

        self._save_state()

        logger.info(
            f"Approval request rejected: {request_id}",
            extra={"request_id": request_id, "rejected_by": rejected_by, "reason": reason},
        )

        # Notify callback
        if request_id in self._callbacks:
            try:
                self._callbacks[request_id](request, False)
            except Exception as e:
                logger.error(f"Error in approval callback: {e}")

        return True

    def get_pending(self) -> List[ApprovalRequest]:
        """Get list of pending approval requests."""
        with self._lock:
            return [
                req for req in self._requests.values() if req.status == ApprovalStatus.PENDING
            ]

    def get_request(self, request_id: str) -> Optional[ApprovalRequest]:
        """Get approval request by ID."""
        with self._lock:
            return self._requests.get(request_id)

    def wait_for_approval(self, request_id: str, timeout: Optional[int] = None) -> bool:
        """
        Wait for approval decision (blocking).

        Args:
            request_id: Request ID to wait for
            timeout: Optional timeout in seconds

        Returns:
            True if approved, False if rejected/timed out
        """
        start_time = time.time()
        while True:
            request = self.get_request(request_id)
            if not request:
                return False

            if request.status == ApprovalStatus.APPROVED:
                return True
            elif request.status in [ApprovalStatus.REJECTED, ApprovalStatus.TIMEOUT]:
                return False

            if timeout and (time.time() - start_time) > timeout:
                return False

            time.sleep(0.5)  # Poll every 500ms


# Global approval manager instance
_approval_manager: Optional[ApprovalManager] = None
_manager_lock = threading.Lock()


def get_approval_manager() -> ApprovalManager:
    """Get or create global approval manager instance."""
    global _approval_manager
    if _approval_manager is None:
        with _manager_lock:
            if _approval_manager is None:
                _approval_manager = ApprovalManager()
    return _approval_manager



