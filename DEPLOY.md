# Deploying Lucy AI

The whole stack runs from one Docker Compose file: the **static site** + **Node
auth/projects backend** + **Python SQLite bridge**, on one origin with a
persistent database volume.

```
                 ┌───────────────────────────────┐
  browser  ──▶   │  app  (Node)                   │
   :8787         │  • serves the static site      │
                 │  • /auth /email /projects API  │
                 │  • /aios-config.js (live mode) │
                 └───────────────┬───────────────┘
                                 │  http://db:8799 (internal)
                 ┌───────────────▼───────────────┐
                 │  db  (Python + SQLite)         │
                 │  • accounts, projects, tasks   │
                 │  • volume: dbdata:/data        │
                 └───────────────────────────────┘
```

## Quick start

```bash
cp .env.example .env
# set at least COOKIE_SECRET and DB_TOKEN:
#   openssl rand -hex 32   (run twice)
docker compose up --build
```

Then open <http://localhost:8787>. Because the backend serves the site, the AIOS
room and Projects dashboard come up in **live mode** automatically
(`/aios-config.js` sets `backendEnabled: true`).

- `docker compose up -d --build` — run detached.
- `docker compose logs -f app` — tail the backend.
- `docker compose down` — stop (keeps the `dbdata` volume).
- `docker compose down -v` — stop and **delete** the database volume.

## What works out of the box

- The marketing site, Team, and AIOS pages.
- The AIOS room + Projects dashboard in live mode (email sign-in → sessions →
  backend-tracked projects persisted in SQLite).
- Health check: `GET /healthz`.

## Enabling the optional integrations

These need your own credentials (see [`docs/auth-setup.md`](docs/auth-setup.md)):

- **Microsoft / Google SSO** — set `MS_CLIENT_ID/SECRET` and/or
  `GOOGLE_CLIENT_ID/SECRET`, and register the redirect URI
  `${BASE_URL}/auth/callback` with each provider.
- **Trial email** — set `EMAIL_PROVIDER=graph` (sends as `info@jabbnetworks.com`,
  needs an Entra app with the **Mail.Send** application permission) or
  `EMAIL_PROVIDER=gmail` (sends as `jabbnetworks@gmail.com`, needs a Gmail
  refresh token).

## Production notes

- Put a TLS-terminating reverse proxy (Caddy, nginx, a cloud LB) in front and
  set `COOKIE_SECURE=true`, `BASE_URL=https://your-domain`, and the matching
  `WELCOME_URL`/`SIGNUP_URL`.
- Keep secrets in `.env` (or your platform's secret store) — never commit them.
- The DB bridge is not published to the host; only the app reaches it over the
  Compose network, guarded by `DB_TOKEN`.
- Back up the `dbdata` volume. To move to Postgres/MySQL later, swap the storage
  layer inside `db/app.py` — the app's API contract stays the same.

## Data store options

Set `ACCOUNTS_STORE`:

- **`sqlite`** (recommended for single-node) — native `node:sqlite`, persistent,
  **no extra service**. Set `SQLITE_PATH=/data/aios.db` and mount a volume at
  `/data`. Survives restarts; `/healthz` reports `store.kind=sqlite`.
- **`remote`** — the separate Python SQLite bridge (`db/`) over the Compose
  network, guarded by `DB_TOKEN` (what `docker-compose.yml` wires today).
- **`memory`** — dev only; resets on restart.

Back up the store's volume. To move to Postgres/MySQL later, add a store backend
(mirror `src/sqlite.js`) — the app's async store interface stays the same.

## Running without Docker

- **Simplest (sqlite):** `cd backend && cp .env.example .env && npm install && SERVE_STATIC=true ACCOUNTS_STORE=sqlite SQLITE_PATH=./data/aios.db npm start`
- **DB bridge (remote):** `cd db && DB_TOKEN=… python3 app.py`, then
  `cd backend && SERVE_STATIC=true ACCOUNTS_STORE=remote DB_BRIDGE_URL=http://localhost:8799 npm start`

See [`backend/README.md`](backend/README.md) and [`db/README.md`](db/README.md).
