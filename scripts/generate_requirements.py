#!/usr/bin/env python3
"""
Requirements Generator Script

Parses AC_Master.md and generates individual requirement files from the documentation.
Each requirement ID (FR-001, FR-002, etc.) gets its own markdown file with all
acceptance criteria grouped together.
"""

import re
import os
import sys
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
from collections import defaultdict


def parse_ac_master(file_path: str) -> Dict[str, List[Dict[str, Any]]]:
    """
    Parse AC_Master.md and extract requirements grouped by Requirement ID.

    Returns:
        Dictionary mapping Requirement ID to list of acceptance criteria
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Dictionary to store requirements by ID
    requirements = defaultdict(list)

    # Process lines to find table rows
    in_table = False
    header_found = False

    for line in lines:
        # Skip section headers
        if line.startswith('###'):
            continue

        # Check if this is the table header
        if '| Type | Requirement ID |' in line:
            in_table = True
            header_found = True
            continue

        # Skip separator row
        if header_found and line.strip().startswith('|') and '---' in line:
            continue

        # Process table rows
        if in_table and line.strip().startswith('|') and '---' not in line:
            # Split by pipe and clean
            parts = [p.strip() for p in line.split('|')]
            # Remove empty first and last elements
            parts = [p for p in parts if p]

            # Expected: Type, Requirement ID, Requirement Title, AC ID, Acceptance Criteria,
            # Test Method, Evidence, Owner, Priority, Gate, Status, Trace → PRD, Trace → TDD
            if len(parts) >= 13:
                req_type = parts[0]
                req_id = parts[1]
                req_title = parts[2]
                ac_id = parts[3]
                ac_text = parts[4]
                test_method = parts[5]
                evidence = parts[6]
                owner = parts[7]
                priority = parts[8]
                gate = parts[9]
                status = parts[10]
                trace_prd = parts[11] if len(parts) > 11 else ''
                trace_tdd = parts[12] if len(parts) > 12 else ''

                # Skip if this looks like a header row
                if req_type in ['Type', 'FR', 'NFR'] and 'Requirement ID' in req_id:
                    continue

                # Store the acceptance criterion
                requirements[req_id].append({
                    'type': req_type,
                    'requirement_id': req_id,
                    'requirement_title': req_title,
                    'ac_id': ac_id,
                    'acceptance_criteria': ac_text,
                    'test_method': test_method,
                    'evidence': evidence,
                    'owner': owner,
                    'priority': priority,
                    'gate': gate,
                    'status': status,
                    'trace_prd': trace_prd,
                    'trace_tdd': trace_tdd
                })

    return dict(requirements)


def get_requirement_context(req_id: str, req_title: str) -> Dict[str, Any]:
    """
    Get additional context for a requirement based on its ID and title.
    Returns a dictionary with use cases, dependencies, constraints, etc.
    """
    context = {
        'business_objective': '',
        'success_criteria': '',
        'target_users': 'Authenticated users',
        'use_cases': {'primary': [], 'edge_cases': []},
        'dependencies': {'technical': [], 'feature': [], 'external': []},
        'constraints': {'technical': [], 'business': []},
        'assumptions': [],
        'risks': []
    }

    # FR-001: User Registration
    if req_id == 'FR-001':
        context['business_objective'] = 'Enable secure user onboarding with email verification to ensure valid accounts and prevent abuse.'
        context['success_criteria'] = 'Users can register, verify email, and access the platform within 24 hours of registration.'
        context['target_users'] = 'New users creating accounts'
        context['use_cases'] = {
            'primary': [
                'User provides email and password to create account',
                'User receives verification email and clicks link',
                'User completes registration and can log in'
            ],
            'edge_cases': [
                'User registers with duplicate email (case variations)',
                'User requests verification email multiple times',
                'User attempts to use expired verification token',
                'User provides weak password that fails policy'
            ]
        }
        context['dependencies'] = {
            'technical': ['Email service (SMTP/nodemailer)', 'Database for user storage', 'JWT token generation'],
            'feature': [],
            'external': ['Email delivery service']
        }
        context['constraints'] = {
            'technical': ['Email verification token TTL = 24h', 'Rate limiting: 5 resend requests/24h/IP'],
            'business': ['Password policy must be enforced', 'Unverified accounts cannot access protected routes']
        }
        context['assumptions'] = [
            'Users have access to email inbox',
            'Email delivery is reliable (<1s for verification email)',
            'Users understand email verification process'
        ]
        context['risks'] = [
            'Email delivery delays could frustrate users',
            'Spam filters may block verification emails',
            'Rate limiting may prevent legitimate users from resending emails'
        ]

    # FR-002: Login & Session
    elif req_id == 'FR-002':
        context['business_objective'] = 'Provide secure authentication and session management with token-based access control.'
        context['success_criteria'] = 'Users can securely log in, maintain sessions, and log out with proper token invalidation.'
        context['target_users'] = 'All authenticated users'
        context['use_cases'] = {
            'primary': [
                'User logs in with email and password',
                'User receives access and refresh tokens',
                'User refreshes access token when expired',
                'User logs out and tokens are invalidated'
            ],
            'edge_cases': [
                'User attempts login with incorrect credentials multiple times (lockout)',
                'User attempts to reuse rotated refresh token (replay attack)',
                'User enables 2FA and must provide TOTP code',
                'User loses 2FA device and uses backup codes'
            ]
        }
        context['dependencies'] = {
            'technical': ['JWT library (jose)', 'Database for refresh token storage', 'Cookie management'],
            'feature': ['FR-001 (User Registration)'],
            'external': []
        }
        context['constraints'] = {
            'technical': ['Access token TTL ≤15m', 'Refresh token TTL ≤30d', 'RS256 algorithm required'],
            'business': ['Account lockout after 10 failed attempts', '2FA is optional']
        }
        context['assumptions'] = [
            'Users remember their passwords',
            'Users have access to 2FA device if enabled',
            'Clock skew between client and server ≤30s'
        ]
        context['risks'] = [
            'Token theft via XSS if cookies not properly secured',
            'Brute force attacks on login endpoint',
            'Session fixation attacks'
        ]

    # FR-003: Auth-Wall
    elif req_id == 'FR-003':
        context['business_objective'] = 'Enforce authentication requirement for all platform access, ensuring privacy-by-default.'
        context['success_criteria'] = 'All unauthenticated requests to protected resources are blocked or redirected to login.'
        context['target_users'] = 'All users (authenticated and unauthenticated)'
        context['use_cases'] = {
            'primary': [
                'Unauthenticated user navigates to protected route → redirected to /login',
                'Unauthenticated API call → returns 401',
                'Authenticated user accesses protected route → allowed'
            ],
            'edge_cases': [
                'User session expires while navigating',
                'User attempts to access legacy public/share links',
                'Static assets must remain accessible'
            ]
        }
        context['dependencies'] = {
            'technical': ['Authentication middleware', 'Route guards (frontend)', 'API middleware'],
            'feature': ['FR-002 (Login & Session)'],
            'external': []
        }
        context['constraints'] = {
            'technical': ['Only /login and /register routes accessible without auth', 'Static assets must be allowlisted'],
            'business': ['Privacy-by-default: all content requires authentication']
        }
        context['assumptions'] = [
            'Users understand they must log in to access content',
            'Legacy public links are no longer supported'
        ]
        context['risks'] = [
            'Users may be confused by redirect behavior',
            'SEO impact from requiring authentication',
            'Legacy bookmarks may break'
        ]

    # FR-004: Planner
    elif req_id == 'FR-004':
        context['business_objective'] = 'Enable users to plan training sessions with drag-and-drop scheduling and conflict detection.'
        context['success_criteria'] = 'Users can create, edit, and schedule training plans with real-time conflict detection.'
        context['target_users'] = 'Authenticated users planning workouts'
        context['use_cases'] = {
            'primary': [
                'User creates a training plan for a specific date/time',
                'User drags and drops sessions to reschedule',
                'User edits plan details and saves changes'
            ],
            'edge_cases': [
                'User attempts to schedule overlapping sessions',
                'Multiple users edit same plan simultaneously (concurrency)',
                'User schedules session in different timezone',
                'User attempts to schedule past-dated sessions'
            ]
        }
        context['dependencies'] = {
            'technical': ['Calendar UI component', 'Drag-and-drop library', 'ETag support for concurrency'],
            'feature': ['FR-003 (Auth-Wall)'],
            'external': []
        }
        context['constraints'] = {
            'technical': ['Plan persistence ≤500ms', 'Calendar re-render ≤150ms', 'Mobile touch gesture support'],
            'business': ['Overlapping sessions must be prevented', 'Last-writer-wins for concurrent edits']
        }
        context['assumptions'] = [
            'Users understand calendar interface',
            'Time zones are handled correctly',
            'Mobile devices support touch gestures'
        ]
        context['risks'] = [
            'Performance degradation with many scheduled sessions',
            'Concurrency conflicts may frustrate users',
            'Mobile drag-and-drop may be difficult on small screens'
        ]

    # FR-005: Logging & Import
    elif req_id == 'FR-005':
        context['business_objective'] = 'Enable users to log workouts manually or import from external sources (GPX/FIT files).'
        context['success_criteria'] = 'Users can log workouts, import files, and edit logged data with accurate metric calculations.'
        context['target_users'] = 'Authenticated users logging workouts'
        context['use_cases'] = {
            'primary': [
                'User starts a workout and logs duration, distance, HR',
                'User imports GPX file from running watch',
                'User edits logged workout data'
            ],
            'edge_cases': [
                'User logs workout while offline (sync on reconnect)',
                'User imports malformed GPX/FIT file',
                'User edits pace which triggers metric recalculation',
                'User imports file with missing timezone data'
            ]
        }
        context['dependencies'] = {
            'technical': ['GPX/FIT parser libraries', 'Offline storage (PWA)', 'Metric calculation engine'],
            'feature': ['FR-004 (Planner)'],
            'external': []
        }
        context['constraints'] = {
            'technical': ['Import parsing ≥99% valid samples', 'Recalculation ≤200ms', 'Offline sync ≤5s after reconnect'],
            'business': ['All edits must be audit-logged']
        }
        context['assumptions'] = [
            'Users have GPX/FIT files from compatible devices',
            'Users understand metric relationships (pace, elevation, etc.)',
            'Network connectivity is available for sync'
        ]
        context['risks'] = [
            'Malformed files may crash parser',
            'Offline data loss if device fails before sync',
            'Metric calculation errors may confuse users'
        ]

    # FR-006: Gamification
    elif req_id == 'FR-006':
        context['business_objective'] = 'Motivate users through points and badges awarded for completing training sessions.'
        context['success_criteria'] = 'Users receive points and badges upon session completion, visible in profile within 2s.'
        context['target_users'] = 'Authenticated users completing workouts'
        context['use_cases'] = {
            'primary': [
                'User completes a training session and receives points',
                'User earns a badge for achieving milestone',
                'User views points and badges in profile'
            ],
            'edge_cases': [
                'User attempts to game the system (detected and prevented)',
                'Admin adjusts user points (audit logged)',
                'Badge criteria changes and affects existing users'
            ]
        }
        context['dependencies'] = {
            'technical': ['Points calculation engine', 'Badge evaluation system', 'Background job processor'],
            'feature': ['FR-005 (Logging & Import)'],
            'external': []
        }
        context['constraints'] = {
            'technical': ['Scoring rules must be deterministic', 'No negative points', 'Badge awards ≤2s'],
            'business': ['Points formula is hidden from users', 'Anti-gaming measures required']
        }
        context['assumptions'] = [
            'Users are motivated by gamification',
            'Points formula is fair and balanced',
            'Badge criteria are achievable'
        ]
        context['risks'] = [
            'Users may attempt to exploit points system',
            'Badge criteria changes may frustrate users',
            'Points calculation errors may reduce trust'
        ]

    # FR-007: Analytics & Export
    elif req_id == 'FR-007':
        context['business_objective'] = 'Provide users with insights into their training progress and ability to export data.'
        context['success_criteria'] = 'Users can view accurate analytics and export their data in CSV/JSON format within 24h.'
        context['target_users'] = 'Authenticated users viewing progress'
        context['use_cases'] = {
            'primary': [
                'User views weekly/monthly training summaries',
                'User views personal bests and streaks',
                'User exports data in CSV/JSON format'
            ],
            'edge_cases': [
                'User exports data including/excluding private sessions',
                'User views analytics for custom date ranges',
                'User has no training data (empty state)'
            ]
        }
        context['dependencies'] = {
            'technical': ['Analytics aggregation engine', 'Materialized views', 'CSV/JSON export generator'],
            'feature': ['FR-005 (Logging & Import)'],
            'external': []
        }
        context['constraints'] = {
            'technical': ['Aggregates match DB within ±0.5%', 'Export ≤1s for ≤10k rows', 'UTF-8 encoding required'],
            'business': ['Private sessions excluded by default', 'Export link valid 24h']
        }
        context['assumptions'] = [
            'Users understand analytics metrics',
            'Users want to export their data',
            'Data volume is manageable (<10k rows typical)'
        ]
        context['risks'] = [
            'Large exports may timeout',
            'Analytics calculation errors may mislead users',
            'Privacy concerns with data export'
        ]

    # FR-008: Admin & RBAC
    elif req_id == 'FR-008':
        context['business_objective'] = 'Enable administrative control and role-based access control for platform management.'
        context['success_criteria'] = 'Admins can manage users and content with proper authorization and audit logging.'
        context['target_users'] = 'Administrators and coaches'
        context['use_cases'] = {
            'primary': [
                'Admin adjusts user points with 2-step confirmation',
                'Admin edits user profile',
                'Admin deletes inappropriate session',
                'User with coach role accesses coach-specific features'
            ],
            'edge_cases': [
                'Admin attempts action without proper role',
                'Admin action fails but audit log is created',
                'Role changes take effect immediately'
            ]
        }
        context['dependencies'] = {
            'technical': ['RBAC middleware', 'JWT role claims', 'Audit logging system'],
            'feature': ['FR-002 (Login & Session)'],
            'external': []
        }
        context['constraints'] = {
            'technical': ['Roles: user, coach, admin', 'All admin actions require 2-step confirm', '403 for unauthorized access'],
            'business': ['All admin actions must be audit-logged', 'No role information leakage in errors']
        }
        context['assumptions'] = [
            'Admins are trusted users',
            'Role assignments are accurate',
            'Audit logs are secure'
        ]
        context['risks'] = [
            'Privilege escalation attacks',
            'Admin mistakes may affect many users',
            'Audit log tampering'
        ]

    # NFR-001: Security
    elif req_id == 'NFR-001':
        context['business_objective'] = 'Ensure platform security through headers, rate limiting, and threat protection.'
        context['success_criteria'] = 'Security headers are properly configured, rate limiting prevents abuse, and threats are detected.'
        context['target_users'] = 'All users (security affects everyone)'
        context['use_cases'] = {
            'primary': [
                'Security headers prevent XSS attacks',
                'Rate limiting prevents brute force attacks',
                'CAPTCHA challenges suspicious activity',
                'JWT validation prevents token tampering'
            ],
            'edge_cases': [
                'Legitimate users hit rate limits',
                'CAPTCHA fails for accessibility users',
                'Clock skew causes JWT validation failures'
            ]
        }
        context['dependencies'] = {
            'technical': ['NGINX for headers', 'Rate limiting library', 'CAPTCHA service', 'AV scanning service'],
            'feature': [],
            'external': ['CAPTCHA provider (if used)', 'Antivirus service']
        }
        context['constraints'] = {
            'technical': ['CSP report-only for 7 days', 'HSTS min-age ≥6 months', 'Rate limit ≥10 req/min/IP'],
            'business': ['Security must not degrade user experience', 'CAPTCHA via feature flag']
        }
        context['assumptions'] = [
            'Security headers are supported by browsers',
            'Rate limiting thresholds are appropriate',
            'AV scanning is reliable'
        ]
        context['risks'] = [
            'Overly strict security may break functionality',
            'Rate limiting may block legitimate users',
            'AV scanning may be slow'
        ]

    # NFR-002: Privacy
    elif req_id == 'NFR-002':
        context['business_objective'] = 'Ensure GDPR compliance and user privacy through data minimization and user rights.'
        context['success_criteria'] = 'No PII in logs, consent is respected, and users can export/delete their data within SLA.'
        context['target_users'] = 'All users (privacy affects everyone)'
        context['use_cases'] = {
            'primary': [
                'User exports their data (GDPR right)',
                'User deletes their account (GDPR right)',
                'User opts out of analytics',
                'System redacts PII from logs'
            ],
            'edge_cases': [
                'User requests export during high load',
                'User deletes account but data needed for legal hold',
                'Consent changes require immediate effect'
            ]
        }
        context['dependencies'] = {
            'technical': ['Data export job system', 'Data deletion pipeline', 'Log redaction system'],
            'feature': ['FR-007 (Analytics & Export)'],
            'external': []
        }
        context['constraints'] = {
            'technical': ['Export ≤24h for typical accounts', 'Deletion ≤30d', 'No PII in logs'],
            'business': ['GDPR compliance required', 'Consent opt-out ≤5m']
        }
        context['assumptions'] = [
            'Users understand their privacy rights',
            'Data deletion is technically feasible',
            'Legal holds are rare'
        ]
        context['risks'] = [
            'Data deletion may be incomplete',
            'Export delays may violate GDPR',
            'Log redaction may miss edge cases'
        ]

    # NFR-003: Performance
    elif req_id == 'NFR-003':
        context['business_objective'] = 'Ensure fast, responsive user experience across devices and network conditions.'
        context['success_criteria'] = 'Core Web Vitals meet targets, API responses are fast, and no regressions >10% across releases.'
        context['target_users'] = 'All users (performance affects everyone)'
        context['use_cases'] = {
            'primary': [
                'User loads dashboard quickly (LCP ≤2.5s)',
                'User interacts with page (TTI ≤3.5s)',
                'User makes API call (TTFB ≤500ms)'
            ],
            'edge_cases': [
                'User on slow 3G connection',
                'User on mid-tier mobile device',
                'High load causes performance degradation'
            ]
        }
        context['dependencies'] = {
            'technical': ['Lighthouse CI', 'Performance monitoring', 'Caching layer', 'CDN'],
            'feature': [],
            'external': ['CDN provider', 'Performance monitoring service']
        }
        context['constraints'] = {
            'technical': ['P95 LCP ≤2.5s', 'P95 TTI ≤3.5s', 'P95 TTFB ≤500ms', 'No regression >10%'],
            'business': ['Performance budgets enforced in CI', 'Mobile performance is critical']
        }
        context['assumptions'] = [
            'Users have reasonable network connections',
            'Devices meet minimum requirements',
            'Performance monitoring is accurate'
        ]
        context['risks'] = [
            'Performance may degrade under load',
            'Third-party scripts may slow page load',
            'Mobile performance may be challenging'
        ]

    # NFR-004: Accessibility
    elif req_id == 'NFR-004':
        context['business_objective'] = 'Ensure platform is accessible to all users, including those with disabilities.'
        context['success_criteria'] = 'WCAG 2.1 AA compliance, keyboard navigation works, and screen readers are supported.'
        context['target_users'] = 'All users, especially those with disabilities'
        context['use_cases'] = {
            'primary': [
                'User navigates with keyboard only',
                'Screen reader user accesses content',
                'User with color blindness uses platform',
                'User with motor impairment uses platform'
            ],
            'edge_cases': [
                'Complex interactions may be difficult',
                'Third-party components may not be accessible',
                'Dynamic content may confuse screen readers'
            ]
        }
        context['dependencies'] = {
            'technical': ['ARIA labels', 'Keyboard navigation', 'Color contrast tools', 'Screen reader testing'],
            'feature': [],
            'external': ['Screen reader software for testing']
        }
        context['constraints'] = {
            'technical': ['Color contrast ≥4.5:1', 'Focus visible on all elements', 'No keyboard traps'],
            'business': ['WCAG 2.1 AA compliance required', 'Accessibility is not optional']
        }
        context['assumptions'] = [
            'Users have assistive technology',
            'Developers understand accessibility',
            'Design system supports accessibility'
        ]
        context['risks'] = [
            'Accessibility may be overlooked in rush',
            'Third-party components may not be accessible',
            'Complex features may be difficult to make accessible'
        ]

    # NFR-005: Availability & Backups
    elif req_id == 'NFR-005':
        context['business_objective'] = 'Ensure platform availability and data protection through backups and monitoring.'
        context['success_criteria'] = '99.0% monthly uptime, backups succeed nightly, and restore drills validate RTO/RPO.'
        context['target_users'] = 'All users (availability affects everyone)'
        context['use_cases'] = {
            'primary': [
                'System is available for users',
                'Backups run successfully',
                'Restore drill validates recovery process',
                'Health check endpoint reports status'
            ],
            'edge_cases': [
                'System outage requires recovery',
                'Backup fails and needs investigation',
                'Restore drill reveals issues'
            ]
        }
        context['dependencies'] = {
            'technical': ['Backup system', 'Monitoring system', 'Health check endpoint', 'Restore procedures'],
            'feature': [],
            'external': ['Backup storage', 'Monitoring service']
        }
        context['constraints'] = {
            'technical': ['SLO ≥99.0% monthly', 'RTO ≤4h', 'RPO ≤24h', '/healthz allowlisted only'],
            'business': ['Outages require RCA within 5 BD', 'Backups must be tested regularly']
        }
        context['assumptions'] = [
            'Infrastructure is reliable',
            'Backup storage is secure',
            'Restore procedures are documented'
        ]
        context['risks'] = [
            'Outages may exceed SLO',
            'Backups may fail silently',
            'Restore may take longer than RTO'
        ]

    # NFR-006: Internationalization
    elif req_id == 'NFR-006':
        context['business_objective'] = 'Support multiple languages and locales to serve international users.'
        context['success_criteria'] = 'English and German translations available, language preference persists, and locale formatting works.'
        context['target_users'] = 'All users (i18n affects everyone)'
        context['use_cases'] = {
            'primary': [
                'User selects language (EN/DE)',
                'User views UI in selected language',
                'User sees dates/numbers in locale format',
                'User language preference persists'
            ],
            'edge_cases': [
                'Translation key is missing (fallback to EN)',
                'User switches language mid-session',
                'Locale formatting fails for edge cases'
            ]
        }
        context['dependencies'] = {
            'technical': ['i18n library', 'Translation files (JSON)', 'Locale formatting library'],
            'feature': [],
            'external': []
        }
        context['constraints'] = {
            'technical': ['Static keys for EN/DE', 'No hard-coded strings', 'Missing key linter passes'],
            'business': ['English and German supported', 'More languages may be added later']
        }
        context['assumptions'] = [
            'Translations are accurate',
            'Users understand language selection',
            'Locale data is available'
        ]
        context['risks'] = [
            'Missing translations may confuse users',
            'Locale formatting may be incorrect',
            'Translation maintenance may be overlooked'
        ]

    return context


def generate_requirement_file(req_id: str, acs: List[Dict[str, Any]], output_dir: Path) -> None:
    """
    Generate a markdown file for a single requirement with all its acceptance criteria.
    """
    if not acs:
        return

    # Get common metadata from first AC
    first_ac = acs[0]
    req_type = first_ac['type']
    req_title = first_ac['requirement_title']

    # Determine if it's functional or non-functional
    is_nfr = req_type == 'NFR'

    # Generate filename
    filename_base = f"{req_id}-{req_title.lower().replace(' ', '-').replace('&', 'and')}"
    filename_base = re.sub(r'[^\w\-]', '', filename_base)  # Remove special chars
    filename = f"{filename_base}.md"
    filepath = output_dir / filename

    # Generate content
    lines = []
    lines.append(f"# {req_id} — {req_title}")
    lines.append("")
    lines.append("---")
    lines.append(f"**Requirement ID**: {req_id}")
    lines.append(f"**Type**: {'Non-Functional Requirement' if is_nfr else 'Functional Requirement'}")
    lines.append(f"**Title**: {req_title}")
    lines.append(f"**Status**: {first_ac['status']}")
    lines.append(f"**Priority**: {first_ac['priority']}")
    lines.append(f"**Gate**: {first_ac['gate']}")
    lines.append(f"**Owner**: {first_ac['owner']}")
    lines.append(f"**Generated**: {datetime.now().isoformat()}")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Get requirement context
    context = get_requirement_context(req_id, req_title)

    # Executive Summary
    lines.append("## Executive Summary")
    lines.append("")
    if is_nfr:
        lines.append(f"This non-functional requirement defines {req_title.lower()} standards and constraints for the FitVibe platform.")
    else:
        lines.append(f"This functional requirement specifies {req_title.lower()} capabilities that the system must provide.")
    if context['business_objective']:
        lines.append("")
        lines.append(context['business_objective'])
    lines.append("")

    # Business Context
    lines.append("## Business Context")
    lines.append("")
    if context['business_objective']:
        lines.append(f"- **Business Objective**: {context['business_objective']}")
    if context['success_criteria']:
        lines.append(f"- **Success Criteria**: {context['success_criteria']}")
    lines.append(f"- **Priority**: {first_ac['priority']}")
    lines.append(f"- **Quality Gate**: {first_ac['gate']}")
    lines.append(f"- **Owner**: {first_ac['owner']}")
    lines.append(f"- **Status**: {first_ac['status']}")
    if context['target_users']:
        lines.append(f"- **Target Users**: {context['target_users']}")
    lines.append("")

    # Traceability
    lines.append("## Traceability")
    lines.append("")
    if first_ac['trace_prd']:
        lines.append(f"- **PRD Reference**: {first_ac['trace_prd']}")
    if first_ac['trace_tdd']:
        lines.append(f"- **TDD Reference**: {first_ac['trace_tdd']}")
    lines.append("")

    # Acceptance Criteria
    lines.append("## Acceptance Criteria")
    lines.append("")
    lines.append("Each acceptance criterion must be met for this requirement to be considered complete.")
    lines.append("")

    for idx, ac in enumerate(acs, 1):
        ac_id = ac['ac_id']
        ac_text = ac['acceptance_criteria']
        test_method = ac['test_method']
        evidence = ac['evidence']

        lines.append(f"### {ac_id}")
        lines.append("")
        lines.append(f"**Criterion**: {ac_text}")
        lines.append("")
        lines.append(f"- **Test Method**: {test_method}")
        lines.append(f"- **Evidence Required**: {evidence}")
        lines.append("")

    # Test Strategy
    lines.append("## Test Strategy")
    lines.append("")
    test_methods = set(ac['test_method'] for ac in acs)
    for method in sorted(test_methods):
        lines.append(f"- {method}")
    lines.append("")

    # Evidence Requirements
    lines.append("## Evidence Requirements")
    lines.append("")
    evidence_types = set(ac['evidence'] for ac in acs)
    for evidence_type in sorted(evidence_types):
        lines.append(f"- {evidence_type}")
    lines.append("")

    # Use Cases
    if context['use_cases']['primary'] or context['use_cases']['edge_cases']:
        lines.append("## Use Cases")
        lines.append("")
        if context['use_cases']['primary']:
            lines.append("### Primary Use Cases")
            lines.append("")
            for use_case in context['use_cases']['primary']:
                lines.append(f"- {use_case}")
            lines.append("")
        if context['use_cases']['edge_cases']:
            lines.append("### Edge Cases")
            lines.append("")
            for edge_case in context['use_cases']['edge_cases']:
                lines.append(f"- {edge_case}")
            lines.append("")

    # Dependencies
    has_dependencies = (context['dependencies']['technical'] or
                       context['dependencies']['feature'] or
                       context['dependencies']['external'])
    if has_dependencies:
        lines.append("## Dependencies")
        lines.append("")
        if context['dependencies']['technical']:
            lines.append("### Technical Dependencies")
            lines.append("")
            for dep in context['dependencies']['technical']:
                lines.append(f"- {dep}")
            lines.append("")
        if context['dependencies']['feature']:
            lines.append("### Feature Dependencies")
            lines.append("")
            for dep in context['dependencies']['feature']:
                lines.append(f"- {dep}")
            lines.append("")
        if context['dependencies']['external']:
            lines.append("### External Dependencies")
            lines.append("")
            for dep in context['dependencies']['external']:
                lines.append(f"- {dep}")
            lines.append("")

    # Constraints
    has_constraints = (context['constraints']['technical'] or
                      context['constraints']['business'])
    if has_constraints:
        lines.append("## Constraints")
        lines.append("")
        if context['constraints']['technical']:
            lines.append("### Technical Constraints")
            lines.append("")
            for constraint in context['constraints']['technical']:
                lines.append(f"- {constraint}")
            lines.append("")
        if context['constraints']['business']:
            lines.append("### Business Constraints")
            lines.append("")
            for constraint in context['constraints']['business']:
                lines.append(f"- {constraint}")
            lines.append("")

    # Assumptions
    if context['assumptions']:
        lines.append("## Assumptions")
        lines.append("")
        for assumption in context['assumptions']:
            lines.append(f"- {assumption}")
        lines.append("")

    # Risks & Issues
    if context['risks']:
        lines.append("## Risks & Issues")
        lines.append("")
        for risk in context['risks']:
            lines.append(f"- **Risk**: {risk}")
        lines.append("")

    # Write file
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f"Generated: {filepath}")


def main():
    """Main function to generate requirement files."""
    import argparse
    import subprocess

    parser = argparse.ArgumentParser(description="Generate requirement files from AC_Master.md")
    parser.add_argument(
        "--auto-plan",
        action="store_true",
        help="Automatically trigger project-planning agent after generating requirements",
    )
    parser.add_argument(
        "--git-token",
        type=str,
        help="GitHub token for project-planning agent (required if --auto-plan is used with issues mode)",
    )
    parser.add_argument(
        "--plan-mode",
        type=str,
        choices=["epics", "stories", "ac", "issues"],
        default="epics",
        help="Project-planning agent mode (default: epics)",
    )
    parser.add_argument(
        "--auto-upload",
        action="store_true",
        help="Auto-upload issues to GitHub (only for issues mode)",
    )
    args = parser.parse_args()

    # Determine paths
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent

    # Try both possible locations for AC_Master.md
    ac_master_paths = [
        repo_root / "apps" / "docs" / "AC_Master.md",
        repo_root / "docs" / "1.Product_Requirements" / "AC_Master.md"
    ]

    ac_master_path = None
    for path in ac_master_paths:
        if path.exists():
            ac_master_path = path
            break

    if not ac_master_path:
        print(f"Error: AC_Master.md not found in expected locations:")
        for path in ac_master_paths:
            print(f"  - {path}")
        return 1

    print(f"Reading AC_Master.md from: {ac_master_path}")

    # Parse requirements
    requirements = parse_ac_master(str(ac_master_path))

    print(f"Found {len(requirements)} unique requirements")

    # Determine output directory
    output_dir = repo_root / "docs" / "1.Product_Requirements" / "Requirements"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Output directory: {output_dir}")

    # Generate files
    for req_id, acs in sorted(requirements.items()):
        generate_requirement_file(req_id, acs, output_dir)

    print(f"\nGenerated {len(requirements)} requirement files in {output_dir}")

    # Auto-trigger project-planning agent if requested
    if args.auto_plan:
        print("\n" + "=" * 60)
        print("AUTO-TRIGGERING PROJECT-PLANNING AGENT")
        print("=" * 60)
        planning_agent = script_dir / "project_planning_agent.py"
        if not planning_agent.exists():
            print(f"Warning: Project-planning agent not found at {planning_agent}")
            return 0

        cmd = [sys.executable, str(planning_agent), "--mode", args.plan_mode]
        if args.git_token:
            cmd.extend(["--git-token", args.git_token])
        if args.auto_upload:
            cmd.append("--auto-upload")

        try:
            result = subprocess.run(cmd, check=False, cwd=repo_root)
            return result.returncode
        except Exception as e:
            print(f"Error running project-planning agent: {e}")
            return 1

    return 0


if __name__ == "__main__":
    import sys
    exit(main())

