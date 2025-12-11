# Security & Privacy

## Security First

- Never commit secrets, API keys, or personal data
- All external calls (email, antivirus, storage) must be adapterized and mockable for tests
- Follow OWASP Top 10 guidelines
- Implement rate limiting on all public endpoints
- Use RS256 for JWT signing (not HS256)
- 2FA support (TOTP) via @otplib/preset-default
- Brute-force protection on auth endpoints
- CSRF protection via csrf middleware
- Helmet.js for security headers
- Input validation with Zod on all endpoints
- SQL injection prevention via Knex parameterized queries
- File upload validation (size, MIME type, antivirus scanning)

## Privacy & GDPR

- **Privacy-by-default**: Private-by-default content, explicit consent for public sharing
- GDPR compliant: Privacy-by-default settings and user-controlled data management
- Data minimization principles
- Support for Data Subject Rights (DSR): access, rectification, deletion, portability
- Audit logging for GDPR events (export, deletion)
- 14-day grace period for account deletion

## Accessibility

- **WCAG 2.1 AA compliant** interface
- UI components accessible by default (labels/ARIA)
- Keyboard navigation support for all interactive elements
- Screen reader testing with axe-core
- Test with Lighthouse for accessibility metrics (target: 100% score)
- Use semantic HTML elements
- Proper focus management for modals and dynamic content


















