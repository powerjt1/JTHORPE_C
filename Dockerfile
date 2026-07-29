# Lucy AI — app image: Node backend that also serves the static site
# (same origin, so cookies + fetch work without CORS).
# Node 22 (>= 22.5) so the built-in node:sqlite store is available.
FROM node:22-alpine

WORKDIR /app

# Install backend deps first (better layer caching).
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# Backend source.
COPY backend ./backend

# Static site (served by the backend via SERVE_STATIC -> path.resolve(__dirname, "..")).
# Copy every root page so new pages (workspace, assembly, city, command-center…)
# ship automatically.
COPY *.html ./
COPY css ./css
COPY js ./js
COPY assets ./assets

ENV NODE_ENV=production \
    PORT=8787 \
    SERVE_STATIC=true

EXPOSE 8787
WORKDIR /app/backend
CMD ["node", "server.js"]
