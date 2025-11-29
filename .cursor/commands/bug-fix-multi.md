---
name: bug:fix:multi
description: Fix bugs using the enhanced multi-agent system with specialized agents and continuous learning
invokable: true
---

# Multi-Agent Bug Fix Command

Fixes bugs using a sophisticated multi-agent system with specialized roles, root cause analysis, and continuous learning.

## What It Does

Uses **4 specialized agents** working together:

1. **Guide Agent** 🧭
   - Analyzes bugs and creates fix strategy
   - Estimates complexity and confidence
   - Learns from similar past fixes

2. **Debug Agent** 🔍
   - Performs root cause analysis
   - Traces error origins and dependencies
   - Analyzes error context

3. **Brainstorm Agent** 💡
   - Coordinates multiple LLMs for diverse perspectives
   - Generates consensus solutions
   - Evaluates solution quality

4. **Feedback Agent** ✅
   - Validates fixes
   - Checks regression tests
   - Provides quality scores

## Usage

```bash
pnpm bug:fix:multi
```

Or directly:

```bash
node scripts/bug-fixer-multi-agent.mjs
```

## Features

- **Multi-Agent Collaboration**: Specialized agents for different tasks
- **Root Cause Analysis**: Deep diagnostic capabilities
- **Continuous Learning**: Learns from past fixes
- **Enhanced Prioritization**: Uses historical success rates
- **Multi-LLM Support**: Ready for LLM API integration
- **Comprehensive Safety**: All safety mechanisms from basic agent

## Workflow

```
Bug → Guide Agent (Strategy)
    → Debug Agent (Root Cause)
    → Brainstorm Agent (Solutions)
    → Apply Fix
    → Feedback Agent (Validation)
    → Regression Tests
    → Update History
```

## Bug Prioritization

Enhanced algorithm considers:

1. **Severity**: Critical > High > Medium > Low
2. **Type**: Type errors > Test failures > Linter errors
3. **Historical Success**: Higher success rate = higher priority
4. **Attempts**: Fewer attempts first

## Continuous Learning

- **Fix History**: Tracks all fix attempts and outcomes
- **Pattern Recognition**: Identifies successful fix patterns
- **Success Rates**: Calculates success rates by bug type/category
- **Confidence Scoring**: Adjusts confidence based on history

## Output

- **Console**: Detailed progress from each agent
- **Bug Database**: Updated with fix status and details
- **Fix History**: `.bug-database/fix-history.json` updated
- **Statistics**: Learning metrics and success rates

## Example Output

```
🤖 Multi-Agent Bug Fixer - Starting...

📊 Bug Statistics:
   Total bugs: 25
   Open: 11
   Fixed: 14
   Historical fixes: 42

📋 Will attempt to fix 10 bugs using multi-agent system

================================================================================
Processing bug: typescript-apps-backend-src-example-ts-42
Type: type-error | Severity: high
================================================================================

🧭 [Guide Agent] Analyzing bug: typescript-apps-backend-src-example-ts-42
   Strategy: type-fix
   Confidence: 85%
   Complexity: low

🔍 [Debug Agent] Root cause analysis for: typescript-apps-backend-src-example-ts-42
   Primary cause: Type mismatch or missing type definition
   Dependencies: 3

💡 [Brainstorm Agent] Generating solutions with multiple perspectives...
   Generated 3 solution perspectives
   Consensus confidence: 82%

🔧 Applying fix based on consensus solution...
   Approach: Add proper TypeScript types without using 'any'
   ⚠️  Auto-apply not fully implemented - requires LLM integration

   🔄 Running comprehensive regression tests...
   ✅ [Feedback Agent] Validating fix for: typescript-apps-backend-src-example-ts-42
   Fix accepted: false
   Quality score: 50%

📊 Multi-Agent Fix Session Summary:
   Fixed: 0
   Failed: 1
   Remaining open: 11
   Total fixes in history: 43
```

## When to Use

- **Complex bugs**: Requiring deep analysis
- **Learning from history**: Want to leverage past fixes
- **Multiple perspectives**: Need diverse solutions
- **Production fixes**: When you need highest quality

## LLM Integration

The system is ready for LLM integration. To enable:

1. Set API keys:

   ```bash
   export OPENAI_API_KEY="your-key"
   export ANTHROPIC_API_KEY="your-key"
   ```

2. Implement API calls in:
   - `brainstormAgent()` - Multi-LLM coordination
   - `applyFix()` - Code generation

3. See documentation for details

## Related Commands

- `/bug:collect` - Collect bugs first
- `/bug:fix` - Basic single-agent fixing
- `/bug:brainstorm` - Brainstorm solutions separately

## Documentation

- [Bug Fixing Agent Guide](../../docs/4.Testing_and_Quality_Assurance_Plan/Bug_Fixing_Agent_Guide.md)
- [Best Practices Comparison](../../docs/4.Testing_and_Quality_Assurance_Plan/Bug_Fixing_Agent_Comparison.md)
- [Multi-Agent Architecture](../../docs/4.Testing_and_Quality_Assurance_Plan/Bug_Fixing_Agent_Comparison.md#1-multi-agent-framework-rgd-pattern)
