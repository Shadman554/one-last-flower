# Production Dockerfile for One Last Flower (Railway, Render, Fly.io & Docker)
FROM node:24-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV GAME_DB_PATH=/app/data/meeting-dates.sqlite

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy dependency manifests
COPY package.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application code and assets
COPY server.mjs meeting-store.mjs engine.js story.js game.js ./
COPY index.html style.css admin.html admin.css admin.js ./
COPY assets/ ./assets/

# Prepare persistent data directory
RUN mkdir -p /app/data

# Expose default port
EXPOSE 4173

# Start the game server
CMD ["node", "server.mjs"]
