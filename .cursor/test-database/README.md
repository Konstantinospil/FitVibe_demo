# Test Database

This directory contains the test tracking database for the FitVibe project.

## Files

- **`tests.json`** - Main test database containing:
  - Test details (type, category, file, test name, suite)
  - Last run time and result for each test
  - Test status (passing, failing, pending, skipped)
  - Duration and failure messages
  - Statistics and metrics

## Usage

The test database is automatically managed by the test manager script:

- **Collection**: `.cursor/scripts/test-manager.mjs` runs tests and updates the database
- **Analysis**: Use the database to plan and streamline test repairs

Or use npm scripts:
- `pnpm test:manage` - Run tests and update database

## Access

Use Cursor commands:
- `/test:manage` - Run tests and update database

## Database Structure

The test database tracks:

- **Test Identification**: Unique ID, file path, test name, suite
- **Execution History**: Last run time, duration, result
- **Status Tracking**: Current status (passing/failing/pending/skipped)
- **Failure Information**: Failure messages for debugging
- **Statistics**: Aggregated metrics by type and category

## Example Usage

```bash
# Run test manager
pnpm test:manage

# This will:
# 1. Run Jest tests (backend)
# 2. Run Vitest tests (frontend)
# 3. Collect all test results
# 4. Update test database with last run time and results
# 5. Create failing tests database for repair planning
```

## Note

This directory is part of `.cursor/` and is ignored by git. The test database is local to your workspace.

