#!/bin/bash

# Script to configure Gmail SMTP for FitVibe

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENV_FILE=".env"

echo -e "${BLUE}📧 Gmail SMTP Configuration for FitVibe${NC}"
echo ""
echo -e "${YELLOW}Before proceeding, make sure you have:${NC}"
echo "  1. Gmail account with 2-Step Verification enabled"
echo "  2. Gmail App Password generated"
echo ""
echo "If you don't have an App Password yet:"
echo "  1. Go to: https://myaccount.google.com/security"
echo "  2. Enable 2-Step Verification"
echo "  3. Go to App Passwords"
echo "  4. Generate password for 'Mail' → 'Other (FitVibe Backend)'"
echo "  5. Copy the 16-character password (remove spaces)"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠ .env file not found. Creating new one...${NC}"
    touch "$ENV_FILE"
fi

# Get Gmail credentials
read -p "Enter your Gmail address: " gmail_user
if [ -z "$gmail_user" ]; then
    echo -e "${RED}✗ Gmail address is required${NC}"
    exit 1
fi

read -sp "Enter your Gmail App Password (16 characters, no spaces): " gmail_pass
echo ""
if [ -z "$gmail_pass" ]; then
    echo -e "${RED}✗ App Password is required${NC}"
    exit 1
fi

read -p "Enter sender name (default: FitVibe): " from_name
from_name=${from_name:-FitVibe}

echo ""
echo -e "${YELLOW}Configuring .env file...${NC}"

# Create backup
cp "$ENV_FILE" "${ENV_FILE}.bak" 2>/dev/null || true

# Remove existing email config
sed -i.bak '/^# Email Configuration/d' "$ENV_FILE" 2>/dev/null || true
sed -i.bak '/^EMAIL_ENABLED=/d' "$ENV_FILE" 2>/dev/null || true
sed -i.bak '/^SMTP_HOST=/d' "$ENV_FILE" 2>/dev/null || true
sed -i.bak '/^SMTP_PORT=/d' "$ENV_FILE" 2>/dev/null || true
sed -i.bak '/^SMTP_SECURE=/d' "$ENV_FILE" 2>/dev/null || true
sed -i.bak '/^SMTP_USER=/d' "$ENV_FILE" 2>/dev/null || true
sed -i.bak '/^SMTP_PASS=/d' "$ENV_FILE" 2>/dev/null || true
sed -i.bak '/^SMTP_FROM_NAME=/d' "$ENV_FILE" 2>/dev/null || true
sed -i.bak '/^SMTP_FROM_EMAIL=/d' "$ENV_FILE" 2>/dev/null || true

# Add Gmail config
cat >> "$ENV_FILE" << EOF

# Email Configuration (Gmail SMTP)
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=${gmail_user}
SMTP_PASS=${gmail_pass}
SMTP_FROM_NAME=${from_name}
SMTP_FROM_EMAIL=${gmail_user}
EOF

# Clean up backup files
rm -f "${ENV_FILE}.bak" 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ Gmail SMTP configuration added to .env${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  SMTP Host: smtp.gmail.com"
echo "  SMTP Port: 587"
echo "  SMTP User: ${gmail_user}"
echo "  From Name: ${from_name}"
echo "  From Email: ${gmail_user}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Restart your backend server"
echo "  2. Check backend logs for: '[mailer] SMTP transporter initialized'"
echo "  3. Test by registering a new user"
echo ""
echo -e "${YELLOW}To verify configuration, run:${NC}"
echo "   ./scripts/check-email-config.sh"
echo ""
echo -e "${GREEN}Done!${NC}"

