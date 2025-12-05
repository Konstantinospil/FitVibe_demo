#!/usr/bin/env python3
"""
Create GitHub issue for Epic 13: WCAG 2.2 Compliance Update.

This script creates a single epic issue from the PROJECT_EPICS_AND_ACTIVITIES.md file.
"""

import os
import sys
import requests
from pathlib import Path

# GitHub repository
REPO = "Konstantinospil/FitVibe_demo"
PROJECT_NUMBER = 1

# API base URL
API_BASE = "https://api.github.com"


def get_github_token():
    """Get GitHub token from environment or prompt."""
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        print("GITHUB_TOKEN environment variable not set.")
        print("\nTo create a token:")
        print("1. Visit: https://github.com/settings/tokens")
        print("2. Click 'Generate new token (classic)'")
        print("3. Select 'repo' scope")
        print("4. Copy the token")
        print("\nYou can either:")
        print("  - Set it: export GITHUB_TOKEN=your_token")
        print("  - Or enter it now (will not be saved):")
        try:
            token = input("\nEnter your GitHub token: ").strip()
            if not token:
                print("No token provided. Exiting.")
                return None
            return token
        except (EOFError, KeyboardInterrupt):
            print("\nCancelled.")
            return None
    return token


def create_label_if_not_exists(session, token, label, color="7057ff"):
    """Create a label if it doesn't exist."""
    url = f"{API_BASE}/repos/{REPO}/labels/{label}"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }

    response = session.get(url, headers=headers)
    if response.status_code == 200:
        return

    data = {
        "name": label,
        "color": color,
        "description": f"Label for {label}",
    }
    response = session.post(
        f"{API_BASE}/repos/{REPO}/labels",
        headers=headers,
        json=data
    )
    if response.status_code == 201:
        print(f"Created label: {label}")
    elif response.status_code != 422:
        print(f"Warning: Could not create label {label}: {response.status_code}")


