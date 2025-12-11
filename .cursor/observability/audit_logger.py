"""
Audit Logging Infrastructure

This module provides comprehensive audit logging for agent operations with:
- Structured JSONL format
- Correlation ID propagation
- Event type classification
- Log rotation and retention
- Query tools for investigation
"""

import json
import logging
import logging.handlers
import os
import uuid
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional
from contextvars import ContextVar
import threading

# Correlation ID context variable for thread-local storage
_correlation_id: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)


class EventType(Enum):
    """Event types for audit logging."""

    TOOL_CALL = "TOOL_CALL"
    FILE_READ = "FILE_READ"
    FILE_WRITE = "FILE_WRITE"
    FILE_DELETE = "FILE_DELETE"
    AGENT_DECISION = "AGENT_DECISION"
    AGENT_HANDOFF = "AGENT_HANDOFF"
    ERROR = "ERROR"
    WARNING = "WARNING"
    VECTOR_SEARCH = "VECTOR_SEARCH"
    VECTOR_ADD = "VECTOR_ADD"
    VECTOR_DELETE = "VECTOR_DELETE"
    APPROVAL_REQUEST = "APPROVAL_REQUEST"
    APPROVAL_GRANTED = "APPROVAL_GRANTED"
    APPROVAL_REJECTED = "APPROVAL_REJECTED"
    QUOTA_WARNING = "QUOTA_WARNING"
    QUOTA_CRITICAL = "QUOTA_CRITICAL"
    CIRCUIT_OPEN = "CIRCUIT_OPEN"
    CIRCUIT_CLOSE = "CIRCUIT_CLOSE"


class CorrelationContext:
    """Context manager for correlation ID propagation."""

    def __init__(self, correlation_id: Optional[str] = None):
        self.correlation_id = correlation_id or str(uuid.uuid4())
        self._token = None

    def __enter__(self):
        self._token = _correlation_id.set(self.correlation_id)
        return self.correlation_id

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._token:
            _correlation_id.set(None)
        return False


def get_correlation_id() -> Optional[str]:
    """Get current correlation ID from context."""
    return _correlation_id.get()


