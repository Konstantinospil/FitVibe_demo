# Backend Technical-Debt Reduction — Pass 2

**Status:** Active  
**Current phase:** Debt-Confrontation Gate — documentation reconciliation  
**Branch:** `dev`  
**Started:** 2026-09-22

## Purpose

This document is the authoritative working record for the second backend technical-debt reduction pass.

The objective is not primarily to make files smaller or to make CI green. The objective is to prevent stale state, contradictory sources of truth, silent data loss, ineffective security controls, accidental behavior preservation, and AI-generated structural residue.

The target state is:

> Every important backend state transition has one authoritative source of truth, explicit invariants, deliberate transaction boundaries, and tests that prove the intended behavior.

This document must be updated as decisions are made and phases are completed so that work can be resumed later without relying on chat history.

## Resume protocol

When resuming this program:

1. Read this document before changing backend code.
2. Confirm the current phase and its status.
3. Read the recorded decisions and unresolved questions for that phase.
4. Review any ADRs referenced by the phase.
5. Do not redo settled strategic decisions unless new evidence conflicts with them.
6. If a new strategic choice is discovered, record it here before implementation.
7. Record the relevant commit/PR and verification result when a phase is completed.

## Strategic-decision interview protocol

Before implementation of **every phase**, conduct a short interview with the product owner.

The interview must cover only decisions that materially affect:

- product behavior;
- persisted data or migration semantics;
- privacy or authorization;
- security posture;
- public API contracts;
- lifecycle/state-machine behavior;
- operational/deployment assumptions;
- irreversible or expensive architectural choices.

For every strategic question:

1. explain the concrete problem;
2. present the realistic options;
3. explain the trade-offs;
4. provide a technical recommendation;
5. obtain an explicit decision before implementing it.

Low-level implementation choices that do not change product behavior or architecture do not require an interview.

If implementation uncovers a new strategic decision, stop at that decision boundary, document the question here, and ask the product owner rather than inventing product behavior.

After the interview:

- record the decision in the phase decision log below;
- create or update an ADR when the choice is architectural and long-lived;
- only then implement the phase.

## Global implementation rules

These rules apply to Phases 11–22.

1. **Fix forward only.** Do not revert valid prior work merely to simplify the repair.
2. **One source of truth.** Important domain state must have a clearly identified owner.
3. **No silent data loss.** Accepted API input must either persist according to contract or be rejected.
4. **No silent security failure.** Security controls may not fail open unless that behavior is explicitly designed and documented.
5. **No zombie features.** A feature that is not connected to a real user/system flow must either be completed or removed.
6. **No fake tests.** Tests must validate intended behavior, not preserve a known defect or merely satisfy coverage.
7. **No weakening tests to get green CI.** When a meaningful test fails, fix the behavior. Change the test only when the intended contract changes.
8. **No compatibility layer without purpose and exit criteria.** Transitional adapters require a documented reason and removal condition.
9. **No abstraction without a concrete need.** Do not add wrappers, helpers, repositories, managers, or generic layers merely to reduce file size.
10. **Prefer deletion over indirection.** Remove obsolete concepts rather than hiding them behind another adapter.
11. **No comments as substitutes for unfinished functionality.** TODO/FIXME/future-migration comments must not represent required behavior.
12. **No duplicated business rules.** Shared invariants, enums, validation and authorization rules should have one canonical definition.
13. **Explicit transaction boundaries.** If two database changes must succeed or fail together, that requirement must be visible in the code.
14. **External side effects are not transactions.** Queueing, telemetry, network calls and similar effects must not accidentally depend on an uncommitted transaction.
15. **Retries must be safe.** Important writes should be idempotent or have explicit duplicate-handling semantics.
16. **Privacy is evaluated from current authority.** Cached/indexed state may not override current authorization or visibility.
17. **Do not optimize for line count.** Large cohesive files are preferable to fragmented artificial abstractions.
18. **Keep dependency direction deliberate.** Prefer controller → service → repository, with documented exceptions.
19. **Every phase must add or strengthen invariant-level verification.**
20. **A passing CI is necessary but not sufficient for phase completion.**

## Completion status model

Each phase uses one of these statuses:

- **Not started**
- **Interviewing**
- **Decided**
- **Implementing**
- **Verifying**
- **Done**

A phase is **Done** only when:

- all strategic decisions are recorded;
- implementation matches those decisions;
- meaningful tests cover the repaired invariant;
- no intentionally weakened test remains;
- lint/typecheck/relevant backend tests pass;
- documentation/ADRs are updated where required;
- the relevant commit or PR is recorded below.

---

## Phase 11 — State-model and invariant audit

**Status:** Done

### Objective

Define the authoritative state, allowed transitions, derived state and consistency expectations before further refactoring.

Domains to audit:

- sessions/exercises/sets;
- feed/publication/bookmarks;
- points/Vibe Levels/badges;
- authentication/lockouts/sessions;
- legal documents/consent;
- measurements;
- secrets.

For each domain establish:

- authoritative persisted state;
- derived/cached state;
- allowed mutations;
- immutable state;
- required transaction boundaries;
- acceptable eventual consistency;
- retry/idempotency semantics;
- database-level invariants.

