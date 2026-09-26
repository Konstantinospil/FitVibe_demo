# Frontend page gallery

This directory is developer-only visual inspection tooling for the existing FitVibe frontend.

## Start

From `apps/frontend`:

```bash
pnpm gallery
```

The first run downloads the pinned Ladle CLI through `pnpm dlx`. It does not add Ladle to the application dependency graph or lockfile.

## Build the static gallery

```bash
pnpm gallery:build
```

## Scope

The gallery exposes every current `src/pages/**/*.tsx` page in three groups:

- Public
- Athlete
- Admin

The global Ladle provider supplies an in-memory router, React Query, FitVibe toast context, translations, an authenticated admin fixture user, and deterministic Axios mocks.

The gallery must remain preview infrastructure only. Production routes, application behavior, and API contracts must not depend on it.
