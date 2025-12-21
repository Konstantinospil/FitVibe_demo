#!/bin/sh
set -e

# Create necessary directories with proper permissions
mkdir -p /tmp/nginx \
         /var/cache/nginx/client_temp \
         /var/cache/nginx/proxy_temp \
         /var/cache/nginx/fastcgi_temp \
         /var/cache/nginx/uwsgi_temp \
         /var/cache/nginx/scgi_temp \
         /var/log/nginx

# Set ownership to nobody user (UID 65534)
chown -R 65534:65534 /tmp/nginx /var/cache/nginx /var/log/nginx

# Create log files if they don't exist and set permissions
touch /var/log/nginx/access.log /var/log/nginx/error.log
chown 65534:65534 /var/log/nginx/access.log /var/log/nginx/error.log

# Switch to nobody user and execute nginx
exec su-exec nobody:65534 nginx -g "daemon off;"

