"""
Circuit Breaker & Quota Management

This module provides quota tracking and circuit breaker functionality to prevent
cost overruns and manage Claude API usage limits.

Features:
- Token and message counting
- Budget tracking by dimension (agent, task type, time period)
- Circuit breaker with state machine
- Warning and critical thresholds
- Automatic quota reset scheduling
"""

import json
import logging
import threading
from datetime import datetime, timezone, timedelta
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import time

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states."""

    CLOSED = "CLOSED"  # Normal operation
    OPEN = "OPEN"  # Quota exceeded, operations blocked
    HALF_OPEN = "HALF_OPEN"  # Testing recovery


@dataclass
class QuotaLimits:
    """Quota limit configuration."""

    tokens_per_hour: int = 100_000
    tokens_per_day: int = 200_000  # Claude Pro daily limit
    messages_per_hour: int = 1000
    messages_per_day: int = 5000
    warning_threshold: float = 0.80  # 80% warning
    critical_threshold: float = 0.95  # 95% critical (circuit opens)


@dataclass
class QuotaUsage:
    """Current quota usage."""

    tokens_hourly: int = 0
    tokens_daily: int = 0
    messages_hourly: int = 0
    messages_daily: int = 0
    last_reset_hourly: datetime = None
    last_reset_daily: datetime = None

    def __post_init__(self):
        if self.last_reset_hourly is None:
            self.last_reset_hourly = datetime.now(timezone.utc)
        if self.last_reset_daily is None:
            self.last_reset_daily = datetime.now(timezone.utc)


@dataclass
class CircuitBreakerState:
    """Circuit breaker state."""

    state: CircuitState = CircuitState.CLOSED
    opened_at: Optional[datetime] = None
    reason: Optional[str] = None
    last_state_change: datetime = None

    def __post_init__(self):
        if self.last_state_change is None:
            self.last_state_change = datetime.now(timezone.utc)


class QuotaTracker:
    """Quota tracker with circuit breaker functionality."""

    def __init__(
        self,
        limits: Optional[QuotaLimits] = None,
        state_file: str = ".cursor/quota_state.json",
    ):
        """
        Initialize quota tracker.

        Args:
            limits: Quota limits configuration
            state_file: Path to state file for persistence
        """
        self.limits = limits or QuotaLimits()
        self.state_file = Path(state_file)
        self.state_file.parent.mkdir(parents=True, exist_ok=True)

        self._lock = threading.Lock()
        self._usage = QuotaUsage()
        self._circuit = CircuitBreakerState()
        self._budget_by_agent: Dict[str, int] = {}
        self._budget_by_task: Dict[str, int] = {}

        # Load persisted state
        self._load_state()

        # Schedule automatic resets
        self._schedule_resets()

    def _load_state(self):
        """Load state from file."""
        if self.state_file.exists():
            try:
                with open(self.state_file, "r") as f:
                    data = json.load(f)

                # Load usage
                if "usage" in data:
                    usage_data = data["usage"]
                    self._usage = QuotaUsage(
                        tokens_hourly=usage_data.get("tokens_hourly", 0),
                        tokens_daily=usage_data.get("tokens_daily", 0),
                        messages_hourly=usage_data.get("messages_hourly", 0),
                        messages_daily=usage_data.get("messages_daily", 0),
                        last_reset_hourly=datetime.fromisoformat(
                            usage_data.get("last_reset_hourly", datetime.now(timezone.utc).isoformat())
                        ),
                        last_reset_daily=datetime.fromisoformat(
                            usage_data.get("last_reset_daily", datetime.now(timezone.utc).isoformat())
                        ),
                    )

                # Load circuit state
                if "circuit" in data:
                    circuit_data = data["circuit"]
                    self._circuit = CircuitBreakerState(
                        state=CircuitState(circuit_data.get("state", "CLOSED")),
                        opened_at=datetime.fromisoformat(circuit_data["opened_at"])
                        if circuit_data.get("opened_at")
                        else None,
                        reason=circuit_data.get("reason"),
                        last_state_change=datetime.fromisoformat(
                            circuit_data.get("last_state_change", datetime.now(timezone.utc).isoformat())
                        ),
                    )

                # Load budgets
                self._budget_by_agent = data.get("budget_by_agent", {})
                self._budget_by_task = data.get("budget_by_task", {})

            except Exception as e:
                logger.warning(f"Error loading quota state: {e}")

    def _save_state(self):
        """Save state to file."""
        try:
            data = {
                "usage": {
                    "tokens_hourly": self._usage.tokens_hourly,
                    "tokens_daily": self._usage.tokens_daily,
                    "messages_hourly": self._usage.messages_hourly,
                    "messages_daily": self._usage.messages_daily,
                    "last_reset_hourly": self._usage.last_reset_hourly.isoformat(),
                    "last_reset_daily": self._usage.last_reset_daily.isoformat(),
                },
                "circuit": {
                    "state": self._circuit.state.value,
                    "opened_at": self._circuit.opened_at.isoformat() if self._circuit.opened_at else None,
                    "reason": self._circuit.reason,
                    "last_state_change": self._circuit.last_state_change.isoformat(),
                },
                "budget_by_agent": self._budget_by_agent,
                "budget_by_task": self._budget_by_task,
            }

            with open(self.state_file, "w") as f:
                json.dump(data, f, indent=2)

        except Exception as e:
            logger.error(f"Error saving quota state: {e}")

    def _check_reset_schedule(self):
        """Check if quotas need to be reset based on schedule."""
        now = datetime.now(timezone.utc)

        # Reset hourly quota at :00
        if now.hour != self._usage.last_reset_hourly.hour:
            self._reset_hourly_quota()

        # Reset daily quota at midnight UTC
        if now.date() > self._usage.last_reset_daily.date():
            self._reset_daily_quota()

    def _reset_hourly_quota(self):
        """Reset hourly quotas."""
        with self._lock:
            self._usage.tokens_hourly = 0
            self._usage.messages_hourly = 0
            self._usage.last_reset_hourly = datetime.now(timezone.utc)
            self._save_state()
            logger.info("Hourly quota reset")

    def _reset_daily_quota(self):
        """Reset daily quotas."""
        with self._lock:
            self._usage.tokens_daily = 0
            self._usage.messages_daily = 0
            self._usage.last_reset_daily = datetime.now(timezone.utc)
            self._save_state()

            # Close circuit if it was open due to daily quota
            if (
                self._circuit.state == CircuitState.OPEN
                and self._circuit.reason
                and "daily" in self._circuit.reason.lower()
            ):
                self._close_circuit("Daily quota reset")
            else:
                self._save_state()

            logger.info("Daily quota reset")

    def _schedule_resets(self):
        """Schedule automatic quota resets (runs in background thread)."""
        import threading

        def reset_loop():
            while True:
                time.sleep(60)  # Check every minute
                self._check_reset_schedule()

        thread = threading.Thread(target=reset_loop, daemon=True)
        thread.start()

    def record_tokens(self, tokens: int, agent_id: Optional[str] = None, task_type: Optional[str] = None):
        """
        Record token usage.

        Args:
            tokens: Number of tokens used
            agent_id: Optional agent ID for budget tracking
            task_type: Optional task type for budget tracking
        """
        with self._lock:
            self._check_reset_schedule()

            self._usage.tokens_hourly += tokens
            self._usage.tokens_daily += tokens

            if agent_id:
                self._budget_by_agent[agent_id] = self._budget_by_agent.get(agent_id, 0) + tokens

            if task_type:
                self._budget_by_task[task_type] = self._budget_by_task.get(task_type, 0) + tokens

            self._save_state()
            self._check_thresholds()

    def record_message(self, agent_id: Optional[str] = None):
        """
        Record message usage.

        Args:
            agent_id: Optional agent ID for budget tracking
        """
        with self._lock:
            self._check_reset_schedule()

            self._usage.messages_hourly += 1
            self._usage.messages_daily += 1

            self._save_state()
            self._check_thresholds()

    def _check_thresholds(self):
        """Check quota thresholds and trigger alerts/circuit breaker."""
        # Check daily token quota
        daily_usage_pct = self._usage.tokens_daily / self.limits.tokens_per_day
        hourly_usage_pct = self._usage.tokens_hourly / self.limits.tokens_per_hour

        # Warning threshold
        if daily_usage_pct >= self.limits.warning_threshold:
            logger.warning(
                f"Quota warning: {daily_usage_pct:.1%} of daily token limit used "
                f"({self._usage.tokens_daily}/{self.limits.tokens_per_day})"
            )

        # Critical threshold - open circuit
        if daily_usage_pct >= self.limits.critical_threshold:
            if self._circuit.state != CircuitState.OPEN:
                self._open_circuit(
                    f"Daily token quota exceeded {self.limits.critical_threshold:.0%} "
                    f"({self._usage.tokens_daily}/{self.limits.tokens_per_day})"
                )

    def _open_circuit(self, reason: str):
        """Open circuit breaker."""
        if self._circuit.state != CircuitState.OPEN:
            self._circuit.state = CircuitState.OPEN
            self._circuit.opened_at = datetime.now(timezone.utc)
            self._circuit.reason = reason
            self._circuit.last_state_change = datetime.now(timezone.utc)
            self._save_state()
            logger.critical(f"Circuit breaker OPENED: {reason}")

    def _close_circuit(self, reason: str):
        """Close circuit breaker."""
        if self._circuit.state != CircuitState.CLOSED:
            self._circuit.state = CircuitState.CLOSED
            self._circuit.opened_at = None
            self._circuit.reason = reason
            self._circuit.last_state_change = datetime.now(timezone.utc)
            self._save_state()
            logger.info(f"Circuit breaker CLOSED: {reason}")

    def check_usage(self) -> Dict[str, Any]:
        """
        Check current usage and circuit state.

        Returns:
            Dictionary with usage stats and circuit state
        """
        with self._lock:
            self._check_reset_schedule()

            return {
                "tokens_hourly": {
                    "used": self._usage.tokens_hourly,
                    "limit": self.limits.tokens_per_hour,
                    "remaining": max(0, self.limits.tokens_per_hour - self._usage.tokens_hourly),
                    "percentage": self._usage.tokens_hourly / self.limits.tokens_per_hour,
                },
                "tokens_daily": {
                    "used": self._usage.tokens_daily,
                    "limit": self.limits.tokens_per_day,
                    "remaining": max(0, self.limits.tokens_per_day - self._usage.tokens_daily),
                    "percentage": self._usage.tokens_daily / self.limits.tokens_per_day,
                },
                "messages_hourly": {
                    "used": self._usage.messages_hourly,
                    "limit": self.limits.messages_per_hour,
                    "remaining": max(0, self.limits.messages_per_hour - self._usage.messages_hourly),
                },
                "messages_daily": {
                    "used": self._usage.messages_daily,
                    "limit": self.limits.messages_per_day,
                    "remaining": max(0, self.limits.messages_per_day - self._usage.messages_daily),
                },
                "circuit_state": self._circuit.state.value,
                "circuit_opened_at": self._circuit.opened_at.isoformat() if self._circuit.opened_at else None,
                "circuit_reason": self._circuit.reason,
            }

    def get_remaining_quota(self) -> Dict[str, int]:
        """Get remaining quota for all dimensions."""
        usage = self.check_usage()
        return {
            "tokens_hourly": usage["tokens_hourly"]["remaining"],
            "tokens_daily": usage["tokens_daily"]["remaining"],
            "messages_hourly": usage["messages_hourly"]["remaining"],
            "messages_daily": usage["messages_daily"]["remaining"],
        }

    def is_circuit_open(self) -> bool:
        """Check if circuit breaker is open."""
        with self._lock:
            self._check_reset_schedule()
            return self._circuit.state == CircuitState.OPEN

    def get_budget_by_agent(self) -> Dict[str, int]:
        """Get budget breakdown by agent."""
        with self._lock:
            return self._budget_by_agent.copy()

    def get_budget_by_task_type(self) -> Dict[str, int]:
        """Get budget breakdown by task type."""
        with self._lock:
            return self._budget_by_task.copy()


# Global quota tracker instance
_quota_tracker: Optional[QuotaTracker] = None
_tracker_lock = threading.Lock()


def get_quota_tracker() -> QuotaTracker:
    """Get or create global quota tracker instance."""
    global _quota_tracker
    if _quota_tracker is None:
        with _tracker_lock:
            if _quota_tracker is None:
                _quota_tracker = QuotaTracker()
    return _quota_tracker



