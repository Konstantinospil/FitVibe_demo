# NGINX Configuration

This directory contains NGINX configuration files for the FitVibe application, including reverse proxy settings, security headers, and static file serving.

## Files

| File                         | Purpose                | Description                                          |
| ---------------------------- | ---------------------- | ---------------------------------------------------- |
| `nginx.conf`                 | Main configuration     | Core NGINX settings, includes, and global directives |
| `Dockerfile`                 | NGINX container        | Dockerfile for building NGINX image                  |
| `sites-enabled/fitvibe.conf` | Site configuration     | Virtual host configuration for FitVibe               |
| `SECURITY_HEADERS.md`        | Security documentation | Documentation of security headers and their purpose  |

## Architecture

NGINX serves as:

- **Reverse Proxy**: Routes requests to backend and frontend services
- **Static File Server**: Serves frontend static assets
- **SSL/TLS Termination**: Handles HTTPS connections
- **Load Balancer**: Distributes traffic across backend instances (if multiple)

## Configuration Structure

```
nginx.conf (main config)
├── Global settings (worker processes, connections, etc.)
├── HTTP block
│   ├── Upstream definitions (backend, frontend)
│   ├── Rate limiting zones
│   ├── Logging configuration
│   └── Includes sites-enabled/*.conf
└── sites-enabled/fitvibe.conf
    ├── Server block for HTTP
    ├── Server block for HTTPS
    ├── Location blocks (/api, /, etc.)
    └── Security headers
```

## Routing

### API Routes

All `/api/*` requests are proxied to the backend:

```nginx
location /api/ {
    proxy_pass http://backend:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Frontend Routes

All other routes serve the frontend SPA:

```nginx
location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
    index index.html;
}
```

## Security Headers

See [`SECURITY_HEADERS.md`](SECURITY_HEADERS.md) for detailed documentation.

Key security headers configured:

- **Content-Security-Policy (CSP)**: Restricts resource loading
- **Strict-Transport-Security (HSTS)**: Enforces HTTPS
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts browser features

## Rate Limiting

Rate limiting is configured to prevent abuse:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;
```

- **API endpoints**: 100 requests per minute per IP
- **Auth endpoints**: 10 requests per minute per IP

## SSL/TLS Configuration

### Production SSL

For production, configure SSL certificates:

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    # ... rest of configuration
}
```

### Let's Encrypt

Use certbot for automatic certificate management:

```bash
certbot --nginx -d fitvibe.example.com
```

## Compression

Gzip compression is enabled for text-based content:

```nginx
gzip on;
gzip_vary on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

## Logging

### Access Logs

Access logs record all requests:

```nginx
access_log /var/log/nginx/access.log combined;
```

### Error Logs

Error logs record errors and warnings:

```nginx
error_log /var/log/nginx/error.log warn;
```

### Log Rotation

Configure log rotation to prevent disk space issues:

```bash
# /etc/logrotate.d/nginx
/var/log/nginx/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
```

## Docker Deployment

### Building Image

```bash
docker build -t fitvibe-nginx -f infra/nginx/Dockerfile .
```

### Running Container

```bash
docker run -d \
  -p 80:80 -p 443:443 \
  -v $(pwd)/infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v $(pwd)/infra/nginx/sites-enabled:/etc/nginx/sites-enabled:ro \
  fitvibe-nginx
```

### Docker Compose

Include in `docker-compose.yml`:

```yaml
services:
  nginx:
    build:
      context: .
      dockerfile: infra/nginx/Dockerfile
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./infra/nginx/sites-enabled:/etc/nginx/sites-enabled:ro
      - ./apps/frontend/dist:/usr/share/nginx/html:ro
    depends_on:
      - backend
      - frontend
```

## Performance Tuning

### Worker Processes

Set based on CPU cores:

```nginx
worker_processes auto;
```

### Connections

Adjust based on expected load:

```nginx
events {
    worker_connections 1024;
    use epoll;
}
```

### Caching

Cache static assets:

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Health Checks

NGINX can perform health checks on upstream servers:

```nginx
upstream backend {
    server backend:4000 max_fails=3 fail_timeout=30s;
    health_check;
}
```

## Troubleshooting

### Configuration Test

```bash
nginx -t
```

### Reload Configuration

```bash
nginx -s reload
```

### Check Logs

```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log
```

### Common Issues

1. **502 Bad Gateway**: Backend service not running or unreachable
2. **404 Not Found**: Check `try_files` directive and file paths
3. **SSL Errors**: Verify certificate paths and permissions
4. **Rate Limiting**: Check `limit_req_zone` configuration

## Related Documentation

- [Security Headers](SECURITY_HEADERS.md)
- [Infrastructure README](../README.md)
- [Docker Configurations](../docker/README.md)
- [Backend README](../../apps/backend/README.md)


