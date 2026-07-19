"use strict";
// OAuth start/callback against a mock provider.
process.env.COOKIE_SECRET = "test-secret-000000000000000000000000";
process.env.BASE_URL = "http://localhost:9911";
process.env.REDIRECT_URI = "http://localhost:9911/auth/callback";
process.env.WELCOME_URL = "http://localhost:8000/welcome.html";
process.env.SIGNUP_URL = "http://localhost:8000/signup.html";

var http = require("http");
var express = require("express");
var cookieParser = require("cookie-parser");
var cfg = require("../src/config");
var authRoutes = require("../routes/auth");

var failures = 0;
function ok(name, cond) { console.log((cond ? "PASS" : "FAIL") + " — " + name); if (!cond) failures++; }

(async function () {
  var mock = http.createServer(function (req, res) {
    if (req.method === "POST" && req.url === "/token") {
      var body = ""; req.on("data", function (c) { body += c; });
      req.on("end", function () {
        var p = new URLSearchParams(body);
        var good = p.get("client_secret") === "secret-x" && p.get("code") === "auth-code-123" &&
                   !!p.get("code_verifier") && p.get("grant_type") === "authorization_code";
        res.writeHead(good ? 200 : 400, { "Content-Type": "application/json" });
        res.end(JSON.stringify(good ? { access_token: "at-abc", id_token: "id-abc", expires_in: 3600 }
                                    : { error: "invalid_grant" }));
      });
      return;
    }
    if (req.method === "GET" && req.url === "/userinfo") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ sub: "user-777", email: "jane@acme.com", name: "Jane Doe" }));
      return;
    }
    res.writeHead(404); res.end();
  });
  await new Promise(function (r) { mock.listen(9922, r); });

  var ms = cfg.config.providers.microsoft;
  ms.clientId = "client-x"; ms.clientSecret = "secret-x";
  ms.authorizeUrl = "http://localhost:9922/authorize";
  ms.tokenUrl = "http://localhost:9922/token";
  ms.userInfoUrl = "http://localhost:9922/userinfo";

  var app = express();
  app.use(cookieParser(cfg.config.cookieSecret));
  app.use(express.urlencoded({ extended: false }));
  app.get("/healthz", function (req, res) {
    res.json({ ok: true, providers: { microsoft: cfg.isProviderConfigured("microsoft"), google: cfg.isProviderConfigured("google") } });
  });
  app.use("/auth", authRoutes);
  var server = http.createServer(app);
  await new Promise(function (r) { server.listen(9911, r); });
  var BASE = "http://localhost:9911";

  var h = await (await fetch(BASE + "/healthz")).json();
  ok("healthz: microsoft configured", h.providers.microsoft === true);
  ok("healthz: google not configured", h.providers.google === false);

  var start = await fetch(BASE + "/auth/microsoft/start", { redirect: "manual" });
  var loc = start.headers.get("location") || "";
  var setCookie = start.headers.get("set-cookie") || "";
  ok("start 302 to provider authorize", start.status === 302 && loc.indexOf("http://localhost:9922/authorize") === 0);
  ok("authorize URL has PKCE + state", /code_challenge=/.test(loc) && /code_challenge_method=S256/.test(loc) && /[?&]state=/.test(loc));
  ok("start sets signed tx cookie", /lucy_oauth_tx=/.test(setCookie));
  var state = new URL(loc).searchParams.get("state");
  var txCookie = setCookie.split(";")[0];

  var cb = await fetch(BASE + "/auth/callback?code=auth-code-123&state=" + encodeURIComponent(state),
    { headers: { cookie: txCookie }, redirect: "manual" });
  ok("callback 302 to welcome + new=1", (cb.headers.get("location") || "").indexOf("http://localhost:8000/welcome.html") === 0 && /new=1/.test(cb.headers.get("location") || ""));
  ok("callback sets session cookie", /lucy_session=/.test(cb.headers.get("set-cookie") || ""));

  var bad = await fetch(BASE + "/auth/callback?code=x&state=WRONG", { headers: { cookie: txCookie }, redirect: "manual" });
  ok("state mismatch -> signup error", (bad.headers.get("location") || "").indexOf("http://localhost:8000/signup.html?error=") === 0);

  var perr = await fetch(BASE + "/auth/callback?error=access_denied&error_description=User%20declined", { redirect: "manual" });
  ok("provider error -> signup error", /signup\.html\?error=User/.test(perr.headers.get("location") || ""));

  var g = await fetch(BASE + "/auth/google/start", { redirect: "manual" });
  ok("unconfigured provider -> signup error", (g.headers.get("location") || "").indexOf("http://localhost:8000/signup.html?error=") === 0);

  server.close(); mock.close();
  console.log(failures ? (failures + " FAILURE(S)") : "auth: ALL PASSED");
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error("ERROR", e); process.exit(2); });
