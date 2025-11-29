@echo off
REM Script to run integration tests locally on Windows
REM Requires: Docker with fitvibe_db container running, pnpm installed

echo Checking database container...
docker ps --format "{{.Names}}" | findstr /C:"fitvibe_db" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Database container 'fitvibe_db' is not running
    echo    Start it with: cd infra\docker\dev ^&^& docker-compose up -d db
    exit /b 1
)

echo Database container is running

echo Checking/creating test database...
docker exec fitvibe_db psql -U fitvibe -d postgres -c "SELECT 1 FROM pg_database WHERE datname='fitvibe_test';" >nul 2>&1
if errorlevel 1 (
    docker exec fitvibe_db psql -U fitvibe -d postgres -c "CREATE DATABASE fitvibe_test;" >nul 2>&1
)

echo Test database ready

echo Running integration tests...
set TEST_DATABASE_URL=postgresql://fitvibe:fitvibe@localhost:5432/fitvibe_test
set PGHOST=localhost
set PGPORT=5432
set PGUSER=fitvibe
set PGPASSWORD=fitvibe
set PGDATABASE=fitvibe_test

pnpm --filter @fitvibe/backend exec jest --maxWorkers=2 --testMatch="**/integration/**/*.integration.test.ts" --testPathIgnorePatterns="/node_modules/|verification-resend-limit\.test\.ts$|login-enumeration\.test\.ts$" --forceExit

echo Integration tests completed

