#!/bin/bash
# OWASP ZAP Security Scan Runner
# This script runs automated security scanning using OWASP ZAP

set -e

# Configuration
ZAP_VERSION="2.14.0"
TARGET_URL="${TARGET_URL:-http://localhost:4000}"
REPORT_DIR="./security-reports/$(date +%Y%m%d-%H%M%S)"
ZAP_CONFIG=".zap/baseline-config.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  OWASP ZAP Security Scanner - FitVibe"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create report directory
mkdir -p "$REPORT_DIR"

# Check if ZAP is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker found"
echo -e "Target URL: ${YELLOW}$TARGET_URL${NC}"
echo -e "Report Directory: ${YELLOW}$REPORT_DIR${NC}"
echo ""

# Function to run ZAP baseline scan
run_baseline_scan() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Running Baseline Scan"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    docker run --rm \
        --network=host \
        -v "$(pwd)/$REPORT_DIR:/zap/wrk:rw" \
        -v "$(pwd)/.zap:/zap/config:ro" \
        ghcr.io/zaproxy/zaproxy:stable \
        zap-baseline.py \
        -t "$TARGET_URL" \
        -r baseline-report.html \
        -J baseline-report.json \
        -w baseline-report.md \
        -c /zap/config/baseline-config.yaml \
        -I || true  # Don't fail on warnings

    echo ""
    echo -e "${GREEN}✓${NC} Baseline scan completed"
}

# Function to run ZAP full scan (for CI/CD or thorough testing)
run_full_scan() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Running Full Scan"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    docker run --rm \
        --network=host \
        -v "$(pwd)/$REPORT_DIR:/zap/wrk:rw" \
        -v "$(pwd)/.zap:/zap/config:ro" \
        ghcr.io/zaproxy/zaproxy:stable \
        zap-full-scan.py \
        -t "$TARGET_URL" \
        -r full-report.html \
        -J full-report.json \
        -w full-report.md \
        -c /zap/config/baseline-config.yaml \
        -I || true

    echo ""
    echo -e "${GREEN}✓${NC} Full scan completed"
}

# Function to run ZAP API scan
run_api_scan() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Running API Scan"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Check if OpenAPI spec exists
    if [ -f "apps/backend/openapi.json" ]; then
        docker run --rm \
            --network=host \
            -v "$(pwd)/$REPORT_DIR:/zap/wrk:rw" \
            -v "$(pwd)/apps/backend:/zap/api:ro" \
            ghcr.io/zaproxy/zaproxy:stable \
            zap-api-scan.py \
            -t /zap/api/openapi.json \
            -f openapi \
            -r api-report.html \
            -J api-report.json \
            -w api-report.md \
            -I || true

        echo ""
        echo -e "${GREEN}✓${NC} API scan completed"
    else
        echo -e "${YELLOW}⚠${NC}  OpenAPI spec not found, skipping API scan"
        echo "    Run 'pnpm openapi:build' to generate the spec"
    fi
}

# Parse command line arguments
SCAN_TYPE="${1:-baseline}"

case "$SCAN_TYPE" in
    baseline)
        run_baseline_scan
        ;;
    full)
        run_full_scan
        ;;
    api)
        run_api_scan
        ;;
    all)
        run_baseline_scan
        run_api_scan
        ;;
    *)
        echo -e "${RED}Error: Unknown scan type '$SCAN_TYPE'${NC}"
        echo ""
        echo "Usage: $0 [baseline|full|api|all]"
        echo ""
        echo "  baseline  - Quick baseline scan (default)"
        echo "  full      - Comprehensive full scan"
        echo "  api       - API-specific scan using OpenAPI spec"
        echo "  all       - Run baseline + API scans"
        exit 1
        ;;
esac

# Analyze results
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Scan Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Count findings by severity
if [ -f "$REPORT_DIR/baseline-report.json" ]; then
    HIGH=$(jq '[.site[].alerts[] | select(.riskcode=="3")] | length' "$REPORT_DIR/baseline-report.json")
    MEDIUM=$(jq '[.site[].alerts[] | select(.riskcode=="2")] | length' "$REPORT_DIR/baseline-report.json")
    LOW=$(jq '[.site[].alerts[] | select(.riskcode=="1")] | length' "$REPORT_DIR/baseline-report.json")
    INFO=$(jq '[.site[].alerts[] | select(.riskcode=="0")] | length' "$REPORT_DIR/baseline-report.json")

    echo -e "  ${RED}High:${NC}          $HIGH"
    echo -e "  ${YELLOW}Medium:${NC}        $MEDIUM"
    echo -e "  ${GREEN}Low:${NC}           $LOW"
    echo -e "  Informational: $INFO"
    echo ""

    # Fail on critical findings
    if [ "$HIGH" -gt 0 ]; then
        echo -e "${RED}✗ FAILED: High severity vulnerabilities found!${NC}"
        echo ""
        echo "Review the full report at: $REPORT_DIR/baseline-report.html"
        exit 1
    elif [ "$MEDIUM" -gt 5 ]; then
        echo -e "${YELLOW}⚠ WARNING: More than 5 medium severity vulnerabilities found${NC}"
        echo ""
        echo "Review the full report at: $REPORT_DIR/baseline-report.html"
        exit 1
    else
        echo -e "${GREEN}✓ PASSED: No critical vulnerabilities found${NC}"
    fi
fi

echo ""
echo "Reports generated in: $REPORT_DIR"
echo ""
echo "Open the HTML report with:"
echo "  open $REPORT_DIR/baseline-report.html"
echo ""
