"""
Agent Executor - Executes agent workflows and coordinates agent handoffs.

This module provides the core execution engine for the multi-agent system,
including prompt loading, context assembly, MCP tool access, and result capture.

Version: 1.0
Last Updated: 2025-01-21
"""

import os
import re
import json
import logging
import time
from typing import Dict, Any, Optional, List, Callable
from pathlib import Path
from dataclasses import dataclass, field
from datetime import datetime

from .agent_state import (
    agent_state_manager,
    AgentState,
    AgentExecution,
    WorkflowExecution,
    HandoffRecord,
    AgentStatus,
    WorkflowStatus,
)
from .model_router import model_router, RoutingDecision
from .error_handling import retry_handler, dead_letter_queue, ErrorCategory
from .llm_client import get_llm_client, OpenAIClient, LLMResponse
from .prompt_assembler import PromptAssembler
from .rag_service import get_rag_service, RAGService
# Imports with fallback for testing
try:
    from ..observability.audit_logger import audit_logger, EventType
    from ..observability.quota_tracker import quota_tracker
except ImportError:
    from .audit_logger_fallback import _audit_logger_fallback as audit_logger
    from enum import Enum
    EventType = Enum("EventType", ["TOOL_CALL", "INFO", "ERROR", "WARNING"])
    quota_tracker = None


@dataclass
class AgentDefinition:
    """Represents an agent definition loaded from markdown file."""
    agent_id: str
    name: str
    description: str
    model: Optional[str] = None
    tools: List[str] = field(default_factory=list)
    mission: str = ""
    responsibilities: List[str] = field(default_factory=list)
    workflow: str = ""
    handoff_protocol: str = ""
    file_path: str = ""


@dataclass
class ExecutionContext:
    """Context assembled for agent execution."""
    agent_id: str
    request_id: str
    workflow_id: str
    input_data: Dict[str, Any]
    agent_definition: AgentDefinition
    codebase_context: Dict[str, Any] = field(default_factory=dict)
    documentation_context: Dict[str, Any] = field(default_factory=dict)
    previous_executions: List[Dict[str, Any]] = field(default_factory=list)
    mcp_tools: List[str] = field(default_factory=list)


@dataclass
class ExecutionResult:
    """Result of agent execution."""
    agent_id: str
    status: str  # "success", "failed", "handoff", "blocked"
    output_data: Dict[str, Any] = field(default_factory=dict)
    handoff: Optional[HandoffRecord] = None
    error: Optional[str] = None
    duration_ms: float = 0.0
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)