### Strategic decisions

All seven Phase 11 decisions were accepted by the product owner on 2026-09-22.

### Decision log

1. Completed-session scoring-relevant fields become immutable; editing requires an explicit reopen transition.
2. `session.visibility` is the visibility authority. Feed visibility may be materialized/indexed, but access must be revalidated from current authoritative state.
3. `exercise_sets` is the long-term sole source of truth for performed workout data.
4. Gamification derivation occurs post-commit and must be retryable/idempotent.
5. Security-critical controls fail closed when their required authoritative backing state cannot be read, unless a later explicit ADR permits degradation.
6. Legal-document versions become explicit persisted versions rather than timestamp/file-metadata-derived versions.
7. The application-level secret contract is a simple string value; provider-specific structures remain adapter details.

**Architecture record:** [ADR-029 — Backend State Ownership and Consistency Invariants](./ADR-029-backend-state-ownership-and-consistency-invariants.md)

### Exit criteria

A compact invariant map exists for all seven domains and provides enough clarity to implement Phases 12–18 without inventing product semantics.

---

## Phase 12 — Session and feed state correctness

**Status:** Done

### Objective

Eliminate stale privacy state and contract drift between sessions, feed publication, bookmarks and visibility validation.

### Known repair targets

- public → followers/private/link transitions;
- stale `feed_items.visibility`;
- bookmark access after visibility changes;
- `followers` visibility missing from HTTP validation while present in shared types;
- accepted top-level `actual` workout data currently being silently discarded.

### Strategic interview topics

- canonical visibility ownership;
- whether feed visibility remains materialized;
- bookmark behavior after access is lost;
- migration/deprecation approach for top-level `actual` workout fields;
- compatibility expectations for existing frontend/API clients.

### Decision log

Accepted on 2026-09-22:

1. Keep `feed_items.visibility` only as materialized/indexed state; current authoritative access must be revalidated and the feed row cannot independently grant access.
2. A bookmark is a durable access grant ("key-door" capability): a user who validly bookmarks a session retains access even after a later visibility restriction.
3. Retain a controlled compatibility period for legacy top-level `actual` input; accepted legacy input must be converted into the authoritative `exercise_sets` model and then removed after client migration. Silent discard and recreation of the old table are prohibited.
4. `followers` is a first-class session visibility and must be supported consistently across shared contracts, HTTP validation, access logic, feed behavior, and tests.

Additional decisions accepted on 2026-09-22:

5. Unbookmarking removes the bookmark-based access grant immediately; other independent grants can still permit access.
6. The owner does not receive a separate per-user bookmark-revocation mechanism in the current model.
7. Blocking is a stronger denial and overrides an existing bookmark grant.
8. Revoking or expiring a link does not invalidate a bookmark that was validly created while link access existed.
9. Session deletion overrides all positive grants.

Authoritative access rule:

```text
allowed =
  notDeleted
  AND notBlocked
  AND (
    isOwner
    OR hasValidBookmark
    OR isPublic
    OR isEligibleFollower
    OR hasValidLink
    OR hasAuthorizedRole
  )
```

**Architecture records:** ADR-029 v1.2 and ADR-010 v1.2.

### Implementation note discovered during Phase 12

The live data design and migration tests explicitly require that `share_links` is **not** recreated. Therefore this phase implements owner/bookmark/public/follower grants and stronger block/deletion denial, but does not invent a replacement link-token store or treat a session UUID as a secret link.

The previously accepted **valid-link** precedence remains the target rule for a future explicit link-grant mechanism. Implementing token issuance/revocation requires a separate architecture/schema decision because doing it implicitly here would violate both the live schema and the no-AI-slop rule.

### Exit criteria

Access is governed by explicit authoritative grants (ownership, applicable visibility/relationship rules, and bookmark capability), while materialized feed state never independently grants access; bookmark revocation semantics are explicit; no accepted workout field is silently lost; shared and HTTP visibility contracts agree.

---

## Phase 13 — Completed-session and gamification invariants

**Status:** Done

### Objective

Prevent completed-workout edits, points events, Vibe Levels and badges from drifting apart.

### Known repair targets

- editing completed sessions can leave existing points/derived state stale;
- points-history pagination cursor can skip one record at page boundaries;
- concurrent points-event creation needs idempotent conflict handling;
- queue/job side effects must not observe state that later rolls back.

### Strategic interview topics

- completed-session immutability vs explicit reopen/re-score;
- which fields are scoring-relevant;
- whether historical points may ever be recalculated;
- acceptable timing for derived gamification updates;
- recovery behavior when derivation fails after source state commits.

### Decision log

Accepted during the Phase 13 interview:

