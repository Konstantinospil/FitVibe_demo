#!/bin/bash
# GDPR Compliance Checker
# Validates GDPR compliance implementation

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GDPR Compliance Checker - FitVibe"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

COMPLIANCE_FAILED=0

# Check 1: DSR Endpoints (Data Subject Rights)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Checking DSR Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for data export endpoint
if grep -r "GET.*\/users\/me\/export" apps/backend/src --include="*.ts" > /dev/null; then
    echo -e "${GREEN}✓${NC} Data export endpoint found (Right to Access)"
else
    echo -e "${RED}✗${NC} Data export endpoint missing"
    COMPLIANCE_FAILED=1
fi

# Check for account deletion endpoint
if grep -r "DELETE.*\/users\/me" apps/backend/src --include="*.ts" > /dev/null; then
    echo -e "${GREEN}✓${NC} Account deletion endpoint found (Right to Erasure)"
else
    echo -e "${RED}✗${NC} Account deletion endpoint missing"
    COMPLIANCE_FAILED=1
fi

# Check 2: Data Retention
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Checking Data Retention Implementation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for retention job
if [ -f "apps/backend/src/db/scripts/run-retention.ts" ]; then
    echo -e "${GREEN}✓${NC} Data retention job exists"
else
    echo -e "${RED}✗${NC} Data retention job missing"
    COMPLIANCE_FAILED=1
fi

# Check for deleted_at columns in migrations
if grep -r "deleted_at" apps/backend/src/db/migrations --include="*.ts" > /dev/null; then
    echo -e "${GREEN}✓${NC} Soft delete support (deleted_at) found in migrations"
else
    echo -e "${YELLOW}⚠${NC}  Soft delete columns may be missing"
fi

# Check 3: Privacy Controls
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Checking Privacy Controls"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for visibility controls
if grep -r "visibility.*enum.*public.*followers.*link.*private" apps/backend/src/db/migrations --include="*.ts" > /dev/null; then
    echo -e "${GREEN}✓${NC} Privacy visibility controls found"
else
    echo -e "${YELLOW}⚠${NC}  Privacy visibility controls may be incomplete"
fi

# Check for profile privacy settings
if grep -r "profile_visibility\|is_profile_public" apps/backend/src --include="*.ts" > /dev/null; then
    echo -e "${GREEN}✓${NC} Profile privacy settings found"
else
    echo -e "${YELLOW}⚠${NC}  Profile privacy settings may be missing"
fi

# Check 4: Audit Logging
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Checking Audit Logging"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for audit_log table
if grep -r "create.*table.*audit_log" apps/backend/src/db/migrations --include="*.ts" > /dev/null; then
    echo -e "${GREEN}✓${NC} Audit log table found"
else
    echo -e "${RED}✗${NC} Audit log table missing"
    COMPLIANCE_FAILED=1
fi

# Check for PII-free logging
if grep -r "password.*email.*ssn" apps/backend/src --include="*.ts" | grep -i "log\|logger\|console" > /dev/null; then
    echo -e "${YELLOW}⚠${NC}  Potential PII in logs detected - review manually"
    echo "    Files to review:"
    grep -r "password.*email" apps/backend/src --include="*.ts" | grep -i "log\|logger" | cut -d: -f1 | sort -u | head -5
else
    echo -e "${GREEN}✓${NC} No obvious PII in logs"
fi

# Check 5: Consent Management
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Checking Consent Management"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for email verification before data access
if grep -r "email_verified\|verified_at" apps/backend/src --include="*.ts" > /dev/null; then
    echo -e "${GREEN}✓${NC} Email verification found"
else
    echo -e "${YELLOW}⚠${NC}  Email verification may be missing"
fi

# Check for consent tracking in database
if grep -r "consent\|agreed_to_terms\|privacy_policy_accepted" apps/backend/src/db/migrations --include="*.ts" > /dev/null; then
    echo -e "${GREEN}✓${NC} Consent tracking in database"
else
    echo -e "${YELLOW}⚠${NC}  Consent tracking may be incomplete"
fi

# Check 6: Data Minimization
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Checking Data Minimization"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check that only necessary user data is collected
echo "Checking database schema for excessive personal data..."

# Count sensitive fields
SENSITIVE_FIELDS=$(grep -r "ssn\|social_security\|passport\|drivers_license\|credit_card" apps/backend/src/db/migrations --include="*.ts" | wc -l)

if [ "$SENSITIVE_FIELDS" -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC}  Sensitive personal data fields detected ($SENSITIVE_FIELDS)"
    echo "    Review if these are necessary for business purposes"
else
    echo -e "${GREEN}✓${NC} No excessive personal data collection"
fi

# Check 7: Security Measures
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Checking Security Measures"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for password hashing
if grep -r "bcrypt\|argon2\|scrypt" apps/backend/src --include="*.ts" > /dev/null; then
    echo -e "${GREEN}✓${NC} Password hashing implemented"
else
    echo -e "${RED}✗${NC} Password hashing not found"
    COMPLIANCE_FAILED=1
fi

# Check for encryption at rest configuration
if grep -r "PGSSL\|sslmode.*require" apps/backend/src --include="*.ts" .env.example > /dev/null; then
    echo -e "${GREEN}✓${NC} Database encryption in transit (SSL) configured"
else
    echo -e "${YELLOW}⚠${NC}  Database SSL may not be enforced"
fi

# Check for HTTPS enforcement
if grep -r "HSTS\|Strict-Transport-Security" infra/nginx/nginx.conf > /dev/null; then
    echo -e "${GREEN}✓${NC} HTTPS enforcement (HSTS) configured"
else
    echo -e "${YELLOW}⚠${NC}  HSTS header may be missing"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GDPR Compliance Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $COMPLIANCE_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED: Core GDPR compliance measures are in place${NC}"
    echo ""
    echo "Note: This is an automated check. A full GDPR audit requires:"
    echo "  - Legal review of privacy policy"
    echo "  - Data Processing Impact Assessment (DPIA)"
    echo "  - Third-party processor agreements"
    echo "  - Manual testing of DSR workflows"
    exit 0
else
    echo -e "${RED}✗ FAILED: GDPR compliance issues detected${NC}"
    echo ""
    echo "Review the findings above and implement missing features."
    echo "See apps/docs/2.Technical_Design_Document_Modules.md for requirements."
    exit 1
fi
