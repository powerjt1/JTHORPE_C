"use strict";

/**
 * Lucy AI — auth backend entry point.
 *
 * Serves the OAuth start/callback routes for Microsoft + Google sign-in.
 * Optionally serves the static site too (set SERVE_STATIC=true) so the whole
 * thing runs on one origin in development.
 */

var path = require("path");
var express = require("express");
var cookieParser = require("cookie-parser");

var cfg = require("./src/config");
var config = cfg.config;
var authRoutes = require("./routes/auth");

if (!config.cookieSecret) {
  // Fail fast: signed cookies are required for state/PKCE and the session.
  // eslint-disable-next-line no-console
  console.error("FATAL: COOKIE_SECRET is not set. Copy .env.example to .env and set it.");
  process.exit(1);
}

var app = express();
app.disable("x-powered-by");
app.use(cookieParser(config.cookieSecret));
app.use(express.urlencoded({ extended: false }));

// Health check
app.get("/healthz", function (req, res) {
  res.json({
    ok: true,
    providers: {
      microsoft: cfg.isProviderConfigured("microsoft"),
      google: cfg.isProviderConfigured("google")
    }
  });
});

// OAuth
app.use("/auth", authRoutes);

// Optionally serve the static marketing site from the repo root.
if (process.env.SERVE_STATIC === "true") {
  var siteRoot = path.resolve(__dirname, "..");
  app.use(express.static(siteRoot));
}

app.listen(config.port, function () {
  // eslint-disable-next-line no-console
  console.log("Lucy AI auth backend listening on " + config.baseUrl + " (port " + config.port + ")");
  // eslint-disable-next-line no-console
  console.log("Redirect URI (register this with both providers): " + config.redirectUri);
});
