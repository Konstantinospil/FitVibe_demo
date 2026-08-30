#!/usr/bin/env python3
"""One-shot documentation sync: link rewrites + INDEX regeneration."""
from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
PRD = DOCS / "1.Product_Requirements"
TDD = DOCS / "2.Technical_Design_Document"
ADR_DIR = TDD / "2.f.Architectural_Decision_Documentation"
DIAG = TDD / "2.g.Diagrams"


def header_fields(text: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in text.splitlines()[:50]:
        m = re.match(r"\*\*([^*]+)\*\*:\s*(.+)", line.strip())
        if not m:
            continue
        val = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", m.group(2)).strip()
        fields[m.group(1).strip()] = val
    return fields


def strip_md_link(s: str) -> str:
    return re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s).strip()


REPLACEMENTS: list[tuple[str, str]] = [
    ("-&-", "-and-"),
    ("E13-wcag-2.2-compliance-update.md", "E13-wcag-2-2-compliance-update.md"),
    ("Requirements/done/", "a.Requirements/"),
    ("Requirements/open/", "a.Requirements/"),
    ("Requirements/progressing/", "a.Requirements/"),
    ("2.g.Diagramms", "2.g.Diagrams"),
    ("./diagrams/", "./2.g.Diagrams/"),
    ("docs/adr/", "docs/2.Technical_Design_Document/2.f.Architectural_Decision_Documentation/"),
    ("ADR-023-database-encryption.md", "ADR-026-database-encryption.md"),
    ("ADP-021-test-runner-backend-jest30-swc.md", "ADR-021-test-runner-backend-jest30-swc.md"),
    ("ADR-021-test-runner-backend-jest30-sw.md", "ADR-021-test-runner-backend-jest30-swc.md"),
    ("ADR-0021-auth-wall.md", "ADR-027-auth-wall.md"),
    ("localhost:4100", "localhost:4000"),
    ("Terms-and-Conditions.md", "terms-and-conditions.md"),
    ("packages/shared", "packages/types"),
    ("NFR-004-accessibility.md", "NFR-004-a11y.md"),
    ("apps/docs/1. Product Requirements Document.md", "docs/1.Product_Requirements/1.Product_Requirements_Document.md"),
    ("apps/docs/2. Technical Design Document.md", "docs/2.Technical_Design_Document/"),
    ("docs/1.Product_Requirements_Document.md", "docs/1.Product_Requirements/1.Product_Requirements_Document.md"),
    ("docs/3.Testing_and_Quality_Assurance_Plan.md", "docs/4.Testing_and_Quality_Assurance_Plan/4a.Testing_and_Quality_Assurance_Plan.md"),
    ("4. Testing_and_Quality_Assurance_Plan.md", "docs/4.Testing_and_Quality_Assurance_Plan/4a.Testing_and_Quality_Assurance_Plan.md"),
    ("4.%20Testing_and_Quality_Assurance_Plan.md", "docs/4.Testing_and_Quality_Assurance_Plan/4a.Testing_and_Quality_Assurance_Plan.md"),
    ("docs/qa/AC_Master.md", "docs/1.Product_Requirements/e.Acceptance_Criteria/INDEX.md"),
    ("docs/rtm_comprehensive.csv", "docs/1.Product_Requirements/rtm_comprehensive.csv"),
    ("UUIDv7/ULID", "UUID (RFC 4122 v4 via crypto.randomUUID)"),
    ("ULIDs or UUIDv7", "UUID v4"),
    ("http://localhost:4000/api/v1/health", "http://localhost:4000/health"),
    ("(.\\1.Product_Requirements_Document.md)", "(../1.Product_Requirements/1.Product_Requirements_Document.md)"),
    ("jwt_private_new.pem", "jwt_rs256_new.key"),
    ("jwt_public_new.pem", "jwt_rs256_new.pub"),
    ("jwt_private.pem", "jwt_rs256.key"),
    ("jwt_public.pem", "jwt_rs256.pub"),
]


