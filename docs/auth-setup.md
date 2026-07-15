# Sign-up / SSO setup (Microsoft & Google)

> Setup guide for the free-trial sign-up (`signup.html` + `js/signup.js`). The
> page ships **front-end only**. To make "Continue with Microsoft/Google" real
> you need OAuth app registrations **and a backend callback** — the browser must
> never exchange the auth code or hold client secrets.

## What exists today

- `signup.html` — trial sign-up page: Microsoft/Google buttons + email fallback.
- `js/signup.js` — SSO buttons hand off to the backend's start route
  (`{authBaseUrl}/auth/:provider/start`). Set `ssoEnabled: true` + `authBaseUrl`
  once the backend is live; until then the buttons show a "not connected yet"
  notice. It also surfaces `?error=…` returned by the callback.
- **`backend/`** — a Node/Express OAuth backend (Authorization Code + PKCE) that
  owns state, PKCE, the code↔token exchange (with the client secret,
  server-side), userinfo, and the session cookie. See
  [`../backend/README.md`](../backend/README.md).

## What you must add

1. **Deploy `backend/`** and give it the provider credentials via env
   (`.env`, from `.env.example`). It provides:
   - `GET /auth/:provider/start` — issues state + PKCE, redirects to consent,
   - `GET /auth/callback` — validates `state`, exchanges the `code` for tokens
     with the **client secret** (server-side only), fetches userinfo,
     finds/creates the trial account, sets a session, redirects to `WELCOME_URL`.
2. **Client IDs/secrets** in the backend `.env` (secrets server-side only, e.g.
   Azure Key Vault — never in this repo or any front-end file).
3. **Point the site at the backend:** set `authBaseUrl` + `ssoEnabled: true` in
   `js/signup.js`.

## Microsoft (Entra ID / Azure AD)

1. Azure Portal → **Entra ID → App registrations → New registration**.
2. Redirect URI (type **Web**): `https://YOUR_DOMAIN/auth/callback`.
3. Supported account types: pick to match `CONFIG.microsoft.tenant`
   (`common` = any Microsoft account, `organizations` = any work/school tenant,
   or a specific tenant GUID).
4. Copy the **Application (client) ID** → `CONFIG.microsoft.clientId`.
5. **Certificates & secrets → New client secret** → store server-side.
6. **API permissions:** delegated `openid`, `profile`, `email`, `User.Read`.
   - Endpoints used: authorize
     `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`,
     token `…/oauth2/v2.0/token`.

## Google

1. Google Cloud Console → **APIs & Services → Credentials → Create
   credentials → OAuth client ID** (type **Web application**).
2. Authorized redirect URI: `https://YOUR_DOMAIN/auth/callback`.
3. Copy the **Client ID** → `CONFIG.google.clientId`; store the secret
   server-side.
4. Configure the OAuth consent screen; scopes `openid`, `profile`, `email`.
   - Endpoints: authorize `https://accounts.google.com/o/oauth2/v2/auth`,
     token `https://oauth2.googleapis.com/token`.

## Redirect URI

`js/signup.js` defaults `redirectUri` to
`window.location.origin + "/auth/callback"`. Register the **exact** same URL
with each provider (including scheme and host). Override in `CONFIG` if your
callback lives elsewhere.

## Security notes

- **PKCE:** the backend uses PKCE (S256) — `code_challenge` on start,
  `code_verifier` on token exchange — carried in a signed httpOnly cookie.
- **Secrets never in the browser.** Client secrets and token exchange are
  server-side only (in `backend/`).
- **State/CSRF:** the backend issues a random `state` and stores it (with the
  PKCE verifier) in a signed httpOnly cookie; the callback verifies it.
- **Relation to Nexus:** end-user trial sign-in is separate from the internal
  agent connections. If a trial later needs delegated Microsoft 365 access, that
  connection should be provisioned and brokered through
  [Nexus (#0)](./agents/00-nexus-master-connector.md), not stored in the app.

## Trial email (Gmail or Outlook)

The trial welcome/confirmation is sent by the backend through the user's
ecosystem — set `EMAIL_PROVIDER` in the backend `.env`:

- **`graph`** — Microsoft Graph / Outlook, sending as **info@jabbnetworks.com**.
  Register an Entra app with the **application** permission `Mail.Send`
  (admin-consented) and set `EMAIL_GRAPH_CLIENT_ID/SECRET` (or reuse `MS_*`).
- **`gmail`** — Gmail API, sending as **jabbnetworks@gmail.com**. Create an
  OAuth client and obtain a **refresh token** for that mailbox with the
  `gmail.send` scope; set `GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN`.
- **`none`** (default) — logs instead of sending, so the flow runs without
  email config.

The backend sends the welcome email automatically after a new sign-in
(`/auth/callback`) or email-fallback sign-up (`/email/trial`), and exposes
`/email/resend` for the welcome page's "Resend email" button. When the site is
served from a different origin than the backend, set `ALLOWED_ORIGIN` so those
`fetch` calls are permitted. See [`../backend/README.md`](../backend/README.md).
