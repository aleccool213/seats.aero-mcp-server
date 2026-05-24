# syntax=docker/dockerfile:1

# ---- Builder ----
FROM node:22-alpine AS builder
WORKDIR /app

# Enable pnpm via corepack (matches package.json packageManager)
RUN corepack enable

# Copy only what's needed for install first (better layer caching)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# ---- Production ----
FROM node:22-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only what we need
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Default port (Render, Fly, etc. will override via $PORT)
ENV PORT=3000
ENV NODE_ENV=production

# Switch to non-root user
USER appuser

# Expose the default port (for documentation / PaaS awareness)
EXPOSE 3000

# Healthcheck (works for both stdio and HTTP mode via /healthz when running HTTP)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e " \
    const http = require('http'); \
    const port = process.env.PORT || 3000; \
    const req = http.request({ hostname: '127.0.0.1', port, path: '/healthz', method: 'GET', timeout: 3000 }, res => { \
      if (res.statusCode === 200) process.exit(0); else process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end(); \
  " || exit 1

# Default command runs the server.
# - For local stdio (Claude Desktop etc.): just `docker run ...`
# - For remote HTTP (Grok): set MCP_TRANSPORT=http (or PORT) and the code will start the HTTP server.
CMD ["node", "build/index.js"]
