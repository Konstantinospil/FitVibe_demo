#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Stopping and removing existing containers..."
docker compose -f docker-compose.dev.yml down -v

echo "Removing existing images..."
# Remove images by container name patterns
docker images | grep -E "fitvibe|postgres:16-alpine|nginx:stable-alpine|clamav/clamav:1.3" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

# Remove images built from docker-compose
docker compose -f docker-compose.dev.yml rm -f 2>/dev/null || true

echo "Building and starting services without cache..."
docker compose -f docker-compose.dev.yml build --no-cache

echo "Starting all services..."
docker compose -f docker-compose.dev.yml up -d

echo "Waiting for services to be ready..."
sleep 5

echo "Checking service status..."
docker compose -f docker-compose.dev.yml ps

echo ""
echo "All services should now be running:"
echo "- Database (PostgreSQL) on port 5432"
echo "- Backend on port 4000"
echo "- Frontend on port 5173"
echo "- Nginx on port 80"
echo "- ClamAV (Antivirus) on port 3310"


