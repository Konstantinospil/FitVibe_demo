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
        local pid=$(get_port_process $port)
        if [ -n "$pid" ]; then
            local process_name=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
            echo -e "${YELLOW}⚠ Port $port ($service_name) is in use by process $pid ($process_name)${NC}"
            echo -e "${YELLOW}Attempting to free port $port...${NC}"
            
            # Try graceful kill first
            kill $pid 2>/dev/null || true
            sleep 1
            
            # Check if still running, force kill if needed
            if check_port $port; then
                echo -e "${YELLOW}Process still running, forcing termination...${NC}"
                kill -9 $pid 2>/dev/null || true
                sleep 1
            fi
            
            # Verify port is now free
            if check_port $port; then
                echo -e "${RED}✗ Failed to free port $port. Please manually stop the process.${NC}"
                return 1
            else
                echo -e "${GREEN}✓ Port $port freed successfully${NC}"
                return 0
            fi
        else
            echo -e "${YELLOW}⚠ Port $port is in use but couldn't identify the process${NC}"
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

# Main execution
main() {
    # Stop Docker containers
    stop_docker
    
    # Wait a moment for ports to be released
    sleep 2
    
    # Check and free ports if needed
    check_and_free_ports
    
    # Check PostgreSQL
    if ! check_postgres; then
        exit 1
    fi
    
    # Setup database
    setup_database
    
    # Run migrations
    run_migrations
    
    echo -e "${GREEN}✅ Setup complete!${NC}"
    echo ""
    echo -e "${YELLOW}Starting development servers...${NC}"
    echo -e "${GREEN}Backend will run on: http://localhost:4000${NC}"
    echo -e "${GREEN}Frontend will run on: http://localhost:5173${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
    echo ""
    
    # Start both backend and frontend in parallel
    pnpm dev
}

# Run main function
main

