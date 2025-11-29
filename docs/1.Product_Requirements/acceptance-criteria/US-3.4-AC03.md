# US-3.4-AC03: Comment Deletion

---

**AC ID**: US-3.4-AC03  
**Story ID**: [US-3.4](../user-stories/US-3.4-comments.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: E2E  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Comment owners and session owners can delete comments via DELETE /api/v1/comments/:commentId; deleted comments are soft-deleted (deleted_at set).

**SMART Criteria Checklist**:

- **Specific**: Clear deletion capability and access control
- **Measurable**: Deletion works for owners, soft-delete via deleted_at
- **Achievable**: Standard deletion pattern
- **Relevant**: Content moderation capability
- **Time-bound**: N/A

## Test Method

E2E tests verify comment deletion and access control.

## Evidence Required

- Comment deletion tests
- Access control verification

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-3.4](../user-stories/US-3.4-comments.md)
- **Epic**: [E3](../epics/E3-sharing-and-community.md)
- **Requirement**: [FR-011](../requirements/FR-011-sharing-and-community.md)
- **PRD Reference**: PRD §Sharing & Community
- **TDD Reference**: TDD §Sharing & Community

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
