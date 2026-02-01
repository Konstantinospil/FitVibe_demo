#!/bin/bash
# Script to run integration tests locally
# Requires: Docker with fitvibe_db container running, pnpm installed

set -e

echo "🔍 Checking database container..."
if ! docker ps --format "{{.Names}}" | grep -q "^fitvibe_db$"; then
  echo "❌ Database container 'fitvibe_db' is not running"
  echo "   Start it with: cd infra/docker/dev && docker-compose up -d db"
  exit 1
fi

echo "✅ Database container is running"

echo "🔍 Checking/creating test database..."
docker exec fitvibe_db psql -U fitvibe -d postgres -c "SELECT 1 FROM pg_database WHERE datname='fitvibe_test';" > /dev/null 2>&1 || \
  docker exec fitvibe_db psql -U fitvibe -d postgres -c "CREATE DATABASE fitvibe_test;" > /dev/null 2>&1

echo "✅ Test database ready"

echo "🧪 Running integration tests..."
export TEST_DATABASE_URL="postgresql://fitvibe:fitvibe@localhost:5432/fitvibe_test"
export PGHOST=localhost
export PGPORT=5432
export PGUSER=fitvibe
export PGPASSWORD=fitvibe
export PGDATABASE=fitvibe_test

export RUN_INTEGRATION_TESTS=1
export DEBUG_AUTH_TOKENS=1

pnpm --filter @fitvibe/backend exec jest \
  --runInBand \
  --testMatch="**/integration/**/*.test.ts" \
  --testPathIgnorePatterns="/node_modules/|verification-resend-limit\\.test\\.ts$|login-enumeration\\.test\\.ts$" \
  --forceExit

echo "✅ Integration tests completed"

