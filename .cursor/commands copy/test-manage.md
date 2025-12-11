---
name: test-manage
description: DEPRECATED - Use /test-fails-collect instead
invokable: false
---

# ⚠️ DEPRECATED: Test Manage Command

**This command has been renamed and replaced.**

## Migration

The `/test-manage` command has been replaced by `/test-fails-collect`.

### What Changed

- **Old**: `/test-manage` collected all test results (passing and failing)
- **New**: `/test-fails-collect` collects only failing tests and classifies them

### New Command

Use the new command:

```bash
# Old (deprecated)
pnpm test:manage

# New (use this)
pnpm test:fails:collect
```

Or use the slash command:

```
/test-fails-collect
```

## Key Differences

1. **Focus**: New command only collects failing tests (not all tests)
2. **Classification**: Automatically differentiates between:
   - **test-bug**: Issues with test code itself
   - **functional-gap**: Issues with implementation code
3. **Database**: Saves to `.cursor/test-database/test-fails.json` (different file)

## See Also

- `/test-fails-collect` - The replacement command
- `/bug:collect` - Collects ESLint and TypeScript errors (separated from test failures)

---

**Note**: This command file will be removed in a future version. Please update any scripts or documentation that reference `/test-manage`.