1. **Completed sessions are the primary business fact.** A completed session is stable until the user explicitly reopens it. Reopening is the deliberate transition that permits correction of recorded workout data.
2. **Correctness of the workout record takes precedence over gamification.** After explicit reopen, the user may correct scoring-relevant performed data (exercise selection, sets, reps, load, distance, duration, RPE and other recorded metadata). Gamification must adapt to the corrected source record; it must never make a recorded workout effectively immutable.
3. **Reopen does not casually delete or stack points.** Reopening moves the session back into an editable/unscored lifecycle state. Existing derived scoring records may remain for audit/history during the transition, but they no longer define current truth. Re-completion reconciles/replaces the derived scoring state for that session rather than adding an unrelated second award.
4. **Historical points may be rewritten.** If the scoring algorithm changes, old completed sessions may be recalculated under the new rules. FitVibe does not treat a previously calculated points value as immutable accounting history.
5. **Gamification is post-commit derivation.** Session completion commits first. Points, Vibe Levels and badges are ramifications of the completed workout and must be retryable/idempotent.
6. **Completion is king.** A successfully completed session stays completed even if points/Vibe/badge derivation fails temporarily. Derivation failure is recoverable projection failure, not failure of the primary workout action.
7. **Points are conceptually recomputable.** They may be stored/materialized for performance, history views and operational efficiency, but authoritative session/workout state plus scoring rules must be sufficient to rebuild them.

Additional decisions accepted:

8. Concurrent completion/scoring attempts must converge to one current result and must not create duplicate awards or expose uniqueness races.
9. Only the session owner may reopen a session through normal product behavior; administrative intervention remains separate.
10. Recalculation uses a hybrid model: completed sessions are authoritative, stored gamification is materialized state, affected projections can be marked stale and rebuilt asynchronously, and a known-stale value may be recalculated/reconciled on demand rather than served as current.
11. Rewritten scoring retains prior calculated value and algorithm/version metadata for audit/explainability, but only the latest projection contributes to current totals.
12. Points-history pagination must be corrected so page concatenation has no gaps or duplicates, including equal timestamps.

No further strategic decision is required before implementation unless code review uncovers a new product-semantic boundary.

### Implementation record

Implemented in PR #238:

- explicit owner-only `POST /sessions/:id/reopen` lifecycle;
- completed workout-record fields require reopen before correction;
- completion/reopen mark the gamification projection stale in the same source transaction;
- completion schedules post-commit reconciliation instead of scoring synchronously;
- per-user projection state records stale/full-rebuild requirements and scoring algorithm version;
- full rebuild archives replaced point events to `points_event_revisions`, supersedes session-derived Vibe/badge records, resets current derived state, and replays authoritative completed sessions chronologically;
- session points, Vibe changes, streak bonuses, seasonal bonuses and session-derived badges are rebuilt from completed-session state;
- Vibe replay preserves historical effective timestamps and reapplies current inactivity decay before marking the projection fresh;
- concurrent source scoring is serialized using advisory transaction locks;
- known-stale points and Vibeform reads reconcile on demand;
- explicitly backdated completions force a full chronological rebuild;
- points-history next cursor is based on the last returned event, removing the page-boundary skip;
- replaced badge projections use partial uniqueness for the current active badge while retaining superseded history;
- the queue handler uses a lazy import to avoid a new points/queue/projection module cycle.

### Verification and review

Phase 13 was verified on final PR head `f8ac1a228e4ce7f8272c7ad18ad543291a0b3bef`.

Passed required gates:

- lint and typecheck;
- backend unit tests;
- backend integration tests;
- database migration and seed tests;
- API contract tests;
- coverage gate;
- frontend tests;
- Lighthouse;
- accessibility;
- visual regression;
- performance budgets;
- security scans / OWASP ZAP;
- QA summary;
- CodeQL.

Final architecture review confirmed:

- no scoring formula was changed by this phase;
- full replay is deterministic (`completed_at ASC, id ASC`);
- full replay removes/rebuilds only session-derived point events (`session_completed`, `streak_bonus`, `seasonal_event`), preserving unrelated/manual point events;
- replaced point calculations are archived with prior algorithm/value metadata;
- session/decay Vibe changes and session-derived badges are superseded rather than silently overwritten;
- queue-enqueue failure does not turn successful session completion into failure;
- known-stale points summary/history and Vibeform reads reconcile before returning current derived state;
- the read-freshness check was placed at the points HTTP boundary rather than creating a `points.service ↔ gamification-projection.service` cycle.

Deliberately deferred findings:

- `manual_adjustment` remains a permitted Vibe-change schema/type value but no active backend path currently writes such Vibe adjustments; Phase 13 did not invent replay semantics for an unused feature.
- A pre-existing earned-badges API routing/contract mismatch was observed outside the Phase 13 change set and is deferred to the later API/repository residue and test-quality review rather than being folded into this lifecycle refactor.
- The pre-existing session-create retry/sleep workaround remains for later transaction/residue cleanup.

### Exit criteria

The session lifecycle and scoring lifecycle cannot silently diverge; pagination has no gaps/duplicates; concurrent scoring is idempotent.

**Result:** satisfied and merged in PR #238.

---

## Phase 14 — Authentication state-machine repair

**Status:** Done

### Objective

Make authentication and brute-force protection explicit, race-safe and consistent with the actual login lifecycle.

### Known repair targets

- successful account login currently clears aggregate IP failures;
- account/IP counters use read-modify-write patterns vulnerable to lost concurrent increments;
- reset semantics occur before all authentication requirements are necessarily complete;
- proxy trust is too implicit for security-sensitive IP controls.

### Strategic interview topics

