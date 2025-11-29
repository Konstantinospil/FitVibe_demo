# Cursor Rules Compliance Report

**Generated**: 2025-11-29 17:58:44
**Repository**: Cursor_fitvibe

## Executive Summary

- **Files Checked**: 11
- **Issues Found**: 253
- **Compliant Items**: 0

## Compliance Status

**Overall Compliance**: -2200.0%

## Issues Found

### API

- [WARNING] apps\backend\src\modules\auth\two-factor.routes.ts: May be missing /api/v1/ prefix
- [WARNING] apps\backend\src\modules\system\system.routes.ts: May be missing /api/v1/ prefix
- [WARNING] apps\backend\src\modules\system\system.routes.ts: Should use HttpError utility for errors

### DATABASE

- [WARNING] 202510140002_create_roles_table.ts:6: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140002_create_roles_table.ts:7: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140003_create_genders_table.ts:6: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140003_create_genders_table.ts:7: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140004_create_fitness_levels_table.ts:6: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140004_create_fitness_levels_table.ts:7: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140005_create_exercise_types_table.ts:6: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140005_create_exercise_types_table.ts:7: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140006_create_users_table.ts:5: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140006_create_users_table.ts:6: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140006_create_users_table.ts:7: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140006_create_users_table.ts:8: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140006_create_users_table.ts:9: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140006_create_users_table.ts:10: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140006_create_users_table.ts:18: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140006_create_users_table.ts:19: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140006_create_users_table.ts:20: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140006_create_users_table.ts:21: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140007_create_profiles_table.ts:27: Possible camelCase in database name (should be snake_case)
- [WARNING] 202510140007_create_profiles_table.ts:28: Possible camelCase in database name (should be snake_case)
- ... and 228 more

### STRUCTURE

- [WARNING] system: Has routes but no controller.ts

### VALIDATION

- [WARNING] apps\backend\src\modules\admin\admin.controller.ts: Uses req.body but no Zod validation found

## [OK] Compliant Items

### EXPRESS

- [OK] two-factor.routes.ts: Uses asyncHandler
- [OK] system.routes.ts: Uses asyncHandler

### TESTING

- [OK] admin: Has **tests** directory
- [OK] auth: Has **tests** directory
- [OK] common: Has **tests** directory
- [OK] exercise-types: Has **tests** directory
- [OK] exercises: Has **tests** directory
- [OK] feed: Has **tests** directory
- [OK] health: Has **tests** directory
- [OK] logs: Has **tests** directory
- [OK] plans: Has **tests** directory
- [OK] points: Has **tests** directory
- ... and 18 more

### TOOLING

- [OK] packageManager specified: pnpm@9.14.4

### TYPESCRIPT

- [OK] tsconfig.json: strict mode enabled
- [OK] tsconfig.json: strict mode enabled
- [OK] tsconfig.json: strict mode enabled

## Recommendations

1. **Address Critical Issues**: Fix all [ERROR] marked issues first
2. **Review Warnings**: Address [WARNING] warnings to improve compliance
3. **Run Linting**: Execute `pnpm lint` to catch formatting issues
4. **Type Checking**: Run `pnpm typecheck` to verify TypeScript compliance

## Next Steps

1. Review the issues above
2. Fix critical issues (❌)
3. Address warnings (⚠️)
4. Re-run this checker to verify fixes
