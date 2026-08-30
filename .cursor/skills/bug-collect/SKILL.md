---
name: bug-collect
description: Collect FitVibe lint and TypeScript errors and summarize them. Use when the user types /bug-collect or /bug:collect.
disable-model-invocation: true
---

# Collect bugs

Run `pnpm lint:check` and `pnpm typecheck`. Group by file. Test failures are `/test-fails-collect`.