- what constitutes a completed successful authentication;
- desired account-vs-IP lockout model;
- thresholds/recovery behavior and user experience;
- trusted reverse-proxy topology for production;
- whether direct backend reachability must be supported.

### Decision log

The Phase 14 interview selected Scenario B with these extensions:

- password verification is an intermediate state; authentication succeeds only after all required factors and policy gates complete;
- nonexistent identifiers and wrong passwords perform comparable cryptographic work and return an opaque pre-authentication challenge instead of disclosing which credential failed;
- a correct password on a 2FA-protected account returns the same externally shaped challenge as an invalid-credential path, so the password result and 2FA enrollment are not disclosed;
- the password stage keeps minimum-duration timing normalization with jitter and the second-factor stage is normalized as well;
- identifier+IP password failures and aggregate IP spray evidence are distinct security states;
- successful authentication clears only the successful identifier+IP failure state; aggregate IP spray evidence survives success;
- aggregate IP spray evidence uses a rolling 30-minute observation window so shared/NAT addresses do not accumulate failures indefinitely;
- password throttling remains temporary and progressive; no permanent lockout is introduced, and throttle state is not exposed as a distinct stage-one response;
- a real second-factor challenge allows at most three failed attempts; after the third attempt the challenge is exhausted and recent exhaustion suppresses immediate challenge cycling;
- second-factor attempts do not reuse password counters;
- TOTP and existing one-time backup codes remain the second-factor mechanisms; Phase 14 does not introduce an email OTP mechanism;
- account recovery continues to use the existing single-use password-reset email-token flow rather than emailing passwords;
- forwarded client IPs are honored only from explicitly configured trusted proxy peers.

Implementation invariants:

1. `password_verified != authentication_succeeded`.
2. No authenticated session or refresh token is issued before required 2FA succeeds.
3. Unknown user, wrong password, internally throttled login and real 2FA-required password success share one first-stage response shape.
4. Invalid, expired, exhausted, reused and unknown second-factor challenges share one public verification error; detailed reasons remain server-side.
5. Three failed second-factor attempts exhaust the challenge.
6. Concurrent password failures from one source IP are serialized before identifier/IP and aggregate-IP counters are updated.
7. Aggregate IP spray state survives successful authentication and decays by observation window.
8. Production proxy trust requires both `TRUST_PROXY=true` and the immediate peer in `TRUSTED_PROXY_IPS`.
9. Existing password-reset recovery remains single-use and enumeration-resistant.

### Exit criteria

Concurrent attempts, multiple accounts per IP, 2FA flows and proxy/direct request paths obey a documented protection model.

---

## Phase 15 — Remove ineffective security features

**Status:** Implemented; final verification deferred until the debt-confrontation gate is clean

### Objective

Remove the appearance of security where no enforceable end-to-end control exists.

### Known repair targets

- email blacklist is fail-open and appears disconnected from registration;
- TOTP secrets are stored plaintext;
- backup-code regeneration currently lacks a documented step-up-authentication policy.

### Strategic interview topics

- retain and enforce email blacklist vs remove feature;
- desired threat model for TOTP secret storage;
- which account-security actions require recent authentication/2FA step-up.

### Decision log

1. **Retain the email blacklist and make it authoritative.** Registration and any other flow that can establish or restore account access must consult the blacklist. The control must fail closed if authoritative blacklist state cannot be read; database/schema errors may not be interpreted as "not blacklisted". The existing admin/backoffice blacklist feature remains supported rather than being removed.
2. **Encrypt TOTP secrets at rest.** TOTP secrets remain recoverable because verification requires the original secret, but plaintext database storage is not acceptable. Encryption/decryption must be encapsulated behind the authentication storage/service boundary, with key material supplied through the existing application secrets/configuration mechanism rather than persisted alongside the ciphertext. Existing plaintext secrets require a controlled migration to the encrypted representation; mixed-format compatibility, if temporarily required, must have an explicit removal condition.
3. **Require step-up authentication for sensitive 2FA administration.** Regenerating backup codes requires recent password confirmation plus a current second factor. Disabling 2FA requires password confirmation plus a current second factor. Replacing or restarting 2FA setup requires the same recent step-up. Read-only 2FA status does not require step-up. A stolen authenticated session alone must not be sufficient to replace, weaken or regenerate recovery material for the second factor.

### Implementation record

Implemented and merged in PR #240 (merge `2b3844bbfe35b6c2d9fe283fc350e24e2c5a62b5`):

- email blacklist moved to one authoritative fail-closed repository and enforced on registration, verification, reset/recovery and primary-email establishment flows;
- persisted TOTP secrets use AES-256-GCM envelopes with application-supplied key material and a migration for existing plaintext secrets;
- sensitive 2FA administration requires password plus current second factor;
- first-time 2FA enrollment remains available while replacement/restart requires step-up;
- frontend contracts and regression tests were updated with the backend behavior.

### Exit criteria

Every security feature present in the backend is connected to a real flow and tested through externally observable behavior.

Phase 15 is not declared finally Done until the debt-confrontation gate below is satisfied.

---

## Debt-Confrontation Gate — Phases 1–14 baseline and Phase 15 finalization

**Status:** Documentation reconciliation in progress

### Purpose

Before extending the backend plan, restore a trustworthy baseline. This gate is deliberately ordered:

