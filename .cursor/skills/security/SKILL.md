---
name: security
description: Review FitVibe code for auth, validation, secrets, GDPR, and OWASP issues. Use when the user types /security or asks for a security review.
disable-model-invocation: true
---

# Security review

Do not write exploit PoCs. Check: Zod at HTTP boundaries, Knex parameterized queries, no secrets in git, HttpOnly cookies + CSRF, RS256 JWT, RBAC, rate limits, private-by-default sharing, no PII in logs.

Report critical / should-fix / note with paths.
