# Backend Technical-Debt Reduction — Pass 2

**Status:** Active  
**Current phase:** Phase 12 — Session and feed state correctness  
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

**Status:** Decided

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

**Architecture records:** ADR-029 v1.2 and ADR-010 v1.1.

### Exit criteria

Access is governed by explicit authoritative grants (ownership, applicable visibility/relationship rules, and bookmark capability), while materialized feed state never independently grants access; bookmark revocation semantics are explicit; no accepted workout field is silently lost; shared and HTTP visibility contracts agree.

---

## Phase 13 — Completed-session and gamification invariants

**Status:** Not started

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

_Pending Phase 13 interview._

### Exit criteria

The session lifecycle and scoring lifecycle cannot silently diverge; pagination has no gaps/duplicates; concurrent scoring is idempotent.

---

## Phase 14 — Authentication state-machine repair

**Status:** Not started

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

_Pending Phase 14 interview._

### Exit criteria

Concurrent attempts, multiple accounts per IP, 2FA flows and proxy/direct request paths obey a documented protection model.

---

## Phase 15 — Remove ineffective security features

**Status:** Not started

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

_Pending Phase 15 interview._

### Exit criteria

Every security feature present in the backend is connected to a real flow and tested through externally observable behavior.

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

## Phase completion record

| Phase | Status | Decision/ADR refs | Implementation commit/PR | Verification |
| --- | --- | --- | --- | --- |
| 11 | Done | ADR-029 | 8185deea299be81a02bd891bf334e2e181c3500c | Invariant map documented; no production-code change required |
| 12 | Decided | ADR-010 v1.1; ADR-029 v1.2 | — | Strategic interview complete; implementation not started |
| 13 | Not started | — | — | — |
| 14 | Not started | — | — | — |
| 15 | Not started | — | — | — |
| 16 | Not started | — | — | — |
| 17 | Not started | — | — | — |
| 18 | Not started | — | — | — |
| 19 | Not started | — | — | — |
| 20 | Not started | — | — | — |
| 21 | Not started | — | — | — |
| 22 | Not started | — | — | — |
