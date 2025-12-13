"""
Orchestration module for FitVibe multi-agent system.

This module provides:
- Model Router: Routes tasks to appropriate AI models
- Agent State Management: Manages agent state and persistence
- Agent Executor: Executes agent workflows
"""

from .model_router import model_router, ModelRouter, RoutingDecision, TaskComplexity, ComplexityLevel
from .agent_state import (
    agent_state_manager,
    AgentStateManager,
    AgentState,
    AgentExecution,
    WorkflowExecution,
    HandoffRecord,
    AgentStatus,
    WorkflowStatus,
)
from .config_loader import config_loader, ConfigLoader
from .agent_executor import (
    agent_executor,
    AgentExecutor,
    AgentDefinition,
    ExecutionContext,
    ExecutionResult,
)
from .error_handling import (
    error_classifier,
    retry_handler,
    dead_letter_queue,
    ErrorClassifier,
    RetryHandler,
    DeadLetterQueue,
    ErrorCategory,
    ErrorSeverity,
    ClassifiedError,
    RetryConfig,
    FailedTask,
)
from .llm_client import (
    get_llm_client,
    OpenAIClient,
    LLMResponse,
    TokenUsage,
    ModelTier,
)
from .prompt_assembler import PromptAssembler
from .workflow_models import (
    WorkflowDefinition,
    WorkflowMetadata,
    WorkflowPhase,
    WorkflowStep,
    WorkflowRule,
    WorkflowCondition,
    WorkflowExecution,
    PhaseExecution,
    StepExecution,
    WorkflowStatus,
    StepType,
    HandoffType,
)
from .workflow_parser import get_workflow_parser, WorkflowParser
from .workflow_validator import get_workflow_validator, WorkflowValidator
from .workflow_executor import get_workflow_executor, WorkflowExecutor
from .rag_service import get_rag_service, RAGService
from .event_log import event_log, EventLog, WorkflowEvent
from .state_repository import AgentStateRepository, StateVersionConflict
from .step_executor import step_executor, StepExecutor, StepExecution as StepExecutionResult, ExecutionContext
from .handoff_generator import get_handoff_generator, HandoffGenerator
from .handoff_registry import get_handoff_registry, HandoffRegistry
from .error_handling import (
    dead_letter_queue, DeadLetterQueue, FailedTask, ErrorClassifier,
    CircuitBreaker, CircuitBreakerOpenError, CircuitState, get_circuit_breaker
)
from .workflow_metrics import get_metrics_collector, WorkflowMetricsCollector, WorkflowMetrics, SystemMetrics
from .workflow_dashboard import show_dashboard
from .workflow_debug import inspect_execution, replay_execution, compare_executions, trace_execution, validate_state

__all__ = [
    "config_loader",
    "ConfigLoader",
    "model_router",
    "ModelRouter",
    "RoutingDecision",
    "TaskComplexity",
    "ComplexityLevel",
    "agent_state_manager",
    "AgentStateManager",
    "AgentState",
    "AgentExecution",
    "WorkflowExecution",
    "HandoffRecord",
    "AgentStatus",
    "WorkflowStatus",
    "agent_executor",
    "AgentExecutor",
    "AgentDefinition",
    "ExecutionContext",
    "ExecutionResult",
    "error_classifier",
    "retry_handler",
    "dead_letter_queue",
    "ErrorClassifier",
    "RetryHandler",
    "DeadLetterQueue",
    "ErrorCategory",
    "ErrorSeverity",
    "ClassifiedError",
    "RetryConfig",
    "FailedTask",
    "get_llm_client",
    "OpenAIClient",
    "LLMResponse",
    "TokenUsage",
    "ModelTier",
    "PromptAssembler",
    "WorkflowDefinition",
    "WorkflowMetadata",
    "WorkflowPhase",
    "WorkflowStep",
    "WorkflowRule",
    "WorkflowCondition",
    "WorkflowExecution",
    "PhaseExecution",
    "StepExecution",
    "WorkflowStatus",
    "StepType",
    "HandoffType",
    "get_workflow_parser",
    "WorkflowParser",
    "get_workflow_validator",
    "WorkflowValidator",
    "get_workflow_executor",
    "WorkflowExecutor",
    "get_rag_service",
    "RAGService",
    "event_log",
    "EventLog",
    "WorkflowEvent",
    "AgentStateRepository",
    "StateVersionConflict",
    "step_executor",
    "StepExecutor",
    "StepExecutionResult",
    "ExecutionContext",
    "get_handoff_generator",
    "HandoffGenerator",
    "get_handoff_registry",
    "HandoffRegistry",
    "dead_letter_queue",
    "DeadLetterQueue",
    "FailedTask",
    "ErrorClassifier",
    # Circuit Breaker
    "CircuitBreaker",
    "CircuitBreakerOpenError",
    "CircuitState",
    "get_circuit_breaker",
    # Phase 6: Observability
    "get_metrics_collector",
    "WorkflowMetricsCollector",
    "WorkflowMetrics",
    "SystemMetrics",
    "show_dashboard",
    "inspect_execution",
    "replay_execution",
    "compare_executions",
    "trace_execution",
    "validate_state",
]

