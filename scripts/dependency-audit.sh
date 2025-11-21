#!/bin/bash
# Dependency Security Audit
# Scans all dependencies for known vulnerabilities

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Dependency Security Audit - FitVibe"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

AUDIT_FAILED=0
REPORT_DIR="./security-reports/dependency-audit-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$REPORT_DIR"

# Function to run npm audit
run_npm_audit() {
    local workspace=$1
    local name=$2

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Auditing $name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    cd "$workspace"

    # Run npm audit
    if npm audit --json > "$REPORT_DIR/${name}-npm-audit.json" 2>&1; then
        echo -e "${GREEN}✓${NC} No vulnerabilities found in $name"
    else
        local critical=$(jq '.metadata.vulnerabilities.critical // 0' "$REPORT_DIR/${name}-npm-audit.json")
        local high=$(jq '.metadata.vulnerabilities.high // 0' "$REPORT_DIR/${name}-npm-audit.json")
        local moderate=$(jq '.metadata.vulnerabilities.moderate // 0' "$REPORT_DIR/${name}-npm-audit.json")
        local low=$(jq '.metadata.vulnerabilities.low // 0' "$REPORT_DIR/${name}-npm-audit.json")

        echo -e "  ${RED}Critical:${NC} $critical"
        echo -e "  ${RED}High:${NC}     $high"
        echo -e "  ${YELLOW}Moderate:${NC} $moderate"
        echo -e "  ${GREEN}Low:${NC}      $low"
        echo ""

        if [ "$critical" -gt 0 ] || [ "$high" -gt 0 ]; then
            echo -e "${RED}✗ FAILED: Critical or high severity vulnerabilities found in $name${NC}"
            AUDIT_FAILED=1
        fi
    fi

    # Generate human-readable report
    npm audit --audit-level=moderate > "$REPORT_DIR/${name}-npm-audit.txt" 2>&1 || true

    cd - > /dev/null
    echo ""
}

# Audit backend
if [ -d "apps/backend" ]; then
    run_npm_audit "apps/backend" "backend"
fi

# Audit frontend
if [ -d "apps/frontend" ]; then
    run_npm_audit "apps/frontend" "frontend"
fi

# Run pnpm audit on root (monorepo)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Auditing Monorepo (pnpm)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v pnpm &> /dev/null; then
    pnpm audit --audit-level=moderate --json > "$REPORT_DIR/pnpm-audit.json" 2>&1 || true
    pnpm audit --audit-level=moderate > "$REPORT_DIR/pnpm-audit.txt" 2>&1 || true

    if [ -s "$REPORT_DIR/pnpm-audit.json" ]; then
        echo -e "${GREEN}✓${NC} pnpm audit completed"
    fi
else
    echo -e "${YELLOW}⚠${NC}  pnpm not found, skipping monorepo audit"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Audit Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $AUDIT_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED: No critical vulnerabilities found${NC}"
    echo ""
    echo "Reports generated in: $REPORT_DIR"
    exit 0
else
    echo -e "${RED}✗ FAILED: Critical vulnerabilities found!${NC}"
    echo ""
    echo "Review the full reports in: $REPORT_DIR"
    echo ""
    echo "To fix vulnerabilities, run:"
    echo "  pnpm audit --fix"
    echo ""
    exit 1
fi