def rewrite_content(text: str, rel: str) -> str:
    out = text
    out = out.replace(".\\4.personas\\", "../3.Sensory_Design_System/3.a.Personas/")
    out = out.replace("./4.personas/", "../3.Sensory_Design_System/3.a.Personas/")
    out = out.replace("4.personas/", "../3.Sensory_Design_System/3.a.Personas/")
    for a, b in REPLACEMENTS:
        out = out.replace(a, b)
    out = out.replace("a.Requirements/a.Requirements/", "a.Requirements/")
    out = re.sub(
        r"\((\.\./)*6\.Implementation/(?:plans|reports)/[^)]+\)",
        "(../../6.Implementation/README.md)",
        out,
    )
    if "E13" not in rel and "upgrade from" not in out.lower():
        out = re.sub(r"WCAG 2\.1 AA", "WCAG 2.2 AA", out)
    return out


def apply_rewrites() -> int:
    n = 0
    for path in DOCS.rglob("*.md"):
        if path.name in {"_sync_docs.py", "project-structure.md"}:
            continue
        if path.stat().st_size > 500_000:
            continue
        orig = path.read_text(encoding="utf-8", errors="replace")
        new = rewrite_content(orig, str(path.relative_to(ROOT)))
        if new != orig:
            path.write_text(new, encoding="utf-8")
            n += 1
    return n


def write_requirements_index() -> None:
    req_dir = PRD / "a.Requirements"
    rows_fr = []
    rows_nfr = []
    rows_other = []
    for p in sorted(req_dir.glob("*.md")):
        if p.name in {"INDEX.md", "README.md", "TEMPLATE.md"}:
            continue
        fields = header_fields(p.read_text(encoding="utf-8", errors="replace"))
        rid = fields.get("Requirement ID", p.stem.split("-")[0])
        title = fields.get("Title", p.stem)
        status = fields.get("Status", "Open")
        if status == "In Progress":
            status = "Progressing"
        pri = fields.get("Priority", "")
        gate = fields.get("Gate", "")
        row = f"| {rid} | {title} | {status} | {pri} | {gate} | [{p.name}](./{p.name}) |"
        if rid.startswith("NFR"):
            rows_nfr.append((rid, row, status))
        elif rid.startswith("FR"):
            rows_fr.append((rid, row, status))
        else:
            rows_other.append((rid, row, status))

    def sort_key(item):
        rid = item[0]
        m = re.search(r"(\d+)", rid)
        return (rid[:3], int(m.group(1)) if m else 0)

    rows_fr.sort(key=sort_key)
    rows_nfr.sort(key=sort_key)
    body = [
        "# Requirements Index",
        "",
        "**Last Updated**: 2026-08-30",
        "",
        "Statuses follow the schema: Open, Progressing, Done.",
        "",
        "## Functional Requirements (FR)",
        "",
        "| ID | Title | Status | Priority | Gate | File |",
        "| --- | --- | --- | --- | --- | --- |",
        *[r[1] for r in rows_fr],
        "",
        "## Non-Functional Requirements (NFR)",
        "",
        "| ID | Title | Status | Priority | Gate | File |",
        "| --- | --- | --- | --- | --- | --- |",
        *[r[1] for r in rows_nfr],
        "",
        "## Other Requirements",
        "",
        "| ID | Title | Status | Priority | Gate | File |",
        "| --- | --- | --- | --- | --- | --- |",
        *[r[1] for r in rows_other],
        "",
        "---",
        "",
        f"- **FR:** {len(rows_fr)} · **NFR:** {len(rows_nfr)} · **Other:** {len(rows_other)}",
        "",
    ]
    (req_dir / "INDEX.md").write_text("\n".join(body), encoding="utf-8")


