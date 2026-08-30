#!/bin/bash
set -e

# Generate secrets for FitVibe Kubernetes deployment
# This script helps create the secrets.yaml file with secure random values

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔐 Generating FitVibe Kubernetes secrets..."
echo ""

# Check if secrets.yaml already exists
if [ -f "secrets.yaml" ]; then
    echo "⚠️  secrets.yaml already exists!"
    read -p "Overwrite? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted"
        exit 1
    fi
fi

# Generate secure random passwords
POSTGRES_USER="fitvibe"
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Generate JWT keys if they don't exist
JWT_KEY_DIR="../docker/keys"
if [ ! -f "$JWT_KEY_DIR/jwt_rs256.key" ]; then
    echo "🔑 Generating JWT keys..."
    mkdir -p "$JWT_KEY_DIR"
    openssl genrsa -out "$JWT_KEY_DIR/jwt_rs256.key" 4096
    openssl rsa -in "$JWT_KEY_DIR/jwt_rs256.key" -pubout -out "$JWT_KEY_DIR/jwt_rs256.pub"
    echo "✓ JWT keys generated in $JWT_KEY_DIR"
fi

# Encode JWT keys to base64
JWT_PRIVATE_B64=$(cat "$JWT_KEY_DIR/jwt_rs256.key" | base64 | tr -d '\n')
JWT_PUBLIC_B64=$(cat "$JWT_KEY_DIR/jwt_rs256.pub" | base64 | tr -d '\n')

# Create database URL
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/fitvibe?sslmode=require"
REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379"

# Create secrets.yaml from template
cat > secrets.yaml <<EOF
# Auto-generated secrets file
# Generated on: $(date)
# 
# IMPORTANT: This file contains sensitive data. Never commit it to git!
# Add secrets.yaml to .gitignore

apiVersion: v1
kind: Secret
metadata:
  name: fitvibe-secrets
  namespace: fitvibe
  labels:
    app: fitvibe
type: Opaque
stringData:
  # PostgreSQL Credentials
  postgres-user: "${POSTGRES_USER}"
  postgres-password: "${POSTGRES_PASSWORD}"
  
  # Redis Credentials
  redis-password: "${REDIS_PASSWORD}"
  redis-url: "${REDIS_URL}"
  
  # Email Service (update with your SMTP settings)
  smtp-host: "REPLACE_WITH_SMTP_HOST"
  smtp-port: "587"
  smtp-user: "REPLACE_WITH_SMTP_USER"
  smtp-password: "REPLACE_WITH_SMTP_PASSWORD"
  smtp-from-email: "noreply@fitvibe.com"
  
  # Database URL
  database-url: "${DATABASE_URL}"

---
# JWT Keys (mounted as files)
apiVersion: v1
kind: Secret
metadata:
  name: jwt-keys
  namespace: fitvibe
  labels:
    app: fitvibe
type: Opaque
data:
  jwt_private.pem: "${JWT_PRIVATE_B64}"
  jwt_public.pem: "${JWT_PUBLIC_B64}"
EOF

echo "✅ secrets.yaml generated successfully!"
echo ""
echo "📝 Generated values:"
echo "   PostgreSQL User: ${POSTGRES_USER}"
echo "   PostgreSQL Password: ${POSTGRES_PASSWORD:0:10}... (hidden)"
echo "   Redis Password: ${REDIS_PASSWORD:0:10}... (hidden)"
echo ""
echo "⚠️  Next steps:"
echo "   1. Review secrets.yaml"
echo "   2. Update SMTP settings if needed"
echo "   3. Run ./setup.sh to deploy"
echo ""

