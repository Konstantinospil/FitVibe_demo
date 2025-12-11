# Bug Database

This directory contains the bug tracking database for the FitVibe project.

## Files

- **`bugs.json`** - Main bug database containing:
  - Bug details (type, severity, file, line, message)
  - Status tracking (open, fixed, blocked)
  - Statistics and metrics
  - Fix history

## Usage

The bug database is automatically managed by bug-fixing scripts:

- **Collection**: `.cursor/scripts/bug-collector.mjs` collects bugs and updates the database
- **Fixing**: `.cursor/scripts/bug-fixer-agent.mjs` and `.cursor/scripts/bug-fixer-multi-agent.mjs` read and update the database
- **Brainstorming**: `.cursor/scripts/bug-brainstorm-coordinator.mjs` uses the database for solution brainstorming

Or use npm scripts:
- `pnpm bug:collect` - Collect bugs
- `pnpm bug:fix` - Fix bugs (basic agent)
- `pnpm bug:fix:multi` - Fix bugs (multi-agent system)
- `pnpm bug:brainstorm` - Brainstorm solutions

## Access

Use Cursor commands:
- `/bug:collect` - Collect bugs and update database
- `/bug:fix` - Fix bugs using basic agent
- `/bug:fix:multi` - Fix bugs using multi-agent system
- `/bug:brainstorm` - Brainstorm solutions for specific bugs

## Note

This directory is part of `.cursor/` and is ignored by git. The bug database is local to your workspace.







