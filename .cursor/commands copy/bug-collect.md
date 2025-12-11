---
name: bug:collect
description: Collect code quality bugs (linter and type checker errors) and update bug database
invokable: true
---

# Bug Collection Command

Systematically collects code quality bugs and maintains a persistent bug database.

## What It Does

1. **Checks linter errors** (ESLint) across the codebase
2. **Checks type errors** (TypeScript) across the codebase
3. **Updates bug database** (`.cursor/bug-database/bugs.json`) with:
   - Bug details (type, severity, file, line, message)
   - Status tracking (open, fixed, blocked)
   - Statistics and metrics

**Note**: Test failures are collected separately by `/test-fails-collect` command.

## Usage

```bash
pnpm bug:collect
```

Or directly:

```bash
node .cursor/scripts/bug-collector.mjs
```

## Output

- **Bug Database**: `.cursor/bug-database/bugs.json`
- **Statistics**: Total bugs, open bugs, fixed bugs, breakdown by type and severity
- **Console Output**: Summary of collected bugs

## Bug Types Collected

- **Linter Errors**: ESLint rule violations
- **Type Errors**: TypeScript compilation errors

## After Collection

- Review bugs: `cat .cursor/bug-database/bugs.json | jq '.bugs[] | select(.status == "open")'`
- View statistics: `cat .cursor/bug-database/bugs.json | jq '.stats'`
- Fix bugs: Use `/bug:fix` or `/bug:fix:multi`

## Integration

This command is designed to run:

- **Locally**: Before fixing bugs
- **In CI/CD**: To track bugs over time
- **Periodically**: To maintain bug database

## Example Output

```
🐛 Bug Collector - Starting collection...

🔍 Collecting ESLint errors...
🔍 Collecting TypeScript errors...

📊 Collection Summary:
   Linter errors: 5
   Type errors: 2
   Total new bugs: 7

✅ Bug database updated:
   Total bugs: 15
   Open: 7
   Fixed: 8

📁 Database saved to: .cursor/bug-database/bugs.json
```

## Related Commands

- `/bug:fix` - Fix bugs with basic agent
- `/bug:fix:multi` - Fix bugs with multi-agent system
- `/bug:brainstorm` - Brainstorm solutions with multiple LLMs

## Documentation

- [Bug Fixing Agent Guide](../../docs/4.Testing_and_Quality_Assurance_Plan/Bug_Fixing_Agent_Guide.md)
- [Best Practices Comparison](../../docs/4.Testing_and_Quality_Assurance_Plan/Bug_Fixing_Agent_Comparison.md)
