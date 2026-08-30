---
name: test
description: Run or create FitVibe tests for the current file or change. Use when the user types /test or asks to run, add, or fix tests.
disable-model-invocation: true
---

# Test

- Backend: `pnpm --filter @fitvibe/backend test`
- Frontend: `pnpm --filter @fitvibe/frontend test`
- Integration: `pnpm test:integration`. Coverage: `pnpm test:coverage:gate`.

Create tests in `tests/` (backend `tests/backend/modules/`, frontend `tests/frontend/`). Doubles for email/storage/antivirus/time. Names: `should [behavior] when [condition]`.
