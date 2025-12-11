"""
Tests for model router module.

Version: 1.0
Last Updated: 2025-01-21
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from orchestration.model_router import (
    ModelRouter,
    ComplexityLevel,
    TaskComplexity,
    RoutingDecision,
)


class TestModelRouter:
    """Tests for ModelRouter."""
    
    def test_analyze_complexity_trivial(self):
        """Test complexity analysis for trivial tasks."""
        router = ModelRouter()
        
        complexity = router.analyze_complexity(
            task_type="trivial",
            task_description="Simple task",
            context_size=100,
            requires_reasoning=False,
            requires_creativity=False,
            requires_domain_knowledge=False,
            quality_requirement="standard"
        )
        
        assert complexity.level == ComplexityLevel.TRIVIAL
        assert complexity.score < 0.2
    
    def test_analyze_complexity_critical(self):
        """Test complexity analysis for critical tasks."""
        router = ModelRouter()
        
        complexity = router.analyze_complexity(
            task_type="complex",
            task_description="Very complex task requiring deep analysis and reasoning",
            context_size=50000,
            requires_reasoning=True,
            requires_creativity=True,
            requires_domain_knowledge=True,
            quality_requirement="critical"
        )
        
        assert complexity.level in [ComplexityLevel.COMPLEX, ComplexityLevel.CRITICAL]
        assert complexity.score >= 0.7
    
    def test_route_to_model_trivial(self):
        """Test routing trivial task to Haiku."""
        router = ModelRouter()
        
        decision = router.route_to_model(
            task_type="simple",
            task_description="Simple documentation update",
            context_size=500,
            estimated_input_tokens=500,
            estimated_output_tokens=200
        )
        
        assert decision.model in ["haiku", "sonnet"]  # May route to sonnet if quality requires
        assert decision.complexity.score < 0.4
    
    def test_route_to_model_critical(self):
        """Test routing critical task to Opus."""
        router = ModelRouter()
        
        decision = router.route_to_model(
            task_type="security_review",
            task_description="Critical security review",
            context_size=10000,
            requires_reasoning=True,
            quality_requirement="critical",
            estimated_input_tokens=5000,
            estimated_output_tokens=1000
        )
        
        assert decision.model == "opus"  # Quality requirement forces Opus
    
    def test_cost_estimation(self):
        """Test cost estimation."""
        router = ModelRouter()
        
        decision_haiku = router.route_to_model(
            task_type="simple",
            task_description="Simple task",
            estimated_input_tokens=1000,
            estimated_output_tokens=500
        )
        
        decision_opus = router.route_to_model(
            task_type="security_review",
            task_description="Security review",
            estimated_input_tokens=1000,
            estimated_output_tokens=500
        )
        
        # Opus should be more expensive
        assert decision_opus.estimated_cost_usd > decision_haiku.estimated_cost_usd
















