# Base stage
FROM node:24-alpine AS base

# Install OpenSSL for Prisma and other build dependencies if needed
RUN apk add --no-cache openssl

WORKDIR /app
# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# Install all dependencies (dev + prod) needed for build
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# We don't generate Prisma here since dev usually uses local bind mounts, but we can as a fallback
EXPOSE 5190
ENV PORT=5190
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma Client
RUN pnpx prisma generate
# Build the application
RUN pnpm build
# Optional: Keep only production dependencies for smaller image
RUN pnpm prune --prod

# Production stage
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=5190

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001 -G nodejs

# Copy built assets and necessary files
COPY --from=builder --chown=nodejs:nodejs /app/.output ./.output
COPY --from=builder --chown=nodejs:nodejs /app/src/generated/prisma ./src/generated/prisma
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

USER nodejs

EXPOSE 5190

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

CMD ["node", ".output/server/index.mjs"]
