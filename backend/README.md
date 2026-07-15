# Lucy AI — Auth Backend (Microsoft + Google SSO)

OAuth 2.0 **Authorization Code + PKCE** backend for the free-trial sign-up. It
owns the secure half of sign-in — state, PKCE, the code↔token exchange (with the
client secret, server-side only), userinfo, and the session cookie. The static
site's SSO buttons just hand off to it.

> **Scaffold.** The account store is in-memory and the session is a minimal
> signed cookie. Swap both for your real database / session layer before
> production. No secrets are committed — everything comes from `.env`.

## Flow

```
signup.html  ──click──▶  GET /auth/:provider/start
                          • issues state + PKCE, sets short-lived signed cookie
                          • 302 → provider consent screen
provider  ───302──▶  GET /auth/callback?code&state
                          • verifies state, exchanges code (+secret+verifier)
                          • fetches userinfo, finds/creates trial account
                          • sets session cookie, 302 → WELCOME_URL
```

One callback (`/auth/callback`) serves both providers; the provider is recovered
from the signed transaction cookie.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/auth/microsoft/start` | Begin Microsoft sign-in |
| GET | `/auth/google/start` | Begin Google sign-in |
| GET | `/auth/callback` | OAuth redirect target (both providers); sends welcome email on new trials |
| POST | `/auth/logout` | Clear the session cookie |
| POST | `/email/trial` | Email-fallback sign-up: create trial + send welcome |
| POST | `/email/resend` | Re-send the welcome email to the signed-in user |
| GET | `/healthz` | Liveness + which providers/email transport are configured |

## Email (Gmail or Outlook)

The trial welcome/confirmation email is sent through the user's ecosystem —
pick the transport with `EMAIL_PROVIDER`:

| `EMAIL_PROVIDER` | Sends via | Sender (`EMAIL_FROM`) | Needs |
|---|---|---|---|
| `none` (default) | logs to console | — | nothing (dev) |
| `graph` | Microsoft Graph / Outlook | `info@jabbnetworks.com` | Entra app with **Mail.Send** application permission (admin-consented) |
| `gmail` | Gmail API | `jabbnetworks@gmail.com` | OAuth client + a **refresh token** for that mailbox with the `gmail.send` scope |

Set the credentials in `.env` (see `.env.example`). The send is fired
after account creation and never blocks sign-in if email is down.

## Run locally

```bash
cd backend
cp .env.example .env          # then fill in the values
npm install
# generate a cookie secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm start
```

To run the site and backend on one origin during development, serve the static
files from the backend:

```bash
SERVE_STATIC=true npm start   # site + API on http://localhost:8787
```

Then set `authBaseUrl: ""` and `ssoEnabled: true` in `js/signup.js`.

## Configure the providers

See [`../docs/auth-setup.md`](../docs/auth-setup.md) for the Azure AD and Google
app-registration steps. In short:

1. Register a **Web** app with each provider.
2. Set the redirect URI to **exactly** `${BASE_URL}/auth/callback` (or your
   `REDIRECT_URI`) for both.
3. Put the client IDs/secrets and scopes in `.env`.
4. `GET /healthz` should then report `microsoft: true` / `google: true`.

## Environment

See [`.env.example`](./.env.example) for the full list. Key ones:

- `BASE_URL` / `REDIRECT_URI` — must match the registered redirect URI.
- `COOKIE_SECRET` — required; signs the state/PKCE and session cookies.
- `COOKIE_SECURE=true` in production (HTTPS).
- `WELCOME_URL` / `SIGNUP_URL` — where users land after success / error.
- `MS_*`, `GOOGLE_*` — per-provider client id/secret/tenant/scopes.

## Security notes

- Client secrets and token exchange are **server-side only** — never shipped to
  the browser.
- PKCE (S256) + `state` (signed httpOnly cookie) protect the code flow.
- Provider tokens are **not** returned to the browser. If a trial later needs
  delegated Microsoft 365 access, broker that connection through **Nexus**
  (`../docs/agents/00-nexus-master-connector.md`), don't store tokens in the app.
- Replace the in-memory account store and cookie session with real
  infrastructure (database + JWT or session store) for production.

## Deploy

Any Node 18+ host works (Azure App Service, Container Apps, a VM, etc.).
Provide the env vars, register the deployed `…/auth/callback` URL with both
providers, and point the site's `authBaseUrl` at the backend's public URL.
