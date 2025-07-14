# DNSweeper Backend Multi-stage Docker Build
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
COPY tsconfig.json ./

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3001
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

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder --chown=dnsweeper:dnsweeper /app/dist ./dist

# Create necessary directories
RUN mkdir -p uploads logs && \
    chown -R dnsweeper:dnsweeper uploads logs

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Switch to non-root user
USER dnsweeper

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/index.js"]