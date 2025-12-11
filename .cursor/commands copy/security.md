---
name: security
description: Review and implement security best practices
invokable: true
---

Review and implement security best practices:

1. **Input Validation**
   - Validate all inputs with Zod schemas
   - Sanitize user-provided data
   - Prevent SQL injection (use Knex.js parameterized queries)
   - Prevent XSS (sanitize output)

2. **Authentication & Authorization**
   - Use RS256 for JWT signing
   - Implement 2FA (TOTP) support
   - Use proper session management
   - Implement RBAC (Role-Based Access Control)
   - Check permissions on all protected endpoints

3. **Rate Limiting**
   - Implement on all public endpoints
   - Use rate-limiter-flexible
   - Configure appropriate limits per endpoint type
   - Return proper error responses

4. **Secrets Management**
   - Never commit secrets, API keys, or personal data
   - Use environment variables
   - Use secure vaults in production
   - Rotate credentials regularly

5. **Security Headers**
   - CSP (Content Security Policy)
   - HSTS (HTTP Strict Transport Security)
   - X-Frame-Options
   - X-Content-Type-Options
   - Configure in NGINX: `infra/nginx/`

6. **File Uploads**
   - AV scanning (antivirus)
   - File type validation
   - Size limits
   - Secure storage

7. **Audit Logging**
   - Log security-relevant events
   - Track authentication attempts
   - Monitor for suspicious activity
   - Follow: `docs/2.Technical_Design_Document/2.f.Architectural_Decision_Documentation/ADR-016-audit-logging-and-security-middleware.md`

8. **Dependencies**
   - Run `pnpm audit --prod` regularly
   - Update vulnerable dependencies
   - Use SCA tools (Snyk, Trivy, Grype)

9. **GDPR Compliance**
   - Privacy-by-default (private-by-default content)
   - Data minimization principles
   - Support DSR (Data Subject Rights): access, rectification, deletion, portability
   - DSR export/delete within ≤30 days
   - Delete propagates to backups ≤14 days
   - Follow: `docs/5.Policies/Privacy_Policy.md`

10. **Security Testing**
    - Run `pnpm audit --prod` regularly
    - Use SCA tools (Snyk, Trivy, Grype)
    - OWASP ZAP baseline scans
    - Security headers verification
    - Penetration testing for critical features

11. **Observability**
    - Log security-relevant events
    - Monitor authentication attempts
    - Track suspicious activity patterns
    - Alert on security anomalies
    - No PII in logs/metrics/labels

## Security Checklist

- [ ] All inputs validated with Zod
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (output sanitization)
- [ ] Authentication required for protected endpoints
- [ ] Authorization checks implemented (RBAC)
- [ ] Rate limiting on public endpoints
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Secrets not committed to repository
- [ ] Dependencies scanned for vulnerabilities
- [ ] Audit logging implemented
- [ ] GDPR compliance verified
