#!/usr/bin/env python3
"""
Cursor Chat History Analyzer
Analyzes Cursor chat history to improve .cursor/rules/

Usage:
    python .cursor/scripts/analyze_cursor_chats.py [--chat-dir <path>] [--output <output.md>]
    # Or from root directory:
    python -m .cursor.scripts.analyze_cursor_chats [--chat-dir <path>] [--output <output.md>]
"""

import argparse
import json
import os
import re
import sqlite3
from pathlib import Path
from collections import Counter, defaultdict
from typing import List, Dict, Any, Optional
from datetime import datetime

def find_cursor_chat_storage() -> Optional[Path]:
    """Find Cursor chat storage location."""
    appdata = os.getenv('APPDATA')
    home = os.getenv('HOME') or os.path.expanduser('~')

    possible_locations = [
        Path(appdata) / 'Cursor' / 'User' / 'workspaceStorage' if appdata else None,
        Path(appdata) / 'Cursor' / 'logs' if appdata else None,
        Path(appdata) / 'Cursor' / 'User' / 'History' if appdata else None,
        Path(home) / '.cursor' / 'logs',
        Path(home) / '.config' / 'Cursor' / 'User' / 'workspaceStorage',
    ]

    for location in possible_locations:
        if location and location.exists():
            return location

    return None

def extract_chats_from_sqlite(db_path: Path) -> List[Dict[str, Any]]:
    """Extract chat messages from SQLite database."""
    chats = []
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Try common table names
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]

        for table in tables:
            try:
                cursor.execute(f"SELECT * FROM {table} LIMIT 1000")
                rows = cursor.fetchall()
                columns = [desc[0] for desc in cursor.description]
                for row in rows:
                    chat_dict = dict(zip(columns, row))
                    # Only include if it looks like a chat message
                    if any(key in chat_dict for key in ['message', 'content', 'text', 'user', 'assistant', 'role']):
                        chats.append(chat_dict)
            except Exception as e:
                continue

        conn.close()
    except Exception as e:
        print(f"  [WARNING] Error reading SQLite {db_path.name}: {e}")

    return chats

def extract_chats_from_json(json_path: Path) -> List[Dict[str, Any]]:
    """Extract chat messages from JSON file."""
    chats = []
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if isinstance(data, list):
                chats = data
            elif isinstance(data, dict):
                # Try common keys
                for key in ['chats', 'messages', 'conversations', 'history', 'data']:
                    if key in data:
                        items = data[key]
                        if isinstance(items, list):
                            chats.extend(items)
                        break
    except Exception as e:
        print(f"  [WARNING] Error reading JSON {json_path.name}: {e}")

    return chats