EPIC_TITLES = {
    1: "Profile & Settings",
    2: "Exercise Library",
    3: "Sharing & Community",
    4: "Planner Completion",
    5: "Logging & Import",
    6: "Privacy & GDPR",
    7: "Performance Optimization",
    8: "Accessibility",
    9: "Observability",
    10: "Availability & Backups",
    11: "Authentication & Registration",
    12: "Coach Training Unit Assignment",
    13: "WCAG 2.2 Compliance Update",
    14: "Gamification",
    15: "Analytics & Export",
    16: "Admin & RBAC",
    17: "Security",
    18: "Internationalization",
    19: "Terms and Conditions",
    20: "Database Encryption",
}


def write_epics_index() -> None:
    epic_dir = PRD / "b.Epics"
    rows = []
    by_status: dict[str, list[str]] = defaultdict(list)
    by_pri: dict[str, list[str]] = defaultdict(list)
    by_gate: dict[str, list[str]] = defaultdict(list)
    for p in sorted(epic_dir.glob("E*.md")):
        if "IMPLEMENTATION" in p.name or "VERIFICATION" in p.name:
            continue
        m = re.match(r"E(\d+)-", p.name)
        if not m:
            continue
        n = int(m.group(1))
        fields = header_fields(p.read_text(encoding="utf-8", errors="replace"))
        status = fields.get("Status", "Open")
        pri = fields.get("Priority", "")
        gate = fields.get("Gate", "")
        effort = fields.get("Estimated Total Effort", "")
        req = fields.get("Requirement ID", "")
        title = fields.get("Title", EPIC_TITLES.get(n, p.stem))
        rows.append((n, f"| [E{n}](./{p.name}) | {title} | {req} | {status} | {pri} | {gate} | {effort} |"))
        by_status[status].append(f"- E{n}: {title}")
        if pri:
            by_pri[pri].append(f"- E{n}: {title}")
        if gate:
            by_gate[gate.split()[0]].append(f"- E{n}: {title}")
    rows.sort(key=lambda x: x[0])
    lines = [
        "# Epics Index",
        "",
        "**Last Updated**: 2026-08-30",
        "",
        "| Epic ID | Title | Requirement | Status | Priority | Gate | Effort |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        *[r[1] for r in rows],
        "",
        "## By Status",
        "",
    ]
    for st in ("Open", "Progressing", "Done"):
        if by_status[st]:
            lines += [f"### {st}", "", *by_status[st], ""]
    lines += ["## By Priority", ""]
    for st in ("High", "Medium", "Low"):
        if by_pri[st]:
            lines += [f"### {st}", "", *by_pri[st], ""]
    lines += ["## By Gate", ""]
    for st in ("GOLD", "SILVER", "BRONZE"):
        if by_gate[st]:
            lines += [f"### {st}", "", *by_gate[st], ""]
    lines += ["", f"**Total Epics**: {len(rows)}", ""]
    (epic_dir / "INDEX.md").write_text("\n".join(lines), encoding="utf-8")


def write_stories_index() -> None:
    d = PRD / "d.User_stories"
    by_epic: dict[int, list[str]] = defaultdict(list)
    total = 0
    for p in sorted(d.glob("US-*.md")):
        fields = header_fields(p.read_text(encoding="utf-8", errors="replace"))
        sid = fields.get("Story ID", p.stem.split("-")[0] + "-" + p.stem.split("-")[1] if "-" in p.stem else p.stem)
        m = re.match(r"US-(\d+)\.", sid) or re.match(r"US-(\d+)\.", p.name)
        if not m:
            continue
        epic = int(m.group(1))
        title = fields.get("Title", p.stem)
        status = fields.get("Status", "Proposed")
        if status == "Proposed":
            # keep file status; indexes show file header
            pass
        sp = fields.get("Story Points", "")
        epic_file = next(iter((PRD / "b.Epics").glob(f"E{epic}-*.md")), None)
        epic_link = f"[E{epic}](../b.Epics/{epic_file.name})" if epic_file else f"E{epic}"
        by_epic[epic].append(
            f"| {sid} | {title} | {epic_link} | {status} | {sp} | [{p.name}](./{p.name}) |"
        )
        total += 1
    lines = [
        "# User Stories Index",
        "",
        "**Last Updated**: 2026-08-30",
        "",
        "Statuses are copied from each story file (schema: Open / Progressing / Done; older files may still say Proposed).",
        "",
    ]
    for epic in sorted(by_epic):
        lines += [
            f"### Epic {epic}: {EPIC_TITLES.get(epic, '')}",
            "",
            "| ID | Title | Epic | Status | Story Points | File |",
            "| --- | --- | --- | --- | --- | --- |",
            *by_epic[epic],
            "",
        ]
    lines += ["---", "", f"**Total stories**: {total}", ""]
    (d / "INDEX.md").write_text("\n".join(lines), encoding="utf-8")


