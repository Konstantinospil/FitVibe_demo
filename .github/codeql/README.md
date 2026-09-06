# CodeQL Configuration

This directory contains the advanced CodeQL configuration for FitVibe security scanning.

## Configuration

The `codeql-config.yml` file is the authoritative CodeQL analysis configuration. It:

- Uses the `security-and-quality` query suite.
- Suppresses reviewed false positives for CSRF middleware and rate limiting.
- Excludes test files and selected config files from security scans.

The workflow does not repeat the query-suite selection; it references this file with
`config-file: ./.github/codeql/codeql-config.yml`.

## Repository Settings

GitHub CodeQL **Default setup must be disabled** while this repository uses the advanced workflow.

In GitHub:

1. Open **Settings** → **Code security and analysis**.
2. Find **CodeQL analysis**.
3. Disable **Default setup**.

This prevents default and advanced CodeQL configurations from overlapping.

## Workflow

The single authoritative CodeQL workflow is:

- `.github/workflows/security-scan.yml`

CodeQL is intentionally separate from `.github/workflows/ci.yml`.

The workflow analyzes the production/runtime languages relevant to this repository independently through a matrix:

- JavaScript / TypeScript: `javascript-typescript`
- GitHub Actions workflows: `actions`

Python is intentionally not part of the CodeQL matrix. The repository currently has no product Python code: all Python files are development/tooling code under `.cursor/` or documentation helpers under `docs/`. Those files should be covered by their own linting/tests rather than product CodeQL scanning.

It runs on:

- Pushes to `main`, `dev`, and `stage`.
- Pull requests targeting `main`, `dev`, and `stage`.
- A weekly scheduled scan on Monday at 03:00 UTC.
- Manual `workflow_dispatch` runs.

The scheduled scan is retained so newly added CodeQL queries can detect issues even when
the repository source has not changed.

## Query Filters

### Suppressed False Positives

1. **js/missing-csrf-middleware**: CSRF is applied globally in `app.ts` after `cookieParser`.
2. **js/missing-rate-limiting**: Global rate limiting is applied in `app.ts`.

### Excluded Paths

The following paths are excluded from CodeQL analysis:

- Test files: `**/__tests__/**`, `**/*.test.ts`, `**/*.test.js`, `**/*.spec.ts`, `**/*.spec.js`
- Test directories: `**/tests/**`
- Config files: `**/*.config.ts`, `**/*.config.js`

## Troubleshooting

### "CodeQL analyses from advanced configurations cannot be processed when the default setup is enabled"

Disable GitHub CodeQL Default setup under **Settings** → **Code security and analysis**.

### A language is not being analyzed

Check the `strategy.matrix.language` values in `.github/workflows/security-scan.yml`.
The current intended set is `javascript-typescript` and `actions`.

### Syntax or extraction errors

Inspect the failed matrix job for the affected language. If a file should not be analyzed,
add a narrowly scoped exclusion to `codeql-config.yml` rather than duplicating configuration
inside the workflow.