1. documentation debt;
2. implementation debt;
3. zero-known-actionable-debt verification;
4. implementation-creep review of the remaining phases;
5. final Phase 15 sign-off;
6. only then proceed to the next justified phase.

“Zero debt” here means zero **known actionable debt attributable to or exposed by the completed work**, not the impossible claim that no future improvement exists.

### Phase-to-ADR traceability audit

The audit distinguishes an architectural decision from implementation structure. A phase does not receive a new ADR merely because it changed code; it must either point to the ADR governing the durable decision or explicitly record that no new architectural decision was introduced.

| Phase | Durable decision(s) | ADR coverage after audit | Documentation action |
| --- | --- | --- | --- |
| 1–3 | Early backend cleanup/typing/formatting work predates the numbered pass record available in this document. Current Git history does not provide evidence of a new durable architectural decision unique to those phase labels. | Existing baseline ADRs govern the architecture; no phase-specific ADR evidenced. | Do not invent retrospective decisions. Treat as **no new ADR evidenced** unless older phase records provide contrary evidence. |
| 4 | Production security/bootstrap configuration: persistent JWT key requirements, environment-owned DB/runtime config, browser CSRF boundary, production AV startup requirement. | ADR-002, ADR-004, ADR-013, ADR-016 and ADR-026 cover the durable policies. | No new ADR required; PR #219 is implementation evidence. |
| 5 | Canonical cross-cutting idempotency, audit writer/job handlers and runtime configuration rather than duplicate per-module implementations. | ADR-007, ADR-013 and ADR-016 cover the architectural direction. | No new ADR required; PR #220 is implementation evidence. |
| 6 | Split large auth/user services into cohesive services while retaining Router → Service → Repository direction. | ADR-013. | No new ADR required; structural refactor within accepted modular-monolith architecture. |
| 7/7.5 | Split feed/auth/user repositories/services, centralize shared contracts/configuration, durable audit replay; preserve dependency direction. | ADR-013, ADR-016 and existing queue/idempotency decisions. | No phase-specific ADR required unless later review finds the durable audit-outbox/replay semantics exceed ADR-016. **Revalidate during implementation-debt audit.** |
| 8/8.1 | Isolate Vibe-level persistence and serialize concurrent mutation/decay to prevent stale overwrite. | ADR-029 now captures state ownership/concurrency principles, but it was created later. | Covered retrospectively by ADR-029; verify the exact Vibe authority wording remains sufficient. |
| 9 | Preferences become a canonical object/endpoint separate from profile; persisted language preference remains distinct from locale. | No explicit ADR found that records this domain-boundary decision. | **Documentation gap:** add/update an ADR after confirming current implementation and product intent; do not infer semantics from commit names alone. |
| 9.5 | Feed/session dependency cleanup uses direct narrow dependencies rather than cyclic service facades. | ADR-013. | No new ADR required; architecture-conformance refactor. |
| 10 | Frontend monolithic API service split into domain APIs behind a compatibility barrel. | Backend ADR set does not govern this frontend module boundary directly. | Outside the backend debt gate unless a frontend architecture ADR claims a conflicting structure. |
| 11 | One authority per important backend state; explicit consistency classes. | ADR-029. | Complete. |
| 12 | Session visibility/access-grant model; bookmark is a durable access grant; performed data authority is `exercise_sets`. | ADR-010 + ADR-029. | Complete. |
| 13 | Completed workout is primary fact; gamification is rebuildable post-commit derived state; explicit reopen/re-score semantics. | ADR-029. | Complete. |
| 14 | Opaque pre-auth state machine, separated brute-force states, three-attempt second-factor exhaustion, trusted-proxy boundary. | ADR-002 v1.1 + ADR-029. | Complete. |
| 15 | Authoritative fail-closed email blacklist; field-level encryption for recoverable TOTP seeds; step-up for sensitive 2FA administration. | ADR-002 v1.2 + ADR-026 v1.1 + ADR-029 general fail-closed rule. | **Gap fixed in debt-confrontation branch.** Previously these decisions lived primarily in the phase log/PR #240. |

### Decisions found insufficiently documented

The audit found two categories that require follow-up rather than invented retrospective prose:

1. **Phase 9 preference ownership/domain boundary** is implemented in Git history but no explicit ADR was found for the durable separation of profile, locale and user preference state. This is a real documentation gap. The current code and requirements must be read before writing the ADR so that the ADR documents actual intended behavior rather than reconstructing intent from commit names.
2. **Phase 7/7.5 durable audit replay/outbox semantics** may be more specific than ADR-016's generic append-only audit/logging decision. Revalidate the current audit implementation and failure semantics. If replay is merely an implementation mechanism satisfying ADR-016, no new ADR is needed; if it establishes a durable delivery/consistency contract, ADR-016 must be amended or a focused ADR created.

Phase 15's missing architectural record has been repaired by ADR-002 v1.2 and ADR-026 v1.1. Phases 11–14 already have explicit ADR coverage. For Phases 1–8, 9.5 and the backend-relevant part of Phase 10, the available Git evidence does not justify manufacturing one ADR per phase: most changes conform to already accepted architecture rather than create a new architectural choice.

