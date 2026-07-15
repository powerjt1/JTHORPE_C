"use strict";

/**
 * Email routes:
 *   POST /email/trial   { email }  -> create trial by email + send welcome
 *   POST /email/resend             -> re-send welcome to the signed-in user
 *
 * Used by the email fallback on signup.html and the "Resend email" button on
 * welcome.html when the backend is wired up (same origin, or CORS-allowed).
 */

var express = require("express");
var router = express.Router();

var cfg = require("../src/config");
var config = cfg.config;
var accounts = require("../src/accounts");
var email = require("../src/email");

var SESSION_COOKIE = "lucy_session";
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    signed: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
  };
}

// Email-fallback sign-up: create the trial and send the welcome email.
router.post("/trial", async function (req, res) {
  var addr = req.body && typeof req.body.email === "string" ? req.body.email.trim() : "";
  if (!EMAIL_RE.test(addr)) {
    return res.status(400).json({ ok: false, error: "A valid email is required." });
  }

  var account = accounts.findOrCreateTrialAccount({ provider: "email", sub: null, email: addr, name: null });

  if (account.isNew) {
    try {
      await email.sendTrialWelcome(account.email, { name: account.name });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[email/trial] send failed:", e && e.message ? e.message : e);
      // Account exists; report soft failure so the UI can still proceed.
      return res.status(202).json({ ok: true, emailed: false });
    }
  }

  res.cookie(
    SESSION_COOKIE,
    JSON.stringify({ id: account.id, email: account.email, name: account.name, provider: account.provider }),
    sessionCookieOptions()
  );
  return res.json({ ok: true, emailed: account.isNew, isNew: account.isNew });
});

// Re-send the welcome email to the currently signed-in user.
router.post("/resend", async function (req, res) {
  var raw = req.signedCookies && req.signedCookies[SESSION_COOKIE];
  if (!raw) return res.status(401).json({ ok: false, error: "Not signed in." });

  var session;
  try { session = JSON.parse(raw); } catch (e) { session = null; }
  if (!session || !session.email) {
    return res.status(401).json({ ok: false, error: "Invalid session." });
  }

  try {
    await email.sendTrialWelcome(session.email, { name: session.name });
    return res.json({ ok: true, email: session.email });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[email/resend] send failed:", e && e.message ? e.message : e);
    return res.status(502).json({ ok: false, error: "Could not send email right now." });
  }
});

module.exports = router;