def create_epic_issue(session, token):
    """Create Epic 13 issue."""
    title = "Epic 13: WCAG 2.2 Compliance Update (NFR-004 Enhancement)"
    
    body = """## Type
Epic / Feature Request

## Priority
High

## Description

Update FitVibe's accessibility compliance from WCAG 2.1 AA to WCAG 2.2 AA by implementing the 9 new success criteria introduced in WCAG 2.2 (released October 2023). This epic enhances the existing accessibility work in Epic 8 with the latest standards.

**Related Epic**: Epic 8 (Accessibility)  
**Gate**: GOLD  
**Estimated Effort**: 6-10 story points

## Acceptance Criteria

### AC-13-1: Documentation Updated
- [ ] Visual Design System updated to reference WCAG 2.2 AA instead of 2.1 AA
- [ ] All accessibility documentation reflects WCAG 2.2 requirements
- [ ] ADR-020 and NFR-004 updated to reference WCAG 2.2
- [ ] New status messages pattern documented in design system

### AC-13-2: Focus Not Obscured (2.4.11)
- [ ] All focus indicators are visible and not hidden by sticky headers, modals, or overlays
- [ ] Focus indicators meet minimum 2px visibility requirement
- [ ] Z-index guidelines documented for focusable elements
- [ ] Automated tests verify focus visibility

### AC-13-3: Dragging Movements (2.5.7)
- [ ] All drag-and-drop operations in Planner have keyboard alternatives
- [ ] Keyboard navigation documented for all draggable elements
- [ ] Arrow keys and Enter/Space activate drag operations via keyboard
- [ ] E2E tests verify keyboard alternatives work

### AC-13-4: Target Size (2.5.8)
- [ ] All pointer targets meet minimum 24×24 CSS pixels
- [ ] Design system explicitly documents 24×24 minimum (current 44×44 exceeds requirement)
- [ ] Exceptions documented (inline links, essential targets)
- [ ] Automated tests verify target sizes

### AC-13-5: Consistent Help (3.2.6)
- [ ] Help mechanisms (help links, contact forms) appear in consistent location
- [ ] Help placement pattern documented in design system
- [ ] Manual audit confirms consistency across pages

### AC-13-6: Redundant Entry (3.3.7)
- [ ] Form data persists on validation errors
- [ ] Multi-step forms preserve entered data
- [ ] Auto-population patterns documented
- [ ] E2E tests verify data persistence

### AC-13-7: Accessible Authentication (3.3.8)
- [ ] No cognitive function tests (CAPTCHA, puzzles) in authentication flows
- [ ] Authentication patterns documented
- [ ] If CAPTCHA is added, alternative authentication must be available
- [ ] Manual audit confirms compliance

### AC-13-8: Status Messages (4.1.3)
- [ ] All status messages use appropriate ARIA roles (status/alert)
- [ ] Status message patterns documented in design system
- [ ] Polite vs. assertive updates properly implemented
- [ ] Automated tests verify ARIA roles

### AC-13-9: Testing & Validation
- [ ] Accessibility tests updated to include WCAG 2.2 tags
- [ ] All new criteria verified with automated tests
- [ ] Manual testing checklist updated
- [ ] Lighthouse and axe-core report 0 WCAG 2.2 violations

## Activities

| ID | Activity | Difficulty | Dependencies |
|----|----------|------------|--------------|
| E13-A1 | Update Visual Design System | 2 | Documentation |
| E13-A2 | Update ADR-020 | 1 | Documentation |
| E13-A3 | Update NFR-004 | 1 | Documentation |
| E13-A4 | Focus Visibility Audit | 2 | E8-A5, All frontend |
| E13-A5 | Keyboard Alternatives for Dragging | 3 | E4-A4, E8-A2 |
| E13-A6 | Target Size Verification | 2 | E8-A3, Frontend |
| E13-A7 | Help Mechanism Consistency | 2 | All frontend |
| E13-A8 | Form Data Persistence | 2 | All frontend |
| E13-A9 | Authentication Pattern Review | 2 | Auth module |
| E13-A10 | Status Messages Implementation | 2 | All frontend |
| E13-A11 | Update Accessibility Tests | 2 | E8-A6 |
| E13-A12 | WCAG 2.2 Compliance Validation | 2 | E13-A1 through A11 |

## Success Metrics

- 100% WCAG 2.2 AA compliance verified by automated tests
- 0 critical or serious violations in axe-core reports
- Lighthouse accessibility score remains ≥ 90
- All documentation updated and accurate
- Manual testing confirms all new criteria met

## Current Status

**Documentation Phase**: ✅ Complete
- Visual Design System updated
- ADR-020 updated
- NFR-004 updated
- Accessibility tests updated with WCAG 2.2 tags

**Implementation Phase**: 🔄 Pending
- Code changes for all 9 new criteria need to be implemented

## References

- [WCAG 2.2 Release Notes](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [WCAG 2.2 Success Criteria](https://www.w3.org/WAI/WCAG22/quickref/)
- Epic documentation: [PROJECT_EPICS_AND_ACTIVITIES.md](../../docs/PROJECT_EPICS_AND_ACTIVITIES.md)
- Implementation plan: [WCAG_2.2_IMPLEMENTATION_PLAN.md](../../docs/3.Sensory_Design_System/WCAG_2.2_IMPLEMENTATION_PLAN.md)
"""

    labels = [
        "epic:wcag-2.2-compliance",
        "priority:high",
        "type:documentation",
        "type:frontend",
        "accessibility",
    ]

    # Ensure labels exist
    session = requests.Session()
    for label in labels:
        create_label_if_not_exists(session, token, label)

    # Create issue
    url = f"{API_BASE}/repos/{REPO}/issues"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }

    data = {
        "title": title,
        "body": body,
        "labels": labels,
    }

    response = session.post(url, headers=headers, json=data)

    if response.status_code == 201:
        issue_data = response.json()
        print(f"✓ Created Epic 13 issue: #{issue_data['number']}")
        print(f"  URL: {issue_data['html_url']}")
        return issue_data
    else:
        print(f"✗ Failed to create issue")
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.text}")
        return None


def main():
    """Main function."""
    token = get_github_token()
    if not token:
        return 1

    print("Creating Epic 13: WCAG 2.2 Compliance Update issue...")
    result = create_epic_issue(requests.Session(), token)

    if result:
        print("\n✓ Epic 13 issue created successfully!")
        return 0
    else:
        print("\n✗ Failed to create Epic 13 issue")
        return 1


if __name__ == "__main__":
    exit(main())















