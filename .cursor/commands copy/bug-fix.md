---
name: bug:fix
description: Fix bugs using the basic single-agent bug fixer with safety mechanisms
invokable: true
---

# Bug Fix Command

Fixes bugs systematically using a single-agent approach with comprehensive safety mechanisms.

## What It Does

1. **Loads bug database** from `.cursor/bug-database/bugs.json`
2. **Prioritizes bugs** by severity, type, and attempts
3. **For each bug**:
   - Analyzes the bug
   - Creates a fix strategy
   - Applies the fix (with backup)
   - Runs regression tests
   - Validates fix doesn't break functionality
   - Marks as fixed or increments attempts
4. **Updates bug database** with results

## Usage

```bash
pnpm bug:fix
```

Or directly:

```bash
node scripts/bug-fixer-agent.mjs
```

## Safety Mechanisms

- **File Backups**: All files backed up before modification
- **Regression Testing**: Full test suite after each fix
- **Automatic Rollback**: Reverts changes if tests fail
- **Attempt Limiting**: Maximum 3 attempts per bug
- **Status Tracking**: Tracks fix history and failures

## Bug Prioritization

Bugs are prioritized by:

1. **Severity**: Critical > High > Medium > Low
2. **Type**: Type errors > Test failures > Linter errors
3. **Attempts**: Fewer attempts first

## Limitations

- **Auto-fix not fully implemented**: Currently requires manual intervention
- **Single agent**: Uses basic analysis (use `/bug:fix:multi` for advanced)
- **No LLM integration**: Placeholder for actual AI-powered fixing

## Output

- **Console**: Progress and results for each bug
- **Bug Database**: Updated with fix status
- **Backup Files**: `.bug-fix-backup` files created

## Example Output

```
🔧 Bug Fixer Agent - Starting...

📊 Bug Statistics:
   Total bugs: 25
   Open: 11
   Fixed: 14

🎯 Prioritizing bugs...

📋 Will attempt to fix 10 bugs:

🔧 Fixing bug: typescript-apps-backend-src-example-ts-42
   Type: type-error
   File: apps/backend/src/example.ts
   Message: Type 'string' is not assignable to type 'number'...
   📝 Analysis: type-fix
   💡 Instructions:
      1. Read the TypeScript error message carefully
      2. Identify the type mismatch or missing type
      3. Add proper types without using 'any'
      4. Ensure the fix maintains functionality

   ⚠️  Auto-fix not implemented. Manual fix required.
   📋 Please fix this bug manually and run the agent again.

📊 Fix Session Summary:
   Fixed: 0
   Failed: 0
   Remaining open: 11
```

## When to Use

- **Simple bugs**: Type errors, linter errors
- **Quick fixes**: When you want basic safety mechanisms
- **Learning**: Understanding the bug fixing workflow

## When to Use Multi-Agent Instead

- **Complex bugs**: Requiring root cause analysis
- **Multiple perspectives**: Need diverse solutions
- **Learning from history**: Want to leverage past fixes

## Related Commands

- `/bug:collect` - Collect bugs first
- `/bug:fix:multi` - Advanced multi-agent fixing
- `/bug:brainstorm` - Brainstorm solutions with LLMs

## Documentation

- [Bug Fixing Agent Guide](../../docs/4.Testing_and_Quality_Assurance_Plan/Bug_Fixing_Agent_Guide.md)
- [Best Practices Comparison](../../docs/4.Testing_and_Quality_Assurance_Plan/Bug_Fixing_Agent_Comparison.md)
