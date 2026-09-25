# ADR-032: Legal Document Publication Uses Immutable Snapshots

**Date:** 2026-09-25  
**Status:** Accepted  
**Author:** FitVibe Development Team  
**Cross-References:** ADR-024, FR-008/E16, REQ-2025-01-20-001/E19

---

## Context

Legal and policy content exists in several representations: Markdown policy files, locale JSON/bootstrap content, database-managed translations, and Backoffice editing surfaces. Treating any mutable representation as the published legal document makes historical reconstruction and acceptance evidence ambiguous.

The Backoffice must be able to publish an authoritative version. Constructing a legal document later from mutable line/translation elements is insufficient because the exact content accepted by a user must remain reproducible.

## Decision

### 1. Publication creates an immutable document snapshot

A publication stores the complete rendered/legal content and publication metadata needed to reconstruct exactly what was published.

The snapshot, not the mutable translation rows or Markdown source, is the authoritative record of a published legal document version.

A snapshot includes at minimum:

- document type/namespace;
- publication identifier and creation timestamp;
- complete content for each included language;
- effective date/version metadata;
- actor responsible for publication;
- publication classification;
- integrity/hash metadata sufficient to detect mutation.

Published snapshots are immutable. Corrections create a new snapshot.

### 2. Publication classification distinguishes legal effect

Snapshots are classified as:

- **minor** — editorial/translation correction that does not change the legal acceptance contract;
- **authoritative** — publication that establishes a new acceptance version and may require user re-acceptance according to the relevant requirement.

The distinction is stored with the snapshot rather than inferred later from changed translation rows.

### 3. Acceptance refers to an authoritative snapshot

User acceptance records refer to the authoritative publication/version that was accepted. A later authoritative publication can make an earlier acceptance outdated.

Minor publications remain part of publication history but do not independently advance the acceptance contract.

### 4. Backoffice is the publication surface

Backoffice is the operational surface for reviewing and publishing versioned legal content. Authoring data may remain editable before publication.

The public/user-facing legal pages render from the applicable published snapshot. They do not reconstruct a historical legal document from current mutable translation rows.

### 5. Source representations are not competing SSOTs

- database translation rows: editable authoring state;
- locale JSON: bootstrap/fallback/development source;
- Markdown policy files: governance/readable mirrors and authoring references;
- published snapshot: authoritative runtime/legal publication record.

Where these disagree for an already published version, the snapshot wins.

## Consequences

### Positive

- Exact historical content remains reproducible.
- Acceptance evidence points to immutable content.
- Translation/editorial changes can be distinguished from legal version changes.
- Backoffice publication has explicit semantics.
- Documents can be rendered directly from snapshots instead of reassembled from mutable line elements.

### Trade-offs

- Publication requires snapshot storage.
- Authoring and published state must be treated separately.
- A correction after publication creates another publication rather than editing history.

## Relationship to ADR-024

ADR-024's cross-language effective-date calculation remains useful for mutable/bootstrap content and migration compatibility. For published legal documents, ADR-032 supersedes the idea that the current authoritative acceptance version can be derived solely from live translation rows. The authoritative version is established by an authoritative publication snapshot.

## Verification intent

Before implementation backlog is created, live `dev` must be compared against this decision to determine which snapshot/publication semantics already exist and which remain gaps.

---

## Status Log

| Version | Date | Change |
| --- | --- | --- |
| v1.0 | 2026-09-25 | Adopt immutable Backoffice publication snapshots with minor/authoritative classification |
