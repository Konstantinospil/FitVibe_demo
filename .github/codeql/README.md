# CodeQL Configuration

This directory contains the advanced CodeQL configuration for FitVibe security scanning.

## Configuration

The `codeql-config.yml` file:

- Uses `security-and-quality` query suite
- Suppresses known false positives (CSRF middleware, rate limiting)
- Excludes test files and config files from security scans

## Important: Repository Settings

**⚠️ CRITICAL**: The default CodeQL setup must be **disabled** in GitHub repository settings when using this advanced configuration.

### To Fix "CodeQL analyses from advanced configurations cannot be processed" Error:

1. Go to repository **Settings** → **Code security and analysis**
2. Find **CodeQL analysis** section
3. Click **Disable** to turn off the default setup
4. Ensure your workflows use the advanced configuration (see below)

## Workflows Using This Config

Both workflows use the same advanced configuration:

- `.github/workflows/ci.yml` - CodeQL job in CI pipeline
- `.github/workflows/security-scan.yml` - Scheduled security scans

Both must use `config-file: ./.github/codeql/codeql-config.yml` in the `github/codeql-action/init` step.

## Query Filters

### Suppressed False Positives

1. **js/missing-csrf-middleware**: CSRF is applied globally in `app.ts` after cookieParser
2. **js/missing-rate-limiting**: Global rate limiting is applied in `app.ts` (line 83)

### Excluded Paths

The following paths are excluded from CodeQL analysis:

- Test files: `**/__tests__/**`, `**/*.test.ts`, `**/*.test.js`, `**/*.spec.ts`, `**/*.spec.js`
- Test directories: `**/tests/**`
- Config files: `**/*.config.ts`, `**/*.config.js`

## Troubleshooting

### Error: "CodeQL analyses from advanced configurations cannot be processed when the default setup is enabled"

**Solution**: Disable the default CodeQL setup in repository Settings → Code security and analysis.

### Error: "Could not process some files due to syntax errors"

Check the CodeQL logs for specific file paths. Common causes:

- Syntax errors in JavaScript/TypeScript files
- Unsupported language features
- Files that should be excluded (add to `paths-ignore` if appropriate)
