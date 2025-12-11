"""
Tests for error handling and recovery module.

Version: 1.0
Last Updated: 2025-01-21
"""

import pytest
import time
from unittest.mock import Mock, patch

# Import from parent module
import sys
from pathlib import Path
cursor_path = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(cursor_path))

from .cursor.orchestration.error_handling import (
    ErrorClassifier,
    RetryHandler,
    DeadLetterQueue,
    ErrorCategory,
    ErrorSeverity,
    RetryConfig,
)


class TestErrorClassifier:
    """Tests for ErrorClassifier."""
    
    def test_classify_timeout_error(self):
        """Test classification of timeout errors."""
        classifier = ErrorClassifier()
        error = Exception("Request timed out after 30 seconds")
        
        classified = classifier.classify(error)
        
        assert classified.category == ErrorCategory.TIMEOUT
        assert classified.retryable is True
        assert classified.retry_delay_seconds > 0
    
    def test_classify_rate_limit_error(self):
        """Test classification of rate limit errors."""
        classifier = ErrorClassifier()
        error = Exception("Rate limit exceeded: 429")
        
        classified = classifier.classify(error)
        
        assert classified.category == ErrorCategory.RATE_LIMIT
        assert classified.retryable is True
        assert classified.retry_delay_seconds >= 60.0
    
    def test_classify_network_error(self):
        """Test classification of network errors."""
        classifier = ErrorClassifier()
        error = Exception("Network connection failed")
        
        classified = classifier.classify(error)
        
        assert classified.category == ErrorCategory.NETWORK
        assert classified.retryable is True
    
    def test_classify_validation_error(self):
        """Test classification of validation errors."""
        classifier = ErrorClassifier()
        error = Exception("Invalid input: validation failed")
        
        classified = classifier.classify(error)
        
        assert classified.category == ErrorCategory.USER_ERROR
        assert classified.retryable is False
    
    def test_classify_not_found_error(self):
        """Test classification of not found errors."""
        classifier = ErrorClassifier()
        error = Exception("Resource not found: 404")
        
        classified = classifier.classify(error)
        
        assert classified.category == ErrorCategory.PERMANENT
        assert classified.retryable is False


class TestRetryHandler:
    """Tests for RetryHandler."""
    
    def test_successful_execution_no_retry(self):
        """Test successful execution without retries."""
        handler = RetryHandler(RetryConfig(max_attempts=3))
        func = Mock(return_value="success")
        
        result = handler.execute_with_retry(func, "task-1", "agent-1")
        
        assert result == "success"
        assert func.call_count == 1
    
    def test_retry_on_transient_error(self):
        """Test retry on transient error."""
        handler = RetryHandler(RetryConfig(max_attempts=3, initial_delay=0.1))
        func = Mock(side_effect=[Exception("Network error"), "success"])
        
        result = handler.execute_with_retry(func, "task-1", "agent-1")
        
        assert result == "success"
        assert func.call_count == 2
    
    def test_max_attempts_exceeded(self):
        """Test failure after max attempts."""
        handler = RetryHandler(RetryConfig(max_attempts=2, initial_delay=0.1))
        func = Mock(side_effect=Exception("Persistent error"))
        
        with pytest.raises(Exception):
            handler.execute_with_retry(func, "task-1", "agent-1")
        
        assert func.call_count == 2
    
    def test_no_retry_on_non_retryable_error(self):
        """Test no retry on non-retryable error."""
        handler = RetryHandler(RetryConfig(max_attempts=3))
        func = Mock(side_effect=Exception("Invalid input: validation failed"))
        
        with pytest.raises(Exception):
            handler.execute_with_retry(func, "task-1", "agent-1")
        
        assert func.call_count == 1
    
    def test_exponential_backoff(self):
        """Test exponential backoff calculation."""
        handler = RetryHandler(RetryConfig(
            max_attempts=5,
            backoff_base=2.0,
            initial_delay=1.0,
            jitter=False
        ))
        
        delay1 = handler._calculate_backoff(1, 1.0)
        delay2 = handler._calculate_backoff(2, 1.0)
        delay3 = handler._calculate_backoff(3, 1.0)
        
        assert delay1 == 1.0
        assert delay2 == 2.0
        assert delay3 == 4.0


class TestDeadLetterQueue:
    """Tests for DeadLetterQueue."""
    
    def test_add_failed_task(self, tmp_path):
        """Test adding a failed task to DLQ."""
        queue = DeadLetterQueue(queue_dir=str(tmp_path / "dlq"))
        error = Exception("Test error")
        
        queue.add_failed_task(
            task_id="task-1",
            agent_id="agent-1",
            workflow_id="workflow-1",
            error=error,
            attempts=3
        )
        
        tasks = queue.get_failed_tasks()
        assert len(tasks) == 1
        assert tasks[0].task_id == "task-1"
        assert tasks[0].agent_id == "agent-1"
        assert tasks[0].attempts == 3
    
    def test_get_failed_tasks_filtered(self, tmp_path):
        """Test getting failed tasks with filters."""
        queue = DeadLetterQueue(queue_dir=str(tmp_path / "dlq"))
        
        # Add multiple tasks
        queue.add_failed_task("task-1", "agent-1", None, Exception("Error 1"), 1)
        queue.add_failed_task("task-2", "agent-2", None, Exception("Error 2"), 2)
        queue.add_failed_task("task-3", "agent-1", None, Exception("Error 3"), 3)
        
        # Filter by agent
        tasks = queue.get_failed_tasks(agent_id="agent-1")
        assert len(tasks) == 2
        assert all(t.agent_id == "agent-1" for t in tasks)
    
    def test_remove_task(self, tmp_path):
        """Test removing a task from DLQ."""
        queue = DeadLetterQueue(queue_dir=str(tmp_path / "dlq"))
        queue.add_failed_task("task-1", "agent-1", None, Exception("Error"), 1)
        
        assert queue.remove_task("task-1") is True
        assert len(queue.get_failed_tasks()) == 0
        assert queue.remove_task("task-1") is False

