"""
Model Router - Routes tasks to appropriate AI models based on complexity.

This module implements intelligent routing of tasks to Claude models (Haiku, Sonnet, Opus)
based on task complexity, cost optimization, and quality requirements.

Version: 1.0
Last Updated: 2025-01-21
"""

import os
import json
import logging
from typing import Dict, Any, Optional, Literal
from enum import Enum
from dataclasses import dataclass, asdict
from datetime import datetime

# Imports with fallback for testing
try:
    from ..observability.audit_logger import audit_logger, EventType
    from ..observability.quota_tracker import quota_tracker
except ImportError:
    # Fallback for testing
    from .audit_logger_fallback import _audit_logger_fallback as audit_logger
    from enum import Enum
    EventType = Enum("EventType", ["TOOL_CALL", "INFO", "ERROR", "WARNING"])
    quota_tracker = None

# Model tiers
ModelTier = Literal["haiku", "sonnet", "opus"]

# Cost per 1M input tokens (approximate, in USD)
MODEL_COSTS = {
    "haiku": {"input": 0.25, "output": 1.25},
    "sonnet": {"input": 3.00, "output": 15.00},
    "opus": {"input": 15.00, "output": 75.00},
}

# Model context windows (in tokens)
MODEL_CONTEXT_WINDOWS = {
    "haiku": 200_000,
    "sonnet": 200_000,
    "opus": 200_000,
}


class ComplexityLevel(Enum):
    """Task complexity levels."""
    TRIVIAL = "trivial"  # Simple, straightforward tasks
    SIMPLE = "simple"  # Standard tasks with clear requirements
    MODERATE = "moderate"  # Tasks requiring analysis or design
    COMPLEX = "complex"  # Tasks requiring deep reasoning
    CRITICAL = "critical"  # Critical tasks requiring highest quality


@dataclass
class TaskComplexity:
    """Represents task complexity analysis."""
    level: ComplexityLevel
    score: float  # 0.0 to 1.0
    factors: Dict[str, float]  # Individual factor scores
    reasoning: str  # Explanation of complexity assessment


@dataclass
class RoutingDecision:
    """Represents a model routing decision."""
    model: ModelTier
    complexity: TaskComplexity
    estimated_cost_usd: float
    reasoning: str
    timestamp: str


