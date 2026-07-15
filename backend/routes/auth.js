"use strict";

/**
 * Auth routes:
 *   GET /auth/:provider/start  -> begins the OAuth flow (state + PKCE, redirect)
 *   GET /auth/callback         -> validates, exchanges code, creates session
 *   POST /auth/logout          -> clears the session cookie
 */

var express = require("express");
var router = express.Router();

var cfg = require("../src/config");
var config = cfg.config;
var isProviderConfigured = cfg.isProviderConfigured;
var oauth = require("../src/oauth");
var accounts = require("../src/accounts");
var email = require("../src/email");

var TX_COOKIE = "lucy_oauth_tx"; // short-lived transaction (state + PKCE + provider)
var SESSION_COOKIE = "lucy_session";

function txCookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    signed: true,
    maxAge: 10 * 60 * 1000, // 10 minutes
    path: "/"
  };
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    signed: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/"
  };
}

function redirectWithError(res, message) {
  var url = config.signupUrl + (config.signupUrl.indexOf("?") === -1 ? "?" : "&") +
    "error=" + encodeURIComponent(message);
  return res.redirect(url);
}

// ---- Start ----
router.get("/:provider/start", function (req, res) {
  var name = req.params.provider;
  var provider = config.providers[name];

  if (!provider) {
    return res.status(404).send("Unknown provider");
  }
  if (!isProviderConfigured(name)) {
    return redirectWithError(res, provider.label + " sign-in is not configured yet.");
  }

  var state = oauth.randomToken(32);
  var pkce = oauth.createPkce();

  res.cookie(
    TX_COOKIE,
    JSON.stringify({ provider: name, state: state, verifier: pkce.verifier }),
    txCookieOptions()
  );

  var url = oauth.buildAuthorizeUrl(provider, config.redirectUri, state, pkce.challenge);
  return res.redirect(url);
});

// ---- Callback (single endpoint for all providers) ----
router.get("/callback", async function (req, res) {
  var q = req.query || {};

  // Provider-reported error (e.g. user declined consent).
  if (q.error) {
    return redirectWithError(res, String(q.error_description || q.error));
  }
  if (!q.code || !q.state) {
    return redirectWithError(res, "Missing authorization code.");
  }

  // Recover and clear the transaction cookie.
  var raw = req.signedCookies && req.signedCookies[TX_COOKIE];
  res.clearCookie(TX_COOKIE, { path: "/" });
  if (!raw) {
    return redirectWithError(res, "Your sign-in session expired. Please try again.");
  }

  var tx;
  try { tx = JSON.parse(raw); } catch (e) { tx = null; }
  if (!tx || tx.state !== q.state) {
    return redirectWithError(res, "Invalid sign-in state. Please try again.");
  }

  var provider = config.providers[tx.provider];
  if (!provider) {
    return redirectWithError(res, "Unknown provider.");
  }

  try {
    var tokens = await oauth.exchangeCodeForTokens(
      provider, String(q.code), tx.verifier, config.redirectUri
    );
    var info = await oauth.fetchUserInfo(provider, tokens.access_token);
    var profile = oauth.normalizeProfile(tx.provider, info);

    if (!profile.email) {
      return redirectWithError(res, "We couldn't read an email from your account.");
    }

    var account = accounts.findOrCreateTrialAccount(profile);

    // Send the welcome/confirmation email for brand-new trials (Gmail or
    // Outlook/Graph, per EMAIL_PROVIDER). Non-blocking — never fail sign-in
    // because email is down.
    if (account.isNew) {
      email.sendTrialWelcome(account.email, { name: account.name }).catch(function (e) {
        // eslint-disable-next-line no-console
        console.error("[auth/callback] welcome email failed:", e && e.message ? e.message : e);
      });
    }

    // Minimal session. In production, prefer a signed JWT or a server-side
    // session store; do NOT put provider tokens in the browser.
    res.cookie(
      SESSION_COOKIE,
      JSON.stringify({ id: account.id, email: account.email, name: account.name, provider: account.provider }),
      sessionCookieOptions()
    );

    var dest = config.welcomeUrl +
      (config.welcomeUrl.indexOf("?") === -1 ? "?" : "&") +
      "new=" + (account.isNew ? "1" : "0");
    return res.redirect(dest);
  } catch (err) {
    // Avoid leaking details to the browser; log server-side.
    // eslint-disable-next-line no-console
    console.error("[auth/callback]", err && err.message ? err.message : err);
    return redirectWithError(res, "Sign-in failed. Please try again.");
  }
});

// ---- Logout ----
router.post("/logout", function (req, res) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  return res.status(204).end();
});

module.exports = router;
