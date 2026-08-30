---
name: lint
description: Run ESLint and TypeScript checks and fix issues in the current change. Use when the user types /lint or asks to lint or typecheck.
disable-model-invocation: true
---

# Lint

1. `pnpm lint --fix` (or filter `@fitvibe/backend` / `@fitvibe/frontend`).
2. CI check: `pnpm lint:check` then `pnpm typecheck`.
3. Fix real issues. Do not add `any` or delete functionality to clear errors.
