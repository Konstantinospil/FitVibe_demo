#!/bin/bash
# Check email configuration and test SMTP connection

echo "=== Email Configuration Check ==="
echo ""

# Check .env file
if [ -f .env ]; then
  echo "📧 Email Configuration in .env:"
  grep -E "EMAIL_ENABLED|SMTP_" .env | sed 's/PASS=.*/PASS=***/' | sed 's/\(.*\)/  \1/'
  echo ""
  
  EMAIL_ENABLED=$(grep "^EMAIL_ENABLED=" .env | cut -d'=' -f2)
  if [ "$EMAIL_ENABLED" != "true" ]; then
    echo "⚠️  WARNING: EMAIL_ENABLED is not set to 'true'"
    echo ""
  fi
else
  echo "⚠️  .env file not found"
  echo ""
fi

# Check if backend is running
echo "🔍 Checking backend logs for mailer initialization..."
echo ""
echo "Look for these log messages in your backend output:"
echo "  ✓ '[mailer] SMTP transporter initialized' - Email is configured correctly"
echo "  ✗ '[mailer] Failed to initialize SMTP transporter' - SMTP config error"
echo "  ✗ '[mailer] Email disabled, skipping send' - EMAIL_ENABLED=false"
echo "  ✗ '[mailer] Transporter not initialized' - Transporter failed to initialize"
echo ""
echo "When you register a user, you should see:"
echo "  ✓ '[mailer] Email sent successfully' - Email was sent"
echo "  ✗ '[mailer] Failed to send email' - Email sending failed"
echo "  ✗ '[auth] Failed to send verification email' - Email error caught"
echo ""
echo "=== Quick Test ==="
echo ""
echo "To test email configuration, try registering a new user and check:"
echo "1. Backend startup logs for '[mailer] SMTP transporter initialized'"
echo "2. Registration response should include debugVerificationToken (in non-production)"
echo "3. Check your email inbox (and spam folder)"
echo ""
echo "If emails aren't sending, check:"
echo "  - Backend was restarted after setting EMAIL_ENABLED=true"
echo "  - SMTP credentials are correct (Gmail app password)"
echo "  - Gmail account has 'Less secure app access' or uses App Passwords"
echo "  - Check backend logs for '[mailer]' entries"


