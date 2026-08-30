---
id: ADR-027
title: Enforce Authentication Wall (pre-login access limited to auth and legal routes)
status: Accepted
date: 2025-10-26
owner: FitVibe Architecture
supersedes: ADR-010 public feed / share-by-link for unauthenticated visitors
renumbered_from: ADR-0021
---

## Context

Current documentation sets **private-by-default** visibility with optional public surfaces via feature flags
(e.g., public feed / share-by-link). This creates ambiguity about pre-login reachability and increases
the attack surface (scraping, token misuse, link leakage). The product direction is to **require login**
for all user-facing content unless strictly necessary for auth and legal flows.

## Decision

1. **Auth wall:** All app routes **MUST** require an authenticated session **except**:
   - Frontend: `/login`, `/login/verify-2fa`, `/register`, `/verify`, `/forgot-password`, `/reset-password`, `/terms`, `/privacy`, `/cookie`, `/impressum`, `/contact`
   - API: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `GET /api/v1/auth/verify`, `POST /api/v1/auth/password/forgot`, `POST /api/v1/auth/password/reset`, `POST /api/v1/auth/login/verify-2fa`, public legal/consent/contact as implemented
   - **Static assets** needed to render the login/registration page (e.g., `/assets/*`, `/favicon.ico`).
2. **Disable public surfaces for anonymous users:** Unauthenticated visitors cannot use the public feed or share-by-link. Authenticated visibility remains **private-by-default** (ADR-010).
3. **Legacy public links:** Previously generated public URLs must return **404 Not Found** for unauthenticated requests.
4. **API semantics:**
   - For API requests without a valid session/JWT: return **401 Unauthorized** (JSON error body).
   - For SPA navigation: redirect unauthenticated users to **`/login`**.
5. **Health checks:** `GET /health` remains **unauthenticated** (ops). No functional data is exposed.

## Scope

- Web SPA (React+Vite), optional SSR server, Backoffice, and Backend API (Node/Express).
- All environments (local, CI, staging, production).

## Non-Goals

- Changing the authentication mechanism itself (still JWT RS256 + refresh tokens).
- Anonymous telemetry or cookie-banner flows (handled separately by compliance).

## Security & Privacy Impact

- Reduces data exposure risk and scraping.
- Limits the blast radius of stolen public-share links.
- Simplifies threat modeling and CSP rules for unauthenticated surfaces.
- Aligns with privacy-by-default and GDPR data minimization.

## Rollout Plan

1. **Config:**
   - Set `AUTH_WALL=true` in all envs.
   - Set/confirm `PUBLIC_FEED=false` and remove any “public share” toggles from UI.
2. **Backend middleware (pseudocode):**
   ```ts
   // auth-wall.ts (Express middleware)
   const ALLOWLIST = new Set([
     '/auth/login', '/auth/register', '/auth/password-reset/request', '/auth/verify',
     '/favicon.ico'
   ]);
   export function authWall(req, res, next) {
     if (req.method === 'GET' and req.path.startsWith('/assets/')) return next();
     if (ALLOWLIST.has(req.path)) return next();
     if (req.user) return next();
     const isApi = req.path.startsWith('/api/');
     return isApi ? res.status(401).json({error:'unauthorized'}) : res.redirect('/login');
   }
   ```
3. **Frontend routing:**
   - Guard all routes except `/login` and `/register`.
   - Remove “public share” UI and any references to public feed.
4. **Data/Artifacts:**
   - Invalidate and delete existing public share tokens/rows (if any).
   - CDN purge for known public URLs.
5. **Docs:**
   - Update QA/UAT scenarios (see linked AC document).
   - Mark ADR-0007 as superseded.

## Alternatives Considered

- Keep public-by-link while tightening token entropy/expiry → rejected (still leaks via referrers/analytics).
- Partial wall (read public, write private) → rejected (complex policy surface).

## Consequences

- Some marketing/SEO benefits of public pages are lost; deliberate decision.
- Simpler mental model for users and developers.
- Fewer conditional branches in tests and middleware.

## Monitoring & Reversibility

- Track 401/302 rates post-rollout.
- One-feature-flag rollback: `AUTH_WALL=false` (re-enable former behavior), but `PUBLIC_FEED` stays false unless explicitly re-approved via ADR.
