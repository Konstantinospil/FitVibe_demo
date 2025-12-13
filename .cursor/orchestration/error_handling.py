"""
Error Handling & Recovery - Retry logic, error classification, and dead-letter queues.

This module provides comprehensive error handling for the multi-agent system,
including retry logic, error classification, and dead-letter queue management.

Version: 1.0
Last Updated: 2025-01-21
"""

import os
import json
import logging
import time
from typing import Dict, Any, Optional, List, Callable, TypeVar, Generic
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path

# Import with fallback for testing
try:
    from ..observability.audit_logger import audit_logger, EventType
except ImportError:
    from .audit_logger_fallback import _audit_logger_fallback as audit_logger
    from enum import Enum
    EventType = Enum("EventType", ["TOOL_CALL", "INFO", "ERROR", "WARNING", "APPROVAL_REQUEST", "APPROVAL_DECISION"])

T = TypeVar('T')


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"  # Normal operation, requests pass through
    OPEN = "open"  # Circuit is open, requests fail immediately
    HALF_OPEN = "half_open"  # Testing if service recovered


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"  # Normal operation, requests pass through
    OPEN = "open"  # Circuit is open, requests fail immediately
    HALF_OPEN = "half_open"  # Testing if service recovered


class ErrorCategory(Enum):
    """Error categories for classification."""
    TRANSIENT = "transient"  # Temporary errors, should retry
    PERMANENT = "permanent"  # Permanent errors, don't retry
    USER_ERROR = "user_error"  # User input errors, don't retry
    SYSTEM_ERROR = "system_error"  # System errors, may retry
    RATE_LIMIT = "rate_limit"  # Rate limit errors, retry with backoff
    TIMEOUT = "timeout"  # Timeout errors, may retry
    NETWORK = "network"  # Network errors, should retry


