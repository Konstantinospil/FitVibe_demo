#!/bin/bash

# Script to set up email configuration for local development
# This script helps configure email using MailHog (for testing) or Gmail SMTP

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

echo -e "${BLUE}📧 FitVibe Email Configuration Setup${NC}"
echo ""

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠ .env file not found. Creating from .env.example if it exists...${NC}"
    if [ -f "$ENV_EXAMPLE" ]; then
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        echo -e "${GREEN}✓ Created .env from .env.example${NC}"
    else
        echo -e "${YELLOW}⚠ .env.example not found. Creating new .env file...${NC}"
        touch "$ENV_FILE"
    fi
fi

echo "Choose your email setup:"
echo ""
echo "1) MailHog (Recommended for local development)"
echo "   - Local SMTP server that captures all emails"
echo "   - View emails at http://localhost:8025"
echo "   - No authentication needed"
echo ""
echo "2) Gmail SMTP (Real email sending)"
echo "   - Requires Gmail account with App Password"
echo "   - Emails will be sent to real addresses"
echo ""
echo "3) Mailtrap (Testing service)"
echo "   - Free testing inbox"
echo "   - Requires Mailtrap account"
echo ""
echo "4) Skip (Keep current configuration)"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}Setting up MailHog configuration...${NC}"
        
        # Remove existing email config
        sed -i.bak '/^EMAIL_ENABLED=/d' "$ENV_FILE" 2>/dev/null || true
        sed -i.bak '/^SMTP_HOST=/d' "$ENV_FILE" 2>/dev/null || true
        sed -i.bak '/^SMTP_PORT=/d' "$ENV_FILE" 2>/dev/null || true
        sed -i.bak '/^SMTP_SECURE=/d' "$ENV_FILE" 2>/dev/null || true
        sed -i.bak '/^SMTP_USER=/d' "$ENV_FILE" 2>/dev/null || true
        sed -i.bak '/^SMTP_PASS=/d' "$ENV_FILE" 2>/dev/null || true
        sed -i.bak '/^SMTP_FROM_NAME=/d' "$ENV_FILE" 2>/dev/null || true
        sed -i.bak '/^SMTP_FROM_EMAIL=/d' "$ENV_FILE" 2>/dev/null || true
        
        # Add MailHog config
        cat >> "$ENV_FILE" << EOF

# Email Configuration (MailHog - Local Development)
EMAIL_ENABLED=true
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM_NAME=FitVibe
SMTP_FROM_EMAIL=noreply@fitvibe.local
EOF
        
        echo -e "${GREEN}✓ MailHog configuration added${NC}"
        echo ""
        echo -e "${YELLOW}To use MailHog:${NC}"
        echo "  1. Start MailHog: docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog"
        echo "     Or use Docker Compose: docker compose -f infra/docker/dev/docker-compose.dev.yml up -d mailhog"
        echo "  2. View emails at: http://localhost:8025"
        echo "  3. Restart your backend server"
        ;;
        
    2)
        echo ""
        echo -e "${YELLOW}Setting up Gmail SMTP configuration...${NC}"
        echo ""
        echo -e "${BLUE}You'll need a Gmail App Password.${NC}"
        echo "1. Go to https://myaccount.google.com/security"
        echo "2. Enable 2-Step Verification"
        echo "3. Go to App Passwords and generate one for 'Mail'"
        echo "4. Copy the 16-character password (no spaces)"
        echo ""
        
        read -p "Enter your Gmail address: " gmail_user
        read -sp "Enter your Gmail App Password: " gmail_pass
        echo ""
        read -p "Enter sender name (default: FitVibe): " from_name
        from_name=${from_name:-FitVibe}
        
        # Remove existing email config
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
        
        echo ""
        echo -e "${GREEN}✓ Gmail SMTP configuration added${NC}"
        echo -e "${YELLOW}⚠ Remember to restart your backend server${NC}"
        ;;
        
    3)
        echo ""
        echo -e "${YELLOW}Setting up Mailtrap configuration...${NC}"
        echo ""
        echo "1. Sign up at https://mailtrap.io (free account)"
        echo "2. Go to Email Testing > Inboxes > SMTP Settings"
        echo "3. Copy your credentials"
        echo ""
        
        read -p "Enter Mailtrap SMTP host (default: sandbox.smtp.mailtrap.io): " smtp_host
        smtp_host=${smtp_host:-sandbox.smtp.mailtrap.io}
        read -p "Enter Mailtrap SMTP port (default: 2525): " smtp_port
        smtp_port=${smtp_port:-2525}
        read -p "Enter Mailtrap username: " mailtrap_user
        read -sp "Enter Mailtrap password: " mailtrap_pass
        echo ""
        
        # Remove existing email config
        sed -i.bak '/^EMAIL_ENABLED=/d' "$ENV_FILE" 2>/dev/null || true
        sed -i.bak '/^SMTP_HOST=/d' "$ENV_FILE" 2>/dev/null || true
        sed -i.bak '/^SMTP_PORT=/d' "$ENV_FILE" 2>/dev/null || true
        sed -i.bak '/^SMTP_SECURE=/d' "$ENV_FILE" 2>/dev/null || true
        sed -i.bak '/^SMTP_USER=/d' "$ENV_FILE" 2>/dev/null || true
        sed -i.bak '/^SMTP_PASS=/d' "$ENV_FILE" 2>/dev/null || true
        sed -i.bak '/^SMTP_FROM_NAME=/d' "$ENV_FILE" 2>/dev/null || true
        sed -i.bak '/^SMTP_FROM_EMAIL=/d' "$ENV_FILE" 2>/dev/null || true
        
        # Add Mailtrap config
        cat >> "$ENV_FILE" << EOF

# Email Configuration (Mailtrap - Testing)
EMAIL_ENABLED=true
SMTP_HOST=${smtp_host}
SMTP_PORT=${smtp_port}
SMTP_SECURE=false
SMTP_USER=${mailtrap_user}
SMTP_PASS=${mailtrap_pass}
SMTP_FROM_NAME=FitVibe
SMTP_FROM_EMAIL=noreply@fitvibe.local
EOF
        
        echo ""
        echo -e "${GREEN}✓ Mailtrap configuration added${NC}"
        echo -e "${YELLOW}⚠ Remember to restart your backend server${NC}"
        ;;
        
    4)
        echo -e "${YELLOW}Skipping email configuration${NC}"
        exit 0
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Clean up backup file
rm -f "${ENV_FILE}.bak" 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ Email configuration complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Restart your backend server"
echo "2. Check backend logs for: '[mailer] SMTP transporter initialized'"
echo "3. Test by registering a new user"
echo ""
echo -e "${BLUE}To verify configuration, run:${NC}"
echo "   ./scripts/check-email-config.sh"
echo ""

