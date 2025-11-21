# FitVibe Backend

The FitVibe backend is an Express API with PostgreSQL persistence managed through Knex. It provides authentication, workout planning, progress tracking, and feed endpoints that power the web client and external integrations.

## Prerequisites

- Node.js 20+
- PNPM 9
- PostgreSQL 14+ (local or containerised)

## Environment

Copy the sample env file and tweak values to match your local setup:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Key variables:

| Variable                | Purpose                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL` or `PG*` | Connection string or discrete connection parts                     |
| `JWT_PRIVATE_KEY_PATH`  | RSA private key for signing tokens                                 |
| `JWT_PUBLIC_KEY_PATH`   | RSA public key for verification                                    |
| `CSRF_ENABLED`          | Toggle CSRF protection (defaults to true; tests override to false) |

## Scripts

```bash
pnpm --filter @fitvibe/backend dev         # start express with TSX watch
pnpm --filter @fitvibe/backend build       # compile to dist/
pnpm --filter @fitvibe/backend start       # run compiled server
pnpm --filter @fitvibe/backend lint        # eslint over src
pnpm --filter @fitvibe/backend typecheck   # strict tsc pass
pnpm --filter @fitvibe/backend test        # jest suite
```

Database tasks live under `src/db/scripts` and can be executed with `pnpm ts-node` or by wiring them into npm scripts:

```bash
pnpm ts-node apps/backend/src/db/scripts/migrate.ts
```

## Feature Modules

The backend groups domain logic into modular verticals. The table below lists each module, its responsibilities, and the primary router or service entry point that wires it into the API.

| Module         | Purpose                                                                                                 | Entry point                                          |
| -------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Auth           | Handles registration, authentication, token refresh, JWKS publishing, and session management endpoints. | `src/modules/auth/auth.routes.ts`                    |
| Users          | Exposes profile management, admin user administration, contact management, and follow relationships.    | `src/modules/users/users.routes.ts`                  |
| Exercise Types | Provides CRUD endpoints for managing the catalog of exercise types with admin-only mutations.           | `src/modules/exercise-types/exerciseTypes.routes.ts` |
| Exercises      | Offers authenticated CRUD APIs for individual exercise records.                                         | `src/modules/exercises/exercise.routes.ts`           |
| Sessions       | Supplies workout session CRUD plus clone and recurrence helpers.                                        | `src/modules/sessions/sessions.routes.ts`            |
| Plans          | Placeholder router that currently returns HTTP 501 while the feature is under construction.             | `src/modules/plans/plans.routes.ts`                  |
| Logs           | Placeholder router that will surface audit log streaming once implemented.                              | `src/modules/logs/logs.routes.ts`                    |
| Points         | Returns loyalty points summaries and history for authenticated users.                                   | `src/modules/points/points.routes.ts`                |
| Progress       | Serves workout summaries, trends, exports, and plan progress analytics.                                 | `src/modules/progress/progress.routes.ts`            |
| Feed           | Powers the social feed, bookmarks, reactions, shares, and moderation endpoints.                         | `src/modules/feed/feed.routes.ts`                    |
| Health         | Lightweight heartbeat router exposing service availability.                                             | `src/modules/health/health.router.ts`                |
| System         | Administrative health and read-only mode controls used for maintenance operations.                      | `src/modules/system/system.routes.ts`                |
| Common         | Shared middleware and utilities such as idempotency handling, RBAC, rate limiting, and auditing.        | `src/modules/common/`                                |

See `src/modules/index.ts` for how these routers are mounted under the versioned API path.

For detailed information about the module architecture, patterns, and how to add new modules, see [`src/modules/README.md`](src/modules/README.md).
