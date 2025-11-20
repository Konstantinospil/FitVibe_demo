# NGINX Security Configuration Guide

**Version:** 1.0
**Last Updated:** 2025-11-11
**Owner:** DevOps & Security Team

This document provides the canonical NGINX configuration for FitVibe, including security headers, TLS settings, OCSP stapling, and edge protection controls.

---

## Table of Contents

- [Overview](#overview)
- [TLS Configuration](#tls-configuration)
- [Security Headers](#security-headers)
- [Rate Limiting](#rate-limiting)
- [OCSP Stapling](#ocsp-stapling)
- [Complete Configuration Example](#complete-configuration-example)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Overview

FitVibe uses NGINX as a reverse proxy and edge layer to:

1. Terminate TLS 1.3 connections with modern cipher suites
2. Apply defense-in-depth security headers (CSP, HSTS, etc.)
3. Rate-limit and throttle abusive clients
4. Enable OCSP stapling for certificate validation
5. Compress and cache static assets
6. Route requests to the backend application server

**Architecture:**

```
Internet → Cloudflare/CDN → NGINX (TLS termination + headers) → Backend (Node.js/Express)
```

---

## TLS Configuration

### Minimum Requirements

- **Protocol:** TLS 1.3 only (TLS 1.2 fallback permitted with strict ciphers)
- **Certificate:** Let's Encrypt or commercial CA with automatic renewal
- **Key Size:** RSA 2048-bit minimum; ECDSA P-256 preferred
- **HSTS:** Enabled with `max-age=31536000; includeSubDomains; preload`

### NGINX TLS Block

```nginx
# TLS 1.3 with TLS 1.2 fallback
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;

# Modern cipher suite (TLS 1.2 + 1.3)
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';

# SSL session settings
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;

# Certificate paths
ssl_certificate /etc/letsencrypt/live/api.fitvibe.app/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/api.fitvibe.app/privkey.pem;
ssl_trusted_certificate /etc/letsencrypt/live/api.fitvibe.app/chain.pem;

# Diffie-Hellman parameters (2048-bit minimum)
ssl_dhparam /etc/nginx/dhparam.pem;
```

### Certificate Renewal

Certificates are automatically renewed via `certbot`:

```bash
# Install certbot
apt-get install certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d api.fitvibe.app -d staging.fitvibe.app

# Automatic renewal (systemd timer)
systemctl enable certbot.timer
systemctl start certbot.timer

# Test renewal
certbot renew --dry-run
```

---

## Security Headers

### Content Security Policy (CSP)

**Production CSP:**

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.fitvibe.app; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;" always;
```

**Key Directives:**

- `default-src 'self'` — Only allow resources from same origin
- `script-src 'self'` — Block inline scripts and eval()
- `style-src 'self' 'unsafe-inline'` — Allow inline styles (required for some libraries)
- `img-src 'self' data: https:` — Images from self, data URIs, and HTTPS sources
- `connect-src 'self' https://api.fitvibe.app` — API calls to backend only
- `frame-ancestors 'none'` — Prevent clickjacking
- `upgrade-insecure-requests` — Auto-upgrade HTTP to HTTPS

### HTTP Strict Transport Security (HSTS)

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

**Configuration:**

- `max-age=31536000` — 1 year duration
- `includeSubDomains` — Apply to all subdomains
- `preload` — Eligible for HSTS preload list

**Preload List Submission:**

Submit to https://hstspreload.org/ after verifying:

1. Valid HTTPS certificate
2. HTTPS redirect from HTTP (301)
3. HSTS header on base domain

### X-Frame-Options

```nginx
add_header X-Frame-Options "DENY" always;
```

Prevents the site from being embedded in `<iframe>`, `<frame>`, or `<object>` tags.

### X-Content-Type-Options

```nginx
add_header X-Content-Type-Options "nosniff" always;
```

Prevents MIME-type sniffing attacks.

### Referrer-Policy

```nginx
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

Sends full referrer for same-origin, origin only for HTTPS→HTTPS, nothing for HTTPS→HTTP.

### Permissions-Policy

```nginx
add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=()" always;
```

Disables sensitive browser features by default.

### Complete Header Block

```nginx
# Security Headers
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.fitvibe.app; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;" always;
```

---

## Rate Limiting

### Global Rate Limits

```nginx
# Define rate limit zones (10MB memory = ~160k IPs)
limit_req_zone $binary_remote_addr zone=global:10m rate=120r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;

# Apply to location blocks
location / {
    limit_req zone=global burst=20 nodelay;
    proxy_pass http://backend;
}

location ~ ^/api/v1/auth/(login|register|refresh) {
    limit_req zone=auth burst=5 nodelay;
    proxy_pass http://backend;
}

location /api/ {
    limit_req zone=api burst=10 nodelay;
    proxy_pass http://backend;
}
```

**Configuration:**

- `global` zone: 120 requests/minute (2 req/sec) with burst of 20
- `auth` zone: 10 requests/minute for auth endpoints with burst of 5
- `api` zone: 60 requests/minute for general API with burst of 10

### Connection Limits

```nginx
# Limit connections per IP
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

location / {
    limit_conn conn_limit 10;
}
```

---

## OCSP Stapling

OCSP (Online Certificate Status Protocol) stapling allows NGINX to cache certificate revocation status and serve it to clients, reducing TLS handshake latency.

### Configuration

```nginx
# Enable OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;

# Trusted certificate for verification
ssl_trusted_certificate /etc/letsencrypt/live/api.fitvibe.app/chain.pem;

# DNS resolver (Google Public DNS)
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

### Verification

Test OCSP stapling:

```bash
echo | openssl s_client -connect api.fitvibe.app:443 -status -servername api.fitvibe.app 2>&1 | grep "OCSP Response Status"
```

Expected output:

```
OCSP Response Status: successful (0x0)
```

---

## Complete Configuration Example

### `/etc/nginx/sites-available/fitvibe-api`

```nginx
# Upstream backend servers
upstream backend {
    server 127.0.0.1:4000;
    keepalive 32;
}

# Rate limit zones
limit_req_zone $binary_remote_addr zone=global:10m rate=120r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name api.fitvibe.app;

    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.fitvibe.app;

    # TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';

    ssl_certificate /etc/letsencrypt/live/api.fitvibe.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.fitvibe.app/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/api.fitvibe.app/chain.pem;

    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_dhparam /etc/nginx/dhparam.pem;

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.fitvibe.app; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;" always;

    # Logging
    access_log /var/log/nginx/fitvibe-api-access.log combined;
    error_log /var/log/nginx/fitvibe-api-error.log warn;

    # Connection limits
    limit_conn conn_limit 10;

    # Health check (bypass rate limiting)
    location = /health {
        access_log off;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    # Metrics endpoint (restrict to internal monitoring)
    location = /metrics {
        access_log off;
        allow 10.0.0.0/8;      # Internal network
        allow 172.16.0.0/12;   # Docker networks
        deny all;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    # Auth endpoints (strict rate limiting)
    location ~ ^/api/v1/auth/(login|register|refresh|verify|password) {
        limit_req zone=auth burst=5 nodelay;

        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $request_id;

        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }

    # General API endpoints
    location /api/ {
        limit_req zone=api burst=10 nodelay;

        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $request_id;

        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files (if serving from NGINX)
    location /static/ {
        alias /var/www/fitvibe/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

---

## Verification

### Test Configuration

```bash
# Test NGINX configuration syntax
nginx -t

# Reload NGINX
systemctl reload nginx
```

### Security Headers Check

```bash
# Check all security headers
curl -I https://api.fitvibe.app

# Expected headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# Content-Security-Policy: default-src 'self'; ...
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Referrer-Policy: strict-origin-when-cross-origin
```

### SSL Labs Test

Test TLS configuration at: https://www.ssllabs.com/ssltest/

**Target Grade:** A+ with the following:

- TLS 1.3 support
- Forward secrecy
- HSTS enabled
- No weak ciphers

### Security Headers Check

Use https://securityheaders.com/ to verify all headers are correctly set.

**Target Grade:** A+

---

## Troubleshooting

### Issue: OCSP Stapling Not Working

**Symptoms:**

```bash
echo | openssl s_client -connect api.fitvibe.app:443 -status
# Shows: OCSP response: no response sent
```

**Solutions:**

1. Check resolver configuration:

   ```nginx
   resolver 8.8.8.8 8.8.4.4 valid=300s;
   ```

2. Verify certificate chain is complete:

   ```bash
   openssl verify -CAfile /etc/letsencrypt/live/api.fitvibe.app/chain.pem \
                  /etc/letsencrypt/live/api.fitvibe.app/cert.pem
   ```

3. Check NGINX error logs:
   ```bash
   tail -f /var/log/nginx/error.log | grep -i ocsp
   ```

### Issue: Rate Limiting Too Aggressive

**Symptoms:** Legitimate users getting 429 Too Many Requests

**Solutions:**

1. Increase burst size:

   ```nginx
   limit_req zone=api burst=20 nodelay;  # Increase from 10 to 20
   ```

2. Whitelist trusted IPs:

   ```nginx
   geo $limit {
       default 1;
       10.0.0.0/8 0;      # Internal network
       1.2.3.4 0;         # Monitoring service
   }

   map $limit $limit_key {
       0 "";
       1 $binary_remote_addr;
   }

   limit_req_zone $limit_key zone=api:10m rate=60r/m;
   ```

### Issue: CSP Blocking Required Resources

**Symptoms:** Browser console shows CSP violations

**Solutions:**

1. Add specific origins to CSP directives:

   ```nginx
   add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://trusted-cdn.com; ..." always;
   ```

2. Use CSP report-only mode during testing:

   ```nginx
   add_header Content-Security-Policy-Report-Only "..." always;
   ```

3. Implement CSP reporting endpoint to monitor violations

---

## References

- [NGINX Security Headers](https://nginx.org/en/docs/http/ngx_http_headers_module.html)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [HSTS Preload List](https://hstspreload.org/)
