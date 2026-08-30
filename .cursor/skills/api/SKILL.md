---
name: api
description: Create or update FitVibe REST API endpoints under /api/v1 with Zod, HttpError, and idempotency. Use when the user types /api or asks to add or change a backend endpoint.
disable-model-invocation: true
---

# API endpoint

Add or change a backend endpoint in `apps/backend/src/modules/<domain>/`.

1. Confirm method, path (`/api/v1/...`), authz, and body shape. Match the module (JSON may be camelCase or snake_case).
2. Update `*.routes.ts` (`asyncHandler`), `*.schemas.ts` (Zod), thin `*.controller.ts`, `*.service.ts`, `*.repository.ts`.
3. Throw `HttpError(status, code, message)` from `apps/backend/src/utils/http.ts`. JSON: `{ error: { code, message, details, requestId } }`.
4. Honor `Idempotency-Key` on state-changing routes. Keep that module's auth/RBAC/rate limits.
5. Tests in `tests/backend/`. Run `pnpm openapi:build` if the public contract changed.
