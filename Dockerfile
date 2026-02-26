# Dockerfile for kjo2_app - SvelteKit Application
# Multi-stage build for optimal image size

# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:22-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# =============================================================================
# Stage 2: Builder
# =============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments — only values needed at build time
# PUBLIC_* vars are inlined by SvelteKit via $env/static/public
# CDN_BASE_URL is used in svelte.config.js paths.assets
# All private vars (DIRECTUS_TOKEN, etc.) are runtime-only via $env/dynamic/private
ARG PUBLIC_SITE_URL
ARG CDN_BASE_URL
ARG S3_BUCKET_URL
ARG NODE_ENV=production
ARG PUBLIC_CONTACT_EMAIL=contact@keyjayonline.com

ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL
ENV CDN_BASE_URL=$CDN_BASE_URL
ENV S3_BUCKET_URL=$S3_BUCKET_URL
ENV NODE_ENV=$NODE_ENV
ENV PUBLIC_CONTACT_EMAIL=$PUBLIC_CONTACT_EMAIL

# Build the application (skip if pre-built via CI artifact)
RUN [ -d build ] || npm run build

# Prune dev dependencies for smaller production image
RUN npm prune --production

# =============================================================================
# Stage 3: Production Runner
# =============================================================================
FROM node:22-alpine AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 sveltekit

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy built application and production dependencies
COPY --from=builder --chown=sveltekit:nodejs /app/build ./build
COPY --from=builder --chown=sveltekit:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=sveltekit:nodejs /app/package.json ./package.json

# Switch to non-root user
USER sveltekit

# Expose port
EXPOSE 3000

# Health check using Node.js (avoids BusyBox wget quirks in Alpine)
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD node -e "const http=require('http');http.get('http://localhost:3000/api/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# Start the application
CMD ["node", "build"]
