"""
Prompt Assembler - Assembles prompts from agent definitions and context.

This module reads agent definition files and assembles complete prompts
for LLM execution, including system instructions, context, and tool descriptions.

Version: 1.0
Last Updated: 2025-01-21
"""

import os
import re
import logging
from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)


class PromptAssembler:
    """Assembles prompts from agent definitions and execution context."""

    def __init__(self, agents_dir: str = ".cursor/agents"):
        """
        Initialize prompt assembler.

        Args:
            agents_dir: Directory containing agent definition files
        """
        self.agents_dir = Path(agents_dir)
        if not self.agents_dir.exists():
            logger.warning(f"Agents directory not found: {self.agents_dir}")

    def load_agent_definition(self, agent_id: str) -> Dict[str, Any]:
        """
        Load agent definition from markdown file.

        Args:
            agent_id: Agent identifier (e.g., "backend-agent")

        Returns:
            Dictionary with agent definition metadata and content
        """
        # Try different file extensions
        possible_files = [
            self.agents_dir / f"{agent_id}.md",
            self.agents_dir / f"{agent_id}.yaml",
            self.agents_dir / f"{agent_id}.yml",
        ]

        agent_file = None
        for file_path in possible_files:
            if file_path.exists():
                agent_file = file_path
                break

        if not agent_file:
            raise FileNotFoundError(
                f"Agent definition not found for {agent_id}. "
                f"Checked: {[str(f) for f in possible_files]}"
            )

        # Read file
        with open(agent_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Parse frontmatter
        frontmatter, body = self._parse_frontmatter(content)

        # Extract sections
        sections = self._parse_sections(body)

        return {
            "agent_id": agent_id,
            "file_path": str(agent_file),
            "frontmatter": frontmatter,
            "sections": sections,
            "raw_content": content
        }

    def _parse_frontmatter(self, content: str) -> Tuple[Dict[str, Any], str]:
        """
        Parse YAML frontmatter from markdown file.

        Returns:
            Tuple of (frontmatter_dict, body_content)
        """
        frontmatter = {}
        body = content

        # Check for frontmatter
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                frontmatter_text = parts[1].strip()
                body = parts[2].strip()

                # Simple YAML parsing (basic key-value pairs)
                for line in frontmatter_text.split("\n"):
                    line = line.strip()
                    if ":" in line:
                        key, value = line.split(":", 1)
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")

                        # Handle lists (tools)
                        if value.startswith("[") and value.endswith("]"):
                            value = [item.strip().strip('"').strip("'") for item in value[1:-1].split(",")]

                        frontmatter[key] = value

        return frontmatter, body

    def _parse_sections(self, body: str) -> Dict[str, str]:
        """
        Parse markdown sections into dictionary.

        Returns:
            Dictionary mapping section headers to content
        """
        sections = {}
        current_section = None
        current_content = []

        for line in body.split("\n"):
            # Check for header
            if line.startswith("#"):
                # Save previous section
                if current_section:
                    sections[current_section] = "\n".join(current_content).strip()

                # Start new section
                current_section = line.lstrip("#").strip()
                current_content = []
            else:
                if current_section:
                    current_content.append(line)

        # Save last section
        if current_section:
            sections[current_section] = "\n".join(current_content).strip()

        return sections

    def assemble_system_prompt(
        self,
        agent_definition: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Assemble system prompt from agent definition.

        Args:
            agent_definition: Agent definition dictionary
            context: Additional context (tools, previous executions, etc.)

        Returns:
            Complete system prompt string
        """
        parts = []

        # Agent metadata
        frontmatter = agent_definition.get("frontmatter", {})
        sections = agent_definition.get("sections", {})

        # Mission statement
        if "Mission Statement" in sections:
            parts.append(f"# Mission\n{sections['Mission Statement']}\n")

        # Core responsibilities
        if "Core Responsibilities" in sections:
            parts.append(f"# Core Responsibilities\n{sections['Core Responsibilities']}\n")

        # Implementation principles
        if "Implementation Principles" in sections:
            parts.append(f"# Implementation Principles\n{sections['Implementation Principles']}\n")

        # Quality standards
        if "Quality Standards" in sections:
            parts.append(f"# Quality Standards\n{sections['Quality Standards']}\n")

        # Tech stack / context
        if "FitVibe-Specific Context" in sections:
            parts.append(f"# Project Context\n{sections['FitVibe-Specific Context']}\n")
        elif "Context" in sections:
            parts.append(f"# Context\n{sections['Context']}\n")

        # Available tools
        if context and "mcp_tools" in context:
            tools = context["mcp_tools"]
            if tools:
                tool_list = "\n".join([f"- {tool.get('name', 'unknown')}: {tool.get('description', '')}" for tool in tools])
                parts.append(f"# Available Tools\n{tool_list}\n")

        # Workflow context
        if context and "workflow_state" in context:
            workflow = context["workflow_state"]
            if workflow:
                parts.append(f"# Current Workflow\nWorkflow ID: {workflow.get('workflow_id', 'unknown')}\n")

        # Previous executions
        if context and "previous_executions" in context:
            prev_execs = context["previous_executions"]
            if prev_execs:
                parts.append(f"# Previous Agent Executions\n{len(prev_execs)} previous execution(s) in this workflow.\n")

        return "\n".join(parts)

    def assemble_user_prompt(
        self,
        task_description: str,
        input_data: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Assemble user prompt from task and input data.

        Args:
            task_description: Description of the task to perform
            input_data: Input data for the task
            context: Additional context

        Returns:
            Complete user prompt string
        """
        parts = []

        # Task description
        parts.append(f"# Task\n{task_description}\n")

        # Input data
        if input_data:
            import json
            parts.append(f"# Input Data\n```json\n{json.dumps(input_data, indent=2)}\n```\n")

        # Additional instructions
        if context and "instructions" in context:
            parts.append(f"# Additional Instructions\n{context['instructions']}\n")

        # Codebase context (if provided)
        if context and "codebase_context" in context:
            codebase = context["codebase_context"]
            if codebase:
                parts.append(f"# Relevant Codebase Context\n{codebase}\n")

        # RAG context (if provided)
        if context and "rag_context" in context:
            rag_context = context["rag_context"]
            if rag_context:
                parts.append(f"# Retrieved Context from Knowledge Base\n{rag_context}\n")

        return "\n".join(parts)

