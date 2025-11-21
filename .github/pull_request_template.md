# Pull Request

## Description

<!-- Provide a clear and concise description of what this PR does -->

## Type of Change

<!-- Mark the relevant option with an 'x' -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🔧 Refactoring (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] 🧪 Test addition or update
- [ ] 🔒 Security fix
- [ ] 🎨 Style/formatting changes
- [ ] 🏗️ Build/CI changes
- [ ] 🔄 Dependency updates

## Related Issues

<!-- Link to related issues using: Closes #123, Fixes #456, Related to #789 -->

Closes #
Related to #

## Changes Made

<!-- List the main changes in this PR -->

- 
- 
- 

## Testing

<!-- Describe the tests you ran and how to verify your changes -->

### Test Coverage

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed

### Test Results

```bash
# Paste test output here or link to CI results
```

## Security Checklist

<!-- Verify all security considerations -->

- [ ] No secrets or credentials committed
- [ ] Input validation implemented where needed
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] Authentication/authorization checks in place
- [ ] Rate limiting considered
- [ ] Security scan passed (`pnpm security:scan`)
- [ ] Dependency audit passed (`pnpm audit --audit-level=high`)

## Documentation

<!-- Mark if documentation was updated -->

- [ ] PRD updated (if product/UX changes)
- [ ] TDD updated (if technical changes)
- [ ] ADR added/updated (if architectural decisions)
- [ ] API documentation updated (if API changes)
- [ ] README updated (if needed)
- [ ] Code comments added/updated

## Screenshots/Recordings

<!-- If applicable, add screenshots or recordings to demonstrate the changes -->

<!--
### Before
![Before](url)

### After
![After](url)
-->

## Checklist

<!-- Mark completed items with an 'x' -->

### Code Quality

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Code is commented where necessary
- [ ] No console.log statements left in code
- [ ] TypeScript types are properly defined (no `any` in public surfaces)
- [ ] ESLint passes (`pnpm lint`)
- [ ] TypeScript compilation passes (`pnpm typecheck`)
- [ ] Prettier formatting applied

### Testing

- [ ] Tests pass locally
- [ ] Test coverage meets requirements (80% repo-wide, 90% critical paths)
- [ ] New tests added for new functionality
- [ ] Edge cases tested
- [ ] Error handling tested

### Security

- [ ] No secrets exposed
- [ ] Input validation implemented
- [ ] Security best practices followed
- [ ] Security scan passed

### Documentation

- [ ] Documentation updated
- [ ] Code comments added where needed
- [ ] PR description is clear and complete

### Dependencies

- [ ] New dependencies are necessary and justified
- [ ] Dependency versions are compatible
- [ ] No high/critical vulnerabilities (`pnpm audit --audit-level=high`)
- [ ] Lock file updated (`pnpm-lock.yaml`)

### Performance

- [ ] Performance impact considered
- [ ] No unnecessary database queries
- [ ] No memory leaks introduced
- [ ] Large files handled appropriately

### Accessibility

- [ ] WCAG 2.1 AA compliance maintained
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility verified
- [ ] ARIA labels added where needed

## Breaking Changes

<!-- If this PR includes breaking changes, describe them here -->

**BREAKING CHANGE:** 

<!--
Example:
**BREAKING CHANGE:** The `getUser()` method now returns a Promise instead of a synchronous value.
Migration: Update all call sites to use `await getUser()`.
-->

## Additional Notes

<!-- Add any additional context, notes, or considerations for reviewers -->

## Reviewer Notes

<!-- For reviewers: Add any specific areas you'd like the author to address -->

---

## Pre-Merge Checklist

<!-- These will be checked by CI/CD, but good to verify locally -->

- [ ] All CI checks pass
- [ ] Branch is up to date with `develop` (or `main` for hotfixes)
- [ ] No merge conflicts
- [ ] Approved by at least one maintainer
- [ ] Ready to merge

