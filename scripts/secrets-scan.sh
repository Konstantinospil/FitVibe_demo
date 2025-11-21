#!/bin/bash
# Secrets Scanner
# Scans codebase for accidentally committed secrets

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Secrets Scanner - FitVibe"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SECRETS_FOUND=0
REPORT_DIR="./security-reports/secrets-scan-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$REPORT_DIR"

# Check if gitleaks is installed
if ! command -v gitleaks &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}  gitleaks not found, attempting to use Docker..."

    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Neither gitleaks nor Docker is installed.${NC}"
        echo ""
        echo "Install gitleaks with:"
        echo "  brew install gitleaks  (macOS)"
        echo "  apt install gitleaks   (Linux)"
        echo ""
        exit 1
    fi

    # Run gitleaks via Docker
    echo "Running gitleaks via Docker..."
    docker run --rm \
        -v "$(pwd):/repo" \
        -v "$(pwd)/$REPORT_DIR:/report" \
        ghcr.io/gitleaks/gitleaks:latest \
        detect \
        --source /repo \
        --report-path /report/gitleaks-report.json \
        --report-format json \
        --no-git \
        --verbose || SECRETS_FOUND=$?
else
    # Run gitleaks directly
    echo "Running gitleaks..."
    gitleaks detect \
        --report-path "$REPORT_DIR/gitleaks-report.json" \
        --report-format json \
        --no-git \
        --verbose || SECRETS_FOUND=$?
fi

echo ""

# Analyze results
if [ -f "$REPORT_DIR/gitleaks-report.json" ]; then
    LEAKS_COUNT=$(jq '. | length' "$REPORT_DIR/gitleaks-report.json")

    if [ "$LEAKS_COUNT" -gt 0 ]; then
        echo -e "${RED}✗ FAILED: $LEAKS_COUNT potential secret(s) found!${NC}"
        echo ""
        echo "Secrets found:"
        jq -r '.[] | "  - \(.Description) in \(.File):\(.StartLine)"' "$REPORT_DIR/gitleaks-report.json"
        echo ""
        echo "Full report: $REPORT_DIR/gitleaks-report.json"
        exit 1
    fi
fi

# Additional pattern checks
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Additional Pattern Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for .env files in git
if git ls-files | grep -q "\.env$"; then
    echo -e "${RED}✗ WARNING: .env file found in git history!${NC}"
    git ls-files | grep "\.env$"
    SECRETS_FOUND=1
else
    echo -e "${GREEN}✓${NC} No .env files in git"
fi

# Check for private keys
if git ls-files | grep -E "\.(pem|key|p12|pfx)$" | grep -v "test" | grep -v "example"; then
    echo -e "${RED}✗ WARNING: Private key files found in git!${NC}"
    git ls-files | grep -E "\.(pem|key|p12|pfx)$" | grep -v "test" | grep -v "example"
    SECRETS_FOUND=1
else
    echo -e "${GREEN}✓${NC} No private keys in git"
fi

# Check for common password patterns in code
echo ""
echo "Checking for hardcoded credentials..."
if grep -r -n -E "(password|passwd|pwd|secret|token|api_key|apikey)\s*=\s*['\"][^'\"]{8,}['\"]" \
    --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" \
    --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build \
    apps/ packages/ > "$REPORT_DIR/hardcoded-credentials.txt" 2>/dev/null; then

    echo -e "${YELLOW}⚠${NC}  Potential hardcoded credentials found:"
    head -n 10 "$REPORT_DIR/hardcoded-credentials.txt"
    echo ""
    echo "Full list: $REPORT_DIR/hardcoded-credentials.txt"
    echo -e "${YELLOW}NOTE: Review these manually - may include test fixtures${NC}"
else
    echo -e "${GREEN}✓${NC} No obvious hardcoded credentials"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Scan Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $SECRETS_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED: No secrets found in codebase${NC}"
    exit 0
else
    echo -e "${RED}✗ FAILED: Potential secrets detected!${NC}"
    echo ""
    echo "Please remove any secrets and use environment variables instead."
    echo "Review SECRETS_MANAGEMENT.md for proper secrets handling."
    exit 1
fi
