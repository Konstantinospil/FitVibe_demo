---
name: bug:collect
description: Collect bugs from all sources (tests, linter, type checker) and update bug database
invokable: true
---

# Bug Collection Command

Systematically collects bugs from all sources and maintains a persistent bug database.

## What It Does

1. **Runs all test suites** (Jest, Vitest) and collects failures
2. **Checks linter errors** (ESLint) across the codebase
3. **Checks type errors** (TypeScript) across the codebase
4. **Updates bug database** (`.bug-database/bugs.json`) with:
   - Bug details (type, severity, file, line, message)
   - Status tracking (open, fixed, blocked)
   - Statistics and metrics

## Usage

```bash
pnpm bug:collect
```

Or directly:

```bash
node scripts/bug-collector.mjs
```

## Output

- **Bug Database**: `.bug-database/bugs.json`
- **Statistics**: Total bugs, open bugs, fixed bugs, breakdown by type and severity
- **Console Output**: Summary of collected bugs

## Bug Types Collected

- **Test Failures**: Jest and Vitest test failures
- **Linter Errors**: ESLint rule violations
- **Type Errors**: TypeScript compilation errors

## After Collection

- Review bugs: `cat .bug-database/bugs.json | jq '.bugs[] | select(.status == "open")'`
- View statistics: `cat .bug-database/bugs.json | jq '.stats'`
- Fix bugs: Use `/bug:fix` or `/bug:fix:multi`

## Integration

This command is designed to run:

- **Locally**: Before fixing bugs
- **In CI/CD**: To track bugs over time
- **Periodically**: To maintain bug database

## Example Output

```
🐛 Bug Collector - Starting collection...

🔍 Collecting Jest test failures...
🔍 Collecting Vitest test failures...
🔍 Collecting ESLint errors...
🔍 Collecting TypeScript errors...

📊 Collection Summary:
   Jest failures: 3
   Vitest failures: 1
   Linter errors: 5
   Type errors: 2
   Total new bugs: 11

✅ Bug database updated:
   Total bugs: 25
   Open: 11
   Fixed: 14

📁 Database saved to: .bug-database/bugs.json
```

## Related Commands

- `/bug:fix` - Fix bugs with basic agent
- `/bug:fix:multi` - Fix bugs with multi-agent system
- `/bug:brainstorm` - Brainstorm solutions with multiple LLMs

## Documentation

- [Bug Fixing Agent Guide](../../docs/4.Testing_and_Quality_Assurance_Plan/Bug_Fixing_Agent_Guide.md)
- [Best Practices Comparison](../../docs/4.Testing_and_Quality_Assurance_Plan/Bug_Fixing_Agent_Comparison.md)
