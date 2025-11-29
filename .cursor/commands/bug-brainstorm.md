---
name: bug:brainstorm
description: Brainstorm bug fix solutions using multiple LLMs for diverse perspectives and consensus
invokable: true
---

# Bug Brainstorm Command

Coordinates multiple LLM models to generate diverse fix perspectives and find consensus solutions.

## What It Does

1. **Loads bug** from bug database
2. **Generates prompts** with bug context and file content
3. **Calls multiple LLMs** (GPT-4, Claude, etc.) simultaneously
4. **Collects perspectives** from each model
5. **Finds consensus** among solutions
6. **Generates fix proposals** for review

## Usage

### For a specific bug:

```bash
pnpm bug:brainstorm <bug-id>
```

Example:

```bash
pnpm bug:brainstorm typescript-apps-backend-src-example-ts-42
```

### For all open bugs:

```bash
pnpm bug:brainstorm --all
```

Or directly:

```bash
node scripts/bug-brainstorm-coordinator.mjs <bug-id>
node scripts/bug-brainstorm-coordinator.mjs --all
```

## LLM Models Used

The system coordinates multiple models for diverse perspectives:

- **GPT-4**: Primary perspective (conservative approach)
- **Claude 3 Opus**: Alternative perspective (creative approach)
- **Local Expert**: Specialized perspective (domain-specific)

## Output

- **Console**: Progress and consensus results
- **Fix Proposals**: `.bug-database/brainstorm-results.json`
  - Consensus solution
  - All model perspectives
  - Confidence scores
  - Agreement metrics

## Example Output

```
💡 Brainstorming solutions with multiple LLMs for bug: typescript-apps-backend-src-example-ts-42

🤖 Calling gpt-4...
   ✅ gpt-4: Confidence 85%

🤖 Calling claude-3-opus...
   ✅ claude-3-opus: Confidence 80%

🤖 Calling gpt-3.5-turbo...
   ✅ gpt-3.5-turbo: Confidence 75%

✅ Consensus found:
   Root cause: Type mismatch between string and number types
   Fix approach: Add explicit type conversion or fix type definition
   Confidence: 85%
   Agreement: 100%

📁 Saved 1 fix proposals to: .bug-database/brainstorm-results.json
```

## Fix Proposal Structure

```json
{
  "bugId": "typescript-apps-backend-src-example-ts-42",
  "bugType": "type-error",
  "file": "apps/backend/src/example.ts",
  "line": 42,
  "consensus": {
    "rootCause": "Type mismatch between string and number",
    "fixApproach": "Add explicit type conversion",
    "codeFix": "...",
    "reasoning": "...",
    "confidence": 0.85,
    "agreement": 1.0
  },
  "source": "gpt-4",
  "allPerspectives": [
    {
      "model": "gpt-4",
      "rootCause": "...",
      "fixApproach": "...",
      "confidence": 0.85
    }
  ],
  "generatedAt": "2025-01-26T10:00:00Z"
}
```

## Reviewing Proposals

```bash
# View all proposals
cat .bug-database/brainstorm-results.json | jq '.'

# View consensus for first bug
cat .bug-database/brainstorm-results.json | jq '.[0].consensus'

# View all perspectives
cat .bug-database/brainstorm-results.json | jq '.[0].allPerspectives'
```

## LLM Integration

Currently uses placeholders. To enable actual LLM calls:

1. **Set API keys**:

   ```bash
   export OPENAI_API_KEY="your-key"
   export ANTHROPIC_API_KEY="your-key"
   ```

2. **Implement API calls** in `bug-brainstorm-coordinator.mjs`:
   - Update `callLLM()` function
   - Add error handling
   - Parse responses

3. **Supported providers**:
   - OpenAI (GPT-4, GPT-3.5)
   - Anthropic (Claude 3)
   - Local models (via API)

## When to Use

- **Complex bugs**: Need multiple perspectives
- **High-stakes fixes**: Want consensus before applying
- **Learning**: Understand different approaches
- **Review**: Generate proposals for manual review

## Workflow

1. **Collect bugs**: `/bug:collect`
2. **Brainstorm solutions**: `/bug:brainstorm <bug-id>`
3. **Review proposals**: Check `.bug-database/brainstorm-results.json`
4. **Apply fix**: Manually or use `/bug:fix:multi`

## Consensus Finding

The system finds consensus by:

1. **Comparing root causes**: Most common cause wins
2. **Confidence scoring**: Highest confidence solution
3. **Agreement metric**: Percentage of models agreeing
4. **Risk assessment**: Evaluates potential risks

## Related Commands

- `/bug:collect` - Collect bugs first
- `/bug:fix` - Apply fixes with basic agent
- `/bug:fix:multi` - Apply fixes with multi-agent system

## Documentation

- [Bug Fixing Agent Guide](../../docs/4.Testing_and_Quality_Assurance_Plan/Bug_Fixing_Agent_Guide.md)
- [Best Practices Comparison](../../docs/4.Testing_and_Quality_Assurance_Plan/Bug_Fixing_Agent_Comparison.md)
- [Multi-LLM Coordination](../../docs/4.Testing_and_Quality_Assurance_Plan/Bug_Fixing_Agent_Comparison.md#4-ensemble-analysis-slean-pattern)
