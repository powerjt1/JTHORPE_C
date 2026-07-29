"use strict";
// Security middleware: headers + rate limiting + production audit.
process.env.COOKIE_SECRET = "test-secret-000000000000000000000000";
process.env.BASE_URL = "http://localhost:9963";

var http = require("http");
var express = require("express");
var security = require("../src/security");

var failures = 0;
function ok(name, cond) { console.log((cond ? "PASS" : "FAIL") + " " + name); if (!cond) failures++; }

(async function () {
  var app = express();
  app.use(security.securityHeaders);
  app.get("/plain", function (req, res) { res.json({ ok: true }); });
  // tight limiter to exercise 429 quickly
  app.get("/limited", security.rateLimiter({ windowMs: 60000, max: 3, key: "test" }),
    function (req, res) { res.json({ ok: true }); });

  var server = http.createServer(app);
  await new Promise(function (r) { server.listen(9963, r); });
  var BASE = "http://localhost:9963";

  // --- headers ---
  var r = await fetch(BASE + "/plain");
  ok("CSP header present", !!r.headers.get("content-security-policy"));
  ok("X-Content-Type-Options nosniff", r.headers.get("x-content-type-options") === "nosniff");
  ok("X-Frame-Options DENY", r.headers.get("x-frame-options") === "DENY");
  ok("Referrer-Policy set", /strict-origin/.test(r.headers.get("referrer-policy") || ""));
  ok("frame-ancestors none in CSP", /frame-ancestors 'none'/.test(r.headers.get("content-security-policy") || ""));

  // --- rate limiting ---
  var codes = [];
  for (var i = 0; i < 5; i++) { var rr = await fetch(BASE + "/limited"); codes.push(rr.status); }
  ok("first 3 allowed", codes.slice(0, 3).every(function (c) { return c === 200; }));
  ok("4th+ rate-limited (429)", codes[3] === 429 && codes[4] === 429);
  var last = await fetch(BASE + "/limited");
  ok("429 sets Retry-After", !!last.headers.get("retry-after"));
  ok("RateLimit-Remaining exposed", last.headers.get("ratelimit-remaining") !== null);

  // --- production audit ---
  var savedEnv = process.env.NODE_ENV, savedSecret = process.env.COOKIE_SECRET;
  process.env.NODE_ENV = "production";
  process.env.COOKIE_SECRET = "short";
  delete require.cache[require.resolve("../src/config")];
  delete require.cache[require.resolve("../src/security")];
  var sec2 = require("../src/security");
  var a = sec2.auditProduction();
  ok("prod audit flags weak secret as fatal", a.fatals.some(function (f) { return /COOKIE_SECRET/.test(f); }));
  ok("prod audit flags insecure cookies as fatal", a.fatals.some(function (f) { return /COOKIE_SECURE/.test(f); }));
  process.env.NODE_ENV = savedEnv; process.env.COOKIE_SECRET = savedSecret;

  server.close();
  console.log(failures ? (failures + " FAILURE(S)") : "security: ALL PASSED");
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error("ERROR", e); process.exit(2); });
