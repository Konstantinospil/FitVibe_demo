#!/usr/bin/env python3
"""
Agent Security Standards Validator
Validates agent configurations against security standards defined in SECURITY_STANDARDS.md

Usage:
    python .cursor/scripts/validate_agent_security.py [--agent <agent_id>] [--strict]
    python .cursor/scripts/validate_agent_security.py --all  # Validate all agents
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Set, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

try:
    import yaml
except ImportError:
    yaml = None
    print("Warning: PyYAML not installed. Install with: pip install pyyaml")

ROOT_DIR = Path(__file__).parent.parent.parent
AGENTS_DIR = ROOT_DIR / ".cursor" / "agents"
SECURITY_STANDARDS = ROOT_DIR / ".cursor" / "agents" / "SECURITY_STANDARDS.md"

@dataclass
class ValidationResult:
    """Result of a validation check."""
    agent_id: str
    check_name: str
    passed: bool
    message: str
    severity: str  # "error", "warning", "info"

class AgentSecurityValidator:
    """Validates agent configurations against security standards."""
    
    # Define allowed/restricted tools per agent from SECURITY_STANDARDS.md
    AGENT_TOOL_RESTRICTIONS = {
        "planner-agent": {
            "allowed": {"Read", "Grep", "Glob", "WebFetch", "TodoWrite", "AskUserQuestion", "SlashCommand"},
            "restricted": {"Edit", "Write", "Bash", "NotebookEdit", "BashOutput", "KillShell", "Skill"},
            "no_git": True,
        },
        "requirements-analyst-agent": {
            "allowed": {"Read", "Grep", "Glob", "WebFetch", "TodoWrite", "Write", "AskUserQuestion"},
            "restricted": {"Edit", "Bash", "NotebookEdit", "Git", "BashOutput", "KillShell"},
            "no_git": True,
        },
        "backend-agent": {
            "allowed": {"Read", "Grep", "Glob", "Edit", "Write", "Bash", "TodoWrite", "NotebookEdit", "BashOutput", "KillShell", "AskUserQuestion", "Skill", "SlashCommand"},
            "restricted": {},
            "no_git": True,  # Must hand off to version-controller
        },
        "senior-frontend-developer": {
            "allowed": {"Read", "Grep", "Glob", "Edit", "Write", "Bash", "TodoWrite", "NotebookEdit", "BashOutput", "KillShell", "AskUserQuestion", "Skill", "SlashCommand"},
            "restricted": {},
            "no_git": True,
        },
        "fullstack-agent": {
            "allowed": {"Read", "Grep", "Glob", "Edit", "Write", "Bash", "TodoWrite", "NotebookEdit", "BashOutput", "KillShell", "AskUserQuestion", "Skill", "SlashCommand"},
            "restricted": {},
            "no_git": True,
        },
        "test-manager": {
            "allowed": {"Read", "Grep", "Glob", "Edit", "Write", "Bash", "TodoWrite", "NotebookEdit", "BashOutput", "KillShell", "AskUserQuestion", "Skill", "SlashCommand"},
            "restricted": {},
            "no_git": True,
        },
        "code-review-agent": {
            "allowed": {"Read", "Grep", "Glob", "WebFetch", "TodoWrite", "Bash"},
            "restricted": {"Edit", "Write", "NotebookEdit", "Git", "BashOutput", "KillShell", "AskUserQuestion", "Skill"},
            "read_only": True,
            "no_git": True,
        },
        "security-review-agent": {
            "allowed": {"Read", "Grep", "Glob", "WebFetch", "TodoWrite", "Bash"},
            "restricted": {"Edit", "Write", "NotebookEdit", "Git", "BashOutput", "KillShell", "AskUserQuestion", "Skill"},
            "read_only": True,
            "no_git": True,
        },
        "api-contract-agent": {
            "allowed": {"Read", "Grep", "Glob", "TodoWrite", "Bash"},
            "restricted": {"Edit", "Write", "NotebookEdit", "Git", "WebFetch", "BashOutput", "KillShell", "AskUserQuestion", "Skill"},
            "read_only": True,
            "no_git": True,
        },
        "documentation-agent": {
            "allowed": {"Read", "Grep", "Glob", "WebFetch", "Edit", "Write", "TodoWrite"},
            "restricted": {"Bash", "NotebookEdit", "Git", "BashOutput", "KillShell"},
            "no_git": True,
        },
        "version-controller": {
            "allowed": {"Read", "Grep", "Glob", "Edit", "Write", "Bash", "TodoWrite", "WebFetch", "SlashCommand"},
            "restricted": {"NotebookEdit"},  # Only version-controller can do git ops
            "can_git": True,
            "can_commit": True,
        },
        "agent-quality-agent": {
            "allowed": {"Read", "Grep", "Glob", "Edit", "Write", "TodoWrite"},
            "restricted": {"Bash", "Git", "NotebookEdit", "BashOutput", "KillShell"},
            "no_git": True,
        },
    }
    
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.agents_dir = root_dir / ".cursor" / "agents"
        self.results: List[ValidationResult] = []
    
    def parse_agent_file(self, agent_file: Path) -> Optional[Dict]:
        """Parse agent YAML frontmatter and content."""
        if not agent_file.exists():
            return None
        
        if yaml is None:
            return {"error": "PyYAML not installed. Install with: pip install pyyaml"}
        
        content = agent_file.read_text(encoding="utf-8")
        
        # Extract YAML frontmatter
        frontmatter_match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
        if not frontmatter_match:
            return None
        
        try:
            frontmatter = yaml.safe_load(frontmatter_match.group(1))
            return {
                "name": frontmatter.get("name", ""),
                "description": frontmatter.get("description", ""),
                "tools": frontmatter.get("tools", ""),
                "model": frontmatter.get("model", ""),
                "color": frontmatter.get("color", ""),
                "content": content,
            }
        except yaml.YAMLError as e:
            return {"error": f"Failed to parse YAML: {e}"}
    
    def extract_tools_list(self, tools_str: str) -> Set[str]:
        """Extract tool names from comma-separated string."""
        if not tools_str:
            return set()
        return {tool.strip() for tool in tools_str.split(",")}
    
    def validate_agent_tools(self, agent_id: str, agent_config: Dict) -> List[ValidationResult]:
        """Validate agent tools against security standards."""
        results = []
        
        # Get restrictions for this agent
        restrictions = self.AGENT_TOOL_RESTRICTIONS.get(agent_id, {})
        if not restrictions:
            results.append(ValidationResult(
                agent_id, "tool_validation", False,
                f"Agent {agent_id} not found in security standards",
                "error"
            ))
            return results
        
        # Extract tools from agent config
        tools_str = agent_config.get("tools", "")
        agent_tools = self.extract_tools_list(tools_str)
        
        # Check for restricted tools
        restricted = restrictions.get("restricted", set())
        for tool in agent_tools:
            if tool in restricted:
                results.append(ValidationResult(
                    agent_id, "tool_restriction", False,
                    f"Tool '{tool}' is restricted for {agent_id} according to security standards",
                    "error"
                ))
        
        # Check if read-only agent has write tools
        if restrictions.get("read_only") and (agent_tools & {"Edit", "Write"}):
            results.append(ValidationResult(
                agent_id, "read_only_violation", False,
                f"{agent_id} is read-only but has Edit/Write tools",
                "error"
            ))
        
        # Check git operations
        if restrictions.get("no_git") and "Git" in agent_tools:
            results.append(ValidationResult(
                agent_id, "git_restriction", False,
                f"{agent_id} cannot use Git operations (must hand off to version-controller)",
                "error"
            ))
        
        # Version-controller should be the only one with git permissions
        if agent_id != "version-controller" and not restrictions.get("no_git") and "Git" not in restrictions.get("allowed", set()):
            if "Git" in agent_tools:
                results.append(ValidationResult(
                    agent_id, "git_restriction", False,
                    f"{agent_id} should not have Git operations (only version-controller can)",
                    "error"
                ))
        
        return results
    
    def validate_agent_security_mentions(self, agent_id: str, agent_config: Dict) -> List[ValidationResult]:
        """Check if agent references security standards."""
        results = []
        content = agent_config.get("content", "")
        
        # Check for security standards reference
        if "SECURITY_STANDARDS.md" not in content and "security standards" not in content.lower():
            results.append(ValidationResult(
                agent_id, "security_reference", False,
                f"{agent_id} does not reference SECURITY_STANDARDS.md",
                "warning"
            ))
        
        return results
    
    def validate_agent(self, agent_id: str, strict: bool = False) -> List[ValidationResult]:
        """Validate a single agent."""
        results = []
        
        # Map agent IDs to filenames
        agent_file_map = {
            "planner-agent": "planner-agent.md",
            "requirements-analyst-agent": "requirements-analyst-agent.md",
            "backend-agent": "backend-agent.md",
            "senior-frontend-developer": "senior-frontend-developer.md",
            "fullstack-agent": "fullstack-agent.md",
            "test-manager": "test_manager.md",
            "code-review-agent": "code-review-agent.md",
            "security-review-agent": "security-review-agent.md",
            "api-contract-agent": "api-contract-agent.md",
            "documentation-agent": "documentation-agent.md",
            "version-controller": "version_controller.md",
            "agent-quality-agent": "agent-quality-agent.md",
        }
        
        filename = agent_file_map.get(agent_id)
        if not filename:
            results.append(ValidationResult(
                agent_id, "file_not_found", False,
                f"Agent file mapping not found for {agent_id}",
                "error"
            ))
            return results
        
        agent_file = self.agents_dir / filename
        if not agent_file.exists():
            results.append(ValidationResult(
                agent_id, "file_not_found", False,
                f"Agent file not found: {agent_file}",
                "error"
            ))
            return results
        
        # Parse agent file
        agent_config = self.parse_agent_file(agent_file)
        if not agent_config or "error" in agent_config:
            results.append(ValidationResult(
                agent_id, "parse_error", False,
                agent_config.get("error", "Failed to parse agent file") if agent_config else "Failed to read agent file",
                "error"
            ))
            return results
        
        # Validate tools
        results.extend(self.validate_agent_tools(agent_id, agent_config))
        
        # Validate security references
        if strict:
            results.extend(self.validate_agent_security_mentions(agent_id, agent_config))
        
        return results
    
    def validate_all_agents(self, strict: bool = False) -> List[ValidationResult]:
        """Validate all agents."""
        all_results = []
        
        for agent_id in self.AGENT_TOOL_RESTRICTIONS.keys():
            results = self.validate_agent(agent_id, strict)
            all_results.extend(results)
        
        return all_results
    
    def print_results(self, results: List[ValidationResult], verbose: bool = False):
        """Print validation results."""
        errors = [r for r in results if r.severity == "error"]
        warnings = [r for r in results if r.severity == "warning"]
        infos = [r for r in results if r.severity == "info"]
        
        if errors:
            print("\n❌ ERRORS:")
            for result in errors:
                print(f"  [{result.agent_id}] {result.check_name}: {result.message}")
        
        if warnings:
            print("\n⚠️  WARNINGS:")
            for result in warnings:
                print(f"  [{result.agent_id}] {result.check_name}: {result.message}")
        
        if verbose and infos:
            print("\nℹ️  INFO:")
            for result in infos:
                print(f"  [{result.agent_id}] {result.check_name}: {result.message}")
        
        print("\n" + "="*60)
        print(f"Total: {len(results)} checks")
        print(f"  Errors: {len(errors)}")
        print(f"  Warnings: {len(warnings)}")
        print(f"  Info: {len(infos)}")
        
        if errors:
            print("\n❌ Validation FAILED")
            return 1
        elif warnings:
            print("\n⚠️  Validation passed with warnings")
            return 0
        else:
            print("\n✅ Validation PASSED")
            return 0

def main():
    parser = argparse.ArgumentParser(
        description="Validate agent configurations against security standards"
    )
    parser.add_argument(
        "--agent",
        help="Validate specific agent (e.g., 'backend-agent')",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Validate all agents",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Enable strict validation (includes warnings)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show all validation messages",
    )
    
    args = parser.parse_args()
    
    validator = AgentSecurityValidator(ROOT_DIR)
    
    if args.agent:
        print(f"Validating agent: {args.agent}\n")
        results = validator.validate_agent(args.agent, args.strict)
    elif args.all:
        print("Validating all agents...\n")
        results = validator.validate_all_agents(args.strict)
    else:
        print("Validating all agents...\n")
        results = validator.validate_all_agents(args.strict)
    
    exit_code = validator.print_results(results, args.verbose)
    sys.exit(exit_code)

if __name__ == "__main__":
    main()

