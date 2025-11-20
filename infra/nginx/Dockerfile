FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom NGINX configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create certbot directory for Let's Encrypt challenges
RUN mkdir -p /var/www/certbot

# Create directory for SSL certificates (mounted at runtime)
RUN mkdir -p /etc/nginx/ssl

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
