"use strict";

/**
 * Loads configuration from the environment and builds per-provider OAuth config.
 * No secrets are hard-coded here — everything comes from env (see .env.example).
 */

function env(name, fallback) {
  var v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

var BASE_URL = env("BASE_URL", "http://localhost:8787");
var REDIRECT_URI = env("REDIRECT_URI", BASE_URL.replace(/\/$/, "") + "/auth/callback");
var MS_TENANT = env("MS_TENANT", "common");

var config = {
  port: parseInt(env("PORT", "8787"), 10),
  baseUrl: BASE_URL,
  redirectUri: REDIRECT_URI,
  welcomeUrl: env("WELCOME_URL", "/welcome.html"),
  signupUrl: env("SIGNUP_URL", "/signup.html"),
  cookieSecret: env("COOKIE_SECRET", ""),
  cookieSecure: env("COOKIE_SECURE", "false") === "true",
  allowedOrigin: env("ALLOWED_ORIGIN", ""),
  // Behind a reverse proxy / load balancer (honor X-Forwarded-For for client IP).
  trustProxy: env("TRUST_PROXY", "false") === "true",

  // Email-verification tokens.
  tokenSecret: env("TOKEN_SECRET", env("COOKIE_SECRET", "")),
  verifyTtlMinutes: parseInt(env("VERIFY_TTL_MINUTES", "1440"), 10), // 24h
  // Where /auth/verify sends users after success (defaults to WELCOME_URL).
  verifiedUrl: env("VERIFIED_URL", ""),

  // Data store: "memory" (default, dev), "sqlite" (native node:sqlite, persistent,
  // single-process), or "remote" (Python SQLite bridge in db/).
  accountsStore: env("ACCOUNTS_STORE", "memory"),
  sqlitePath: env("SQLITE_PATH", "./data/aios.db"),
  dbBridgeUrl: env("DB_BRIDGE_URL", "http://localhost:8799"),
  dbToken: env("DB_TOKEN", ""),

  // When the backend serves the static site, expose /aios-config.js so the
  // AIOS room + projects dashboard run in live (backend-driven) mode.
  aiosLive: env("AIOS_LIVE", "true") === "true",

  providers: {
    microsoft: {
      label: "Microsoft",
      clientId: env("MS_CLIENT_ID", ""),
      clientSecret: env("MS_CLIENT_SECRET", ""),
      authorizeUrl:
        "https://login.microsoftonline.com/" + MS_TENANT + "/oauth2/v2.0/authorize",
      tokenUrl:
        "https://login.microsoftonline.com/" + MS_TENANT + "/oauth2/v2.0/token",
      userInfoUrl: "https://graph.microsoft.com/oidc/userinfo",
      scopes: env("MS_SCOPES", "openid profile email User.Read"),
      // Provider-specific extra params for the authorize request.
      extraAuthParams: { response_mode: "query" }
    },
    google: {
      label: "Google",
      clientId: env("GOOGLE_CLIENT_ID", ""),
      clientSecret: env("GOOGLE_CLIENT_SECRET", ""),
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
      scopes: env("GOOGLE_SCOPES", "openid profile email"),
      extraAuthParams: { access_type: "offline", prompt: "consent" }
    }
  },

  // Outbound email for the trial welcome/confirmation. Sent via the user's
  // ecosystem: Gmail API ("gmail") or Microsoft Graph / Outlook ("graph").
  // "none" (default) just logs — so the backend runs without email config.
  email: {
    provider: env("EMAIL_PROVIDER", "none"), // none | graph | gmail
    from: env("EMAIL_FROM", ""),             // sender mailbox address
    fromName: env("EMAIL_FROM_NAME", "Lucy AI"),
    // Microsoft Graph (Outlook) — app-only send as EMAIL_FROM (needs Mail.Send
    // application permission). Falls back to the MS_* sign-in app if unset.
    graph: {
      tenant: env("EMAIL_GRAPH_TENANT", MS_TENANT),
      clientId: env("EMAIL_GRAPH_CLIENT_ID", env("MS_CLIENT_ID", "")),
      clientSecret: env("EMAIL_GRAPH_CLIENT_SECRET", env("MS_CLIENT_SECRET", ""))
    },
    // Gmail API — send as EMAIL_FROM using an OAuth refresh token for that
    // mailbox. Falls back to the GOOGLE_* sign-in app if unset.
    gmail: {
      clientId: env("GMAIL_CLIENT_ID", env("GOOGLE_CLIENT_ID", "")),
      clientSecret: env("GMAIL_CLIENT_SECRET", env("GOOGLE_CLIENT_SECRET", "")),
      refreshToken: env("GMAIL_REFRESH_TOKEN", "")
    }
  }
};

/** True if a provider has both a client id and secret configured. */
function isProviderConfigured(name) {
  var p = config.providers[name];
  return !!(p && p.clientId && p.clientSecret);
}

module.exports = { config: config, isProviderConfigured: isProviderConfigured };
