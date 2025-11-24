# GitHub Actions Database Setup Guide

## ✅ Current Setup

Your CI workflow **already has PostgreSQL configured** as a service container. The database is set up in two jobs:

### 1. Quality Job (Unit Tests)

- **PostgreSQL Service**: `postgres:16`
- **Connection**: `postgresql://postgres:postgres@127.0.0.1:5432/fitvibe_test`
- **Port**: `5432`
- **Health Check**: Configured with `pg_isready`

### 2. Integration Job (Integration Tests)

- **PostgreSQL Service**: `postgres:16`
- **Connection**: `postgresql://fitvibe:fitvibe@127.0.0.1:5432/fitvibe`
- **Port**: `5432`
- **Health Check**: Configured with `pg_isready`

## ❌ Problem

The tests are still being skipped because the test files (`seeds.test.ts` and `migrations.test.ts`) check for database availability using `resolveDatabaseConnection()`, which looks for:

1. `TEST_DATABASE_URL` (highest priority)
2. Individual PG environment variables: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

But in CI, only `DATABASE_URL` was set, which the test files don't check.

## ✅ Solution Applied

I've updated the CI workflow to add the environment variables that the test files expect:

### Quality Job

```yaml
env:
  DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/fitvibe_test
  # Individual PG env vars for test files to detect database
  PGHOST: 127.0.0.1
  PGPORT: 5432
  PGUSER: postgres
  PGPASSWORD: postgres
  PGDATABASE: fitvibe_test
  # Highest priority - test files check this first
  TEST_DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/fitvibe_test
```

### Integration Job

```yaml
env:
  DATABASE_URL: postgresql://fitvibe:fitvibe@127.0.0.1:5432/fitvibe
  # Individual PG env vars for test files to detect database
  PGHOST: 127.0.0.1
  PGPORT: 5432
  PGUSER: fitvibe
  PGPASSWORD: fitvibe
  PGDATABASE: fitvibe
  # Highest priority - test files check this first
  TEST_DATABASE_URL: postgresql://fitvibe:fitvibe@127.0.0.1:5432/fitvibe
```

## How It Works

### 1. Service Container Setup

GitHub Actions automatically:

- Starts PostgreSQL container before the job runs
- Waits for health check to pass
- Exposes the database on `127.0.0.1:5432`
- Makes it available to all steps in the job

### 2. Health Check

The service has a health check configured:

```yaml
options: >-
  --health-cmd="pg_isready -U postgres"
  --health-interval=10s
  --health-timeout=5s
  --health-retries=5
```

This ensures PostgreSQL is ready before any steps run.

### 3. Manual Wait Step

There's also a manual wait step (lines 118-132) that:

- Waits up to 60 seconds for PostgreSQL to be ready
- Uses `pg_isready` to check connection
- Fails if database doesn't start within timeout

### 4. Test Detection

Now with the environment variables set, the test files will:

1. Check `TEST_DATABASE_URL` first (now set ✅)
2. If not found, check individual PG env vars (now set ✅)
3. Test connection availability
4. Run tests if database is available

## Verification

After this change, when CI runs:

1. ✅ PostgreSQL service starts automatically
2. ✅ Health check ensures it's ready
3. ✅ Environment variables are set
4. ✅ Test files detect database
5. ✅ Tests run instead of being skipped

## Testing Locally

To test the same setup locally:

### Option 1: Use Docker Compose

```bash
docker-compose up -d postgres
export TEST_DATABASE_URL="postgresql://fitvibe:your_password@127.0.0.1:5432/fitvibe_test"
pnpm test
```

### Option 2: Set Individual Variables

```bash
export PGHOST=127.0.0.1
export PGPORT=5432
export PGUSER=fitvibe
export PGPASSWORD=your_password
export PGDATABASE=fitvibe_test
pnpm test
```

### Option 3: Use Local PostgreSQL

If you have PostgreSQL installed locally:

```bash
# Ensure PostgreSQL is running
pg_isready -h localhost -p 5432

# Set environment variables
export TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/test_db"
pnpm test
```

## Summary

✅ **Database is already set up in CI** via service containers  
✅ **Environment variables added** so tests can detect the database  
✅ **Tests will now run** instead of being skipped  
✅ **No code changes needed** - just CI configuration update

The database setup in GitHub Actions is now complete and tests should run automatically!