def extract_text_from_file(file_path: Path) -> List[str]:
    """Extract text content from any file, looking for chat-like patterns."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        # Look for chat-like patterns
        messages = []

        # Pattern: User: message or Assistant: message
        user_pattern = re.compile(r'(?:User|You|Human):\s*(.+?)(?:\n|$)', re.IGNORECASE | re.MULTILINE)
        assistant_pattern = re.compile(r'(?:Assistant|AI|Bot|Cursor):\s*(.+?)(?:\n|$)', re.IGNORECASE | re.MULTILINE)

        messages.extend(user_pattern.findall(content))
        messages.extend(assistant_pattern.findall(content))

        # Pattern: JSON-like structures
        json_pattern = re.compile(r'\{[^{}]*"(?:message|content|text|user|assistant)"[^{}]*\}', re.IGNORECASE)
        json_matches = json_pattern.findall(content)
        for match in json_matches:
            try:
                data = json.loads(match)
                if 'message' in data or 'content' in data or 'text' in data:
                    messages.append(str(data.get('message') or data.get('content') or data.get('text', '')))
            except:
                pass

        return messages
    except Exception as e:
        return []

def collect_all_chats(chat_dir: Path) -> List[Dict[str, Any]]:
    """Collect all chats from directory."""
    all_chats = []
    all_messages = []

    if not chat_dir.exists():
        return all_chats

    print(f"  [INFO] Searching in: {chat_dir}")

    # Search for SQLite databases
    db_files = list(chat_dir.rglob('*.db'))
    json_files = list(chat_dir.rglob('*.json'))
    text_files = list(chat_dir.rglob('*.txt'))
    log_files = list(chat_dir.rglob('*.log'))

    print(f"  [INFO] Found: {len(db_files)} DB files, {len(json_files)} JSON files, {len(text_files)} text files, {len(log_files)} log files")

    for db_file in db_files[:10]:  # Limit to first 10 to avoid too many
        print(f"  [INFO] Checking: {db_file.name}")
        chats = extract_chats_from_sqlite(db_file)
        all_chats.extend(chats)
        if chats:
            print(f"    [OK] Found {len(chats)} entries")

    for json_file in json_files[:20]:  # Limit to first 20
        if 'chat' in json_file.name.lower() or 'conversation' in json_file.name.lower() or 'message' in json_file.name.lower():
            print(f"  [INFO] Checking: {json_file.name}")
            chats = extract_chats_from_json(json_file)
            all_chats.extend(chats)
            if chats:
                print(f"    [OK] Found {len(chats)} entries")

    # Also extract text from files
    for text_file in (text_files + log_files)[:10]:
        if any(keyword in text_file.name.lower() for keyword in ['chat', 'conversation', 'message', 'history']):
            messages = extract_text_from_file(text_file)
            all_messages.extend(messages)

    # Convert messages to chat format
    for msg in all_messages:
        all_chats.append({'message': msg, 'content': msg, 'text': msg})

    return all_chats

def analyze_patterns(chats: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze chat patterns to identify improvements."""
    analysis = {
        'total_chats': len(chats),
        'common_questions': Counter(),
        'repeated_issues': Counter(),
        'missing_context': Counter(),
        'code_patterns': Counter(),
        'error_patterns': Counter(),
        'technology_mentions': Counter(),
        'file_mentions': Counter(),
        'suggestions': []
    }

    # Extract user messages
    user_messages = []
    for chat in chats:
        # Try different message formats
        msg = None
        for key in ['message', 'content', 'text', 'user', 'userMessage', 'prompt']:
            if key in chat and chat[key]:
                msg = str(chat[key])
                break

        if msg and len(msg) > 10:  # Only meaningful messages
            user_messages.append(msg)

    print(f"  [INFO] Analyzing {len(user_messages)} user messages...")

    # Analyze common questions
    question_patterns = [
        (r'how (do|can|should|to) (i|we|you)', 'how questions'),
        (r'what (is|are|does|should)', 'what questions'),
        (r'why (does|is|are|should)', 'why questions'),
        (r'where (is|are|should|can)', 'where questions'),
        (r'can (you|i|we)', 'can questions'),
        (r'help (me|with|to)', 'help requests'),
        (r'explain', 'explain requests'),
        (r'show (me|how)', 'show requests'),
    ]

    for msg in user_messages:
        msg_lower = msg.lower()
        for pattern, category in question_patterns:
            if re.search(pattern, msg_lower):
                # Extract the question topic
                match = re.search(r'(?:how|what|why|where|can|help|explain|show).{0,150}', msg_lower)
                if match:
                    question = match.group(0).strip()[:100]
                    analysis['common_questions'][question] += 1

    # Analyze error mentions
    error_keywords = ['error', 'bug', 'fix', 'broken', 'not working', 'fails', 'exception', 'issue', 'problem']
    for msg in user_messages:
        msg_lower = msg.lower()
        for keyword in error_keywords:
            if keyword in msg_lower:
                # Extract context around error
                context = re.search(r'.{0,80}' + keyword + r'.{0,80}', msg_lower)
                if context:
                    error_context = context.group(0).strip()[:120]
                    analysis['error_patterns'][error_context] += 1

    # Analyze code-related requests
    code_keywords = {
        'create': ['create', 'make', 'build', 'generate'],
        'implement': ['implement', 'add', 'write'],
        'update': ['update', 'modify', 'change', 'edit'],
        'refactor': ['refactor', 'improve', 'optimize', 'clean'],
        'test': ['test', 'testing', 'tests'],
        'component': ['component', 'component'],
        'api': ['api', 'endpoint', 'route'],
        'migration': ['migration', 'migrate', 'schema'],
    }

    for category, keywords in code_keywords.items():
        for msg in user_messages:
            msg_lower = msg.lower()
            for keyword in keywords:
                if keyword in msg_lower:
                    # Extract the target
                    match = re.search(rf'{keyword}\s+([a-z\s]+?)(?:\s|$|\.|,|;|:)', msg_lower)
                    if match:
                        target = match.group(1).strip()[:50]
                        analysis['code_patterns'][f"{category}: {target}"] += 1
                    else:
                        analysis['code_patterns'][category] += 1

    # Analyze technology mentions
    tech_keywords = ['typescript', 'react', 'express', 'postgres', 'knex', 'zod', 'jest', 'vitest', 'playwright', 'docker', 'kubernetes']
    for msg in user_messages:
        msg_lower = msg.lower()
        for tech in tech_keywords:
            if tech in msg_lower:
                analysis['technology_mentions'][tech] += 1

    # Analyze file mentions
    file_patterns = [
        r'\.(ts|tsx|js|jsx|json|md|sql|py)(?:\s|$|,|\.)',
        r'/(?:src|apps|packages|docs|tests)/[^\s]+',
    ]
    for msg in user_messages:
        for pattern in file_patterns:
            matches = re.findall(pattern, msg)
            for match in matches:
                if isinstance(match, tuple):
                    match = match[0]
                analysis['file_mentions'][match.strip()[:50]] += 1

    # Identify missing context
    missing_context_keywords = ['what is', 'explain', 'documentation', 'where is', 'how does', 'i don\'t understand', 'confused']
    for msg in user_messages:
        msg_lower = msg.lower()
        for keyword in missing_context_keywords:
            if keyword in msg_lower:
                analysis['missing_context'][keyword] += 1

    return analysis

