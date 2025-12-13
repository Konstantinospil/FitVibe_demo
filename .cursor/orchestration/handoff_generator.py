"""
Handoff Generator - Automatically generates and validates handoffs between agents.

This module provides functionality to generate handoff records from workflow step
executions, validate them against the handoff protocol, and save them for agent
processing.

Version: 1.0
Last Updated: 2025-12-12
"""

import logging
import uuid
import json
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import asdict

from .agent_state import HandoffRecord
from .workflow_models import WorkflowStep, WorkflowExecution as WorkflowExecutionModel, HandoffType
from .step_executor import StepExecution as StepExecutionResult

logger = logging.getLogger(__name__)


class HandoffGenerator:
    """
    Generates and validates handoffs between agents.
    
    Uses the Builder pattern to construct handoff records from step executions.
    """
    
    def __init__(self, agents_dir: str = ".cursor/agents", handoffs_dir: str = ".cursor/agents/examples/handoffs"):
        """
        Initialize handoff generator.
        
        Args:
            agents_dir: Directory containing agent definitions
            handoffs_dir: Directory where handoff files are saved
        """
        self.agents_dir = Path(agents_dir)
        self.handoffs_dir = Path(handoffs_dir)
        self.handoffs_dir.mkdir(parents=True, exist_ok=True)
        
        # Cache of available agents (lazy loaded)
        self._available_agents: Optional[List[str]] = None
    
    def _get_current_timestamp(self) -> str:
        """
        Get current UTC timestamp (NEVER hardcode dates).
        
        Returns:
            ISO 8601 formatted timestamp string
        """
        result = subprocess.run(
            ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            return result.stdout.strip()
        # Fallback to Python datetime if date command fails
        from datetime import datetime
        return datetime.utcnow().isoformat() + 'Z'
    
    def _get_available_agents(self) -> List[str]:
        """Get list of available agent IDs."""
        if self._available_agents is None:
            agents = []
            if self.agents_dir.exists():
                for agent_file in self.agents_dir.glob("*.md"):
                    # Extract agent ID from filename (e.g., "agent-name.md" -> "agent-name")
                    agent_id = agent_file.stem
                    agents.append(agent_id)
            self._available_agents = agents
        return self._available_agents
    
    def _agent_exists(self, agent_id: str) -> bool:
        """Check if an agent exists."""
        return agent_id in self._get_available_agents()
    
    def generate_handoff(
        self,
        step_execution: StepExecutionResult,
        step_definition: WorkflowStep,
        workflow_execution: WorkflowExecutionModel
    ) -> HandoffRecord:
        """
        Generate handoff from step execution.
        
        Args:
            step_execution: Result of step execution
            step_definition: Workflow step definition
            workflow_execution: Current workflow execution state
        
        Returns:
            HandoffRecord object
        """
        if not step_definition.handoff_to:
            raise ValueError(f"Step '{step_definition.step_id}' has no handoff_to specified")
        
        # Get current timestamp
        timestamp = self._get_current_timestamp()
        
        # Extract handoff type string from enum
        handoff_type_str = step_definition.handoff_type.value if isinstance(step_definition.handoff_type, HandoffType) else str(step_definition.handoff_type)
        
        # Map HandoffType enum to handoff record type
        type_mapping = {
            "always": "standard",
            "conditional": "standard",
            "on_error": "error_recovery",
            "never": "standard"  # Shouldn't happen, but default
        }
        record_type = type_mapping.get(handoff_type_str.lower(), "standard")
        
        # Extract summary and deliverables from step execution output
        output_data = step_execution.output_data or {}
        summary = output_data.get("summary", step_definition.description or "")
        deliverables = output_data.get("deliverables", [])
        if not isinstance(deliverables, list):
            deliverables = [deliverables] if deliverables else []
        
        # Get request_id from workflow execution metadata
        request_id = workflow_execution.metadata.get("request_id", workflow_execution.execution_id) if workflow_execution.metadata else workflow_execution.execution_id
        
        # Build handoff record
        handoff = HandoffRecord(
            handoff_id=str(uuid.uuid4()),
            from_agent=step_definition.agent_id or "unknown",
            to_agent=step_definition.handoff_to,
            timestamp=timestamp,
            handoff_type=record_type,
            status="pending",
            work_summary=summary,
            deliverables=deliverables,
            blockers=output_data.get("blockers", []),
            notes=output_data.get("notes") or step_definition.handoff_criteria
        )
        
        logger.info(f"Generated handoff {handoff.handoff_id} from {handoff.from_agent} to {handoff.to_agent}")
        
        return handoff
    
    def validate_handoff(self, handoff: HandoffRecord) -> List[str]:
        """
        Validate handoff against protocol.
        
        Args:
            handoff: HandoffRecord to validate
        
        Returns:
            List of error messages (empty if valid)
        """
        errors = []
        
        # Check required fields
        required_fields = [
            ("handoff_id", handoff.handoff_id),
            ("from_agent", handoff.from_agent),
            ("to_agent", handoff.to_agent),
            ("timestamp", handoff.timestamp),
            ("handoff_type", handoff.handoff_type),
            ("status", handoff.status),
        ]
        
        for field_name, field_value in required_fields:
            if not field_value:
                errors.append(f"Missing required field: {field_name}")
        
        # Validate agent IDs exist
        if handoff.from_agent and not self._agent_exists(handoff.from_agent):
            errors.append(f"Source agent does not exist: {handoff.from_agent}")
        
        if handoff.to_agent and not self._agent_exists(handoff.to_agent):
            errors.append(f"Target agent does not exist: {handoff.to_agent}")
        
        # Validate handoff_type
        valid_types = ["standard", "escalation", "collaboration", "error_recovery"]
        if handoff.handoff_type not in valid_types:
            errors.append(f"Invalid handoff_type: {handoff.handoff_type}. Must be one of {valid_types}")
        
        # Validate status
        valid_statuses = ["pending", "in_progress", "complete", "blocked", "failed"]
        if handoff.status not in valid_statuses:
            errors.append(f"Invalid status: {handoff.status}. Must be one of {valid_statuses}")
        
        # Validate timestamp format (ISO 8601)
        if handoff.timestamp:
            try:
                from datetime import datetime
                datetime.fromisoformat(handoff.timestamp.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                errors.append(f"Invalid timestamp format: {handoff.timestamp}. Must be ISO 8601 format")
        
        # Validate handoff_id format (should be UUID)
        if handoff.handoff_id:
            try:
                uuid.UUID(handoff.handoff_id)
            except (ValueError, AttributeError):
                errors.append(f"Invalid handoff_id format: {handoff.handoff_id}. Must be a valid UUID")
        
        return errors
    
    def save_handoff(self, handoff: HandoffRecord) -> str:
        """
        Save handoff to file.
        
        Args:
            handoff: HandoffRecord to save
        
        Returns:
            Path to saved handoff file
        """
        # Validate before saving
        errors = self.validate_handoff(handoff)
        if errors:
            error_msg = "; ".join(errors)
            raise ValueError(f"Handoff validation failed: {error_msg}")
        
        # Ensure handoffs directory exists
        self.handoffs_dir.mkdir(parents=True, exist_ok=True)
        
        # Save to JSON file
        handoff_file = self.handoffs_dir / f"{handoff.handoff_id}.json"
        
        # Convert to dict for JSON serialization
        handoff_dict = asdict(handoff)
        
        with open(handoff_file, 'w') as f:
            json.dump(handoff_dict, f, indent=2, sort_keys=True)
        
        logger.info(f"Saved handoff {handoff.handoff_id} to {handoff_file}")
        
        return str(handoff_file)
    
    def generate_and_save_handoff(
        self,
        step_execution: StepExecutionResult,
        step_definition: WorkflowStep,
        workflow_execution: WorkflowExecutionModel
    ) -> str:
        """
        Generate and save handoff in one call.
        
        Args:
            step_execution: Result of step execution
            step_definition: Workflow step definition
            workflow_execution: Current workflow execution state
        
        Returns:
            Path to saved handoff file
        """
        handoff = self.generate_handoff(step_execution, step_definition, workflow_execution)
        return self.save_handoff(handoff)


# Global handoff generator instance
_handoff_generator: Optional[HandoffGenerator] = None


def get_handoff_generator() -> HandoffGenerator:
    """Get or create global handoff generator instance."""
    global _handoff_generator
    
    if _handoff_generator is None:
        _handoff_generator = HandoffGenerator()
    
    return _handoff_generator