class ModelRouter:
    """
    Routes tasks to appropriate AI models based on complexity analysis.
    
    Features:
    - Complexity scoring based on multiple factors
    - Cost-aware routing for optimization
    - Quality-aware routing for critical tasks
    - Cost tracking by model
    - Routing history and analytics
    """
    
    def __init__(
        self,
        config_path: Optional[str] = None,
        history_path: str = ".cursor/data/routing_history.jsonl",
        default_model: ModelTier = "sonnet"
    ):
        # Use config loader if available, otherwise fall back to file-based
        try:
            from .config_loader import config_loader
            self.config = config_loader.get_section("model_router") or {}
            if not self.config:
                # Fall back to file-based if config not found
                self.config_path = config_path or ".cursor/config/model_router.json"
                self.config = self._load_config()
            else:
                self.config_path = None
        except ImportError:
            self.config_path = config_path or ".cursor/config/model_router.json"
            self.config = self._load_config()
        
        self.history_path = history_path
        self.default_model = default_model
        self._ensure_history_file()
        
        audit_logger.log_info(
            agent_id="ModelRouter",
            message="ModelRouter initialized",
            details={"config": self.config, "default_model": default_model}
        )
    
    def _load_config(self) -> Dict[str, Any]:
        """Loads routing configuration from JSON file."""
        if not self.config_path or not os.path.exists(self.config_path):
            default_config = {
                "routing_rules": {
                    "trivial": {"model": "haiku", "min_score": 0.0, "max_score": 0.2},
                    "simple": {"model": "haiku", "min_score": 0.2, "max_score": 0.4},
                    "moderate": {"model": "sonnet", "min_score": 0.4, "max_score": 0.7},
                    "complex": {"model": "sonnet", "min_score": 0.7, "max_score": 0.9},
                    "critical": {"model": "opus", "min_score": 0.9, "max_score": 1.0}
                },
                "cost_optimization": {
                    "enabled": True,
                    "prefer_cheaper": True,
                    "quality_threshold": 0.8
                },
                "quality_requirements": {
                    "always_opus": ["security_review", "architecture_design", "critical_bug_fix"],
                    "always_sonnet": ["code_review", "test_generation", "api_design"],
                    "can_use_haiku": ["documentation", "simple_refactor", "formatting"]
                }
            }
            if self.config_path:
                os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
                with open(self.config_path, 'w') as f:
                    json.dump(default_config, f, indent=2)
            return default_config
        else:
            with open(self.config_path, 'r') as f:
                return json.load(f)
    
    def _ensure_history_file(self):
        """Ensures routing history file exists."""
        os.makedirs(os.path.dirname(self.history_path), exist_ok=True)
        if not os.path.exists(self.history_path):
            # Create empty file
            open(self.history_path, 'a').close()
    
    def analyze_complexity(
        self,
        task_type: str,
        task_description: str,
        context_size: int = 0,
        requires_reasoning: bool = False,
        requires_creativity: bool = False,
        requires_domain_knowledge: bool = False,
        quality_requirement: str = "standard"
    ) -> TaskComplexity:
        """
        Analyzes task complexity based on multiple factors.
        
        Factors considered:
        - Task type and description length
        - Context size (input tokens)
        - Reasoning requirements
        - Creativity requirements
        - Domain knowledge requirements
        - Quality requirements
        """
        factors = {}
        
        # Factor 1: Task type complexity (0.0 to 0.3)
        task_type_scores = {
            "trivial": 0.05,
            "simple": 0.15,
            "moderate": 0.25,
            "complex": 0.30
        }
        factors["task_type"] = task_type_scores.get(task_type, 0.20)
        
        # Factor 2: Description complexity (0.0 to 0.2)
        # Longer, more detailed descriptions indicate complexity
        desc_length = len(task_description)
        if desc_length < 100:
            factors["description"] = 0.05
        elif desc_length < 500:
            factors["description"] = 0.10
        elif desc_length < 2000:
            factors["description"] = 0.15
        else:
            factors["description"] = 0.20
        
        # Factor 3: Context size (0.0 to 0.2)
        # Larger context indicates more complex task
        if context_size < 1000:
            factors["context_size"] = 0.05
        elif context_size < 10000:
            factors["context_size"] = 0.10
        elif context_size < 50000:
            factors["context_size"] = 0.15
        else:
            factors["context_size"] = 0.20
        
        # Factor 4: Reasoning requirements (0.0 to 0.15)
        factors["reasoning"] = 0.15 if requires_reasoning else 0.0
        
        # Factor 5: Creativity requirements (0.0 to 0.1)
        factors["creativity"] = 0.10 if requires_creativity else 0.0
        
        # Factor 6: Domain knowledge (0.0 to 0.1)
        factors["domain_knowledge"] = 0.10 if requires_domain_knowledge else 0.0
        
        # Factor 7: Quality requirement (0.0 to 0.1)
        quality_scores = {
            "standard": 0.0,
            "high": 0.05,
            "critical": 0.10
        }
        factors["quality"] = quality_scores.get(quality_requirement, 0.0)
        
        # Calculate total complexity score
        total_score = sum(factors.values())
        total_score = min(1.0, total_score)  # Cap at 1.0
        
        # Determine complexity level
        if total_score < 0.2:
            level = ComplexityLevel.TRIVIAL
        elif total_score < 0.4:
            level = ComplexityLevel.SIMPLE
        elif total_score < 0.7:
            level = ComplexityLevel.MODERATE
        elif total_score < 0.9:
            level = ComplexityLevel.COMPLEX
        else:
            level = ComplexityLevel.CRITICAL
        
        reasoning = (
            f"Complexity score: {total_score:.2f}. "
            f"Factors: task_type={factors['task_type']:.2f}, "
            f"description={factors['description']:.2f}, "
            f"context={factors['context_size']:.2f}, "
            f"reasoning={factors['reasoning']:.2f}, "
            f"creativity={factors['creativity']:.2f}, "
            f"domain={factors['domain_knowledge']:.2f}, "
            f"quality={factors['quality']:.2f}"
        )
        
        return TaskComplexity(
            level=level,
            score=total_score,
            factors=factors,
            reasoning=reasoning
        )
    
    def route_to_model(
        self,
        task_type: str,
        task_description: str,
        context_size: int = 0,
        requires_reasoning: bool = False,
        requires_creativity: bool = False,
        requires_domain_knowledge: bool = False,
        quality_requirement: str = "standard",
        estimated_input_tokens: int = 1000,
        estimated_output_tokens: int = 500
    ) -> RoutingDecision:
        """
        Routes a task to the appropriate model based on complexity analysis.
        
        Returns:
            RoutingDecision with model, complexity, cost estimate, and reasoning
        """
        # Analyze complexity
        complexity = self.analyze_complexity(
            task_type=task_type,
            task_description=task_description,
            context_size=context_size,
            requires_reasoning=requires_reasoning,
            requires_creativity=requires_creativity,
            requires_domain_knowledge=requires_domain_knowledge,
            quality_requirement=quality_requirement
        )
        
        # Check quality requirements first (overrides complexity)
        quality_rules = self.config.get("quality_requirements", {})
        if task_type in quality_rules.get("always_opus", []):
            model = "opus"
            reasoning = f"Task type '{task_type}' requires Opus (quality requirement)"
        elif task_type in quality_rules.get("always_sonnet", []):
            model = "sonnet"
            reasoning = f"Task type '{task_type}' requires Sonnet (quality requirement)"
        elif task_type in quality_rules.get("can_use_haiku", []):
            # Can use Haiku, but check complexity
            if complexity.score < 0.4:
                model = "haiku"
                reasoning = f"Task type '{task_type}' can use Haiku, complexity is low"
            else:
                model = "sonnet"
                reasoning = f"Task type '{task_type}' can use Haiku, but complexity requires Sonnet"
        else:
            # Use routing rules based on complexity
            routing_rules = self.config.get("routing_rules", {})
            model = self.default_model
            reasoning = f"Using default model '{self.default_model}'"
            
            for level_name, rule in routing_rules.items():
                if rule["min_score"] <= complexity.score < rule["max_score"]:
                    model = rule["model"]
                    reasoning = f"Complexity level '{complexity.level.value}' ({complexity.score:.2f}) routes to {model}"
                    break
        
        # Cost optimization (if enabled)
        cost_opt = self.config.get("cost_optimization", {})
        if cost_opt.get("enabled", True) and cost_opt.get("prefer_cheaper", True):
            # Check if we can use a cheaper model
            if model == "opus" and complexity.score < 0.95:
                # Consider Sonnet if quality threshold allows
                if complexity.score < cost_opt.get("quality_threshold", 0.8):
                    model = "sonnet"
                    reasoning += f" (cost optimization: downgraded from Opus)"
            elif model == "sonnet" and complexity.score < 0.6:
                # Consider Haiku if quality threshold allows
                if complexity.score < cost_opt.get("quality_threshold", 0.8):
                    model = "haiku"
                    reasoning += f" (cost optimization: downgraded from Sonnet)"
        
        # Calculate estimated cost
        cost = self._estimate_cost(model, estimated_input_tokens, estimated_output_tokens)
        
        # Create routing decision
        decision = RoutingDecision(
            model=model,
            complexity=complexity,
            estimated_cost_usd=cost,
            reasoning=reasoning,
            timestamp=datetime.utcnow().isoformat()
        )
        
        # Log routing decision
        self._log_routing_decision(decision, task_type, task_description)
        
        # Track cost
        if quota_tracker:
            quota_tracker.record_usage(
                tokens=estimated_input_tokens + estimated_output_tokens,
                agent_id="ModelRouter",
                task_type=task_type
            )
        
        audit_logger.log_tool_call(
            agent_id="ModelRouter",
            tool_name="route_to_model",
            params={
                "task_type": task_type,
                "complexity_score": complexity.score,
                "model": model,
                "estimated_cost": cost
            },
            output_summary=f"Routed to {model} with complexity {complexity.score:.2f}",
            duration_ms=0,
            status="success"
        )
        
        return decision
    
    def _estimate_cost(
        self,
        model: ModelTier,
        input_tokens: int,
        output_tokens: int
    ) -> float:
        """Estimates cost for a task based on model and token counts."""
        costs = MODEL_COSTS.get(model, MODEL_COSTS["sonnet"])
        input_cost = (input_tokens / 1_000_000) * costs["input"]
        output_cost = (output_tokens / 1_000_000) * costs["output"]
        return input_cost + output_cost
    
    def _log_routing_decision(
        self,
        decision: RoutingDecision,
        task_type: str,
        task_description: str
    ):
        """Logs routing decision to history file."""
        log_entry = {
            "timestamp": decision.timestamp,
            "task_type": task_type,
            "task_description": task_description[:200],  # Truncate for storage
            "model": decision.model,
            "complexity_score": decision.complexity.score,
            "complexity_level": decision.complexity.level.value,
            "estimated_cost_usd": decision.estimated_cost_usd,
            "reasoning": decision.reasoning,
            "complexity_factors": decision.complexity.factors
        }
        
        with open(self.history_path, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
    
    def get_routing_stats(self, days: int = 7) -> Dict[str, Any]:
        """Returns routing statistics for the last N days."""
        if not os.path.exists(self.history_path):
            return {
                "total_routes": 0,
                "by_model": {},
                "by_complexity": {},
                "total_cost_usd": 0.0,
                "average_complexity": 0.0
            }
        
        stats = {
            "total_routes": 0,
            "by_model": {"haiku": 0, "sonnet": 0, "opus": 0},
            "by_complexity": {
                "trivial": 0,
                "simple": 0,
                "moderate": 0,
                "complex": 0,
                "critical": 0
            },
            "total_cost_usd": 0.0,
            "complexity_scores": []
        }
        
        cutoff_date = datetime.utcnow().timestamp() - (days * 24 * 60 * 60)
        
        with open(self.history_path, 'r') as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    entry = json.loads(line)
                    entry_timestamp = datetime.fromisoformat(entry["timestamp"]).timestamp()
                    if entry_timestamp >= cutoff_date:
                        stats["total_routes"] += 1
                        stats["by_model"][entry["model"]] += 1
                        stats["by_complexity"][entry["complexity_level"]] += 1
                        stats["total_cost_usd"] += entry.get("estimated_cost_usd", 0.0)
                        stats["complexity_scores"].append(entry["complexity_score"])
                except (json.JSONDecodeError, KeyError, ValueError):
                    continue
        
        if stats["complexity_scores"]:
            stats["average_complexity"] = sum(stats["complexity_scores"]) / len(stats["complexity_scores"])
        else:
            stats["average_complexity"] = 0.0
        
        del stats["complexity_scores"]  # Remove temporary list
        
        return stats


# Global instance for easy access
model_router = ModelRouter()