class AuditLogger:
    """Structured audit logger for agent operations."""

    def __init__(
        self,
        log_dir: str = ".cursor/logs",
        retention_days: int = 30,
        compress_old: bool = True,
    ):
        """
        Initialize audit logger.

        Args:
            log_dir: Directory for audit logs
            retention_days: Days to retain logs (default 30)
            compress_old: Whether to compress old logs with gzip
        """
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.retention_days = retention_days
        self.compress_old = compress_old

        # Set up JSONL file handler with daily rotation
        log_file = self.log_dir / "audit-{}.jsonl".format(
            datetime.now(timezone.utc).strftime("%Y-%m-%d")
        )

        # Create JSON formatter
        self.formatter = JSONFormatter()

        # Set up rotating file handler
        self.handler = logging.handlers.TimedRotatingFileHandler(
            filename=str(log_file),
            when="midnight",
            interval=1,
            backupCount=retention_days,
            utc=True,
            encoding="utf-8",
        )
        if compress_old:
            self.handler.suffix = "%Y-%m-%d.jsonl.gz"
            self.handler.namer = lambda name: name + ".gz"

        self.handler.setFormatter(self.formatter)

        # Create logger
        self.logger = logging.getLogger("audit")
        self.logger.setLevel(logging.INFO)
        self.logger.addHandler(self.handler)
        self.logger.propagate = False

    def _create_log_entry(
        self,
        event_type: EventType,
        agent_id: Optional[str] = None,
        tool_name: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None,
        output_summary: Optional[str] = None,
        duration_ms: Optional[float] = None,
        status: str = "success",
        error: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Create structured log entry."""
        correlation_id = get_correlation_id()

        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "correlation_id": correlation_id or str(uuid.uuid4()),
            "event_type": event_type.value,
            "status": status,
        }

        if agent_id:
            entry["agent_id"] = agent_id
        if tool_name:
            entry["tool_name"] = tool_name
        if params:
            entry["params"] = params
        if output_summary:
            entry["output_summary"] = output_summary[:500]  # Limit summary length
        if duration_ms is not None:
            entry["duration_ms"] = round(duration_ms, 2)
        if error:
            entry["error"] = error
            entry["status"] = "error"

        # Add any additional fields
        entry.update(kwargs)

        return entry

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
        entry = self._create_log_entry(
            EventType.TOOL_CALL,
            agent_id=agent_id,
            tool_name=tool_name,
            params=params,
            output_summary=output_summary,
            duration_ms=duration_ms,
            status=status,
            error=error,
        )
        self.logger.info("tool_call", extra=entry)

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
        event_type_map = {
            "read": EventType.FILE_READ,
            "write": EventType.FILE_WRITE,
            "delete": EventType.FILE_DELETE,
        }
        event_type = event_type_map.get(operation.lower(), EventType.FILE_READ)

        entry = self._create_log_entry(
            event_type,
            agent_id=agent_id,
            tool_name=f"file_{operation}",
            params={"path": file_path, "size": file_size, "checksum": checksum},
            duration_ms=duration_ms,
            status=status,
            error=error,
        )
        self.logger.info("file_op", extra=entry)

    def log_agent_decision(
        self,
        agent_id: str,
        decision: str,
        context: Optional[Dict[str, Any]] = None,
        duration_ms: Optional[float] = None,
    ):
        """Log an agent decision."""
        entry = self._create_log_entry(
            EventType.AGENT_DECISION,
            agent_id=agent_id,
            params={"decision": decision, "context": context},
            output_summary=decision[:500],
            duration_ms=duration_ms,
        )
        self.logger.info("agent_decision", extra=entry)

    def log_agent_handoff(
        self,
        from_agent: str,
        to_agent: str,
        reason: str,
        context: Optional[Dict[str, Any]] = None,
    ):
        """Log an agent handoff."""
        entry = self._create_log_entry(
            EventType.AGENT_HANDOFF,
            agent_id=from_agent,
            params={
                "from_agent": from_agent,
                "to_agent": to_agent,
                "reason": reason,
                "context": context,
            },
        )
        self.logger.info("agent_handoff", extra=entry)

    def log_vector_search(
        self,
        query: str,
        results_count: int,
        category_filter: Optional[str] = None,
        duration_ms: Optional[float] = None,
        agent_id: Optional[str] = None,
    ):
        """Log a vector database search operation."""
        entry = self._create_log_entry(
            EventType.VECTOR_SEARCH,
            agent_id=agent_id,
            tool_name="vector_search",
            params={
                "query": query[:200],  # Limit query length
                "results_count": results_count,
                "category_filter": category_filter,
            },
            duration_ms=duration_ms,
        )
        self.logger.info("vector_search", extra=entry)

    def log_error(
        self,
        error_message: str,
        agent_id: Optional[str] = None,
        tool_name: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ):
        """Log an error event."""
        entry = self._create_log_entry(
            EventType.ERROR,
            agent_id=agent_id,
            tool_name=tool_name,
            params=context,
            error=error_message,
            status="error",
        )
        self.logger.error("error", extra=entry)

    def log_warning(
        self,
        warning_message: str,
        agent_id: Optional[str] = None,
        tool_name: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ):
        """Log a warning event."""
        entry = self._create_log_entry(
            EventType.WARNING,
            agent_id=agent_id,
            tool_name=tool_name,
            params=context,
            output_summary=warning_message[:500],
            status="warning",
        )
        self.logger.warning("warning", extra=entry)


class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
        }

        # Add all extra fields
        for key, value in record.__dict__.items():
            if key not in [
                "name",
                "msg",
                "args",
                "created",
                "filename",
                "funcName",
                "levelname",
                "levelno",
                "lineno",
                "module",
                "msecs",
                "message",
                "pathname",
                "process",
                "processName",
                "relativeCreated",
                "thread",
                "threadName",
                "exc_info",
                "exc_text",
                "stack_info",
            ]:
                log_data[key] = value

        return json.dumps(log_data, ensure_ascii=False)


# Global audit logger instance
_audit_logger: Optional[AuditLogger] = None
_lock = threading.Lock()


def get_audit_logger() -> AuditLogger:
    """Get or create global audit logger instance."""
    global _audit_logger
    if _audit_logger is None:
        with _lock:
            if _audit_logger is None:
                _audit_logger = AuditLogger()
    return _audit_logger



