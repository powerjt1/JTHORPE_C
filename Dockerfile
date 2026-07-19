# Lucy AI — app image: Node backend that also serves the static site
# (same origin, so cookies + fetch work without CORS).
FROM node:20-alpine

WORKDIR /app

# Install backend deps first (better layer caching).
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# Backend source.
COPY backend ./backend

# Static site (served by the backend via SERVE_STATIC -> path.resolve(__dirname, "..")).
COPY index.html team.html aios.html signup.html welcome.html projects.html ./
COPY css ./css
COPY js ./js
COPY assets ./assets

ENV NODE_ENV=production \
    PORT=8787 \
    SERVE_STATIC=true

EXPOSE 8787
WORKDIR /app/backend
CMD ["node", "server.js"]
