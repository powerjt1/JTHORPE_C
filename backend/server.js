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
var emailRoutes = require("./routes/email");
var projectRoutes = require("./routes/projects");

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
app.use(express.json());

// Minimal CORS — only needed if the site is served from a different origin and
// calls the email endpoints via fetch. Allows credentials for the one origin.
if (config.allowedOrigin) {
  app.use(function (req, res, next) {
    if (req.headers.origin === config.allowedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", config.allowedOrigin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
}

// Health check
app.get("/healthz", function (req, res) {
  res.json({
    ok: true,
    providers: {
      microsoft: cfg.isProviderConfigured("microsoft"),
      google: cfg.isProviderConfigured("google")
    },
    email: config.email.provider
  });
});

// OAuth + email + projects
app.use("/auth", authRoutes);
app.use("/email", emailRoutes);
app.use("/projects", projectRoutes);

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