class AgentExecutor:
    """
    Executes agent workflows and coordinates agent handoffs.
    
    Features:
    - Loads agent definitions from markdown files
    - Assembles execution context
    - Integrates with MCP tools
    - Executes agent workflows
    - Captures results and state
    - Handles errors and retries
    """
    
    def __init__(
        self,
        agents_dir: str = ".cursor/agents",
        workflows_dir: str = ".cursor/workflows",
        llm_client: Optional[OpenAIClient] = None,
        mcp_servers_config: str = ".cursor/mcp/servers.json"
    ):
        self.agents_dir = Path(agents_dir)
        self.workflows_dir = Path(workflows_dir)
        self.mcp_servers_config = Path(mcp_servers_config)
        self.agent_definitions: Dict[str, AgentDefinition] = {}
        self.mcp_tools: List[str] = []
        
        # Initialize LLM client
        try:
            self.llm_client = llm_client or get_llm_client()
        except Exception as e:
            logging.warning(f"Failed to initialize LLM client: {e}. Agent execution will be limited.")
            self.llm_client = None
        
        # Initialize prompt assembler
        self.prompt_assembler = PromptAssembler(agents_dir=str(self.agents_dir))
        
        # Initialize RAG service
        try:
            self.rag_service = get_rag_service()
        except Exception as e:
            logging.warning(f"Failed to initialize RAG service: {e}")
            self.rag_service = None
        
        # Load agent definitions
        self._load_agent_definitions()
        
        # Load MCP tools
        self._load_mcp_tools()
        
        audit_logger.log_info(
            agent_id="AgentExecutor",
            message="AgentExecutor initialized",
            details={
                "agents_loaded": len(self.agent_definitions),
                "mcp_tools": len(self.mcp_tools)
            }
        )
    
    def _load_agent_definitions(self):
        """Loads all agent definitions from markdown files."""
        if not self.agents_dir.exists():
            logging.warning(f"Agents directory not found: {self.agents_dir}")
            return
        
        for agent_file in self.agents_dir.glob("*.md"):
            if agent_file.name in ["README.md", "REGISTRY.md", "STANDARDS.md", "HANDOFF_PROTOCOL.md", "SECURITY_STANDARDS.md"]:
                continue
            
            try:
                definition = self._load_agent_definition(agent_file)
                if definition:
                    self.agent_definitions[definition.agent_id] = definition
            except Exception as e:
                logging.error(f"Error loading agent definition from {agent_file}: {e}")
    
    def _load_agent_definition(self, agent_file: Path) -> Optional[AgentDefinition]:
        """Loads a single agent definition from markdown file."""
        with open(agent_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse frontmatter
        frontmatter_match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
        if not frontmatter_match:
            return None
        
        frontmatter = frontmatter_match.group(1)
        frontmatter_dict = {}
        for line in frontmatter.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                frontmatter_dict[key.strip()] = value.strip().strip('"')
        
        # Extract agent ID from filename
        agent_id = agent_file.stem.replace('-agent', '').replace('_', '-')
        
        # Parse markdown content
        mission_match = re.search(r'## Mission Statement\s*\n\n(.*?)(?=\n##|\Z)', content, re.DOTALL)
        mission = mission_match.group(1).strip() if mission_match else ""
        
        responsibilities_match = re.search(r'### Primary Functions\s*\n\n(.*?)(?=\n###|\Z)', content, re.DOTALL)
        responsibilities = []
        if responsibilities_match:
            for line in responsibilities_match.group(1).split('\n'):
                if line.strip().startswith('1.') or line.strip().startswith('-'):
                    responsibilities.append(line.strip().lstrip('1.2.3.4.5.6.7.8.9.0.- '))
        
        # Extract tools from frontmatter
        tools_str = frontmatter_dict.get('tools', '')
        tools = [t.strip() for t in tools_str.split(',')] if tools_str else []
        
        return AgentDefinition(
            agent_id=agent_id,
            name=frontmatter_dict.get('name', agent_id),
            description=frontmatter_dict.get('description', ''),
            model=frontmatter_dict.get('model'),
            tools=tools,
            mission=mission,
            responsibilities=responsibilities,
            file_path=str(agent_file)
        )
    
    def _load_mcp_tools(self):
        """Loads available MCP tools from servers configuration."""
        if not self.mcp_servers_config.exists():
            logging.warning(f"MCP servers config not found: {self.mcp_servers_config}")
            return
        
        try:
            with open(self.mcp_servers_config, 'r') as f:
                config = json.load(f)
            
            # Extract tool names from MCP server configs
            # This is a simplified version - actual MCP integration would query servers
            self.mcp_tools = [
                "filesystem_read",
                "filesystem_write",
                "filesystem_list",
                "git_status",
                "git_diff",
                "postgres_query",
                "brave_search",
                "github_issue_create",
            ]
        except Exception as e:
            logging.error(f"Error loading MCP tools: {e}")
    
    def assemble_context(
        self,
        agent_id: str,
        request_id: str,
        workflow_id: str,
        input_data: Dict[str, Any],
        workflow_state: Optional[WorkflowExecution] = None
    ) -> ExecutionContext:
        """
        Assembles execution context for an agent.
        
        Context includes:
        - Agent definition
        - Input data
        - Codebase context (if needed)
        - Documentation context (if needed)
        - Previous executions in workflow
        - Available MCP tools
        """
        agent_def = self.agent_definitions.get(agent_id)
        if not agent_def:
            raise ValueError(f"Agent definition not found: {agent_id}")
        
        # Build previous executions list
        previous_executions = []
        if workflow_state:
            for exec in workflow_state.agent_executions:
                previous_executions.append({
                    "agent_id": exec.agent_id,
                    "status": exec.status.value,
                    "output_data": exec.output_data
                })
        
        # Determine which MCP tools are available for this agent
        available_tools = [tool for tool in agent_def.tools if tool in self.mcp_tools]
        
        context = ExecutionContext(
            agent_id=agent_id,
            request_id=request_id,
            workflow_id=workflow_id,
            input_data=input_data,
            agent_definition=agent_def,
            previous_executions=previous_executions,
            mcp_tools=available_tools
        )
        
        # Add RAG context if available and requested
        if self.rag_service and input_data.get("use_rag", True):
            # Extract query for RAG retrieval
            rag_query = input_data.get("rag_query") or input_data.get("task") or input_data.get("description", "")
            if rag_query:
                try:
                    retrieved_docs = self.rag_service.retrieve(
                        query=rag_query,
                        n_results=5,
                        category=input_data.get("rag_category")
                    )
                    
                    if retrieved_docs:
                        # Format RAG context
                        rag_context_parts = []
                        for doc in retrieved_docs:
                            text = doc.get("text", "")
                            metadata = doc.get("metadata", {})
                            title = metadata.get("title", "Document")
                            source = metadata.get("source_file", "Unknown")
                            score = doc.get("score", 0.0)
                            
                            rag_context_parts.append(
                                f"Source: {source} ({title}) [Relevance: {score:.2f}]\n{text[:500]}"
                            )
                        
                        context.codebase_context["rag_context"] = "\n\n".join(rag_context_parts)
                except Exception as e:
                    logging.warning(f"Failed to retrieve RAG context: {e}")
        
        return context
    
    def execute_agent(
        self,
        agent_id: str,
        request_id: str,
        workflow_id: str,
        input_data: Dict[str, Any],
        workflow_state: Optional[WorkflowExecution] = None
    ) -> ExecutionResult:
        """
        Executes an agent with the given context.
        
        This is a placeholder that would integrate with actual LLM APIs.
        In a real implementation, this would:
        1. Assemble context
        2. Route to appropriate model
        3. Call LLM API with agent prompt + context
        4. Parse response
        5. Execute tool calls if needed
        6. Capture results
        """
        task_id = f"{workflow_id}_{agent_id}_{int(time.time())}"
        start_time = time.time()
        
        def _execute():
            """Inner function for retry logic."""
            # Assemble context
            context = self.assemble_context(agent_id, request_id, workflow_id, input_data, workflow_state)
            
            # Route to model
            routing_decision = model_router.route_to_model(
                task_type=agent_id,
                task_description=context.agent_definition.description,
                context_size=len(json.dumps(input_data)),
                estimated_input_tokens=1000,
                estimated_output_tokens=500
            )
            
            # Create agent execution record
            agent_execution = AgentExecution(
                agent_id=agent_id,
                status=AgentStatus.IN_PROGRESS,
                started_at=datetime.utcnow().isoformat(),
                input_data=input_data
            )
            
            # Check if LLM client is available
            if not self.llm_client:
                raise Exception("LLM client not initialized. Cannot execute agent.")
            
            # 1. Load agent definition for prompt assembly
            try:
                agent_def_dict = self.prompt_assembler.load_agent_definition(agent_id)
            except FileNotFoundError:
                # Fallback to basic definition
                agent_def_dict = {
                    "agent_id": agent_id,
                    "frontmatter": {
                        "name": context.agent_definition.name,
                        "description": context.agent_definition.description,
                        "model": context.agent_definition.model or "sonnet"
                    },
                    "sections": {
                        "Mission Statement": context.agent_definition.mission,
                        "Core Responsibilities": "\n".join([f"- {r}" for r in context.agent_definition.responsibilities])
                    }
                }
            
            # 2. Assemble prompts
            prompt_context = {
                "mcp_tools": [{"name": tool, "description": f"Tool: {tool}"} for tool in context.mcp_tools],
                "workflow_state": workflow_state.__dict__ if workflow_state else None,
                "previous_executions": context.previous_executions,
                "input_data": input_data,
                "rag_context": context.codebase_context.get("rag_context")
            }
            
            system_prompt = self.prompt_assembler.assemble_system_prompt(
                agent_def_dict,
                context=prompt_context
            )
            
            # Create task description from input data
            task_description = input_data.get("task", input_data.get("description", f"Execute {agent_id} agent"))
            user_prompt = self.prompt_assembler.assemble_user_prompt(
                task_description=task_description,
                input_data=input_data,
                context=prompt_context
            )
            
            # 3. Call LLM API
            model_to_use = routing_decision.model or context.agent_definition.model or "sonnet"
            temperature = input_data.get("temperature", 0.7)
            max_tokens = input_data.get("max_tokens")
            
            llm_response: LLMResponse = self.llm_client.complete(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model=model_to_use,
                temperature=temperature,
                max_tokens=max_tokens,
                context=prompt_context
            )
            
            # 4. Parse response and extract output
            output_data = {
                "content": llm_response.content,
                "model_used": llm_response.model,
                "token_usage": {
                    "prompt_tokens": llm_response.token_usage.prompt_tokens,
                    "completion_tokens": llm_response.token_usage.completion_tokens,
                    "total_tokens": llm_response.token_usage.total_tokens,
                    "cost_usd": llm_response.token_usage.cost_usd
                },
                "complexity": routing_decision.complexity.score,
                "finish_reason": llm_response.finish_reason
            }
            
            # 5. Check for tool calls in response (basic parsing)
            # In a more sophisticated implementation, this would parse structured tool calls
            tool_calls = []
            if "[TOOL_CALL]" in llm_response.content or "[FUNCTION_CALL]" in llm_response.content:
                # Extract tool calls from response (simplified)
                # Real implementation would parse JSON or structured format
                tool_calls.append({
                    "type": "detected",
                    "raw": llm_response.content
                })
            
            # 6. Check for handoffs
            handoff = None
            if "[HANDOFF]" in llm_response.content or "[HANDOFF_TO]" in llm_response.content:
                # Extract handoff information (simplified)
                # Real implementation would parse structured handoff format
                handoff_match = re.search(r'\[HANDOFF_TO:\s*(\w+)\]', llm_response.content)
                if handoff_match:
                    target_agent = handoff_match.group(1)
                    handoff = HandoffRecord(
                        from_agent=agent_id,
                        to_agent=target_agent,
                        reason="Agent requested handoff",
                        context=input_data
                    )
            
            agent_execution.status = AgentStatus.COMPLETE
            agent_execution.completed_at = datetime.utcnow().isoformat()
            agent_execution.duration_ms = (time.time() - start_time) * 1000
            agent_execution.output_data = output_data
            
            # Save state
            state = AgentState(
                state_id=task_id,
                state_type="agent",
                created_at=datetime.utcnow().isoformat(),
                updated_at=datetime.utcnow().isoformat(),
                agent_execution=agent_execution
            )
            agent_state_manager.save_state(state)
            
            # Determine result status
            result_status = "handoff" if handoff else "success"
            
            return ExecutionResult(
                agent_id=agent_id,
                status=result_status,
                output_data=output_data,
                handoff=handoff,
                tool_calls=tool_calls,
                duration_ms=agent_execution.duration_ms
            )
        
        # Execute with retry logic
        try:
            result = retry_handler.execute_with_retry(
                func=_execute,
                task_id=task_id,
                agent_id=agent_id,
                context={"request_id": request_id, "workflow_id": workflow_id}
            )
            
            audit_logger.log_tool_call(
                agent_id="AgentExecutor",
                tool_name="execute_agent",
                params={"agent_id": agent_id, "request_id": request_id, "workflow_id": workflow_id},
                output_summary=f"Agent {agent_id} executed successfully",
                duration_ms=result.duration_ms,
                status="success"
            )
            
            return result
            
        except Exception as e:
            error_msg = str(e)
            logging.error(f"Error executing agent {agent_id}: {error_msg}")
            
            # Add to dead-letter queue
            dead_letter_queue.add_failed_task(
                task_id=task_id,
                agent_id=agent_id,
                workflow_id=workflow_id,
                error=e,
                attempts=retry_handler.config.max_attempts,
                context={"request_id": request_id, "input_data": input_data}
            )
            
            result = ExecutionResult(
                agent_id=agent_id,
                status="failed",
                error=error_msg,
                duration_ms=(time.time() - start_time) * 1000
            )
            
            audit_logger.log_error(
                agent_id="AgentExecutor",
                message=f"Agent execution failed: {error_msg}",
                error_type="ExecutionError",
                details={"agent_id": agent_id, "request_id": request_id, "task_id": task_id}
            )
            
            return result
    
    def execute_workflow(
        self,
        workflow_name: str,
        request_id: str,
        input_data: Dict[str, Any]
    ) -> WorkflowExecution:
        """
        Executes a complete workflow.
        
        This loads the workflow definition and executes it step by step.
        """
        workflow_id = f"{workflow_name}_{request_id}_{int(time.time())}"
        
        workflow_execution = WorkflowExecution(
            workflow_id=workflow_id,
            workflow_name=workflow_name,
            status=WorkflowStatus.IN_PROGRESS,
            started_at=datetime.utcnow().isoformat(),
            request_id=request_id,
            context=input_data
        )
        
        # Load workflow definition
        workflow_file = self.workflows_dir / f"{workflow_name}.md"
        if not workflow_file.exists():
            workflow_execution.status = WorkflowStatus.FAILED
            workflow_execution.completed_at = datetime.utcnow().isoformat()
            raise ValueError(f"Workflow definition not found: {workflow_file}")
        
        # In a real implementation, this would:
        # 1. Parse workflow definition
        # 2. Execute workflow steps in order
        # 3. Handle handoffs between agents
        # 4. Track state throughout
        # 5. Handle errors and retries
        
        # For now, this is a placeholder
        # TODO: Implement full workflow execution
        
        # Save workflow state
        state = AgentState(
            state_id=workflow_id,
            state_type="workflow",
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
            workflow_execution=workflow_execution
        )
        agent_state_manager.save_state(state)
        
        return workflow_execution
    
    def get_agent_definition(self, agent_id: str) -> Optional[AgentDefinition]:
        """Gets agent definition by ID."""
        return self.agent_definitions.get(agent_id)
    
    def list_agents(self) -> List[str]:
        """Lists all available agent IDs."""
        return list(self.agent_definitions.keys())


# Global instance for easy access
agent_executor = AgentExecutor()

