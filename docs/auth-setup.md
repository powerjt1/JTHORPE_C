# Sign-up / SSO setup (Microsoft & Google)

> Setup guide for the free-trial sign-up (`signup.html` + `js/signup.js`). The
> page ships **front-end only**. To make "Continue with Microsoft/Google" real
> you need OAuth app registrations **and a backend callback** — the browser must
> never exchange the auth code or hold client secrets.

## What exists today

- `signup.html` — trial sign-up page: Microsoft/Google buttons + email fallback.
- `js/signup.js` — builds standards-compliant authorization-code redirect URLs
  from a `CONFIG` block. Until `clientId`s are filled in, the buttons show a
  "not connected yet" notice instead of a broken redirect.

## What you must add

1. **A backend callback** at a route you control (default assumed:
   `/auth/callback`) that:
   - validates the returned `state` against the one issued at sign-in,
   - exchanges the `code` for tokens using the provider's **token endpoint**
     with the **client secret** (server-side only),
   - creates/looks up the trial account and starts a session,
   - redirects the user into the app / trial.
2. **Client IDs** pasted into `CONFIG` in `js/signup.js`.
3. **Client secrets** stored server-side only (e.g. Azure Key Vault) — never in
   this repo or any front-end file.

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

- **PKCE:** for a public client, add PKCE (`code_challenge` / `code_verifier`).
  The current build uses the plain authorization-code redirect; add PKCE when
  you implement the callback.
- **Secrets never in the browser.** Client secrets and token exchange are
  server-side only.
- **State/CSRF:** `signup.js` issues a random `state` and stores it in
  `sessionStorage`; the callback must verify it.
- **Relation to Nexus:** end-user trial sign-in is separate from the internal
  agent connections. If a trial later needs delegated Microsoft 365 access, that
  connection should be provisioned and brokered through
  [Nexus (#0)](./agents/00-nexus-master-connector.md), not stored in the app.

## Email fallback

The email form currently logs to the console as a demo. Replace the marked
`TODO` in `js/signup.js` with a POST to your trial-provisioning endpoint
(JABB backend / service) to send a real confirmation + start the trial.
