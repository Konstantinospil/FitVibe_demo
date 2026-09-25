# ADR-032: Authoritative Legal Publications and Immutable Snapshots

**Date:** 2026-09-25  
**Status:** Accepted  
**Author:** FitVibe Engineering / Product Owner  
**Supersedes:** ADR-024 version derivation model

## Context

FitVibe previously had competing legal-version concepts:

- Terms used a hard-coded version constant.
- Privacy and cookie versions could be derived from translation/file timestamps.
- Translation edits could therefore change the effective legal text without an explicit publication event.
- Existing user acceptance fields stored version strings, but there was no authoritative persisted publication entity containing the exact text that a user accepted.
- Privacy acceptance/status behavior was incomplete.

This made translation metadata an accidental legal source of truth.

## Decision

Legal documents use explicit persisted publications.

A legal publication has:

- a document type: Terms, Privacy, or Cookie;
- an explicit version identifier;
- a change classification;
- a required user action;
- publication and effective timestamps;
- the Backoffice user that published it;
- immutable per-language full-document snapshots.

Translation rows are an **authoring source only**. Editing translations does not publish a legal version.

Publishing is an explicit Backoffice action. At publication time the current legal translation namespace is assembled into a complete document snapshot for every available language. Each snapshot is stored immutably with a SHA-256 content hash.

### Change classification

Published versions are classified as:

- `editorial`: authoritative text changes that do not invalidate existing user acceptance/consent;
- `material`: changes that require an explicit user action;
- `legacy`: migration records representing pre-Phase-17 versions.

User effects are stored independently as:

- `none`;
- `acknowledge`;
- `accept`;
- `renew_consent`.

This avoids treating “minor versus major” as equivalent to one fixed legal consequence.

### Product rules

1. Material Terms changes require renewed acceptance and block ordinary authenticated application use until accepted. Legal-document viewing, logout, account/security access and account deletion remain available.
2. Privacy changes require acknowledgement/re-acceptance when they materially affect processing or legal basis. Informational changes are non-blocking unless fresh consent is specifically required.
3. Cookie Policy publication does not itself create a generic legal-acceptance gate. Consent is renewed when consent-relevant purposes/categories change.
4. Existing recorded acceptances are migrated as historical evidence. No acceptance is manufactured where none was recorded.
5. An editorial publication may become the current authoritative text while a previous material publication remains the latest version requiring user action.
6. Acceptance of a newer publication satisfies an older required publication of the same document.

## Data model

- `legal_document_versions`: publication metadata and user-effect policy.
- `legal_document_snapshots`: immutable language-specific full-document snapshots.
- `legal_document_acceptances`: append-oriented evidence linking a user to the exact published version acted upon.
- `cookie_consents.legal_version_id`: links consent evidence to the corresponding Cookie publication.

Existing `users.terms_version`, `users.privacy_policy_version`, and `cookie_consents.consent_version` remain compatibility fields during migration.

## Rendering

Published legal pages are rendered from the immutable publication snapshot rather than reconstructed from mutable translation rows at request time.

This gives the system one answer to both questions:

- What is the authoritative document now?
- What exact document did the user accept or acknowledge?

## Consequences

### Positive

- Legal authority no longer depends on file timestamps or translation row timestamps.
- Editing and publishing are separate operations.
- Historical documents can be reproduced exactly.
- Rendering can consume one complete snapshot rather than many mutable line elements.
- Editorial corrections do not force unnecessary re-acceptance.
- Material changes have an explicit user effect.

### Negative

- Publications duplicate legal content by design.
- A Backoffice publishing workflow becomes required.
- Legacy versions may exist without snapshots if the historical text cannot be reconstructed with sufficient confidence.

The duplication is intentional: legal evidence must remain stable even when the authoring source changes.

## Rejected alternatives

- Timestamp-derived versions: metadata does not express legal publication intent.
- Boolean `minor`/`authoritative` flags: every published version is authoritative, and legal user effects require more than one boolean.
- Referencing mutable translation rows: historical evidence would depend on another subsystem's lifecycle.
- Reconstructing historical documents dynamically: cannot guarantee exact historical content after later edits.

## Status log

| Version | Date | Change |
| --- | --- | --- |
| v1.0 | 2026-09-25 | Adopt explicit Backoffice publication with immutable full-document snapshots |
