# Safe Git Push Guide

This guide ensures you can push to git without exposing secrets or introducing vulnerabilities.

## ✅ Current Security Status

Your repository is **already well-protected**:

1. **Comprehensive `.gitignore`** - Excludes:
   - `.env` files and environment variables
   - Private keys (`.pem`, `.key`, `.p12`, `.pfx`)
   - Certificates (`.crt`)
   - Database dumps
   - Upload directories

2. **Pre-commit Hook** - Automatically runs:
   - Linting and formatting (via `lint-staged`)
   - Secret scanning (checks for hardcoded secrets)

3. **Pre-push Hook** - Automatically runs:
   - Security scans (secret detection, dependency audit)
   - Dependency vulnerability checks

4. **Secrets Management** - Uses:
   - HashiCorp Vault (development/staging)
   - AWS Secrets Manager (production)
   - Environment variables (fallback)

## 🔒 Before Pushing Checklist

### 1. Verify No Secrets in Staged Files

```bash
# Run the secret scanner manually
pnpm security:scan

# Or use the dedicated secret scan script
bash scripts/secrets-scan.sh
```

### 2. Check for Dependency Vulnerabilities

```bash
# Check for high/critical vulnerabilities
pnpm audit --audit-level=high

# Or run the full audit script
bash scripts/dependency-audit.sh
```

### 3. Verify .gitignore is Working

```bash
# Check if any .env files are tracked
git ls-files | grep "\.env$"

# Check if any private keys are tracked
git ls-files | grep -E "\.(pem|key|p12|pfx)$"
```

### 4. Review Your Changes

```bash
# See what you're about to commit
git status
git diff

# Check for any hardcoded credentials
git diff | grep -iE "(password|secret|api_key|token)\s*="
```

## 🚨 What to Do If Secrets Are Found

### If Secrets Are Already Committed

1. **DO NOT PUSH** - Stop immediately
2. **Remove the secret** from the file
3. **Rotate the secret** - The old value is compromised
4. **Remove from git history** (if not yet pushed):

   ```bash
   # Remove file from last commit (if not pushed)
   git reset HEAD~1
   git add <file>
   git commit -m "fix: remove accidentally committed secret"
   ```

5. **If already pushed**, you must:
   - Rotate the secret immediately
   - Consider using `git filter-branch` or BFG Repo-Cleaner (advanced)
   - Contact repository maintainers

### If Secrets Are in Unstaged Changes

Simply remove them and use environment variables instead:

```typescript
// ❌ BAD - Hardcoded secret
const apiKey = "sk_live_abc123...";

// ✅ GOOD - Environment variable
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY environment variable is required");
}
```

## 📋 Manual Pre-Push Checklist

Before pushing, manually verify:

- [ ] No `.env` files in staged changes
- [ ] No private keys (`.pem`, `.key`) in staged changes
- [ ] No hardcoded passwords, API keys, or tokens
- [ ] All secrets use environment variables or secrets manager
- [ ] `pnpm audit` shows no high/critical vulnerabilities
- [ ] `pnpm security:scan` passes
- [ ] Code passes linting (`pnpm lint`)

## 🛡️ Automatic Protection

The hooks will **automatically prevent** you from:

- **Pre-commit**: Committing files with secrets or lint errors
- **Pre-push**: Pushing if high-severity vulnerabilities are found

### Bypassing Hooks (Not Recommended)

If you absolutely must bypass hooks (e.g., for emergency hotfixes):

```bash
# Skip pre-commit hook
git commit --no-verify -m "message"

# Skip pre-push hook
git push --no-verify
```

**⚠️ Warning**: Only bypass hooks if you're certain there are no secrets or vulnerabilities.

## 🔍 What Gets Scanned

The secret scanner checks for:

- AWS Access Keys (`AKIA...`, `A3T...`)
- AWS Secret Keys
- GitHub Tokens (`ghp_...`, `gho_...`, etc.)
- Google API Keys (`AIza...`)
- Slack Tokens (`xoxb-...`, `xoxa-...`, etc.)
- Stripe Keys (`sk_live_...`, `sk_test_...`)
- Private Keys (`-----BEGIN PRIVATE KEY-----`)
- Hardcoded passwords/credentials in code

## 📚 Best Practices

1. **Never commit secrets** - Use environment variables or secrets manager
2. **Use `.env.example`** - Document required environment variables
3. **Rotate secrets regularly** - Especially if accidentally exposed
4. **Review diffs before committing** - `git diff` shows what you're committing
5. **Use secrets manager in production** - Vault or AWS Secrets Manager
6. **Keep dependencies updated** - Run `pnpm audit` regularly

## 🆘 Getting Help

If you're unsure whether something is safe to commit:

1. Check the `.gitignore` file
2. Run `pnpm security:scan`
3. Ask in team chat or create an issue
4. Review `docs/5.Policies/5.a.Ops/KEY_MANAGEMENT_POLICY.md`

## 📖 Related Documentation

- [Key Management Policy](../5.a.Ops/KEY_MANAGEMENT_POLICY.md)
- [Security Policy](./SECURITY.md)
- [Contributing Guide](../../../CONTRIBUTING.md)
