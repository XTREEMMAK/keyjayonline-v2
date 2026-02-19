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

# Build arguments for environment variables during build
ARG DIRECTUS_URL
ARG DIRECTUS_TOKEN
ARG PUBLIC_SITE_URL
ARG CDN_BASE_URL
ARG S3_BUCKET_URL
ARG USE_CDN_FOR_ASSETS=true
ARG NODE_ENV=production
ARG IGDB_CLIENT_ID=placeholder
ARG IGDB_ACCESS_TOKEN=placeholder
ARG DISCORD_BOT_TOKEN=placeholder
ARG DISCORD_USER_ID=placeholder
ARG PUBLIC_CONTACT_EMAIL=contact@keyjayonline.com

# Set build-time environment variables
ENV DIRECTUS_URL=$DIRECTUS_URL
ENV DIRECTUS_TOKEN=$DIRECTUS_TOKEN
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL
ENV CDN_BASE_URL=$CDN_BASE_URL
ENV S3_BUCKET_URL=$S3_BUCKET_URL
ENV USE_CDN_FOR_ASSETS=$USE_CDN_FOR_ASSETS
ENV NODE_ENV=$NODE_ENV
ENV IGDB_CLIENT_ID=$IGDB_CLIENT_ID
ENV IGDB_ACCESS_TOKEN=$IGDB_ACCESS_TOKEN
ENV DISCORD_BOT_TOKEN=$DISCORD_BOT_TOKEN
ENV DISCORD_USER_ID=$DISCORD_USER_ID
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

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "build"]
