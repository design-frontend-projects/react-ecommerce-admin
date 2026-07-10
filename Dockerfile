# Base stage
FROM node:24-alpine AS base

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./

# Development stage
FROM base AS dev

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5190
ENV PORT=5190

CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# Build stage
FROM base AS builder

RUN pnpm install --frozen-lockfile

COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM base AS runner

# We copy the built app and the node_modules
COPY --from=builder /app/.vinxi ./.vinxi
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 5190
ENV PORT=5190

CMD ["pnpm", "start"]
