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

CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# Build stage
FROM base AS builder

# Install dependencies
RUN pnpm install --frozen-lockfile

COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/app.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
