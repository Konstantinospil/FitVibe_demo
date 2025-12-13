"""
Workflow Validator - Validates workflow definitions for correctness.

This module validates workflow definitions to ensure:
- Agent references exist
- Handoff protocols are valid
- No circular dependencies
- Required fields are present

Version: 1.0
Last Updated: 2025-01-21
"""

import logging
from typing import Dict, Any, List, Optional, Set
from pathlib import Path

from .workflow_models import (
    WorkflowDefinition,
    WorkflowPhase,
    WorkflowStep,
    StepType,
)
from .agent_discovery import AgentDiscovery, resolve_agents_dir

logger = logging.getLogger(__name__)


class ValidationError(Exception):
    """Raised when workflow validation fails."""
    pass


class WorkflowValidator:
    """Validates workflow definitions."""
    
    def __init__(self, agents_dir: Optional[Path] = None):
        """
        Initialize validator.
        
        Args:
            agents_dir: Optional directory containing agent definitions
                       (default: auto-discovered from .cursor/agents)
        """
        if agents_dir is None:
            agents_dir = resolve_agents_dir()
        else:
            agents_dir = Path(agents_dir)
        
        self.agents_dir = agents_dir
        self.agent_discovery = AgentDiscovery(agents_dir)
        self.available_agents: Set[str] = self._load_agent_list()
    
    def _load_agent_list(self) -> Set[str]:
        """Load list of available agent IDs using agent discovery."""
        return self.agent_discovery.get_agent_ids()
    
    def validate(self, workflow: WorkflowDefinition) -> List[str]:
        """
        Validate a workflow definition.
        
        Args:
            workflow: Workflow definition to validate
        
        Returns:
            List of validation errors (empty if valid)
        """
        errors = []
        
        # Validate basic structure
        errors.extend(self._validate_structure(workflow))
        
        # Validate agent references
        errors.extend(self._validate_agent_references(workflow))
        
        # Validate handoffs
        errors.extend(self._validate_handoffs(workflow))
        
        # Validate dependencies
        errors.extend(self._validate_dependencies(workflow))
        
        # Validate phases
        errors.extend(self._validate_phases(workflow))
        
        return errors
    
    def _validate_structure(self, workflow: WorkflowDefinition) -> List[str]:
        """Validate basic workflow structure."""
        errors = []
        
        if not workflow.workflow_id:
            errors.append("Workflow ID is required")
        
        if not workflow.name:
            errors.append("Workflow name is required")
        
        if not workflow.description:
            errors.append("Workflow description is required")
        
        if not workflow.phases:
            errors.append("Workflow must have at least one phase")
        
        return errors
    
    def _validate_agent_references(self, workflow: WorkflowDefinition) -> List[str]:
        """Validate that all agent references exist."""
        errors = []
        
        for phase in workflow.phases:
            for step in phase.steps:
                if step.step_type == StepType.AGENT and step.agent_id:
                    if step.agent_id not in self.available_agents:
                        errors.append(
                            f"Agent '{step.agent_id}' referenced in step '{step.step_id}' "
                            f"does not exist. Available agents: {sorted(self.available_agents)}"
                        )
        
        return errors
    
    def _validate_handoffs(self, workflow: WorkflowDefinition) -> List[str]:
        """Validate handoff protocols."""
        errors = []
        
        # Collect all step IDs
        all_step_ids = set()
        for phase in workflow.phases:
            for step in phase.steps:
                all_step_ids.add(step.step_id)
        
        # Validate handoff targets
        for phase in workflow.phases:
            for step in phase.steps:
                if step.handoff_to:
                    # Check if handoff target is a valid step or agent
                    handoff_target = step.handoff_to
                    
                    # Check if it's a step ID
                    if handoff_target not in all_step_ids:
                        # Check if it's an agent ID
                        if handoff_target not in self.available_agents:
                            errors.append(
                                f"Handoff target '{handoff_target}' in step '{step.step_id}' "
                                f"is not a valid step ID or agent ID"
                            )
        
        return errors
    
    def _validate_dependencies(self, workflow: WorkflowDefinition) -> List[str]:
        """Validate workflow dependencies (check for circular dependencies)."""
        errors = []
        
        # Build dependency graph
        dependencies: Dict[str, List[str]] = {}
        
        for phase in workflow.phases:
            for step in phase.steps:
                deps = []
                if step.handoff_to:
                    deps.append(step.handoff_to)
                dependencies[step.step_id] = deps
        
        # Check for cycles using DFS
        visited: Set[str] = set()
        rec_stack: Set[str] = set()
        
        def has_cycle(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)
            
            for dep in dependencies.get(node, []):
                if dep not in visited:
                    if has_cycle(dep):
                        return True
                elif dep in rec_stack:
                    return True
            
            rec_stack.remove(node)
            return False
        
        for step_id in dependencies:
            if step_id not in visited:
                if has_cycle(step_id):
                    errors.append(f"Circular dependency detected involving step '{step_id}'")
        
        return errors
    
    def _validate_phases(self, workflow: WorkflowDefinition) -> List[str]:
        """Validate phase structure."""
        errors = []
        
        if not workflow.phases:
            return errors
        
        # Check phase numbering
        for i, phase in enumerate(workflow.phases, 1):
            if phase.phase_number != i:
                errors.append(
                    f"Phase '{phase.phase_id}' has incorrect phase number. "
                    f"Expected {i}, got {phase.phase_number}"
                )
            
            # Check that phase has steps
            if not phase.steps:
                errors.append(f"Phase '{phase.phase_id}' has no steps")
            
            # Check step numbering within phase
            for j, step in enumerate(phase.steps, 1):
                if step.step_number != j:
                    errors.append(
                        f"Step '{step.step_id}' in phase '{phase.phase_id}' has incorrect step number. "
                        f"Expected {j}, got {step.step_number}"
                    )
        
        return errors
    
    def validate_execution_ready(self, workflow: WorkflowDefinition) -> bool:
        """
        Check if workflow is ready for execution.
        
        Args:
            workflow: Workflow definition to check
        
        Returns:
            True if ready, False otherwise
        """
        errors = self.validate(workflow)
        
        if errors:
            logger.warning(f"Workflow '{workflow.workflow_id}' has validation errors:")
            for error in errors:
                logger.warning(f"  - {error}")
            return False
        
        return True


# Global validator instance
_workflow_validator: Optional[WorkflowValidator] = None


def get_workflow_validator() -> WorkflowValidator:
    """Get or create global workflow validator instance."""
    global _workflow_validator
    
    if _workflow_validator is None:
        _workflow_validator = WorkflowValidator()
    
    return _workflow_validator













