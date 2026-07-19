# Lucy AI — Minimal Accounts DB Bridge (Python)

A tiny, **dependency-free** Python service (`http.server` + `sqlite3`) that
persists trial accounts for the Node auth backend. It's the "remote" store the
backend uses when `ACCOUNTS_STORE=remote`; otherwise the backend keeps accounts
in memory.

> Scaffold-grade but real: it uses SQLite, a shared-secret header, and a simple
> JSON API. Swap SQLite for Postgres/MySQL later without changing the Node side —
> just keep the same endpoints.

## Why a separate service?

- Keeps persistence in one place, callable by any component (not just Node).
- Lets you evolve/scale the datastore independently.
- Standard library only — nothing to `pip install`.

## Run

```bash
cd db
# optional: pick a db file + a shared secret
export DB_PATH=./lucy.db
export DB_TOKEN=$(python3 -c "import secrets; print(secrets.token_hex(24))")
python3 app.py
# -> Lucy AI DB bridge on :8799
```

Then point the Node backend at it (in `backend/.env`):

```
ACCOUNTS_STORE=remote
DB_BRIDGE_URL=http://localhost:8799
DB_TOKEN=<same value as the bridge's DB_TOKEN>
```

## Environment

| Var | Default | Purpose |
|---|---|---|
| `DB_PATH` | `./lucy.db` (next to `app.py`) | SQLite file location |
| `PORT` | `8799` | Listen port |
| `DB_TOKEN` | _(unset)_ | If set, callers must send `X-DB-Token: <value>` |

## API

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/healthz` | — | `{ ok, db }` (no auth) |
| POST | `/accounts/find-or-create` | `{ provider, sub, email, name }` | `{ account }` (with `isNew`) |
| GET | `/accounts/by-email` | `?email=` | `{ account | null }` |
| POST | `/accounts/verify` | `{ email }` | `{ updated }` (rows changed) |

Account shape:

```json
{
  "id": "google:123",
  "email": "user@acme.com",
  "name": "Jane Doe",
  "provider": "google",
  "emailVerified": true,
  "trialStartedAt": "2026-07-16T12:00:00+00:00",
  "verifiedAt": null,
  "isNew": false
}
```

Accounts created via SSO (`provider != "email"`) are `emailVerified: true` on
creation; email sign-ups start unverified until `/accounts/verify` runs (driven
by the backend's `/auth/verify` confirm link).

## Schema

`accounts(id PK, email, name, provider, email_verified, trial_started_at, verified_at)`
— created automatically on first run. See the top of `app.py`.

## Notes

- Run behind the same trust boundary as the backend (private network / same
  host); the `DB_TOKEN` is a guard, not a substitute for network isolation.
- `*.db` files are gitignored — never commit real account data.