### Documentation reconciliation

The pre-existing `DOC_CODE_DRIFT.md` is evidence, not current truth. Its 2026-09-01 snapshot predates Phases 11–15 and contains findings already repaired later (for example production TLS verification and parts of authentication hardening). Before code changes are selected from it, every relevant row must be revalidated against current `dev`.

Documentation is considered reconciled only when:

- shipped behavior is represented in requirements/TDD/ADR/runbook documentation;
- stale claims are corrected rather than layered with contradictory notes;
- long-lived architectural decisions from Phases 11–15 have an ADR or are explicitly covered by an existing ADR;
- phase completion records point to actual PRs/commits and verification evidence;
- backlog requirements are not mislabeled as shipped implementation debt.

### Implementation-debt reconciliation

After documentation is authoritative, review the current backend for:

- TODO/FIXME/stubs/placeholders and obsolete compatibility paths;
- skipped or weakened tests;
- duplicated business rules and transitional duplicate implementations;
- dependency cycles/layering violations;
- transaction ownership and check-then-write races;
- schema/migration/runtime contract drift;
- broad catches and silent security/data fallbacks;
- stale retry/sleep workarounds;
- dead security controls;
- Phase 11–15 residue.

Fix only confirmed debt. Do not redesign healthy code or implement unrelated open product backlog.

### Zero-debt exit gate

The gate passes only when:

- no known material doc/code contradiction remains in the reviewed Phase 1–15 surface;
- no unexplained production TODO/stub/workaround remains from those phases;
- no meaningful test is skipped or weakened merely to obtain green CI;
- migrations, API contracts and documented invariants agree;
- architectural decisions are traceable;
- required CI gates pass on the final head.

Any intentionally retained compromise must have an explicit rationale and owner/removal condition where applicable.

### Implementation-creep review

Only after the zero-debt gate passes, reassess Phases 16–22. A remaining phase is retained only if it solves a demonstrated correctness, security, privacy, operability or maintainability problem. Work whose principal justification is architectural sophistication, generic cleanup or hypothetical scale is reduced, merged into a smaller targeted phase, or removed.

The debt-confrontation gate itself is not permission for broad refactoring. Changes remain surgical and fix-forward.

---

## Phase 16 — Transaction boundary cleanup

**Status:** Not started

### Objective

Make atomicity and post-commit side effects deliberate rather than accidental.

### Known repair targets

- measurement attribute + translation creation is non-atomic;
- translation update/upsert flows contain check-then-write race opportunities;
- jobs/metrics/audit/feed side effects need explicit classification relative to database commits.

### Strategic interview topics

- acceptable eventual consistency for audit/feed/jobs;
- failure/retry expectations after source data commits;
- whether any domain warrants a transactional outbox now or whether post-commit retryable execution is sufficient.

### Decision log

_Pending Phase 16 interview._

### Exit criteria

Atomic multi-table operations are transactional; external side effects have explicit post-commit and recovery semantics.

---

## Phase 17 — Legal/version state consolidation

**Status:** Not started

### Objective

Replace competing legal-version concepts with one authoritative model.

### Known repair targets

- static terms version vs dynamically derived versions;
- translation value changes may not advance timestamp-derived legal versions;
- privacy acceptance/status behavior is incomplete;
- legal state currently depends on metadata such as `created_at`/file timestamps.

### Strategic interview topics

- explicit persisted versions vs timestamp/content-hash derivation;
- which legal documents require renewed acceptance;
- effective-date/publishing behavior;
- migration treatment of existing user acceptances.

### Decision log

_Pending Phase 17 interview._

### Exit criteria

A legal-document change deterministically produces the intended acceptance state, with one current-version authority.

---

## Phase 18 — Secrets contract repair

**Status:** Not started

### Objective

Give all secret providers one predictable application-level contract.

### Known repair targets

- AWS write/read string behavior is not round-trip safe;
- Vault string wrapping/read behavior differs;
- documented environment fallback does not match actual behavior.

### Strategic interview topics

- string-only vs structured secret contract;
- environment-variable fallback policy;
- provider precedence and behavior when a provider is unavailable;
- whether writes must be supported equally across providers.

### Decision log

_Pending Phase 18 interview._

### Exit criteria

Provider-independent contract tests prove that supported write/read operations round-trip consistently and failure semantics are explicit.

---

## Phase 19 — Repository/API quality pass

**Status:** Not started

### Objective

Remove implementation residue without performing arbitrary style churn.

### Review targets

Search and classify:

- unused/underscore-prefixed legacy code;
- `eslint-disable`;
- TODO/FIXME/temporary/legacy/workaround markers;
- broad or empty catches;
- `any` and unsafe casts;
- duplicated enums/schemas/normalization;
- silent defaults/fallbacks;
- retry sleeps;
- comments promising future migrations;
- unreachable or impossible-state handling.

### Strategic interview topics

Only items that reveal a product/architecture decision are escalated. Purely technical residue is fixed without unnecessary product-owner involvement.

### Decision log

_Pending Phase 19 interview._

### Exit criteria

Remaining exceptions are intentional, justified and small; obsolete code is deleted rather than hidden.

---

## Phase 20 — Backend test quality audit

