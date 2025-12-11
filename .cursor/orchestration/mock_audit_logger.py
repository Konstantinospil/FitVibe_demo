"""
Mock Audit Logger - Fallback audit logger for testing.

This provides a minimal audit logger interface when the real one is not available.
"""

import logging
from typing import Dict, Any, Optional


class MockAuditLogger:
    """Mock audit logger that provides the same interface as AuditLogger."""
    
    def __init__(self):
        self.logger = logging.getLogger("audit_mock")
        self.logger.setLevel(logging.INFO)
    
    def log_info(self, agent_id: Optional[str] = None, message: str = "", **kwargs: Any):
        """Log info message."""
        self.logger.info(f"[{agent_id}] {message}", extra=kwargs)
    
    def log_tool_call(
        self,
        agent_id: str,
        tool_name: str,
        params: Dict[str, Any],
        output_summary: str,
        duration_ms: float,
        status: str = "success",
        error: Optional[str] = None,
        **kwargs: Any
    ):
        """Log tool call."""
        self.logger.info(
            f"[{agent_id}] Tool: {tool_name} ({status})",
            extra={"tool_name": tool_name, "params": params, "duration_ms": duration_ms, **kwargs}
        )
    
    def log_error(
        self,
        agent_id: Optional[str],
        message: str,
        error_type: str,
        details: Optional[Dict[str, Any]] = None,
        **kwargs: Any
    ):
        """Log error."""
        self.logger.error(
            f"[{agent_id}] Error: {message}",
            extra={"error_type": error_type, "details": details, **kwargs}
        )
    
    def log_warning(
        self,
        agent_id: Optional[str],
        message: str,
        details: Optional[Dict[str, Any]] = None,
        **kwargs: Any
    ):
        """Log warning."""
        self.logger.warning(
            f"[{agent_id}] Warning: {message}",
            extra={"details": details, **kwargs}
        )


# Create mock instance
_mock_audit_logger = MockAuditLogger()

