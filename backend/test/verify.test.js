"use strict";
// Email-verification tokens + /auth/verify.
process.env.COOKIE_SECRET = "test-secret-000000000000000000000000";
process.env.BASE_URL = "http://localhost:9941";
process.env.WELCOME_URL = "http://localhost:8000/welcome.html";
process.env.SIGNUP_URL = "http://localhost:8000/signup.html";

var http = require("http");
var express = require("express");
var cookieParser = require("cookie-parser");
var cfg = require("../src/config");
var tokens = require("../src/tokens");
var accounts = require("../src/accounts");
var emailMod = require("../src/email");
var authRoutes = require("../routes/auth");
var emailRoutes = require("../routes/email");

var failures = 0;
function ok(name, cond) { console.log((cond ? "PASS" : "FAIL") + " — " + name); if (!cond) failures++; }

(async function () {
  cfg.config.email.provider = "none";

  var tok = tokens.sign({ email: "a@b.com", purpose: "verify" }, 60);
  ok("token roundtrip", tokens.verify(tok).email === "a@b.com");
  var expThrew = false; try { tokens.verify(tokens.sign({ email: "a@b.com", purpose: "verify" }, -10)); } catch (e) { expThrew = e.message === "expired"; }
  ok("expired rejected", expThrew);
  var tamThrew = false; try { tokens.verify(tok.slice(0, -2) + (tok.slice(-2) === "aa" ? "bb" : "aa")); } catch (e) { tamThrew = true; }
  ok("tampered rejected", tamThrew);

  var withLink = emailMod.buildWelcomeEmail({ name: "Jane", verifyUrl: "https://x/auth/verify?token=abc" });
  ok("email has confirm link", /Confirm my email/.test(withLink.html) && /auth\/verify\?token=abc/.test(withLink.html));
  ok("email without verifyUrl has no link", !/auth\/verify/.test(emailMod.buildWelcomeEmail({ name: "Jane" }).html));

  var app = express();
  app.use(cookieParser(cfg.config.cookieSecret));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use("/auth", authRoutes);
  app.use("/email", emailRoutes);
  var server = http.createServer(app);
  await new Promise(function (r) { server.listen(9941, r); });
  var BASE = "http://localhost:9941";

  await fetch(BASE + "/email/trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "verify@acme.com" }) });
  ok("account starts unverified", (await accounts.getByEmail("verify@acme.com")).emailVerified === false);

  var vtok = tokens.sign({ email: "verify@acme.com", purpose: "verify" }, 3600);
  var vres = await fetch(BASE + "/auth/verify?token=" + encodeURIComponent(vtok), { redirect: "manual" });
  ok("verify -> welcome?verified=1", (vres.headers.get("location") || "").indexOf("http://localhost:8000/welcome.html?verified=1") === 0);
  ok("account now verified", (await accounts.getByEmail("verify@acme.com")).emailVerified === true);

  var eres = await fetch(BASE + "/auth/verify?token=" + encodeURIComponent(tokens.sign({ email: "verify@acme.com", purpose: "verify" }, -10)), { redirect: "manual" });
  ok("expired link -> signup error", /signup\.html\?error=.*expired/i.test(eres.headers.get("location") || ""));
  var wres = await fetch(BASE + "/auth/verify?token=" + encodeURIComponent(tokens.sign({ email: "x@y.com", purpose: "login" }, 3600)), { redirect: "manual" });
  ok("wrong purpose -> signup error", (wres.headers.get("location") || "").indexOf("http://localhost:8000/signup.html?error=") === 0);

  server.close();
  console.log(failures ? (failures + " FAILURE(S)") : "verify: ALL PASSED");
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error("ERROR", e); process.exit(2); });