def write_activities_index() -> None:
    d = PRD / "c.Activities"
    by_epic: dict[int, list[str]] = defaultdict(list)
    total = 0
    for p in sorted(d.glob("E*-A*.md")):
        m = re.match(r"E(\d+)-A(\d+)", p.name)
        if not m:
            continue
        epic = int(m.group(1))
        fields = header_fields(p.read_text(encoding="utf-8", errors="replace"))
        aid = fields.get("Activity ID", p.stem.split("-")[0] + "-" + p.stem.split("-")[1])
        title = fields.get("Title", p.stem)
        status = fields.get("Status", "Open")
        diff = fields.get("Difficulty", "")
        effort = fields.get("Estimated Effort", "")
        epic_file = next((x for x in (PRD / "b.Epics").glob(f"E{epic}-*.md") if "IMPLEMENTATION" not in x.name and "VERIFICATION" not in x.name), None)
        epic_link = f"[E{epic}](../b.Epics/{epic_file.name})" if epic_file else f"E{epic}"
        by_epic[epic].append(
            f"| {aid} | {title} | {epic_link} | {status} | {diff} | {effort} | [{p.name}](./{p.name}) |"
        )
        total += 1
    lines = [
        "# Activities Index",
        "",
        "**Last Updated**: 2026-08-30",
        "",
    ]
    for epic in sorted(by_epic):
        lines += [
            f"### E{epic}: {EPIC_TITLES.get(epic, '')}",
            "",
            "| ID | Title | Epic | Status | Difficulty | Estimated Effort | File |",
            "| --- | --- | --- | --- | --- | --- | --- |",
            *by_epic[epic],
            "",
        ]
    lines += ["---", "", f"**Total Activities**: {total}", ""]
    (d / "INDEX.md").write_text("\n".join(lines), encoding="utf-8")


def story_filename(us_id: str) -> str | None:
    matches = list((PRD / "d.User_stories").glob(f"{us_id}-*.md"))
    return matches[0].name if matches else None


def write_ac_index() -> None:
    d = PRD / "e.Acceptance_Criteria"
    by_us: dict[str, list[str]] = defaultdict(list)
    total = 0
    for p in sorted(d.glob("US-*-AC*.md")):
        fields = header_fields(p.read_text(encoding="utf-8", errors="replace"))
        acid = fields.get("AC ID", p.stem)
        m = re.match(r"(US-\d+\.\d+)-AC", acid) or re.match(r"(US-\d+\.\d+)-AC", p.name)
        if not m:
            continue
        us = m.group(1)
        status = fields.get("Status", "Proposed")
        method = fields.get("Test Method", "")
        sf = story_filename(us)
        story_link = f"[{us}](../d.User_stories/{sf})" if sf else us
        by_us[us].append(f"| {acid} | {story_link} | {status} | {method} | [{p.name}](./{p.name}) |")
        total += 1
    lines = [
        "# Acceptance Criteria Index",
        "",
        "**Last Updated**: 2026-08-30",
        "",
        "Only files that exist on disk are listed.",
        "",
    ]
    current_epic = None
    for us in sorted(by_us, key=lambda x: tuple(map(float, x.replace("US-", "").split(".")))):
        epic = int(us.split("-")[1].split(".")[0])
        if epic != current_epic:
            current_epic = epic
            lines += [f"### Epic {epic}: {EPIC_TITLES.get(epic, '')}", ""]
        sf = story_filename(us)
        title = us
        if sf:
            tfields = header_fields((PRD / "d.User_stories" / sf).read_text(encoding="utf-8", errors="replace"))
            title = f"{us}: {tfields.get('Title', us)}"
        lines += [
            f"#### {title}",
            "",
            "| AC ID | Story | Status | Test Method | File |",
            "| --- | --- | --- | --- | --- |",
            *by_us[us],
            "",
        ]
    lines += ["---", "", f"**Total ACs**: {total}", ""]
    (d / "INDEX.md").write_text("\n".join(lines), encoding="utf-8")