class ErrorSeverity(Enum):
    """Error severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ClassifiedError:
    """Classified error with metadata."""
    error: Exception
    category: ErrorCategory
    severity: ErrorSeverity
    message: str
    retryable: bool
    retry_delay_seconds: float = 0.0
    context: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RetryConfig:
    """Retry configuration."""
    max_attempts: int = 3
    backoff_base: float = 2.0  # Exponential backoff base
    backoff_max: float = 60.0  # Maximum backoff in seconds
    initial_delay: float = 1.0  # Initial delay in seconds
    jitter: bool = True  # Add random jitter to backoff


@dataclass
class FailedTask:
    """Represents a failed task in the dead-letter queue."""
    task_id: str
    agent_id: str
    workflow_id: Optional[str]
    error: ClassifiedError
    attempts: int
    failed_at: str
    context: Dict[str, Any] = field(default_factory=dict)
    can_retry: bool = True
    retry_after: Optional[str] = None


class ErrorClassifier:
    """Classifies errors for appropriate handling."""
    
    def classify(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> ClassifiedError:
        """
        Classifies an error and determines retry strategy.
        
        Args:
            error: The exception to classify
            context: Additional context about the error
        
        Returns:
            ClassifiedError with category, severity, and retry strategy
        """
        context = context or {}
        error_type = type(error).__name__
        error_message = str(error)
        
        # Classify by error type and message
        if "timeout" in error_message.lower() or "timed out" in error_message.lower():
            return ClassifiedError(
                error=error,
                category=ErrorCategory.TIMEOUT,
                severity=ErrorSeverity.MEDIUM,
                message=error_message,
                retryable=True,
                retry_delay_seconds=5.0,
                context=context
            )
        
        if "rate limit" in error_message.lower() or "429" in error_message:
            return ClassifiedError(
                error=error,
                category=ErrorCategory.RATE_LIMIT,
                severity=ErrorSeverity.MEDIUM,
                message=error_message,
                retryable=True,
                retry_delay_seconds=60.0,  # Wait longer for rate limits
                context=context
            )
        
        if "network" in error_message.lower() or "connection" in error_message.lower():
            return ClassifiedError(
                error=error,
                category=ErrorCategory.NETWORK,
                severity=ErrorSeverity.MEDIUM,
                message=error_message,
                retryable=True,
                retry_delay_seconds=2.0,
                context=context
            )
        
        if "validation" in error_message.lower() or "invalid" in error_message.lower():
            return ClassifiedError(
                error=error,
                category=ErrorCategory.USER_ERROR,
                severity=ErrorSeverity.LOW,
                message=error_message,
                retryable=False,
                context=context
            )
        
        if "not found" in error_message.lower() or "404" in error_message:
            return ClassifiedError(
                error=error,
                category=ErrorCategory.PERMANENT,
                severity=ErrorSeverity.LOW,
                message=error_message,
                retryable=False,
                context=context
            )
        
        # Default classification
        return ClassifiedError(
            error=error,
            category=ErrorCategory.SYSTEM_ERROR,
            severity=ErrorSeverity.HIGH,
            message=error_message,
            retryable=True,
            retry_delay_seconds=1.0,
            context=context
        )


class RetryHandler:
    """Handles retry logic with exponential backoff."""
    
    def __init__(self, config: Optional[RetryConfig] = None):
        self.config = config or RetryConfig()
        self.classifier = ErrorClassifier()
    
    def execute_with_retry(
        self,
        func: Callable[[], T],
        task_id: str,
        agent_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> T:
        """
        Executes a function with retry logic.
        
        Args:
            func: Function to execute
            task_id: Task identifier
            agent_id: Agent identifier
            context: Additional context
        
        Returns:
            Function result
        
        Raises:
            Exception: If all retries fail
        """
        last_error = None
        context = context or {}
        
        for attempt in range(1, self.config.max_attempts + 1):
            try:
                result = func()
                
                # Log successful retry if not first attempt
                if attempt > 1:
                    audit_logger.log_info(
                        agent_id=agent_id,
                        message=f"Task {task_id} succeeded on attempt {attempt}",
                        details={"task_id": task_id, "attempt": attempt}
                    )
                
                return result
                
            except Exception as e:
                last_error = e
                classified = self.classifier.classify(e, {**context, "attempt": attempt})
                
                # Don't retry if error is not retryable
                if not classified.retryable:
                    audit_logger.log_error(
                        agent_id=agent_id,
                        message=f"Task {task_id} failed with non-retryable error",
                        error_type=classified.category.value,
                        details={
                            "task_id": task_id,
                            "error": classified.message,
                            "category": classified.category.value,
                            "severity": classified.severity.value
                        }
                    )
                    raise
                
                # Don't retry if max attempts reached
                if attempt >= self.config.max_attempts:
                    audit_logger.log_error(
                        agent_id=agent_id,
                        message=f"Task {task_id} failed after {attempt} attempts",
                        error_type=classified.category.value,
                        details={
                            "task_id": task_id,
                            "error": classified.message,
                            "attempts": attempt,
                            "category": classified.category.value
                        }
                    )
                    raise
                
                # Calculate backoff delay
                delay = self._calculate_backoff(attempt, classified.retry_delay_seconds)
                
                audit_logger.log_warning(
                    agent_id=agent_id,
                    message=f"Task {task_id} failed, retrying in {delay:.2f}s (attempt {attempt}/{self.config.max_attempts})",
                    details={
                        "task_id": task_id,
                        "error": classified.message,
                        "attempt": attempt,
                        "delay": delay,
                        "category": classified.category.value
                    }
                )
                
                time.sleep(delay)
        
        # Should not reach here, but just in case
        raise last_error
    
    def _calculate_backoff(self, attempt: int, base_delay: float) -> float:
        """Calculates exponential backoff delay."""
        delay = min(
            base_delay * (self.config.backoff_base ** (attempt - 1)),
            self.config.backoff_max
        )
        
        if self.config.jitter:
            import random
            delay = delay * (0.5 + random.random() * 0.5)  # Add 0-50% jitter
        
        return delay


class DeadLetterQueue:
    """Manages failed tasks in a dead-letter queue."""
    
    def __init__(self, queue_dir: str = ".cursor/data/dead_letter_queue"):
        self.queue_dir = Path(queue_dir)
        self.queue_dir.mkdir(parents=True, exist_ok=True)
        self.classifier = ErrorClassifier()
    
    def add_failed_task(
        self,
        task_id: str,
        agent_id: str,
        workflow_id: Optional[str],
        error: Exception,
        attempts: int,
        context: Optional[Dict[str, Any]] = None
    ):
        """Adds a failed task to the dead-letter queue."""
        classified = self.classifier.classify(error, context)
        
        failed_task = FailedTask(
            task_id=task_id,
            agent_id=agent_id,
            workflow_id=workflow_id,
            error=classified,
            attempts=attempts,
            failed_at=datetime.utcnow().isoformat(),
            context=context or {},
            can_retry=classified.retryable,
            retry_after=(
                (datetime.utcnow() + timedelta(seconds=classified.retry_delay_seconds)).isoformat()
                if classified.retryable else None
            )
        )
        
        task_file = self.queue_dir / f"{task_id}.json"
        
        # Convert to dict with proper enum serialization
        task_dict = asdict(failed_task)
        # Convert enum values to their string values for JSON serialization
        if "error" in task_dict and task_dict["error"]:
            error_dict = task_dict["error"]
            if "category" in error_dict:
                cat = error_dict["category"]
                # Handle both enum and string
                if isinstance(cat, ErrorCategory):
                    error_dict["category"] = cat.value
                elif isinstance(cat, str) and not cat.startswith("ErrorCategory"):
                    error_dict["category"] = cat  # Already a value string
                else:
                    error_dict["category"] = "system_error"  # Fallback
            if "severity" in error_dict:
                sev = error_dict["severity"]
                if isinstance(sev, ErrorSeverity):
                    error_dict["severity"] = sev.value
                elif isinstance(sev, str) and not sev.startswith("ErrorSeverity"):
                    error_dict["severity"] = sev
                else:
                    error_dict["severity"] = "medium"  # Fallback
        
        with open(task_file, 'w') as f:
            json.dump(task_dict, f, indent=2, default=str)
        
        audit_logger.log_error(
            error_message=f"Task {task_id} added to dead-letter queue: {classified.message}",
            agent_id=agent_id,
            context={
                "task_id": task_id,
                "error": classified.message,
                "attempts": attempts,
                "category": classified.category.value,
                "can_retry": classified.retryable,
                "workflow_id": workflow_id
            }
        )
    
    def get_failed_tasks(
        self,
        agent_id: Optional[str] = None,
        can_retry: Optional[bool] = None,
        limit: int = 100
    ) -> List[FailedTask]:
        """Gets failed tasks from the dead-letter queue."""
        tasks = []
        
        for task_file in self.queue_dir.glob("*.json"):
            try:
                with open(task_file, 'r') as f:
                    data = json.load(f)
                
                # Reconstruct ClassifiedError
                error_data = data["error"]
                error = Exception(error_data["message"])
                
                # Handle category - could be enum value, string value, or enum name
                category_value = error_data["category"]
                if isinstance(category_value, str):
                    # Remove "ErrorCategory." prefix if present
                    if category_value.startswith("ErrorCategory."):
                        category_value = category_value.replace("ErrorCategory.", "")
                    # Try to get enum by value first
                    try:
                        category = ErrorCategory(category_value)
                    except ValueError:
                        # Try by name
                        try:
                            category = getattr(ErrorCategory, category_value)
                        except (AttributeError, TypeError):
                            # Fallback to SYSTEM_ERROR if invalid
                            category = ErrorCategory.SYSTEM_ERROR
                else:
                    category = ErrorCategory(category_value) if isinstance(category_value, ErrorCategory) else ErrorCategory.SYSTEM_ERROR
                
                # Handle severity - could be enum value, string value, or enum name
                severity_value = error_data["severity"]
                if isinstance(severity_value, str):
                    # Remove "ErrorSeverity." prefix if present
                    if severity_value.startswith("ErrorSeverity."):
                        severity_value = severity_value.replace("ErrorSeverity.", "")
                    try:
                        severity = ErrorSeverity(severity_value)
                    except ValueError:
                        try:
                            severity = getattr(ErrorSeverity, severity_value)
                        except (AttributeError, TypeError):
                            severity = ErrorSeverity.MEDIUM
                else:
                    severity = ErrorSeverity(severity_value) if isinstance(severity_value, ErrorSeverity) else ErrorSeverity.MEDIUM
                
                classified = ClassifiedError(
                    error=error,
                    category=category,
                    severity=severity,
                    message=error_data["message"],
                    retryable=error_data["retryable"],
                    retry_delay_seconds=error_data.get("retry_delay_seconds", 0.0),
                    context=error_data.get("context", {})
                )
                
                task = FailedTask(
                    task_id=data["task_id"],
                    agent_id=data["agent_id"],
                    workflow_id=data.get("workflow_id"),
                    error=classified,
                    attempts=data["attempts"],
                    failed_at=data["failed_at"],
                    context=data.get("context", {}),
                    can_retry=data.get("can_retry", True),
                    retry_after=data.get("retry_after")
                )
                
                # Apply filters
                if agent_id and task.agent_id != agent_id:
                    continue
                if can_retry is not None and task.can_retry != can_retry:
                    continue
                
                tasks.append(task)
                
                if len(tasks) >= limit:
                    break
                    
            except Exception as e:
                logging.warning(f"Error reading dead-letter queue file {task_file}: {e}")
                continue
        
        return sorted(tasks, key=lambda t: t.failed_at, reverse=True)
    
    def remove_task(self, task_id: str) -> bool:
        """Removes a task from the dead-letter queue."""
        task_file = self.queue_dir / f"{task_id}.json"
        if task_file.exists():
            task_file.unlink()
            return True
        return False


class CircuitBreaker:
    """
    Circuit breaker pattern for preventing cascading failures.
    
    The circuit breaker monitors failures and opens the circuit when
    the failure threshold is exceeded, preventing further requests
    until the service recovers.
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        timeout_seconds: float = 60.0,
        name: str = "default"
    ):
        """
        Initialize circuit breaker.
        
        Args:
            failure_threshold: Number of failures before opening circuit
            timeout_seconds: Time to wait before attempting half-open
            name: Circuit breaker name for identification
        """
        self.failure_threshold = failure_threshold
        self.timeout_seconds = timeout_seconds
        self.name = name
        
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.success_count = 0
        self.half_open_attempts = 0
    
    def call(self, func: Callable[[], T], *args, **kwargs) -> T:
        """
        Execute function with circuit breaker protection.
        
        Args:
            func: Function to execute
            *args: Function arguments
            **kwargs: Function keyword arguments
        
        Returns:
            Function result
        
        Raises:
            CircuitBreakerOpenError: If circuit is open
            Exception: If function execution fails
        """
        # Check circuit state
        if self.state == CircuitState.OPEN:
            # Check if timeout has passed
            if self.last_failure_time:
                elapsed = (datetime.utcnow() - self.last_failure_time).total_seconds()
                if elapsed >= self.timeout_seconds:
                    # Transition to half-open
                    self.state = CircuitState.HALF_OPEN
                    self.half_open_attempts = 0
                    logger.info(f"Circuit breaker '{self.name}' transitioning to HALF_OPEN")
                else:
                    # Circuit still open
                    raise CircuitBreakerOpenError(
                        f"Circuit breaker '{self.name}' is OPEN. "
                        f"Retry after {self.timeout_seconds - elapsed:.1f} seconds"
                    )
        
        # Execute function
        try:
            result = func(*args, **kwargs)
            
            # Success - reset failure count
            if self.state == CircuitState.HALF_OPEN:
                self.success_count += 1
                # If we get a few successes, close the circuit
                if self.success_count >= 2:
                    self.state = CircuitState.CLOSED
                    self.failure_count = 0
                    self.success_count = 0
                    self.half_open_attempts = 0
                    logger.info(f"Circuit breaker '{self.name}' transitioning to CLOSED")
            elif self.state == CircuitState.CLOSED:
                # Reset failure count on success
                self.failure_count = 0
            
            return result
        
        except Exception as e:
            # Failure - increment failure count
            self.failure_count += 1
            self.last_failure_time = datetime.utcnow()
            
            if self.state == CircuitState.HALF_OPEN:
                # Failure in half-open state - open circuit again
                self.state = CircuitState.OPEN
                self.half_open_attempts = 0
                logger.warning(f"Circuit breaker '{self.name}' transitioning to OPEN (half-open failure)")
            elif self.state == CircuitState.CLOSED:
                # Check if threshold exceeded
                if self.failure_count >= self.failure_threshold:
                    self.state = CircuitState.OPEN
                    logger.warning(
                        f"Circuit breaker '{self.name}' transitioning to OPEN "
                        f"(failure count: {self.failure_count})"
                    )
            
            # Re-raise the exception
            raise
    
    def reset(self):
        """Manually reset circuit breaker to closed state."""
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.half_open_attempts = 0
        self.last_failure_time = None
        logger.info(f"Circuit breaker '{self.name}' manually reset to CLOSED")
    
    def get_state(self) -> Dict[str, Any]:
        """Get current circuit breaker state."""
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "failure_threshold": self.failure_threshold,
            "last_failure_time": self.last_failure_time.isoformat() if self.last_failure_time else None,
            "timeout_seconds": self.timeout_seconds
        }


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open and request is rejected."""
    pass


# Global instances
error_classifier = ErrorClassifier()
retry_handler = RetryHandler()
dead_letter_queue = DeadLetterQueue()

# Circuit breaker registry
_circuit_breakers: Dict[str, CircuitBreaker] = {}


def get_circuit_breaker(name: str = "default", **kwargs) -> CircuitBreaker:
    """
    Get or create a circuit breaker instance.
    
    Args:
        name: Circuit breaker name
        **kwargs: Circuit breaker configuration (failure_threshold, timeout_seconds)
    
    Returns:
        CircuitBreaker instance
    """
    if name not in _circuit_breakers:
        # Load config if available
        try:
            from .config_loader import config_loader
            workflow_config = config_loader.get_section("workflow_engine") or {}
            failure_threshold = kwargs.get(
                "failure_threshold",
                workflow_config.get("circuit_breaker_threshold", 5)
            )
            timeout_seconds = kwargs.get(
                "timeout_seconds",
                workflow_config.get("circuit_breaker_timeout_seconds", 60)
            )
        except ImportError:
            failure_threshold = kwargs.get("failure_threshold", 5)
            timeout_seconds = kwargs.get("timeout_seconds", 60.0)
        
        _circuit_breakers[name] = CircuitBreaker(
            failure_threshold=failure_threshold,
            timeout_seconds=timeout_seconds,
            name=name
        )
    
    return _circuit_breakers[name]

