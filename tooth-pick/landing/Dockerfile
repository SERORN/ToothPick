# Dockerfile para Landing Page
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json ./
RUN npm install serve

# Production runner
FROM base AS runner
WORKDIR /app

# Copy static files
COPY . .

# Create non-root user
RUN addgroup --system --gid 1001 landing
RUN adduser --system --uid 1001 landing
RUN chown -R landing:landing /app
USER landing

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

CMD ["npx", "serve", ".", "-l", "3001"]
