#!/usr/bin/env python3
"""
Cursor Rules Compliance Checker
Checks if the repository complies with .cursorrules standards

Usage:
    python scripts/check_cursor_rules_compliance.py [--output <report.md>]
"""

import argparse
import json
import os
import re
from pathlib import Path
from collections import defaultdict
from typing import List, Dict, Any, Tuple
from datetime import datetime

ROOT_DIR = Path(__file__).parent.parent

class ComplianceChecker:
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.issues = defaultdict(list)
        self.compliant = defaultdict(list)
        self.stats = {
            'files_checked': 0,
            'issues_found': 0,
            'compliant_items': 0,
        }

    def check_typescript_strict_mode(self) -> None:
        """Check if TypeScript strict mode is enabled."""
        tsconfig_files = [
            self.root_dir / 'tsconfig.json',
            self.root_dir / 'apps/backend/tsconfig.json',
            self.root_dir / 'apps/frontend/tsconfig.json',
        ]

        for tsconfig_path in tsconfig_files:
            if not tsconfig_path.exists():
                continue

            try:
                with open(tsconfig_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)

                compiler_options = config.get('compilerOptions', {})
                strict = compiler_options.get('strict', False)

                if strict:
                    self.compliant['typescript'].append(f"[OK] {tsconfig_path.name}: strict mode enabled")
                else:
                    self.issues['typescript'].append(
                        f"[ERROR] {tsconfig_path.name}: strict mode not enabled (required)"
                    )
                    self.stats['issues_found'] += 1
            except Exception as e:
                self.issues['typescript'].append(f"[WARNING] {tsconfig_path.name}: Error reading config - {e}")

    def check_any_types(self) -> None:
        """Check for 'any' types in non-test files."""
        backend_src = self.root_dir / 'apps/backend/src'
        frontend_src = self.root_dir / 'apps/frontend/src'

        any_pattern = re.compile(r':\s*any\b|:\s*any\[|any\s*[<\(]', re.MULTILINE)

        # Check backend (excluding tests)
        if backend_src.exists():
            for ts_file in backend_src.rglob('*.ts'):
                if '__tests__' in str(ts_file) or '.test.' in ts_file.name:
                    continue  # Skip test files

                try:
                    content = ts_file.read_text(encoding='utf-8')
                    matches = any_pattern.findall(content)

                    if matches:
                        # Check if it's in a comment or string
                        lines = content.split('\n')
                        for i, line in enumerate(lines, 1):
                            if any_pattern.search(line) and not line.strip().startswith('//'):
                                # Check if it's in a string
                                if '"' not in line.split('any')[0] and "'" not in line.split('any')[0]:
                                    self.issues['typescript'].append(
                                        f"[ERROR] {ts_file.relative_to(self.root_dir)}:{i}: 'any' type found (not allowed in public surfaces)"
                                    )
                                    self.stats['issues_found'] += 1
                                    break
                except Exception:
                    pass

        # Check frontend (excluding tests)
        if frontend_src.exists():
            for ts_file in frontend_src.rglob('*.{ts,tsx}'):
                if 'tests' in str(ts_file) or '.test.' in ts_file.name:
                    continue

                try:
                    content = ts_file.read_text(encoding='utf-8')
                    matches = any_pattern.findall(content)

                    if matches:
                        lines = content.split('\n')
                        for i, line in enumerate(lines, 1):
                            if any_pattern.search(line) and not line.strip().startswith('//'):
                                if '"' not in line.split('any')[0] and "'" not in line.split('any')[0]:
                                    self.issues['typescript'].append(
                                        f"[ERROR] {ts_file.relative_to(self.root_dir)}:{i}: 'any' type found"
                                    )
                                    self.stats['issues_found'] += 1
                                    break
                except Exception:
                    pass

    def check_import_extensions(self) -> None:
        """Check if imports use .js extensions (ESM compatibility)."""
        backend_src = self.root_dir / 'apps/backend/src'
        frontend_src = self.root_dir / 'apps/frontend/src'

        # Pattern for relative imports without .js extension
        import_pattern = re.compile(r"from\s+['\"](\.\.?/.*?)(?<!\.js)['\"]", re.MULTILINE)

        for src_dir in [backend_src, frontend_src]:
            if not src_dir.exists():
                continue

            for ts_file in src_dir.rglob('*.{ts,tsx}'):
                if '__tests__' in str(ts_file) or '.test.' in ts_file.name:
                    continue

                try:
                    content = ts_file.read_text(encoding='utf-8')
                    matches = import_pattern.findall(content)

                    for match in matches:
                        # Skip node_modules, external packages, and type-only imports that might not need .js
                        if 'node_modules' in match or match.startswith('@') or match.startswith('http'):
                            continue

                        # Check if it's a type-only import
                        if 'import type' in content[:content.find(match)]:
                            continue

                        self.issues['imports'].append(
                            f"[WARNING] {ts_file.relative_to(self.root_dir)}: Import '{match}' missing .js extension"
                        )
                        self.stats['issues_found'] += 1
                except Exception:
                    pass

    def check_type_imports(self) -> None:
        """Check if type-only imports use 'import type'."""
        backend_src = self.root_dir / 'apps/backend/src'
        frontend_src = self.root_dir / 'apps/frontend/src'

        # Pattern for regular imports that should be type imports
        type_import_pattern = re.compile(
            r"^import\s+\{[^}]*type\s+[^}]+\}[^}]*from",
            re.MULTILINE
        )

        for src_dir in [backend_src, frontend_src]:
            if not src_dir.exists():
                continue

            for ts_file in src_dir.rglob('*.{ts,tsx}'):
                if '__tests__' in str(ts_file):
                    continue

                try:
                    content = ts_file.read_text(encoding='utf-8')
                    lines = content.split('\n')

                    for i, line in enumerate(lines, 1):
                        # Check for imports with 'type' keyword that aren't 'import type'
                        if re.match(r'^\s*import\s+\{[^}]*\btype\s+', line) and 'import type' not in line:
                            self.issues['imports'].append(
                                f"[WARNING] {ts_file.relative_to(self.root_dir)}:{i}: Should use 'import type' for type-only imports"
                            )
                            self.stats['issues_found'] += 1
                except Exception:
                    pass

    def check_module_structure(self) -> None:
        """Check backend module structure compliance."""
        modules_dir = self.root_dir / 'apps/backend/src/modules'

        if not modules_dir.exists():
            return

        expected_files = {
            'routes.ts': 'Route definitions',
            'controller.ts': 'Request/response handlers',
            'service.ts': 'Business logic',
            'repository.ts': 'Data access layer',
            'types.ts': 'TypeScript types',
            'schemas.ts': 'Zod schemas',
        }

        for module_dir in modules_dir.iterdir():
            if not module_dir.is_dir() or module_dir.name.startswith('.'):
                continue

            # Check for expected file patterns
            module_files = {f.name for f in module_dir.iterdir() if f.is_file()}

            # Check if module has routes (most should)
            has_routes = any(f.endswith('.routes.ts') for f in module_files)
            has_controller = any(f.endswith('.controller.ts') for f in module_files)
            has_service = any(f.endswith('.service.ts') for f in module_files)

            if has_routes and not has_controller:
                self.issues['structure'].append(
                    f"[WARNING] {module_dir.name}: Has routes but no controller.ts"
                )
                self.stats['issues_found'] += 1

            if has_controller and not has_service:
                self.issues['structure'].append(
                    f"[WARNING] {module_dir.name}: Has controller but no service.ts"
                )
                self.stats['issues_found'] += 1

            # Check for test directory
            test_dir = module_dir / '__tests__'
            if not test_dir.exists():
                self.issues['testing'].append(
                    f"[WARNING] {module_dir.name}: Missing __tests__ directory"
                )
                self.stats['issues_found'] += 1
            else:
                self.compliant['testing'].append(f"[OK] {module_dir.name}: Has __tests__ directory")

    def check_api_conventions(self) -> None:
        """Check API endpoint conventions."""
        routes_dir = self.root_dir / 'apps/backend/src/modules'

        if not routes_dir.exists():
            return

        api_prefix_pattern = re.compile(r"['\"]/api/v1/")
        error_response_pattern = re.compile(r'\{[\s\n]*error[\s\n]*:')

        for routes_file in routes_dir.rglob('*.routes.ts'):
            try:
                content = routes_file.read_text(encoding='utf-8')

                # Check for /api/v1/ prefix
                if 'router.' in content or 'app.' in content:
                    if not api_prefix_pattern.search(content):
                        # Some routes might be health checks, etc.
                        if 'health' not in routes_file.name.lower():
                            self.issues['api'].append(
                                f"[WARNING] {routes_file.relative_to(self.root_dir)}: May be missing /api/v1/ prefix"
                            )
                            self.stats['issues_found'] += 1

                # Check for HttpError usage
                if 'res.status' in content and 'HttpError' not in content:
                    # Might be using HttpError, check imports
                    if 'from' in content and 'http.js' not in content:
                        self.issues['api'].append(
                            f"[WARNING] {routes_file.relative_to(self.root_dir)}: Should use HttpError utility for errors"
                        )
                        self.stats['issues_found'] += 1
            except Exception:
                pass

    def check_database_naming(self) -> None:
        """Check database naming conventions (snake_case)."""
        migrations_dir = self.root_dir / 'apps/backend/src/db/migrations'

        if not migrations_dir.exists():
            return

        camel_case_pattern = re.compile(r'[a-z][A-Z]')

        for migration_file in migrations_dir.glob('*.ts'):
            try:
                content = migration_file.read_text(encoding='utf-8')

                # Check for camelCase in table/column names
                lines = content.split('\n')
                for i, line in enumerate(lines, 1):
                    # Look for table/column definitions
                    if 'table.' in line or '.column(' in line or 'table.string(' in line:
                        # Extract column/table names
                        if camel_case_pattern.search(line):
                            # Might be a false positive, check context
                            if 'createTable' in line or 'table.' in line:
                                self.issues['database'].append(
                                    f"[WARNING] {migration_file.name}:{i}: Possible camelCase in database name (should be snake_case)"
                                )
                                self.stats['issues_found'] += 1
            except Exception:
                pass

    def check_async_handler_usage(self) -> None:
        """Check if Express route handlers use asyncHandler."""
        routes_dir = self.root_dir / 'apps/backend/src/modules'

        if not routes_dir.exists():
            return

        for routes_file in routes_dir.rglob('*.routes.ts'):
            try:
                content = routes_file.read_text(encoding='utf-8')

                # Check for route definitions with async handlers
                if 'router.' in content and 'async' in content:
                    if 'asyncHandler' not in content:
                        self.issues['express'].append(
                            f"[WARNING] {routes_file.relative_to(self.root_dir)}: Should use asyncHandler wrapper for async route handlers"
                        )
                        self.stats['issues_found'] += 1
                    else:
                        self.compliant['express'].append(
                            f"[OK] {routes_file.name}: Uses asyncHandler"
                        )
            except Exception:
                pass

    def check_zod_validation(self) -> None:
        """Check if endpoints use Zod validation."""
        controllers_dir = self.root_dir / 'apps/backend/src/modules'

        if not controllers_dir.exists():
            return

        for controller_file in controllers_dir.rglob('*.controller.ts'):
            try:
                content = controller_file.read_text(encoding='utf-8')

                # Check for POST/PUT/PATCH handlers
                if any(method in content for method in ['POST', 'PUT', 'PATCH']):
                    if 'req.body' in content:
                        # Check for Zod schema usage
                        if '.parse(' not in content and '.safeParse(' not in content:
                            # Might be in service layer, check if schemas file exists
                            module_dir = controller_file.parent
                            schemas_file = list(module_dir.glob('*.schemas.ts'))

                            if not schemas_file:
                                self.issues['validation'].append(
                                    f"[WARNING] {controller_file.relative_to(self.root_dir)}: Uses req.body but no Zod validation found"
                                )
                                self.stats['issues_found'] += 1
            except Exception:
                pass

    def check_test_structure(self) -> None:
        """Check test file structure and location."""
        # Backend tests should be in __tests__ directories
        backend_modules = self.root_dir / 'apps/backend/src/modules'

        if backend_modules.exists():
            for module_dir in backend_modules.iterdir():
                if not module_dir.is_dir():
                    continue

                test_dir = module_dir / '__tests__'
                if test_dir.exists():
                    test_files = list(test_dir.glob('*.test.ts'))
                    if test_files:
                        self.compliant['testing'].append(
                            f"[OK] {module_dir.name}: Has {len(test_files)} test file(s)"
                        )

        # Frontend tests should be in tests/ directory
        frontend_tests = self.root_dir / 'apps/frontend/tests'
        if frontend_tests.exists():
            test_files = list(frontend_tests.rglob('*.test.{ts,tsx}'))
            if test_files:
                self.compliant['testing'].append(
                    f"[OK] Frontend: Has {len(test_files)} test file(s) in tests/ directory"
                )

    def check_package_manager(self) -> None:
        """Check if package.json specifies PNPM."""
        package_json = self.root_dir / 'package.json'

        if package_json.exists():
            try:
                with open(package_json, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                if 'packageManager' in data:
                    pm = data['packageManager']
                    if 'pnpm' in pm:
                        self.compliant['tooling'].append(f"[OK] packageManager specified: {pm}")
                    else:
                        self.issues['tooling'].append(
                            f"[ERROR] packageManager should specify pnpm, found: {pm}"
                        )
                        self.stats['issues_found'] += 1
                else:
                    self.issues['tooling'].append(
                        "[WARNING] package.json missing 'packageManager' field"
                    )
                    self.stats['issues_found'] += 1
            except Exception as e:
                self.issues['tooling'].append(f"[ERROR] Error reading package.json: {e}")

    def run_all_checks(self) -> None:
        """Run all compliance checks."""
        print("Running compliance checks...")
        print("=" * 60)

        checks = [
            ("TypeScript Strict Mode", self.check_typescript_strict_mode),
            ("TypeScript 'any' Types", self.check_any_types),
            ("Import Extensions", self.check_import_extensions),
            ("Type Imports", self.check_type_imports),
            ("Module Structure", self.check_module_structure),
            ("API Conventions", self.check_api_conventions),
            ("Database Naming", self.check_database_naming),
            ("Async Handler Usage", self.check_async_handler_usage),
            ("Zod Validation", self.check_zod_validation),
            ("Test Structure", self.check_test_structure),
            ("Package Manager", self.check_package_manager),
        ]

        for name, check_func in checks:
            print(f"\n[{name}]")
            try:
                check_func()
                self.stats['files_checked'] += 1
            except Exception as e:
                self.issues['general'].append(f"[ERROR] Error in {name}: {e}")
                self.stats['issues_found'] += 1

    def generate_report(self, output_path: Path) -> None:
        """Generate compliance report."""
        report = f"""# Cursor Rules Compliance Report

**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Repository**: {self.root_dir.name}

## Executive Summary

- **Files Checked**: {self.stats['files_checked']}
- **Issues Found**: {self.stats['issues_found']}
- **Compliant Items**: {self.stats['compliant_items']}

## Compliance Status

"""

        # Calculate compliance percentage
        total_checks = self.stats['files_checked']
        if total_checks > 0:
            compliance_rate = ((total_checks - self.stats['issues_found']) / total_checks) * 100
            report += f"**Overall Compliance**: {compliance_rate:.1f}%\n\n"

        # Issues by category
        if self.issues:
            report += "## Issues Found\n\n"
            for category, items in sorted(self.issues.items()):
                if items:
                    report += f"### {category.upper()}\n\n"
                    for item in items[:20]:  # Limit to first 20 per category
                        report += f"- {item}\n"
                    if len(items) > 20:
                        report += f"- ... and {len(items) - 20} more\n"
                    report += "\n"
        else:
            report += "## [OK] No Issues Found\n\n"

        # Compliant items
        if self.compliant:
            report += "## [OK] Compliant Items\n\n"
            for category, items in sorted(self.compliant.items()):
                if items:
                    report += f"### {category.upper()}\n\n"
                    for item in items[:10]:  # Limit to first 10 per category
                        report += f"- {item}\n"
                    if len(items) > 10:
                        report += f"- ... and {len(items) - 10} more\n"
                    report += "\n"

        report += "\n## Recommendations\n\n"

        if self.issues:
            report += "1. **Address Critical Issues**: Fix all [ERROR] marked issues first\n"
            report += "2. **Review Warnings**: Address [WARNING] warnings to improve compliance\n"
            report += "3. **Run Linting**: Execute `pnpm lint` to catch formatting issues\n"
            report += "4. **Type Checking**: Run `pnpm typecheck` to verify TypeScript compliance\n"
        else:
            report += "[OK] **Excellent!** The repository appears to be fully compliant with .cursorrules.\n"

        report += "\n## Next Steps\n\n"
        report += "1. Review the issues above\n"
        report += "2. Fix critical issues (❌)\n"
        report += "3. Address warnings (⚠️)\n"
        report += "4. Re-run this checker to verify fixes\n"

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report)

        print(f"\n[OK] Report generated: {output_path}")

def main():
    import sys
    # Fix Windows console encoding
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

    parser = argparse.ArgumentParser(
        description="Check repository compliance with .cursorrules"
    )
    parser.add_argument(
        '--output',
        type=str,
        default='docs/6.Implementation/cursor_rules_compliance_report.md',
        help='Output path for compliance report'
    )

    args = parser.parse_args()

    checker = ComplianceChecker(ROOT_DIR)
    checker.run_all_checks()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    checker.generate_report(output_path)

    # Print summary
    print("\n" + "=" * 60)
    print("COMPLIANCE CHECK SUMMARY")
    print("=" * 60)
    print(f"Issues Found: {checker.stats['issues_found']}")
    print(f"Compliant Items: {sum(len(items) for items in checker.compliant.values())}")

    if checker.stats['issues_found'] == 0:
        print("\n[OK] Repository is compliant with .cursorrules!")
        return 0
    else:
        print(f"\n[WARNING] Found {checker.stats['issues_found']} issue(s) - see report for details")
        return 1

if __name__ == '__main__':
    exit(main())

