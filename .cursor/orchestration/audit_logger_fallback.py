"""
Fallback audit logger for testing when observability module is not available.

This provides a minimal mock implementation of the audit logger interface.
"""

import logging
from typing import Dict, Any, Optional


class MockAuditLogger:
    """Mock audit logger that matches the AuditLogger interface."""

    def __init__(self):
        self.logger = logging.getLogger("audit_fallback")
        self.logger.setLevel(logging.INFO)

    def log_tool_call(
        self,
        tool_name: str,
        agent_id: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None,
        output_summary: Optional[str] = None,
        duration_ms: Optional[float] = None,
        status: str = "success",
        error: Optional[str] = None,
    ):
        """Log a tool call event."""
        self.logger.info(
            f"tool_call: {tool_name}",
            extra={
                "agent_id": agent_id,
                "tool_name": tool_name,
                "status": status,
                "error": error,
            }
        )

    def log_file_op(
        self,
        operation: str,
        file_path: str,
        agent_id: Optional[str] = None,
        file_size: Optional[int] = None,
        checksum: Optional[str] = None,
        duration_ms: Optional[float] = None,
        status: str = "success",
        error: Optional[str] = None,
    ):
        """Log a file operation."""
        self.logger.info(
            f"file_op: {operation} {file_path}",
            extra={"agent_id": agent_id, "status": status}
        )

    def log_agent_decision(
        self,
        agent_id: str,
        decision: str,
        context: Optional[Dict[str, Any]] = None,
        duration_ms: Optional[float] = None,
    ):
        """Log an agent decision."""
        self.logger.info(
            f"agent_decision: {agent_id} - {decision}",
            extra={"agent_id": agent_id, "context": context}
        )

    def log_agent_handoff(
        self,
        from_agent: str,
        to_agent: str,
        reason: str,
        context: Optional[Dict[str, Any]] = None,
    ):
        """Log an agent handoff."""
        self.logger.info(
            f"agent_handoff: {from_agent} -> {to_agent}",
            extra={"from_agent": from_agent, "to_agent": to_agent, "reason": reason}
        )

    def log_error(
        self,
        error_message: str,
        agent_id: Optional[str] = None,
        tool_name: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ):
        """Log an error event."""
        self.logger.error(
            f"error: {error_message}",
            extra={"agent_id": agent_id, "tool_name": tool_name, "context": context}
        )

    def log_warning(
        self,
        warning_message: str,
        agent_id: Optional[str] = None,
        tool_name: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ):
        """Log a warning event."""
        self.logger.warning(
            f"warning: {warning_message}",
            extra={"agent_id": agent_id, "tool_name": tool_name, "context": context}
        )

    def log_info(
        self,
        message: str,
        agent_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        """Log an informational event."""
        self.logger.info(
            f"info: {message}",
            extra={"agent_id": agent_id, "details": details}
        )


# Create fallback instance
_audit_logger_fallback = MockAuditLogger()















