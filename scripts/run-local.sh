#!/bin/bash

# Script to run FitVibe locally without Docker
# This script stops Docker containers, ensures PostgreSQL is running,
# runs migrations, and starts the backend and frontend

set -e

echo "🚀 Starting FitVibe locally (without Docker)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to get process info using a port
get_port_process() {
    local port=$1
    lsof -Pi :$port -sTCP:LISTEN -t 2>/dev/null | head -1
}

# Function to free a port by killing the process using it
free_port() {
    local port=$1
    local service_name=$2
    
    if check_port $port; then
        # Get all PIDs using the port (there might be multiple)
        local pids=$(lsof -ti :$port 2>/dev/null || true)
        
        if [ -n "$pids" ]; then
            echo -e "${YELLOW}⚠ Port $port ($service_name) is in use${NC}"
            echo -e "${YELLOW}Attempting to free port $port...${NC}"
            
            # Kill all processes using the port
            echo "$pids" | xargs kill -9 2>/dev/null || true
            sleep 2
            
            # Verify port is now free
            if check_port $port; then
                echo -e "${RED}✗ Failed to free port $port. Please manually stop the process.${NC}"
                echo -e "${YELLOW}Try: lsof -ti :$port | xargs kill -9${NC}"
                return 1
            else
                echo -e "${GREEN}✓ Port $port freed successfully${NC}"
                return 0
            fi
        else
            echo -e "${YELLOW}⚠ Port $port is in use but couldn't identify the process${NC}"
            # Try to kill any process on the port anyway
            lsof -ti :$port 2>/dev/null | xargs kill -9 2>/dev/null || true
            sleep 1
            if ! check_port $port; then
                echo -e "${GREEN}✓ Port $port freed successfully${NC}"
                return 0
            fi
            return 1
        fi
    else
        return 0  # Port is already free
    fi
}

# Function to stop Docker containers
stop_docker() {
    echo -e "${YELLOW}📦 Checking for Docker containers...${NC}"
    
    # Check if docker-compose file exists
    if [ -f "infra/docker/dev/docker-compose.dev.yml" ]; then
        echo -e "${YELLOW}Stopping Docker containers...${NC}"
        docker compose -f infra/docker/dev/docker-compose.dev.yml down 2>/dev/null || true
        echo -e "${GREEN}✓ Docker containers stopped${NC}"
    else
        echo -e "${YELLOW}No docker-compose file found, skipping...${NC}"
    fi
}

# Function to check PostgreSQL
check_postgres() {
    echo -e "${YELLOW}🐘 Checking PostgreSQL...${NC}"
    
    # Check if PostgreSQL is running
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is running on port 5432${NC}"
        return 0
    else
        echo -e "${RED}✗ PostgreSQL is not running on port 5432${NC}"
        echo -e "${YELLOW}Please start PostgreSQL manually:${NC}"
        echo ""
        echo "  macOS options:"
        echo "  1. Using Postgres.app: Download from https://postgresapp.com/"
        echo "  2. Using Docker: docker run --name fitvibe-postgres -e POSTGRES_USER=fitvibe -e POSTGRES_PASSWORD=fitvibe -e POSTGRES_DB=fitvibe -p 5432:5432 -d postgres:16-alpine"
        echo "  3. Manual start: pg_ctl -D /usr/local/var/postgres start"
        echo "     (or find your data dir with: pg_config --sharedir)"
        echo ""
        echo "  Linux: sudo systemctl start postgresql"
        echo ""
        echo "  Or install PostgreSQL from: https://www.postgresql.org/download/"
        return 1
    fi
}

# Function to check/create database
setup_database() {
    echo -e "${YELLOW}🗄️  Setting up database...${NC}"
    
    # Try to connect and create database if it doesn't exist
    PGPASSWORD=${PGPASSWORD:-fitvibe} psql -h localhost -U ${PGUSER:-fitvibe} -d postgres -c "SELECT 1 FROM pg_database WHERE datname='fitvibe'" 2>/dev/null | grep -q 1 || {
        echo -e "${YELLOW}Creating database 'fitvibe'...${NC}"
        PGPASSWORD=${PGPASSWORD:-fitvibe} createdb -h localhost -U ${PGUSER:-fitvibe} fitvibe 2>/dev/null || {
            echo -e "${YELLOW}Database might already exist or user needs permissions${NC}"
        }
    }
    echo -e "${GREEN}✓ Database ready${NC}"
}

# Function to run migrations
run_migrations() {
    echo -e "${YELLOW}🔄 Running database migrations...${NC}"
    pnpm --filter @fitvibe/backend run db:migrate || {
        echo -e "${RED}✗ Migration failed${NC}"
        exit 1
    }
    echo -e "${GREEN}✓ Migrations completed${NC}"
}

# Function to seed database
seed_database() {
    echo -e "${YELLOW}🌱 Seeding database...${NC}"
    pnpm --filter @fitvibe/backend run db:seed || {
        echo -e "${RED}✗ Database seeding failed${NC}"
        exit 1
    }
    echo -e "${GREEN}✓ Database seeded${NC}"
}

