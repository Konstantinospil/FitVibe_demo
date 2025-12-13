"""
Workflow Data Models - Data structures for workflow definitions and execution.

This module defines the data models used to represent workflows, phases, steps,
and execution state.

Version: 1.0
Last Updated: 2025-01-21
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from enum import Enum
from datetime import datetime


class WorkflowStatus(Enum):
    """Status of workflow execution."""
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StepType(Enum):
    """Type of workflow step."""
    AGENT = "agent"  # Execute an agent
    CONDITION = "condition"  # Conditional branch
    PARALLEL = "parallel"  # Parallel execution
    MANUAL = "manual"  # Manual intervention required
    SCRIPT = "script"  # Execute a script


class HandoffType(Enum):
    """Type of handoff between agents."""
    ALWAYS = "always"  # Always hand off
    CONDITIONAL = "conditional"  # Hand off based on condition
    ON_ERROR = "on_error"  # Hand off only on error
    NEVER = "never"  # Never hand off (end of workflow)


@dataclass
class WorkflowMetadata:
    """Metadata about a workflow definition."""
    version: str
    last_updated: str
    status: str  # "Active", "Deprecated", etc.
    priority: str  # "Standard", "Emergency", etc.
    workflow_id: str  # Unique identifier


@dataclass
class WorkflowCondition:
    """Represents a conditional branch in a workflow."""
    condition_id: str
    description: str
    condition_expression: Optional[str] = None  # For future evaluation
    true_branch: Optional[str] = None  # Next step if true
    false_branch: Optional[str] = None  # Next step if false
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkflowStep:
    """Represents a single step in a workflow."""
    step_id: str
    step_number: int
    name: str
    description: str
    step_type: StepType
    agent_id: Optional[str] = None  # Agent to execute (if type is AGENT)
    script_path: Optional[str] = None  # Script to execute (if type is SCRIPT)
    input_data: Dict[str, Any] = field(default_factory=dict)
    conditions: List[WorkflowCondition] = field(default_factory=list)
    handoff_to: Optional[str] = None  # Next agent/step
    handoff_type: HandoffType = HandoffType.ALWAYS
    handoff_criteria: Optional[str] = None  # Criteria for handoff
    is_mandatory: bool = True
    estimated_duration_minutes: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkflowPhase:
    """Represents a phase in a workflow."""
    phase_id: str
    phase_number: int
    name: str
    description: str
    estimated_duration_minutes: Optional[int] = None
    steps: List[WorkflowStep] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkflowRule:
    """Represents a workflow rule (mandatory/conditional steps, handoff criteria)."""
    rule_type: str  # "mandatory", "conditional", "handoff_criteria"
    description: str
    step_ids: List[str] = field(default_factory=list)
    agent_ids: List[str] = field(default_factory=list)
    conditions: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkflowDefinition:
    """Complete workflow definition."""
    workflow_id: str
    name: str
    description: str
    metadata: WorkflowMetadata
    phases: List[WorkflowPhase] = field(default_factory=list)
    rules: List[WorkflowRule] = field(default_factory=list)
    error_handling: Dict[str, Any] = field(default_factory=dict)
    success_criteria: List[str] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)
    mermaid_diagram: Optional[str] = None
    file_path: str = ""
    raw_content: str = ""


@dataclass
class StepExecution:
    """Execution state of a workflow step."""
    step_id: str
    status: WorkflowStatus
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration_ms: Optional[float] = None
    agent_execution_id: Optional[str] = None
    input_data: Dict[str, Any] = field(default_factory=dict)
    output_data: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    retry_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PhaseExecution:
    """Execution state of a workflow phase."""
    phase_id: str
    status: WorkflowStatus
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration_ms: Optional[float] = None
    step_executions: List[StepExecution] = field(default_factory=list)
    current_step_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkflowExecution:
    """Execution state of a complete workflow."""
    execution_id: str
    workflow_id: str
    workflow_version: str  # Pinned workflow version
    status: WorkflowStatus
    started_at: str
    completed_at: Optional[str] = None
    duration_ms: Optional[float] = None
    input_data: Dict[str, Any] = field(default_factory=dict)
    phase_executions: List[PhaseExecution] = field(default_factory=list)
    current_phase_id: Optional[str] = None
    current_step_id: Optional[str] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)













