#!/usr/bin/env python3
"""
Script to check if all requirements have corresponding epics.
"""

import os
import re
from pathlib import Path

requirements_dir = Path('a.Requirements')
epics_dir = Path('b.Epics')

# Get all requirements
reqs = {}
for f in requirements_dir.glob('*.md'):
    if f.name in ['INDEX.md', 'README.md', 'TEMPLATE.md']:
        continue
    # Extract requirement ID from filename
    if f.stem.startswith('FR-'):
        req_id = f.stem.split('-')[0] + '-' + f.stem.split('-')[1]
        reqs[req_id] = {'file': f.name, 'title': '-'.join(f.stem.split('-')[2:])}
    elif f.stem.startswith('NFR-'):
        req_id = f.stem.split('-')[0] + '-' + f.stem.split('-')[1]
        reqs[req_id] = {'file': f.name, 'title': '-'.join(f.stem.split('-')[2:])}
    elif f.stem.startswith('REQ-'):
        req_id = '-'.join(f.stem.split('-')[:4])  # REQ-2025-01-20
        reqs[req_id] = {'file': f.name, 'title': '-'.join(f.stem.split('-')[4:])}

# Get all epics and their requirements
epic_reqs = {}
for f in epics_dir.glob('E*.md'):
    if f.name in ['INDEX.md', 'README.md', 'TEMPLATE.md']:
        continue
    content = f.read_text(encoding='utf-8')
    # Look for Requirement ID line
    match = re.search(r'Requirement ID.*?\[(FR-\d+|NFR-\d+|REQ-[^\]]+)\]', content)
    if match:
        req_id = match.group(1)
        epic_id = f.stem.split('-')[0]
        if req_id not in epic_reqs:
            epic_reqs[req_id] = []
        epic_reqs[req_id].append(epic_id)

# Find requirements without epics
missing = []
for req_id in sorted(reqs.keys()):
    if req_id not in epic_reqs:
        missing.append((req_id, reqs[req_id]))

print('=' * 80)
print('REQUIREMENTS COVERAGE ANALYSIS')
print('=' * 80)
print()

print(f'Total Requirements: {len(reqs)}')
print(f'Requirements with Epics: {len(epic_reqs)}')
print(f'Requirements without Epics: {len(missing)}')
print()

if missing:
    print('REQUIREMENTS MISSING EPICS:')
    print('-' * 80)
    for req_id, info in missing:
        print(f'  - {req_id}: {info["title"]} ({info["file"]})')
    print()
else:
    print('✅ All requirements have corresponding epics!')
    print()

print('REQUIREMENT TO EPIC MAPPING:')
print('-' * 80)
for req_id in sorted(reqs.keys()):
    if req_id in epic_reqs:
        epics = ', '.join(epic_reqs[req_id])
        print(f'  {req_id:25} -> {epics}')
    else:
        print(f'  {req_id:25} -> [MISSING]')

