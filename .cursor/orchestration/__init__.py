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
]

