#!/bin/bash

# Script to check and restart the frontend if needed

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PORT=5173
FRONTEND_URL="http://localhost:$PORT"

echo "🔍 Checking frontend on port $PORT..."

# Check if port is in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    PID=$(lsof -Pi :$PORT -sTCP:LISTEN -t 2>/dev/null | head -1)
    PROCESS_NAME=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
    
    echo -e "${GREEN}✓ Port $PORT is in use by process $PID ($PROCESS_NAME)${NC}"
    
    # Check if it's actually responding
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Frontend is responding with HTTP $HTTP_CODE${NC}"
        echo -e "${GREEN}✅ Frontend is running correctly!${NC}"
        echo ""
        echo "Access it at: $FRONTEND_URL"
        exit 0
    else
        echo -e "${YELLOW}⚠ Port is in use but not responding correctly (HTTP $HTTP_CODE)${NC}"
        echo -e "${YELLOW}The process might be stuck. Consider restarting.${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Port $PORT is not in use${NC}"
    echo -e "${YELLOW}Frontend is not running.${NC}"
    echo ""
    echo "To start it, run:"
    echo "  pnpm --filter @fitvibe/frontend dev"
    echo ""
    echo "Or from the project root:"
    echo "  pnpm dev"
    exit 1
fi