def write_adr_index() -> None:
    rows = []
    for p in sorted(ADR_DIR.glob("ADR-*.md")):
        if p.name in {"ADR_INDEX.md", "ADR_TEMPLATE.md", "README.md"}:
            continue
        text = p.read_text(encoding="utf-8", errors="replace")
        m = re.search(r"(?im)^id:\s*[\"']?([A-Z0-9-]+)", text)
        aid = m.group(1) if m else p.stem.split("-")[0] + "-" + p.stem.split("-")[1]
        title_m = re.search(r"(?im)^title:\s*[\"']?(.+?)[\"']?\s*$", text)
        if not title_m:
            title_m = re.search(r"^#\s+(.+)$", text, re.M)
        title = title_m.group(1).strip().strip('"') if title_m else p.stem
        st_m = re.search(r"(?im)^status:\s*[\"']?([^\"'\n]+)", text)
        status = (st_m.group(1).strip() if st_m else "Accepted")
        date_m = re.search(r"(?im)^(?:date|\*\*Date\*\*):\s*[\"']?([0-9-]+)", text)
        date = date_m.group(1).strip() if date_m else ""
        rows.append((aid, title, status, date, p.name))
    def key(r):
        m = re.search(r"(\d+)", r[0])
        return int(m.group(1)) if m else 0
    rows.sort(key=key)
    lines = [
        "# Architecture Decision Record (ADR) Index",
        "",
        "**Sources of truth:** PRD, TDD, and QA plan. Status is copied from each ADR file.",
        "",
        "| ID | Title | Status | Decision Date | File |",
        "| --- | --- | --- | --- | --- |",
    ]
    for aid, title, status, date, name in rows:
        lines.append(f"| {aid} | {title} | {status} | {date} | [{name}](./{name}) |")
    lines += [
        "",
        "## Numbering notes",
        "",
        "- ADR-021 is the Jest 30 proposal (**Deferred**; backend remains Jest 29 + ts-jest).",
        "- ADR-023 is Server-Side Rendering.",
        "- ADR-026 is Database Encryption (formerly a duplicate ADR-023).",
        "- ADR-027 is the Auth Wall (formerly ADR-0021).",
        "",
    ]
    (ADR_DIR / "ADR_INDEX.md").write_text("\n".join(lines), encoding="utf-8")


def write_diagrams_index() -> None:
    files = sorted(DIAG.glob("*.mmd"))
    lines = [
        "# FitVibe – Mermaid Diagrams Index",
        "",
        "Diagrams live in this folder (`2.g.Diagrams/`). Links are relative.",
        "",
        "| File | Origin |",
        "| --- | --- |",
    ]
    for f in files:
        origin = "PRD" if f.name.startswith("prd") else "TDD" if f.name.startswith("tdd") else "Other"
        lines.append(f"| [{f.name}](./{f.name}) | {origin} |")
    lines.append("")
    (DIAG / "diagrams_index.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    n = apply_rewrites()
    write_requirements_index()
    write_epics_index()
    write_stories_index()
    write_activities_index()
    write_ac_index()
    write_adr_index()
    write_diagrams_index()
    print(f"rewrote {n} files; indexes regenerated")


if __name__ == "__main__":
    main()
