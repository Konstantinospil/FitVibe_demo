# Bug Fixing Agent System

## Overview

A comprehensive bug collection and fixing system that systematically identifies, tracks, and fixes bugs without breaking functionality. The system includes multi-agent collaboration and support for multi-LLM brainstorming.

## Quick Start

```bash
# 1. Collect all bugs
pnpm bug:collect

# 2. Fix bugs (basic agent)
pnpm bug:fix

# 3. Fix bugs (multi-agent system - recommended)
pnpm bug:fix:multi

# 4. Brainstorm solutions with multiple LLMs
pnpm bug:brainstorm <bug-id>
```

## Files

- `bug-collector.mjs` - Collects bugs from tests, linter, and type checker
- `bug-fixer-agent.mjs` - Basic single-agent bug fixer
- `bug-fixer-multi-agent.mjs` - Enhanced multi-agent system (Guide, Debug, Feedback, Brainstorm)
- `bug-brainstorm-coordinator.mjs` - Coordinates multiple LLMs for solution brainstorming

## Documentation

- [Best Practices Comparison](../../docs/4.Testing_and_Quality_Assurance_Plan/Bug_Fixing_Agent_Comparison.md)
- [User Guide](../../docs/4.Testing_and_Quality_Assurance_Plan/Bug_Fixing_Agent_Guide.md)

## Features

✅ Systematic bug collection from all sources  
✅ Persistent bug database with history  
✅ Multi-agent collaboration (RGD pattern)  
✅ Safety mechanisms (backups, rollback, regression testing)  
✅ Continuous learning from past fixes  
✅ Multi-LLM brainstorming support  
✅ Root cause analysis  
✅ Prioritization algorithm

## Next Steps

To enable full LLM integration:

1. Set API keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
2. Implement API calls in `callLLM()` functions
3. Update `applyFix()` to use LLM-generated code

See the User Guide for detailed instructions.