**Status:** Not started

### Objective

Ensure tests defend intended invariants instead of freezing defects.

### Known weak tests

- session repository tests currently legitimize loss of top-level actual data;
- IP brute-force tests legitimize aggregate IP reset;
- secrets tests lack provider round-trip coverage;
- points pagination lacks multi-page boundary assertions;
- session-points tests do not cover completed-session mutation;
- feed tests do not adequately prove visibility downgrade behavior.

### Strategic interview topics

- which behaviors are contractual and require durable regression tests;
- acceptable integration-test cost/runtime in CI;
- whether database-backed concurrency tests should be mandatory.

### Decision log

_Pending Phase 20 interview._

### Exit criteria

Breaking a core invariant reliably fails a meaningful test. Tests are not weakened solely to obtain green CI.

---

## Phase 21 — Final architecture-residue review

**Status:** Not started

### Objective

Repeat the structural review after behavior repairs and detect remaining debt.

### Required review

- twenty largest backend production files;
- dependency direction;
- duplicated business rules;
- state ownership;
- cross-module coupling;
- stale compatibility code;
- placeholders/stubs;
- unnecessary abstractions introduced during this pass.

### Strategic interview topics

Only unresolved architectural ownership or deliberate-debt choices.

### Decision log

_Pending Phase 21 interview._

### Exit criteria

No known high-severity correctness/privacy/security debt from this pass remains undocumented; remaining debt is explicit and accepted.

---

## Phase 22 — CI quality gate

**Status:** Not started

### Objective

Make the repaired invariants difficult to regress.

### Expected gate

At minimum:

- lint;
- typecheck;
- backend unit tests;
- backend integration tests;
- database/migration tests;
- API/contract validation;
- security-focused tests.

Potential targeted hygiene checks may reject new high-signal residue such as empty catches or unjustified new `any`/eslint suppressions. Avoid large generic rule sets that create noise.

### Strategic interview topics

- mandatory vs advisory hygiene rules;
- acceptable CI runtime;
- file-size thresholds, if any;
- whether architectural checks should block merges.

### Decision log

_Pending Phase 22 interview._

### Exit criteria

CI verifies the intended backend quality model without encouraging superficial compliance or test weakening.

---

## Program decision log