def generate_improvements(analysis: Dict[str, Any], current_rules: str) -> List[str]:
    """Generate suggestions to improve .cursorrules."""
    improvements = []

    # Check for common questions that aren't covered
    top_questions = analysis['common_questions'].most_common(15)
    if top_questions:
        improvements.append("## Frequently Asked Questions\n")
        improvements.append("These questions appear multiple times. Consider adding clarifications to .cursorrules:\n")
        for question, count in top_questions:
            if count > 2:
                improvements.append(f"- **'{question}'** (asked {count} times)")
                # Check if covered in current rules
                if question.lower() not in current_rules.lower():
                    improvements.append(f"  [WARNING] Not currently covered in .cursorrules")
                improvements.append("")

    # Check for error patterns
    top_errors = analysis['error_patterns'].most_common(10)
    if top_errors:
        improvements.append("\n## Common Error Patterns\n")
        improvements.append("These errors are mentioned frequently. Consider adding troubleshooting guidance:\n")
        for error, count in top_errors:
            if count > 1:
                improvements.append(f"- **'{error}'** (mentioned {count} times)")
                improvements.append("")

    # Check for code patterns
    top_patterns = analysis['code_patterns'].most_common(15)
    if top_patterns:
        improvements.append("\n## Common Code Requests\n")
        improvements.append("These patterns are requested frequently. Ensure .cursorrules has clear guidance:\n")
        for pattern, count in top_patterns:
            if count > 1:
                improvements.append(f"- **'{pattern}'** (requested {count} times)")
                # Check if pattern is covered
                pattern_lower = pattern.lower()
                if not any(keyword in current_rules.lower() for keyword in pattern_lower.split(':')):
                    improvements.append(f"  [WARNING] May need better coverage in .cursorrules")
                improvements.append("")

    # Technology mentions
    top_tech = analysis['technology_mentions'].most_common(10)
    if top_tech:
        improvements.append("\n## Technology Mentions\n")
        improvements.append("These technologies are frequently discussed. Verify they're well-documented:\n")
        for tech, count in top_tech:
            improvements.append(f"- **{tech}** ({count} mentions)")
            if tech.lower() not in current_rules.lower():
                improvements.append(f"  [WARNING] Not mentioned in .cursorrules")
            improvements.append("")

    # Missing context
    if analysis['missing_context']:
        improvements.append("\n## Missing Context Indicators\n")
        improvements.append("Users seem to need more context in these areas:\n")
        for context, count in analysis['missing_context'].most_common(5):
            improvements.append(f"- **{context}** ({count} mentions)")
        improvements.append("\n[TIP] Consider adding more examples and detailed explanations to .cursorrules")

    return improvements

