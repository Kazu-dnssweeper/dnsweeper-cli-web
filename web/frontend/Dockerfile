# DNSweeper Frontend Multi-stage Docker Build
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S dnsweeper && \
    adduser -S dnsweeper -u 1001 -G dnsweeper

# Set proper permissions
RUN chown -R dnsweeper:dnsweeper /usr/share/nginx/html && \
    chown -R dnsweeper:dnsweeper /var/cache/nginx && \
    chown -R dnsweeper:dnsweeper /var/log/nginx && \
    chown -R dnsweeper:dnsweeper /etc/nginx/conf.d

# Switch to non-root user
USER dnsweeper

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]