#!/bin/bash
# Script to set up test database, run migrations, seeds, and integration tests

set -e

echo "🚀 Setting up test database and running integration tests..."

# Set test environment variables
export NODE_ENV=test
export PGHOST=${PGHOST:-localhost}
export PGPORT=${PGPORT:-5432}
export PGUSER=${PGUSER:-fitvibe}
export PGPASSWORD=${PGPASSWORD:-fitvibe}
export PGDATABASE=${PGDATABASE:-fitvibe_test}

echo "📊 Database configuration:"
echo "   Host: $PGHOST"
echo "   Port: $PGPORT"
echo "   User: $PGUSER"
echo "   Database: $PGDATABASE"
echo ""

# Check if PostgreSQL is accessible
echo "🔍 Checking PostgreSQL connection..."
if ! pnpm --filter @fitvibe/backend exec tsx -e "
import db from './apps/backend/src/db/index.js';
db.raw('SELECT 1').then(() => {
  console.log('✅ Database connection successful');
  process.exit(0);
}).catch((err) => {
  console.error('❌ Database connection failed:', err.message);
  process.exit(1);
});
" 2>/dev/null; then
  echo ""
  echo "❌ ERROR: Cannot connect to PostgreSQL!"
  echo ""
  echo "Please ensure PostgreSQL is running. Options:"
  echo ""
  echo "Option 1: Start with Docker Compose:"
  echo "  docker compose -f infra/docker/dev/docker-compose.dev.yml up -d db"
  echo ""
  echo "Option 2: Start local PostgreSQL service:"
  echo "  brew services start postgresql@16  # if installed via Homebrew"
  echo "  # or use your system's PostgreSQL service manager"
  echo ""
  echo "Option 3: Create test database manually:"
  echo "  createdb -U fitvibe fitvibe_test"
  echo ""
  exit 1
fi

echo ""
echo "📦 Running database migrations..."
pnpm --filter @fitvibe/backend exec pnpm db:migrate

echo ""
echo "🌱 Seeding database..."
pnpm --filter @fitvibe/backend exec pnpm db:seed

echo ""
echo "🧪 Running integration tests..."
pnpm --filter @fitvibe/backend exec jest \
  --maxWorkers=2 \
  --testMatch="**/integration/**/*.integration.test.ts" \
  --testPathIgnorePatterns="/node_modules/|verification-resend-limit\\.test\\.ts$|login-enumeration\\.test\\.ts$"

echo ""
echo "✅ All done!"

