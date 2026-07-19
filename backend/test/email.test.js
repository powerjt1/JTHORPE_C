"use strict";
// Email transports (graph + gmail via mocked fetch) and /email routes.
process.env.COOKIE_SECRET = "test-secret-000000000000000000000000";
process.env.BASE_URL = "http://localhost:9931";
process.env.WELCOME_URL = "http://localhost:8000/welcome.html";
process.env.SIGNUP_URL = "http://localhost:8000/signup.html";

var http = require("http");
var express = require("express");
var cookieParser = require("cookie-parser");
var cfg = require("../src/config");
var emailMod = require("../src/email");
var authRoutes = require("../routes/auth");
var emailRoutes = require("../routes/email");

var failures = 0;
function ok(name, cond) { console.log((cond ? "PASS" : "FAIL") + " — " + name); if (!cond) failures++; }

(async function () {
  var realFetch = global.fetch;
  var calls = [];
  function mockFetch(seq) {
    var i = 0;
    global.fetch = function (url, opts) {
      calls.push({ url: String(url), opts: opts || {} });
      var r = seq[i++] || { status: 200, json: {} };
      return Promise.resolve({
        ok: r.status >= 200 && r.status < 300, status: r.status,
        json: function () { return Promise.resolve(r.json || {}); },
        text: function () { return Promise.resolve(JSON.stringify(r.json || {})); }
      });
    };
  }

  calls = [];
  mockFetch([{ status: 200, json: { access_token: "graph-at" } }, { status: 202, json: {} }]);
  cfg.config.email.provider = "graph";
  cfg.config.email.from = "info@jabbnetworks.com";
  cfg.config.email.graph = { tenant: "common", clientId: "gid", clientSecret: "gsec" };
  var gRes = await emailMod.sendTrialWelcome("user@acme.com", { name: "Jane Doe" });
  ok("graph: client_credentials token", /login\.microsoftonline\.com\/common\/oauth2\/v2\.0\/token/.test(calls[0].url) && /grant_type=client_credentials/.test(String(calls[0].opts.body)));
  ok("graph: sendMail as info@jabbnetworks.com", /graph\.microsoft\.com\/v1\.0\/users\/info%40jabbnetworks\.com\/sendMail/.test(calls[1].url));
  ok("graph: bearer + recipient", calls[1].opts.headers.Authorization === "Bearer graph-at" && /user@acme\.com/.test(String(calls[1].opts.body)));
  ok("graph: accepted", gRes.transport === "graph" && gRes.accepted === true);

  calls = [];
  mockFetch([{ status: 200, json: { access_token: "gmail-at" } }, { status: 200, json: { id: "msg-1" } }]);
  cfg.config.email.provider = "gmail";
  cfg.config.email.from = "jabbnetworks@gmail.com";
  cfg.config.email.gmail = { clientId: "cid", clientSecret: "csec", refreshToken: "rtok" };
  var gmRes = await emailMod.sendTrialWelcome("user@acme.com", { name: "Jane" });
  ok("gmail: refresh_token grant", /oauth2\.googleapis\.com\/token/.test(calls[0].url) && /grant_type=refresh_token/.test(String(calls[0].opts.body)));
  ok("gmail: messages.send bearer", /gmail\.googleapis\.com\/gmail\/v1\/users\/me\/messages\/send/.test(calls[1].url) && calls[1].opts.headers.Authorization === "Bearer gmail-at");
  var decoded = Buffer.from(JSON.parse(calls[1].opts.body).raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  ok("gmail: RFC822 from/to", /From: .*jabbnetworks@gmail\.com/.test(decoded) && /To: user@acme\.com/.test(decoded));
  ok("gmail: id", gmRes.transport === "gmail" && gmRes.id === "msg-1");

  global.fetch = realFetch;

  cfg.config.email.provider = "none";
  var app = express();
  app.use(cookieParser(cfg.config.cookieSecret));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use("/auth", authRoutes);
  app.use("/email", emailRoutes);
  var server = http.createServer(app);
  await new Promise(function (r) { server.listen(9931, r); });
  var BASE = "http://localhost:9931";

  var t = await fetch(BASE + "/email/trial", { method: "POST", headers: { "Content-Type": "application/json" }, redirect: "manual", body: JSON.stringify({ email: "new@acme.com" }) });
  var sessionCookie = (t.headers.get("set-cookie") || "").split(";")[0];
  ok("trial: 200 + session cookie", t.status === 200 && /lucy_session=/.test(sessionCookie));
  var badEmail = await fetch(BASE + "/email/trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "nope" }) });
  ok("trial: invalid email -> 400", badEmail.status === 400);
  var r1 = await fetch(BASE + "/email/resend", { method: "POST", headers: { cookie: sessionCookie } });
  ok("resend: with session -> ok", r1.status === 200);
  var r2 = await fetch(BASE + "/email/resend", { method: "POST" });
  ok("resend: no session -> 401", r2.status === 401);

  server.close();
  console.log(failures ? (failures + " FAILURE(S)") : "email: ALL PASSED");
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error("ERROR", e); process.exit(2); });
