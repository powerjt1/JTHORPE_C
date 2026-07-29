"use strict";

/**
 * Security middleware — dependency-free (no helmet/express-rate-limit).
 *
 * - securityHeaders: sensible response headers (framing, sniffing, referrer,
 *   permissions, and a CSP that still lets the static site work). HSTS is only
 *   sent when cookies/serving are marked secure (HTTPS).
 * - rateLimiter: a small in-memory fixed-window limiter keyed by client IP,
 *   for abuse-prone endpoints (auth, email, agent asks). Single-node only; a
 *   distributed store is a production follow-up.
 * - clientIp: honors X-Forwarded-For when trustProxy is on.
 */

var config = require("./config").config;

function clientIp(req) {
  if (config.trustProxy) {
    var xff = req.headers["x-forwarded-for"];
    if (xff) return String(xff).split(",")[0].trim();
  }
  return (req.socket && req.socket.remoteAddress) || req.ip || "unknown";
}

// Content-Security-Policy tuned so the existing site keeps working:
// self for scripts (incl. vendored three.min.js) with inline allowed (pages use
// inline <script>/style=), Google Fonts allowed, everything else same-origin.
var CSP = [
  "default-src 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'"
].join("; ");

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(self), camera=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Content-Security-Policy", CSP);
  if (config.cookieSecure) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

/**
 * Fixed-window rate limiter.
 * @param {{windowMs:number, max:number, key?:string}} opts
 */
function rateLimiter(opts) {
  var windowMs = opts.windowMs || 60000;
  var max = opts.max || 60;
  var bucketName = opts.key || "default";
  var hits = new Map(); // ip -> { count, resetAt }

  // Opportunistic cleanup so the map doesn't grow unbounded.
  var sweep = setInterval(function () {
    var now = Date.now();
    hits.forEach(function (v, k) { if (v.resetAt <= now) hits.delete(k); });
  }, windowMs);
  if (sweep.unref) sweep.unref(); // don't keep the process alive just for cleanup

  return function (req, res, next) {
    var now = Date.now();
    var ip = clientIp(req);
    var k = bucketName + ":" + ip;
    var rec = hits.get(k);
    if (!rec || rec.resetAt <= now) {
      rec = { count: 0, resetAt: now + windowMs };
      hits.set(k, rec);
    }
    rec.count += 1;
    var remaining = Math.max(0, max - rec.count);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    if (rec.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((rec.resetAt - now) / 1000)));
      return res.status(429).json({ ok: false, error: "Too many requests. Please slow down." });
    }
    next();
  };
}

/**
 * Log/enforce production guardrails at boot. Returns a list of warnings.
 * In production (NODE_ENV=production) a missing/weak secret or insecure cookies
 * are hard failures.
 */
function auditProduction() {
  var isProd = process.env.NODE_ENV === "production";
  var warnings = [];
  var fatals = [];

  if (!config.cookieSecret || config.cookieSecret.length < 32) {
    (isProd ? fatals : warnings).push("COOKIE_SECRET should be a long random value (>= 32 chars).");
  }
  if (isProd && !config.cookieSecure) {
    fatals.push("COOKIE_SECURE must be true in production (HTTPS).");
  }
  if (isProd && !config.allowedOrigin && process.env.SERVE_STATIC !== "true") {
    warnings.push("ALLOWED_ORIGIN is empty; cross-origin browser calls will be blocked.");
  }
  return { warnings: warnings, fatals: fatals, isProd: isProd };
}

module.exports = {
  securityHeaders: securityHeaders,
  rateLimiter: rateLimiter,
  auditProduction: auditProduction,
  clientIp: clientIp
};
