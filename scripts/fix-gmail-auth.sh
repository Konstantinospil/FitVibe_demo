#!/bin/bash

# Script to help fix Gmail authentication issues

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Gmail Authentication Troubleshooting${NC}"
echo ""
echo -e "${YELLOW}Error: 535-5.7.8 Username and Password not accepted${NC}"
echo ""
echo -e "${BLUE}This error means Gmail rejected your credentials.${NC}"
echo ""
echo -e "${YELLOW}Step 1: Verify 2-Step Verification is Enabled${NC}"
echo "1. Go to: https://myaccount.google.com/security"
echo "2. Check if '2-Step Verification' is ON"
echo "3. If not, enable it first (required for App Passwords)"
echo ""
echo -e "${YELLOW}Step 2: Generate a New App Password${NC}"
echo "1. Go to: https://myaccount.google.com/security"
echo "2. Click '2-Step Verification'"
echo "3. Scroll down to 'App passwords'"
echo "4. Click 'App passwords'"
echo "5. Select app: 'Mail'"
echo "6. Select device: 'Other (Custom name)'"
echo "7. Enter: 'FitVibe Backend'"
echo "8. Click 'Generate'"
echo "9. ${RED}IMPORTANT:${NC} Copy the 16-character password immediately"
echo "   (It looks like: abcd efgh ijkl mnop)"
echo ""
echo -e "${YELLOW}Step 3: Update Your .env File${NC}"
echo ""
read -p "Do you want to update your .env file now? (y/n): " update_env

if [ "$update_env" = "y" ] || [ "$update_env" = "Y" ]; then
    echo ""
    read -p "Enter your Gmail address: " gmail_user
    read -sp "Enter your NEW App Password (16 characters, no spaces): " app_pass
    echo ""
    
    # Remove old SMTP config
    sed -i.bak '/^SMTP_USER=/d' .env 2>/dev/null || true
    sed -i.bak '/^SMTP_PASS=/d' .env 2>/dev/null || true
    
    # Add new config
    echo "SMTP_USER=${gmail_user}" >> .env
    echo "SMTP_PASS=${app_pass}" >> .env
    
    # Clean up backup
    rm -f .env.bak 2>/dev/null || true
    
    echo ""
    echo -e "${GREEN}✓ .env file updated${NC}"
    echo ""
    echo -e "${YELLOW}Important Notes:${NC}"
    echo "  • Remove ALL spaces from the App Password"
    echo "  • The password should be exactly 16 characters"
    echo "  • Make sure EMAIL_ENABLED=true in your .env"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Restart your backend server"
    echo "2. Try registering a user again"
    echo "3. Check backend logs for '[mailer] Email sent successfully'"
else
    echo ""
    echo -e "${YELLOW}Manual Update Instructions:${NC}"
    echo "1. Open your .env file"
    echo "2. Update SMTP_PASS with your new App Password (no spaces)"
    echo "3. Make sure SMTP_USER is your full Gmail address"
    echo "4. Restart the backend"
fi

echo ""
echo -e "${BLUE}Common Issues:${NC}"
echo "  • App Password has spaces → Remove all spaces"
echo "  • Using regular Gmail password → Must use App Password"
echo "  • 2-Step Verification not enabled → Enable it first"
echo "  • App Password expired → Generate a new one"
echo ""



