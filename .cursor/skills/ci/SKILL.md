---
name: ci
description: Run FitVibe local quality gates in order and fix failures before the next step. Use when the user types /ci or asks to run CI locally.
disable-model-invocation: true
---

# Local CI

Run in order; fix and re-run each failure. Do not skip tests.

1. `pnpm install --frozen-lockfile`
2. `pnpm lint:check`
3. `pnpm typecheck`
4. `pnpm --filter @fitvibe/backend test -- --coverage --maxWorkers=2`
5. `pnpm --filter @fitvibe/frontend test -- --coverage --maxWorkers=2`
6. `pnpm test:coverage:gate`
7. `pnpm i18n:check`
8. `pnpm build`
