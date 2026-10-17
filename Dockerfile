# Multi-stage lean production Dockerfile for One Last Flower
FROM node:24-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=4173
ENV HOST=0.0.0.0
ENV GAME_DB_PATH=/app/data/meeting-dates.sqlite

# Install curl for healthcheck if needed, or use node built-in
RUN apk add --no-cache curl

# Copy dependency manifests
COPY package.json ./

# Install production dependencies (if any)
RUN npm install --omit=dev

# Copy application code and assets
COPY server.mjs meeting-store.mjs engine.js story.js game.js ./
COPY index.html style.css admin.html admin.css admin.js ./
COPY assets/ ./assets/

# Prepare persistent data volume directory
RUN mkdir -p /app/data && chown -R node:node /app

# Switch to non-privileged user for security
USER node

# Expose default game port
EXPOSE 4173

# Persistent SQLite database volume
VOLUME ["/app/data"]

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-4173}/api/health || exit 1

# Start the game server
CMD ["node", "server.mjs"]
