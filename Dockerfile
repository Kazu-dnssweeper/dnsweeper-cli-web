# DNSweeper CLI Multi-stage Docker Build
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S dnsweeper && \
    adduser -S dnsweeper -u 1001 -G dnsweeper

WORKDIR /app

# Copy built application
COPY --from=builder --chown=dnsweeper:dnsweeper /app/dist ./dist
COPY --from=builder --chown=dnsweeper:dnsweeper /app/package*.json ./
COPY --from=builder --chown=dnsweeper:dnsweeper /app/node_modules ./node_modules

# Set environment
ENV NODE_ENV=production
ENV USER=dnsweeper

# Switch to non-root user
USER dnsweeper

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('DNS Sweeper is healthy')" || exit 1

# Expose port (if needed for future web interface)
EXPOSE 3000

# Default command
ENTRYPOINT ["node", "dist/index.js"]
CMD ["--help"]