| Date | Phase | Decision | Rationale | ADR / implementation reference |
| --- | --- | --- | --- | --- |
| 2026-09-22 | Program | Use this document as the authoritative resumable record for Pass 2. | Avoid reliance on chat history and prevent implementation drift. | This document |
| 2026-09-22 | Program | Interview product owner before every phase for strategic decisions. | Product semantics must not be invented during AI-assisted refactoring. | This document |
| 2026-09-22 | Program | Apply the global implementation rules above throughout the pass. | Prevent stale state, false security, fake tests and abstraction residue. | This document |
| 2026-09-22 | 11 | Completed-session scoring data is immutable unless the session is explicitly reopened. | Prevent completed source state from silently diverging from scoring-derived state. | ADR-029 |
| 2026-09-22 | 11 | Session visibility is authoritative; feed/index state cannot independently grant access. | Prevent stale derived visibility from causing privacy leaks. | ADR-029 |
| 2026-09-22 | 11 | Performed workout data converges on `exercise_sets` as the sole long-term representation. | Eliminate contradictory actual-workout representations and silent data loss. | ADR-029 |
| 2026-09-22 | 11 | Gamification derivation is post-commit, retryable and idempotent. | Keep source transactions narrow while preserving recoverability. | ADR-029 |
| 2026-09-22 | 11 | Security-critical controls fail closed when authoritative backing state is unavailable. | Avoid silent security weakening. | ADR-029 |
| 2026-09-22 | 11 | Legal versions become explicit persisted versions. | Create a deliberate legal publication and acceptance boundary. | ADR-029 |
| 2026-09-22 | 11 | Application secrets use a provider-independent string contract. | Remove provider-specific storage semantics from application code. | ADR-029 |
| 2026-09-22 | 12 | Feed visibility remains materialized/indexed only and cannot independently authorize access. | Preserve query performance without allowing stale projection state to become an authorization source. | ADR-029 v1.1 |
| 2026-09-22 | 12 | A valid bookmark is a durable user access grant to that session. | Implement the product's key-door model: bookmarked workouts remain accessible through an explicit grant after later visibility restriction. | ADR-029 v1.1 |
| 2026-09-22 | 12 | Legacy top-level performed-workout input receives a controlled conversion period into `exercise_sets`. | Avoid silent data loss while converging on one performed-workout model. | This document / ADR-029 |
| 2026-09-22 | 12 | `followers` is a first-class visibility across API and backend access logic. | Eliminate contract drift and make existing domain behavior explicit. | ADR-010 v1.1 |
| 2026-09-22 | 12 | Unbookmarking removes the bookmark grant; the owner has no separate per-user bookmark-revoke control. | Keep the access model simple and avoid adding an undeveloped ACL feature. | ADR-010 v1.1 / ADR-029 v1.2 |
| 2026-09-22 | 12 | Link revocation does not revoke an already-created bookmark. | The bookmark becomes its own durable grant after legitimate entry. | ADR-010 v1.1 / ADR-029 v1.2 |
| 2026-09-22 | 12 | Blocking and session deletion override bookmark and other positive grants. | Define explicit stronger-denial semantics. | ADR-010 v1.1 / ADR-029 v1.2 |
| 2026-09-23 | 13 | Completed session/workout state is authoritative; points/Vibe/badges are derived ramifications. | Preserve the workout as the primary product action and make gamification recoverable/recomputable. | ADR-029 v1.4 |
| 2026-09-23 | 13 | Recorded workout data may be corrected after explicit reopen, including scoring-relevant fields. | Accuracy of the workout record takes precedence over preserving a previous gamification result. | ADR-029 v1.4 |
| 2026-09-23 | 13 | Historical points may be recalculated under newer scoring rules. | Points are a derived interpretation of completed workouts, not immutable accounting history. | ADR-029 v1.4 |
| 2026-09-23 | 13 | Gamification derivation occurs after completion commit and may fail/retry independently. | Completion is the primary function; derivation is secondary and recoverable. | ADR-029 v1.4 |
| 2026-09-23 | 13 | Recalculation uses a hybrid stale-projection model with batch rebuild plus on-demand reconciliation. | Avoid permanently stale state without recalculating all history on every read. | ADR-029 v1.4 |
| 2026-09-23 | 13 | Previous scoring values/versions may be retained as audit metadata while only the latest projection is current. | Preserve explainability without making old gamification authoritative. | ADR-029 v1.4 |
| 2026-09-23 | 14 | Authentication success means completion of every required factor and policy gate; password verification alone is not authentication. | Prevent partial authentication state from issuing sessions or leaking factor success. | ADR-002 / PR #239 |
| 2026-09-23 | 14 | Invalid credentials, internal password throttling and real 2FA-required password success share an opaque first-stage challenge shape. | Resist username/password/2FA-enrollment enumeration while preserving the existing two-stage architecture. | ADR-002 / PR #239 |
| 2026-09-23 | 14 | Aggregate source-IP spray evidence survives successful account authentication and decays within a bounded observation window. | A successful guess must not erase evidence of cross-account password spraying; NAT/shared-IP state must not accumulate forever. | ADR-002 / PR #239 |
| 2026-09-23 | 14 | A second-factor challenge is exhausted after three failed attempts and recent exhaustion temporarily suppresses challenge cycling. | Bound TOTP/backup-code guessing without permanent account lockout. | ADR-002 / PR #239 |
| 2026-09-23 | 14 | Forwarded client IPs are accepted only from explicitly configured trusted proxy peers. | Prevent spoofed forwarding headers from bypassing IP-based security controls. | ADR-002 / PR #239 |
| 2026-09-24 | 15 | Retain the email blacklist as an authoritative fail-closed access control. | A configured security control must not silently degrade or be bypassed by alternate account-access flows. | PR #240 / Phase 15 decision log |
| 2026-09-24 | 15 | Encrypt persisted TOTP secrets with application-held key material. | TOTP verification requires recoverability, but plaintext persistence is not acceptable. | PR #240 / ADR-026 security context |
| 2026-09-24 | 15 | Sensitive 2FA administration requires password plus current second factor. | A stolen authenticated session must not be sufficient to weaken or replace the second factor. | PR #240 / Phase 15 decision log |
| 2026-09-24 | Program | Insert a debt-confrontation gate before final Phase 15 sign-off and later phases. | Documentation must become authoritative before implementation debt is selected; later phases must be justified against a clean baseline. | This document |

## Phase completion record

| Phase | Status | Decision/ADR refs | Implementation commit/PR | Verification |
| --- | --- | --- | --- | --- |
| 11 | Done | ADR-029 | 8185deea299be81a02bd891bf334e2e181c3500c | Invariant map documented; no production-code change required |
| 12 | Done | ADR-010 v1.2; ADR-029 v1.2 | PR #237; merge 2d8c8f734fc01ab3efb811d3f9cd5ad58538117d | Lighthouse rerun passed; backend/frontend/database/integration/API/security/accessibility/visual/coverage gates passed |
| 13 | Done | ADR-029 v1.5 | PR #238; merge 75cb53722a5e0d91417ad8d6b4eca64fcc47fd24 | Final head f8ac1a228e4ce7f8272c7ad18ad543291a0b3bef; CI 35909692358 and CodeQL 35909692342 passed all required gates |
| 14 | Done | ADR-002; this document | PR #239; merge `6438d7b25e79394bfb1c3827f0a792abb3cd4fdf` | CI 1018 and CodeQL 786 passed all required gates |
| 15 | Implemented; debt gate pending | this document | PR #240; merge `2b3844bbfe35b6c2d9fe283fc350e24e2c5a62b5` | Implementation merged; final sign-off waits for debt-confrontation gate |
| Debt gate | Documentation reconciliation | this document | `debt-confrontation-phase` | Revalidate current documentation before selecting implementation repairs |
| 16 | Not started | — | — | — |
| 17 | Not started | — | — | — |
| 18 | Not started | — | — | — |
| 19 | Not started | — | — | — |
| 20 | Not started | — | — | — |
| 21 | Not started | — | — | — |
| 22 | Not started | — | — | — |