def generate_report(analysis: Dict[str, Any], improvements: List[str], output_path: Path, current_rules_path: Path):
    """Generate analysis report."""
    report = f"""# Cursor Chat History Analysis Report

**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Executive Summary

This report analyzes Cursor chat history to identify patterns and suggest improvements to `.cursorrules`.

- **Total chats analyzed**: {analysis['total_chats']}
- **User messages extracted**: {sum(len(str(v)) for v in analysis.values() if isinstance(v, Counter))}
- **Common questions identified**: {len(analysis['common_questions'])}
- **Error patterns found**: {len(analysis['error_patterns'])}
- **Code patterns identified**: {len(analysis['code_patterns'])}

---

## Top 15 Most Common Questions

"""

    if analysis['common_questions']:
        for i, (question, count) in enumerate(analysis['common_questions'].most_common(15), 1):
            report += f"{i}. `{question}` ({count} times)\n"
    else:
        report += "*No questions detected*\n"

    report += "\n## Top 10 Error Patterns\n\n"
    if analysis['error_patterns']:
        for i, (error, count) in enumerate(analysis['error_patterns'].most_common(10), 1):
            report += f"{i}. `{error}` ({count} times)\n"
    else:
        report += "*No error patterns detected*\n"

    report += "\n## Top 15 Code Patterns\n\n"
    if analysis['code_patterns']:
        for i, (pattern, count) in enumerate(analysis['code_patterns'].most_common(15), 1):
            report += f"{i}. `{pattern}` ({count} times)\n"
    else:
        report += "*No code patterns detected*\n"

    report += "\n## Technology Mentions\n\n"
    if analysis['technology_mentions']:
        for tech, count in analysis['technology_mentions'].most_common(10):
            report += f"- **{tech}**: {count} mentions\n"
    else:
        report += "*No technology mentions detected*\n"

    report += "\n---\n\n"
    report += "## Suggested Improvements to .cursorrules\n\n"
    report += "\n".join(improvements)

    report += "\n---\n\n"
    report += "## Next Steps\n\n"
    report += "1. **Review common questions**: Add clarifications to `.cursorrules` for frequently asked questions\n"
    report += "2. **Add examples**: Include code examples for frequently requested patterns\n"
    report += "3. **Create troubleshooting section**: Document solutions for common errors\n"
    report += "4. **Enhance technology docs**: Ensure all frequently mentioned technologies are well-documented\n"
    report += "5. **Add missing context**: Expand explanations for areas where users need more information\n"
    report += "\n"
    report += "## How to Apply Improvements\n\n"
    report += "1. Review this report and identify high-priority improvements\n"
    report += "2. Update `.cursorrules` with new sections or clarifications\n"
    report += "3. Test the updated rules by asking similar questions in Cursor\n"
    report += "4. Iterate based on feedback\n"

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"\n[OK] Report saved to: {output_path}")

def main():
    import sys
    # Fix Windows console encoding
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

    parser = argparse.ArgumentParser(
        description="Analyze Cursor chat history to improve .cursorrules"
    )
    parser.add_argument(
        '--chat-dir',
        type=str,
        help='Path to Cursor chat storage directory (auto-detected if not provided)'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='docs/6.Implementation/cursor_chat_analysis.md',
        help='Output path for analysis report'
    )
    parser.add_argument(
        '--rules-file',
        type=str,
        default='.cursorrules',
        help='Path to current .cursorrules file'
    )

    args = parser.parse_args()

    print("Cursor Chat History Analyzer")
    print("=" * 60)

    # Find chat directory
    if args.chat_dir:
        chat_dir = Path(args.chat_dir)
    else:
        print("\n[INFO] Auto-detecting Cursor chat storage...")
        chat_dir = find_cursor_chat_storage()
        if not chat_dir:
            print("[ERROR] Could not find Cursor chat storage directory automatically.")
            print("\nPlease provide --chat-dir path manually.")
            print("\nCommon locations:")
            print("  Windows: %APPDATA%\\Cursor\\User\\workspaceStorage")
            print("  Or: %APPDATA%\\Cursor\\logs")
            print("  Or: %APPDATA%\\Cursor\\User\\History")
            return 1
        else:
            print(f"[OK] Found: {chat_dir}")

    if not chat_dir.exists():
        print(f"[ERROR] Directory does not exist: {chat_dir}")
        return 1

    # Collect chats
    print(f"\n[INFO] Collecting chats from: {chat_dir}")
    chats = collect_all_chats(chat_dir)

    if not chats:
        print("\n[WARNING] No chats found. This could mean:")
        print("  1. Cursor hasn't been used much yet (no chat history)")
        print("  2. Chat storage is in a different location")
        print("  3. Chat format is different than expected")
        print("\n[TIP] You can also manually export chats and save them as text files, then run:")
        print("   python scripts/analyze_cursor_chats.py --chat-dir <path-to-text-files>")
        return 1

    print(f"\n[OK] Collected {len(chats)} chat entries")

    # Analyze
    print("\n[INFO] Analyzing patterns...")
    analysis = analyze_patterns(chats)

    # Read current rules
    current_rules = ""
    rules_path = Path(args.rules_file)
    if rules_path.exists():
        print(f"\n[INFO] Reading current .cursorrules from: {rules_path}")
        with open(rules_path, 'r', encoding='utf-8') as f:
            current_rules = f.read()
        print(f"   [OK] Read {len(current_rules)} characters")
    else:
        print(f"\n[WARNING] .cursorrules not found at: {rules_path}")

    # Generate improvements
    print("\n[INFO] Generating improvement suggestions...")
    improvements = generate_improvements(analysis, current_rules)

    # Generate report
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    generate_report(analysis, improvements, output_path, rules_path)

    print(f"\n[OK] Analysis complete!")
    print(f"[OK] Report: {output_path}")
    print(f"\n[TIP] Review the report and update .cursorrules accordingly")
    print(f"   The report contains specific suggestions based on your chat history")

    return 0

if __name__ == '__main__':
    exit(main())

