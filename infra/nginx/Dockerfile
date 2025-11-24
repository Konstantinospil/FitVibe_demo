FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom NGINX configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create certbot directory for Let's Encrypt challenges
RUN mkdir -p /var/www/certbot && \
    chown -R nobody:nobody /var/www/certbot

# Create directory for SSL certificates (mounted at runtime)
RUN mkdir -p /etc/nginx/ssl && \
    chown -R nobody:nobody /etc/nginx/ssl

# Ensure proper permissions for nginx directories
RUN mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp /var/cache/nginx/scgi_temp && \
    chown -R nobody:nobody /var/cache/nginx /var/run /var/log/nginx

# Set nginx to run as nobody user
RUN sed -i 's/user  nginx;/user nobody;/' /etc/nginx/nginx.conf

# Run as non-root user (nobody)
USER nobody

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
