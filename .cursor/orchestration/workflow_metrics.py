"""
Workflow Metrics - Collect and aggregate workflow execution metrics.

This module provides metrics collection for workflow execution, including
success rates, execution times, error rates, and throughput.

Version: 1.0
Last Updated: 2025-01-21
"""

import logging
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, List

from .event_log import event_log, WorkflowEvent

logger = logging.getLogger(__name__)


@dataclass
class WorkflowMetrics:
    """Aggregated workflow metrics."""
    workflow_id: str
    total_executions: int
    successful_executions: int
    failed_executions: int
    cancelled_executions: int
    average_duration_ms: Optional[float]
    success_rate: float
    failure_rate: float
    last_execution_at: Optional[str]
    last_success_at: Optional[str]
    last_failure_at: Optional[str]


@dataclass
class SystemMetrics:
    """System-wide workflow metrics."""
    total_workflows: int
    total_executions: int
    active_executions: int
    successful_executions: int
    failed_executions: int
    cancelled_executions: int
    overall_success_rate: float
    average_duration_ms: Optional[float]
    executions_last_24h: int
    executions_last_7d: int
    top_workflows: List[Dict[str, Any]]  # List of {workflow_id, execution_count}


class WorkflowMetricsCollector:
    """
    Collects and aggregates workflow execution metrics.
    
    Features:
    - Workflow-specific metrics
    - System-wide metrics
    - Time-based filtering
    - Performance metrics
    """
    
    def __init__(self, event_log_instance=None):
        """
        Initialize metrics collector.
        
        Args:
            event_log_instance: EventLog instance (default: global event_log)
        """
        self.event_log = event_log_instance or event_log
    
    def get_workflow_metrics(
        self,
        workflow_id: str,
        since: Optional[str] = None
    ) -> WorkflowMetrics:
        """
        Get metrics for a specific workflow.
        
        Args:
            workflow_id: Workflow ID
            since: Optional ISO timestamp to filter events (default: all time)
        
        Returns:
            WorkflowMetrics object
        """
        # Get all workflow events for this workflow
        events = self.event_log.get_events(
            workflow_id=workflow_id,
            limit=10000  # Large limit to get all events
        )
        
        # Filter by time if specified
        if since:
            since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
            events = [
                e for e in events
                if datetime.fromisoformat(e.timestamp.replace('Z', '+00:00')) >= since_dt
            ]
        
        # Extract unique execution IDs
        execution_ids = set(e.execution_id for e in events)
        
        # Count executions by status
        total_executions = len(execution_ids)
        successful_executions = 0
        failed_executions = 0
        cancelled_executions = 0
        
        durations = []
        last_execution_at = None
        last_success_at = None
        last_failure_at = None
        
        for exec_id in execution_ids:
            # Get workflow_started and workflow_completed/failed events
            started_events = [e for e in events if e.execution_id == exec_id and e.event_type == "workflow_started"]
            completed_events = [e for e in events if e.execution_id == exec_id and e.event_type == "workflow_completed"]
            failed_events = [e for e in events if e.execution_id == exec_id and e.event_type == "workflow_failed"]
            cancelled_events = [e for e in events if e.execution_id == exec_id and e.event_type == "workflow_cancelled"]
            
            if started_events:
                start_time = started_events[0].timestamp
                if not last_execution_at or start_time > last_execution_at:
                    last_execution_at = start_time
                
                # Check completion status
                if completed_events:
                    successful_executions += 1
                    end_time = completed_events[0].timestamp
                    if not last_success_at or end_time > last_success_at:
                        last_success_at = end_time
                    
                    # Calculate duration
                    start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                    end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                    duration_ms = (end_dt - start_dt).total_seconds() * 1000
                    durations.append(duration_ms)
                
                elif failed_events:
                    failed_executions += 1
                    end_time = failed_events[0].timestamp
                    if not last_failure_at or end_time > last_failure_at:
                        last_failure_at = end_time
                    
                    # Calculate duration even for failures
                    start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                    end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                    duration_ms = (end_dt - start_dt).total_seconds() * 1000
                    durations.append(duration_ms)
                
                elif cancelled_events:
                    cancelled_executions += 1
        
        # Calculate averages
        average_duration_ms = sum(durations) / len(durations) if durations else None
        
        # Calculate rates
        success_rate = (successful_executions / total_executions) if total_executions > 0 else 0.0
        failure_rate = (failed_executions / total_executions) if total_executions > 0 else 0.0
        
        return WorkflowMetrics(
            workflow_id=workflow_id,
            total_executions=total_executions,
            successful_executions=successful_executions,
            failed_executions=failed_executions,
            cancelled_executions=cancelled_executions,
            average_duration_ms=average_duration_ms,
            success_rate=success_rate,
            failure_rate=failure_rate,
            last_execution_at=last_execution_at,
            last_success_at=last_success_at,
            last_failure_at=last_failure_at
        )
    
    def get_system_metrics(self, since: Optional[str] = None) -> SystemMetrics:
        """
        Get system-wide metrics.
        
        Args:
            since: Optional ISO timestamp to filter events (default: all time)
        
        Returns:
            SystemMetrics object
        """
        # Get all workflow events
        events = self.event_log.get_events(limit=10000)
        
        # Filter by time if specified
        if since:
            since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
            events = [
                e for e in events
                if datetime.fromisoformat(e.timestamp.replace('Z', '+00:00')) >= since_dt
            ]
        
        # Extract unique workflow IDs and execution IDs
        workflow_ids = set(e.workflow_id for e in events)
        execution_ids = set(e.execution_id for e in events)
        
        # Count executions by status
        total_executions = len(execution_ids)
        successful_executions = 0
        failed_executions = 0
        cancelled_executions = 0
        
        durations = []
        workflow_counts: Dict[str, int] = {}
        
        # Calculate time windows
        now = datetime.utcnow()
        last_24h = (now - timedelta(days=1)).isoformat() + 'Z'
        last_7d = (now - timedelta(days=7)).isoformat() + 'Z'
        
        executions_last_24h = 0
        executions_last_7d = 0
        
        for exec_id in execution_ids:
            exec_events = [e for e in events if e.execution_id == exec_id]
            
            # Get workflow ID for this execution
            workflow_id = exec_events[0].workflow_id if exec_events else None
            if workflow_id:
                workflow_counts[workflow_id] = workflow_counts.get(workflow_id, 0) + 1
            
            # Check execution status
            started_events = [e for e in exec_events if e.event_type == "workflow_started"]
            completed_events = [e for e in exec_events if e.event_type == "workflow_completed"]
            failed_events = [e for e in exec_events if e.event_type == "workflow_failed"]
            cancelled_events = [e for e in exec_events if e.event_type == "workflow_cancelled"]
            
            if started_events:
                start_time = started_events[0].timestamp
                start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                
                # Check time windows
                if start_dt >= datetime.fromisoformat(last_24h.replace('Z', '+00:00')):
                    executions_last_24h += 1
                if start_dt >= datetime.fromisoformat(last_7d.replace('Z', '+00:00')):
                    executions_last_7d += 1
                
                if completed_events:
                    successful_executions += 1
                    end_time = completed_events[0].timestamp
                    end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                    duration_ms = (end_dt - start_dt).total_seconds() * 1000
                    durations.append(duration_ms)
                
                elif failed_events:
                    failed_executions += 1
                    end_time = failed_events[0].timestamp
                    end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                    duration_ms = (end_dt - start_dt).total_seconds() * 1000
                    durations.append(duration_ms)
                
                elif cancelled_events:
                    cancelled_executions += 1
        
        # Calculate averages
        average_duration_ms = sum(durations) / len(durations) if durations else None
        
        # Calculate overall success rate
        overall_success_rate = (
            (successful_executions / total_executions) if total_executions > 0 else 0.0
        )
        
        # Get top workflows by execution count
        top_workflows = [
            {"workflow_id": wf_id, "execution_count": count}
            for wf_id, count in sorted(
                workflow_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10]
        ]
        
        return SystemMetrics(
            total_workflows=len(workflow_ids),
            total_executions=total_executions,
            active_executions=0,  # Would need to query active executions separately
            successful_executions=successful_executions,
            failed_executions=failed_executions,
            cancelled_executions=cancelled_executions,
            overall_success_rate=overall_success_rate,
            average_duration_ms=average_duration_ms,
            executions_last_24h=executions_last_24h,
            executions_last_7d=executions_last_7d,
            top_workflows=top_workflows
        )
    
    def get_execution_metrics(self, execution_id: str) -> Dict[str, Any]:
        """
        Get detailed metrics for a specific execution.
        
        Args:
            execution_id: Execution ID
        
        Returns:
            Dictionary with execution metrics
        """
        events = self.event_log.get_events(execution_id=execution_id, limit=1000)
        
        if not events:
            return {}
        
        # Get workflow ID
        workflow_id = events[0].workflow_id if events else None
        
        # Find start and end events
        started_event = next((e for e in events if e.event_type == "workflow_started"), None)
        completed_event = next((e for e in events if e.event_type == "workflow_completed"), None)
        failed_event = next((e for e in events if e.event_type == "workflow_failed"), None)
        
        status = "unknown"
        duration_ms = None
        
        if started_event:
            start_time = started_event.timestamp
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            
            if completed_event:
                status = "completed"
                end_time = completed_event.timestamp
                end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                duration_ms = (end_dt - start_dt).total_seconds() * 1000
            elif failed_event:
                status = "failed"
                end_time = failed_event.timestamp
                end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                duration_ms = (end_dt - start_dt).total_seconds() * 1000
        
        # Count phases and steps
        phase_events = [e for e in events if e.event_type in ["phase_started", "phase_completed", "phase_failed"]]
        step_events = [e for e in events if e.event_type in ["step_started", "step_completed", "step_failed"]]
        
        phases_started = len([e for e in phase_events if e.event_type == "phase_started"])
        phases_completed = len([e for e in phase_events if e.event_type == "phase_completed"])
        phases_failed = len([e for e in phase_events if e.event_type == "phase_failed"])
        
        steps_started = len([e for e in step_events if e.event_type == "step_started"])
        steps_completed = len([e for e in step_events if e.event_type == "step_completed"])
        steps_failed = len([e for e in step_events if e.event_type == "step_failed"])
        
        return {
            "execution_id": execution_id,
            "workflow_id": workflow_id,
            "status": status,
            "duration_ms": duration_ms,
            "phases": {
                "started": phases_started,
                "completed": phases_completed,
                "failed": phases_failed
            },
            "steps": {
                "started": steps_started,
                "completed": steps_completed,
                "failed": steps_failed
            },
            "total_events": len(events)
        }


# Global metrics collector instance
_metrics_collector: Optional[WorkflowMetricsCollector] = None


def get_metrics_collector() -> WorkflowMetricsCollector:
    """Get or create global metrics collector instance."""
    global _metrics_collector
    if _metrics_collector is None:
        _metrics_collector = WorkflowMetricsCollector()
    return _metrics_collector
