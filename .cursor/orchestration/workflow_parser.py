"""
Workflow Parser - Parses markdown workflow definitions into executable structures.

This module parses workflow markdown files and converts them into WorkflowDefinition
objects that can be executed by the workflow executor.

Version: 1.0
Last Updated: 2025-01-21
"""

import re
import logging
from typing import Dict, Any, Optional, List
from pathlib import Path

from .workflow_models import (
    WorkflowDefinition,
    WorkflowMetadata,
    WorkflowPhase,
    WorkflowStep,
    WorkflowRule,
    WorkflowCondition,
    StepType,
    HandoffType,
)
from .agent_discovery import AgentDiscovery, resolve_workflows_dir

logger = logging.getLogger(__name__)


class WorkflowParser:
    """Parses workflow definitions from markdown files."""
    
    def __init__(self, workflows_dir: Optional[Path] = None):
        """
        Initialize workflow parser.
        
        Args:
            workflows_dir: Optional directory containing workflow definition files
                          (default: auto-discovered from .cursor/workflows)
        """
        if workflows_dir is None:
            workflows_dir = resolve_workflows_dir()
        else:
            workflows_dir = Path(workflows_dir)
        
        self.workflows_dir = workflows_dir
        if not self.workflows_dir.exists():
            logger.warning(f"Workflows directory not found: {self.workflows_dir}")
    
    def parse_workflow(self, workflow_file: Path) -> WorkflowDefinition:
        """
        Parse a workflow definition from a markdown file.
        
        Args:
            workflow_file: Path to workflow markdown file
        
        Returns:
            WorkflowDefinition object
        """
        if not workflow_file.exists():
            raise FileNotFoundError(f"Workflow file not found: {workflow_file}")
        
        # Read file
        with open(workflow_file, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Extract metadata
        metadata = self._parse_metadata(content, workflow_file)
        
        # Extract workflow name and description
        name, description = self._parse_overview(content)
        
        # Extract phases
        phases = self._parse_phases(content)
        
        # Extract rules
        rules = self._parse_rules(content)
        
        # Extract error handling
        error_handling = self._parse_error_handling(content)
        
        # Extract success criteria
        success_criteria = self._parse_success_criteria(content)
        
        # Extract metrics
        metrics = self._parse_metrics(content)
        
        # Extract mermaid diagram
        mermaid_diagram = self._extract_mermaid_diagram(content)
        
        return WorkflowDefinition(
            workflow_id=metadata.workflow_id,
            name=name,
            description=description,
            metadata=metadata,
            phases=phases,
            rules=rules,
            error_handling=error_handling,
            success_criteria=success_criteria,
            metrics=metrics,
            mermaid_diagram=mermaid_diagram,
            file_path=str(workflow_file),
            raw_content=content
        )
    
    def _parse_metadata(self, content: str, workflow_file: Path) -> WorkflowMetadata:
        """Parse workflow metadata from frontmatter or header."""
        metadata = {
            "version": "1.0",
            "last_updated": "",
            "status": "Active",
            "priority": "Standard",
        }
        
        # Extract version
        version_match = re.search(r'\*\*Version\*\*:\s*([^\n]+)', content)
        if version_match:
            metadata["version"] = version_match.group(1).strip()
        
        # Extract last updated
        updated_match = re.search(r'\*\*Last Updated\*\*:\s*([^\n]+)', content)
        if updated_match:
            metadata["last_updated"] = updated_match.group(1).strip()
        
        # Extract status
        status_match = re.search(r'\*\*Status\*\*:\s*([^\n]+)', content)
        if status_match:
            metadata["status"] = status_match.group(1).strip()
        
        # Extract priority
        priority_match = re.search(r'\*\*Priority\*\*:\s*([^\n]+)', content)
        if priority_match:
            metadata["priority"] = priority_match.group(1).strip()
        
        # Generate workflow ID from filename
        workflow_id = workflow_file.stem.replace("-", "_")
        
        return WorkflowMetadata(
            version=metadata["version"],
            last_updated=metadata["last_updated"],
            status=metadata["status"],
            priority=metadata["priority"],
            workflow_id=workflow_id
        )
    
    def _parse_overview(self, content: str) -> tuple[str, str]:
        """Parse workflow name and description from overview section."""
        # Extract name from first heading
        name_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        name = name_match.group(1).strip() if name_match else "Unknown Workflow"
        
        # Extract description from Overview section
        overview_match = re.search(
            r'## Overview\s*\n\n(.+?)(?=\n##|\Z)',
            content,
            re.DOTALL
        )
        description = ""
        if overview_match:
            description = overview_match.group(1).strip()
        
        return name, description
    
    def _parse_phases(self, content: str) -> List[WorkflowPhase]:
        """Parse workflow phases from Workflow Steps section."""
        phases = []
        
        # Find all phase sections (### Phase X: Name (duration))
        # Use negative lookbehind to ensure it's exactly 3 hashes (not 4 or more)
        # This prevents matching subsections like "#### Phase 1: Requirements & Design"
        phase_pattern = r'(?<!#)### Phase (\d+):\s*(.+?)\s*\(([^)]+)\)\s*\n\n(.*?)(?=\n### Phase|\n##|\Z)'
        phase_matches = re.finditer(phase_pattern, content, re.DOTALL)
        
        phase_number = 1
        for match in phase_matches:
            phase_num = int(match.group(1))
            phase_name = match.group(2).strip()
            duration_str = match.group(3).strip()
            phase_content = match.group(4).strip()
            
            # Skip if this looks like a subsection (has nested phase references)
            # Check if content contains "#### Phase" which indicates it's a subsection
            if "#### Phase" in phase_content:
                logger.debug(f"Skipping phase {phase_num} - appears to be a subsection")
                continue
            
            # Parse duration
            duration_minutes = self._parse_duration(duration_str)
            
            # Parse steps in this phase
            steps = self._parse_steps(phase_content, phase_number)
            
            # Only create phase if it has steps or is explicitly defined
            # Skip phases that are just documentation subsections
            if not steps and "####" in phase_content:
                logger.debug(f"Skipping phase {phase_num} - no steps and contains subsections")
                continue
            
            phase = WorkflowPhase(
                phase_id=f"phase_{phase_number}",
                phase_number=phase_number,
                name=phase_name,
                description=f"Phase {phase_number}: {phase_name}",
                estimated_duration_minutes=duration_minutes,
                steps=steps
            )
            
            phases.append(phase)
            phase_number += 1
        
        return phases
    
    def _parse_steps(self, phase_content: str, phase_number: int) -> List[WorkflowStep]:
        """Parse steps within a phase."""
        steps = []
        
        # Pattern: "1. **Step Name** → Agent Name"
        step_pattern = r'(\d+)\.\s+\*\*(.+?)\*\*\s*→\s*(.+?)(?:\n|$)'
        step_matches = re.finditer(step_pattern, phase_content, re.MULTILINE)
        
        step_number = 1
        for match in step_matches:
            step_num = int(match.group(1))
            step_name = match.group(2).strip()
            agent_or_action = match.group(3).strip()
            
            # Extract description (lines after step header)
            description = self._extract_step_description(phase_content, match.end())
            
            # Determine step type and agent
            step_type, agent_id = self._parse_agent_reference(agent_or_action)
            
            # Extract handoff information
            handoff_to, handoff_type, handoff_criteria = self._parse_handoff(description)
            
            # Check if mandatory
            is_mandatory = "always" in description.lower() or "required" in description.lower()
            
            # Extract conditions
            conditions = self._parse_conditions(description)
            
            step = WorkflowStep(
                step_id=f"phase_{phase_number}_step_{step_number}",
                step_number=step_number,
                name=step_name,
                description=description,
                step_type=step_type,
                agent_id=agent_id,
                handoff_to=handoff_to,
                handoff_type=handoff_type,
                handoff_criteria=handoff_criteria,
                is_mandatory=is_mandatory,
                conditions=conditions
            )
            
            steps.append(step)
            step_number += 1
        
        return steps
    
    def _parse_agent_reference(self, agent_text: str) -> tuple[StepType, Optional[str]]:
        """Parse agent reference from step text."""
        # Normalize agent names to match registry IDs (without -agent suffix)
        agent_mapping = {
            "planner agent": "planner",
            "planner": "planner",
            "requirements analyst agent": "requirements-analyst",
            "requirements analyst": "requirements-analyst",
            "system architect agent": "system-architect",
            "system architect": "system-architect",
            "backend agent": "backend",
            "backend": "backend",
            "frontend agent": "frontend",
            "frontend": "frontend",
            "senior frontend developer": "senior-frontend-developer",
            "fullstack agent": "fullstack",
            "fullstack": "fullstack",
            "api contract agent": "api-contract",
            "api contract": "api-contract",
            "test manager": "test-manager",
            "code review agent": "code-review",
            "code review": "code-review",
            "security review agent": "security-review",
            "security review": "security-review",
            "documentation agent": "documentation",
            "documentation": "documentation",
            "garbage collection agent": "garbage-collection",
            "garbage collection": "garbage-collection",
            "version controller": "version-controller",
            "prompt engineer agent": "prompt-engineer",
            "prompt engineer": "prompt-engineer",
            "knowledge specialist agent": "knowledge-specialist",
            "knowledge specialist": "knowledge-specialist",
            "researcher agent": "researcher",
            "researcher": "researcher",
            "agent quality agent": "agent-quality",
            "agent quality": "agent-quality",
            # Legacy/alternative names
            "bug collector": "bug-collector",
            "bug collector script": "bug-collector",
            "single agent fixer": "bug-fixer-agent",
            "multi-agent fixer": "bug-fixer-multi-agent",
            "debug agent": "debug-agent",
            "fix agent": "fix-agent",
        }
        
        agent_text_lower = agent_text.lower()
        
        # Check for script references
        if "script" in agent_text_lower:
            script_name = agent_text_lower.replace(" script", "").replace("script", "").strip()
            return StepType.SCRIPT, script_name
        
        # Check for manual intervention
        if "manual" in agent_text_lower or "user" in agent_text_lower:
            return StepType.MANUAL, None
        
        # Map agent names (check longer matches first to avoid partial matches)
        sorted_keys = sorted(agent_mapping.keys(), key=len, reverse=True)
        for key in sorted_keys:
            if key in agent_text_lower:
                return StepType.AGENT, agent_mapping[key]
        
        # Default to agent type with extracted name (remove "agent" suffix if present)
        agent_id = agent_text_lower.replace(" agent", "").replace(" ", "-")
        return StepType.AGENT, agent_id
    
    def _parse_handoff(self, description: str) -> tuple[Optional[str], HandoffType, Optional[str]]:
        """Parse handoff information from step description."""
        handoff_to = None
        handoff_type = HandoffType.ALWAYS
        handoff_criteria = None
        
        # Look for handoff patterns
        handoff_pattern = r'hands?\s+off\s+to\s+([^\n,\.]+)'
        handoff_match = re.search(handoff_pattern, description, re.IGNORECASE)
        if handoff_match:
            handoff_text = handoff_match.group(1).strip()
            # Clean up: remove markdown formatting, parentheses, arrows, and other artifacts
            handoff_text = re.sub(r'\*\*|\([^)]*\)|→|\(never[^)]*\)', '', handoff_text, flags=re.IGNORECASE)
            handoff_text = handoff_text.strip()
            # Convert to agent ID format
            handoff_to = handoff_text.lower().replace(" ", "-").replace("_", "-")
            # Remove any remaining non-alphanumeric/dash characters except hyphens
            handoff_to = re.sub(r'[^a-z0-9-]', '', handoff_to)
            # Remove multiple consecutive hyphens
            handoff_to = re.sub(r'-+', '-', handoff_to).strip('-')
        
        # Look for conditional handoffs
        if "if" in description.lower() or "when" in description.lower():
            handoff_type = HandoffType.CONDITIONAL
            # Extract condition
            condition_match = re.search(r'(?:if|when)\s+([^\n,\.]+)', description, re.IGNORECASE)
            if condition_match:
                handoff_criteria = condition_match.group(1).strip()
        
        # Look for "always" handoffs
        if "always" in description.lower():
            handoff_type = HandoffType.ALWAYS
        
        return handoff_to, handoff_type, handoff_criteria
    
    def _parse_conditions(self, description: str) -> List[WorkflowCondition]:
        """Parse conditional branches from step description."""
        conditions = []
        
        # Look for conditional patterns like "{Condition?}"
        condition_pattern = r'\{([^}]+)\}'
        condition_matches = re.finditer(condition_pattern, description)
        
        for idx, match in enumerate(condition_matches):
            condition_text = match.group(1).strip()
            condition = WorkflowCondition(
                condition_id=f"condition_{idx}",
                description=condition_text,
                condition_expression=condition_text
            )
            conditions.append(condition)
        
        return conditions
    
    def _extract_step_description(self, content: str, start_pos: int) -> str:
        """Extract description text for a step."""
        # Get lines after the step header until next numbered step or end
        lines = content[start_pos:].split('\n')
        description_lines = []
        
        for line in lines:
            # Stop at next numbered step
            if re.match(r'^\d+\.\s+\*\*', line):
                break
            # Stop at next phase
            if line.startswith('### Phase'):
                break
            description_lines.append(line)
        
        return '\n'.join(description_lines).strip()
    
    def _parse_duration(self, duration_str: str) -> Optional[int]:
        """Parse duration string into minutes."""
        # Patterns: "30-45 minutes", "1-4 hours", etc.
        duration_str = duration_str.lower()
        
        # Extract numbers
        numbers = re.findall(r'(\d+)', duration_str)
        if not numbers:
            return None
        
        # Determine unit
        if "hour" in duration_str:
            # Convert hours to minutes
            return int(numbers[0]) * 60
        elif "minute" in duration_str:
            return int(numbers[0])
        
        return None
    
    def _parse_rules(self, content: str) -> List[WorkflowRule]:
        """Parse workflow rules section."""
        rules = []
        
        # Find Workflow Rules section
        rules_section = re.search(
            r'## Workflow Rules\s*\n\n(.*?)(?=\n##|\Z)',
            content,
            re.DOTALL
        )
        
        if not rules_section:
            return rules
        
        rules_content = rules_section.group(1)
        
        # Parse mandatory steps
        mandatory_match = re.search(
            r'### Mandatory Steps\s*\n(.*?)(?=\n###|\Z)',
            rules_content,
            re.DOTALL
        )
        if mandatory_match:
            mandatory_text = mandatory_match.group(1)
            step_ids = re.findall(r'✅\s+(.+?)(?:\n|$)', mandatory_text)
            rule = WorkflowRule(
                rule_type="mandatory",
                description="Mandatory steps that cannot be skipped",
                step_ids=[s.strip() for s in step_ids],
                conditions=[]
            )
            rules.append(rule)
        
        # Parse conditional steps
        conditional_match = re.search(
            r'### Conditional Steps\s*\n(.*?)(?=\n###|\Z)',
            rules_content,
            re.DOTALL
        )
        if conditional_match:
            conditional_text = conditional_match.group(1)
            step_ids = re.findall(r'⚠️\s+(.+?)(?:\n|$)', conditional_text)
            rule = WorkflowRule(
                rule_type="conditional",
                description="Conditional steps that may be skipped",
                step_ids=[s.strip() for s in step_ids],
                conditions=[]
            )
            rules.append(rule)
        
        # Parse handoff criteria
        handoff_match = re.search(
            r'### Handoff Criteria\s*\n(.*?)(?=\n###|\Z)',
            rules_content,
            re.DOTALL
        )
        if handoff_match:
            handoff_text = handoff_match.group(1)
            criteria = re.findall(r'-\s+\*\*(.+?)\*\*:\s*(.+?)(?:\n|$)', handoff_text)
            rule = WorkflowRule(
                rule_type="handoff_criteria",
                description="Criteria for agent handoffs",
                conditions=[f"{c[0]}: {c[1]}" for c in criteria],
                step_ids=[]
            )
            rules.append(rule)
        
        return rules
    
    def _parse_error_handling(self, content: str) -> Dict[str, Any]:
        """Parse error handling section."""
        error_section = re.search(
            r'## Error Handling\s*\n\n(.*?)(?=\n##|\Z)',
            content,
            re.DOTALL
        )
        
        if not error_section:
            return {}
        
        error_content = error_section.group(1)
        error_handling = {}
        
        # Extract error scenarios
        scenarios = re.findall(
            r'### If (.+?)\s*\n(.*?)(?=\n### If|\Z)',
            error_content,
            re.DOTALL
        )
        
        for scenario_name, scenario_content in scenarios:
            error_handling[scenario_name.strip()] = scenario_content.strip()
        
        return error_handling
    
    def _parse_success_criteria(self, content: str) -> List[str]:
        """Parse success criteria section."""
        criteria_section = re.search(
            r'## Success Criteria\s*\n\n(.*?)(?=\n##|\Z)',
            content,
            re.DOTALL
        )
        
        if not criteria_section:
            return []
        
        criteria_content = criteria_section.group(1)
        
        # Extract criteria (lines starting with - ✅)
        criteria = re.findall(r'-\s+✅\s+(.+?)(?:\n|$)', criteria_content)
        
        return [c.strip() for c in criteria]
    
    def _parse_metrics(self, content: str) -> Dict[str, Any]:
        """Parse metrics section."""
        metrics_section = re.search(
            r'## Metrics\s*\n\n(.*?)(?=\n##|\Z)',
            content,
            re.DOTALL
        )
        
        if not metrics_section:
            return {}
        
        metrics_content = metrics_section.group(1)
        metrics = {}
        
        # Extract metric lines (format: "- **Name**: Value")
        metric_pattern = r'-\s+\*\*(.+?)\*\*:\s*(.+?)(?:\n|$)'
        metric_matches = re.finditer(metric_pattern, metrics_content)
        
        for match in metric_matches:
            name = match.group(1).strip()
            value = match.group(2).strip()
            metrics[name] = value
        
        return metrics
    
    def _extract_mermaid_diagram(self, content: str) -> Optional[str]:
        """Extract mermaid diagram from workflow definition."""
        mermaid_match = re.search(
            r'```mermaid\s*\n(.*?)\n```',
            content,
            re.DOTALL
        )
        
        if mermaid_match:
            return mermaid_match.group(1).strip()
        
        return None
    
    def list_workflows(self) -> List[Path]:
        """List all workflow definition files."""
        if not self.workflows_dir.exists():
            return []
        
        return list(self.workflows_dir.glob("*.md"))


# Global parser instance
_workflow_parser: Optional[WorkflowParser] = None


def get_workflow_parser() -> WorkflowParser:
    """Get or create global workflow parser instance."""
    global _workflow_parser
    
    if _workflow_parser is None:
        _workflow_parser = WorkflowParser()
    
    return _workflow_parser