# Function to check and free ports
check_and_free_ports() {
    echo -e "${YELLOW}🔌 Checking ports...${NC}"
    
    # Free port 4000 (backend) if in use
    if ! free_port 4000 "backend"; then
        echo -e "${RED}✗ Could not free port 4000. Please manually stop the process and try again.${NC}"
        exit 1
    fi
    
    # Free port 5173 (frontend) if in use
    if ! free_port 5173 "frontend"; then
        echo -e "${RED}✗ Could not free port 5173. Please manually stop the process and try again.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Ports 4000 and 5173 are available${NC}"
}

# Function to check and install dependencies
check_dependencies() {
    echo -e "${YELLOW}📦 Checking dependencies...${NC}"
    
    # Check if node_modules exists in root
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Dependencies not found. Installing...${NC}"
        pnpm install || {
            echo -e "${RED}✗ Failed to install dependencies${NC}"
            exit 1
        }
        echo -e "${GREEN}✓ Dependencies installed${NC}"
    else
        echo -e "${GREEN}✓ Dependencies found${NC}"
    fi
    
    # Verify frontend dependencies exist
    if [ ! -d "apps/frontend/node_modules" ] && [ ! -f "apps/frontend/package.json" ]; then
        echo -e "${YELLOW}Frontend dependencies may be missing. Ensuring they're installed...${NC}"
        pnpm install --filter @fitvibe/frontend || {
            echo -e "${YELLOW}Warning: Frontend dependencies installation had issues${NC}"
        }
    fi
    
    # Verify backend dependencies exist
    if [ ! -d "apps/backend/node_modules" ] && [ ! -f "apps/backend/package.json" ]; then
        echo -e "${YELLOW}Backend dependencies may be missing. Ensuring they're installed...${NC}"
        pnpm install --filter @fitvibe/backend || {
            echo -e "${YELLOW}Warning: Backend dependencies installation had issues${NC}"
        }
    fi
}

# Function to check frontend environment
check_frontend_env() {
    echo -e "${YELLOW}🔧 Checking frontend environment...${NC}"
    
    local env_file="apps/frontend/.env"
    local env_local_file="apps/frontend/.env.local"
    
    # Check if .env.local exists (takes precedence)
    if [ -f "$env_local_file" ]; then
        echo -e "${GREEN}✓ Frontend .env.local found${NC}"
        return 0
    fi
    
    # Check if .env exists
    if [ -f "$env_file" ]; then
        echo -e "${GREEN}✓ Frontend .env found${NC}"
        return 0
    fi
    
    # Create .env.local with default values
    echo -e "${YELLOW}Creating frontend .env.local with default values...${NC}"
    mkdir -p "$(dirname "$env_local_file")"
    cat > "$env_local_file" << EOF
VITE_API_BASE_URL=http://localhost:4000/api/v1
EOF
    echo -e "${GREEN}✓ Created frontend .env.local${NC}"
}

# Function to wait for a service to be ready
wait_for_service() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0
    
    echo -e "${YELLOW}⏳ Waiting for $service_name to start on port $port...${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        if check_port $port; then
            echo -e "${GREEN}✓ $service_name is running on port $port${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    echo -e "${RED}✗ $service_name failed to start on port $port after ${max_attempts} seconds${NC}"
    return 1
}

# Function to cleanup development servers
cleanup_servers() {
    echo ""
    echo -e "${YELLOW}Stopping development servers...${NC}"
    # Kill any processes on our ports (pnpm/turbo will handle cleanup of child processes)
    lsof -ti :4000 2>/dev/null | xargs kill -9 2>/dev/null || true
    lsof -ti :5173 2>/dev/null | xargs kill -9 2>/dev/null || true
    # Also kill any pnpm/turbo processes
    pkill -f "pnpm.*dev" 2>/dev/null || true
    pkill -f "turbo.*dev" 2>/dev/null || true
    echo -e "${GREEN}✓ Servers stopped${NC}"
}

# Function to start services and show logs
start_and_verify_services() {
    echo -e "${YELLOW}🚀 Starting development servers...${NC}"
    echo ""
    echo -e "${BLUE}Services are starting. Logs will be displayed below in real-time.${NC}"
    echo -e "${BLUE}Logs are also being saved to: /tmp/fitvibe-dev.log${NC}"
    echo ""
    echo -e "${GREEN}Backend will run on: http://localhost:4000${NC}"
    echo -e "${GREEN}Frontend will run on: http://localhost:5173${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Set up cleanup handler for signals
    trap "cleanup_servers; exit 0" INT TERM
    
    # Start pnpm dev with output to both console and log file
    # This runs in foreground so logs are visible in real-time
    pnpm dev 2>&1 | tee /tmp/fitvibe-dev.log
}

# Main execution
main() {
    # Stop Docker containers
    stop_docker
    
    # Wait a moment for ports to be released
    sleep 2
    
    # Check and free ports if needed
    check_and_free_ports
    
    # Check and install dependencies
    check_dependencies
    
    # Check frontend environment
    check_frontend_env
    
    # Check PostgreSQL
    if ! check_postgres; then
        exit 1
    fi
    
    # Setup database
    setup_database
    
    # Run migrations
    run_migrations
    
    # Seed database
    seed_database
    
    echo -e "${GREEN}✅ Setup complete!${NC}"
    echo ""
    
    # Start and verify services
    start_and_verify_services
}

# Run main function
main

