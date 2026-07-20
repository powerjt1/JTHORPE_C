"use strict";
// Projects engine. Runs against MEMORY by default, or the REMOTE SQLite bridge
// when ACCOUNTS_STORE=remote + DB_BRIDGE_URL + DB_TOKEN are set (used in CI).
process.env.COOKIE_SECRET = "test-secret-000000000000000000000000";
process.env.BASE_URL = "http://localhost:9961";
process.env.WELCOME_URL = "http://localhost:8000/welcome.html";
process.env.SIGNUP_URL = "http://localhost:8000/signup.html";

var http = require("http");
var express = require("express");
var cookieParser = require("cookie-parser");
var cfg = require("../src/config");
var authRoutes = require("../routes/auth");
var emailRoutes = require("../routes/email");
var projectRoutes = require("../routes/projects");

var MODE = process.env.ACCOUNTS_STORE === "remote" ? "REMOTE" : "MEMORY";
var failures = 0;
function ok(name, cond) { console.log((cond ? "PASS" : "FAIL") + " [" + MODE + "] " + name); if (!cond) failures++; }

(async function () {
  cfg.config.email.provider = "none";
  var app = express();
  app.use(cookieParser(cfg.config.cookieSecret));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use("/auth", authRoutes);
  app.use("/email", emailRoutes);
  app.use("/projects", projectRoutes);
  var server = http.createServer(app);
  await new Promise(function (r) { server.listen(9961, r); });
  var BASE = "http://localhost:9961";

  var noAuth = await fetch(BASE + "/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  ok("create without session -> 401", noAuth.status === 401);

  var uniq = "proj" + Date.now();
  var t = await fetch(BASE + "/email/trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: uniq + "@acme.com" }) });
  var cookie = (t.headers.get("set-cookie") || "").split(";")[0];
  ok("got session cookie", /lucy_session=/.test(cookie));

  var cr = await fetch(BASE + "/projects", { method: "POST", headers: { "Content-Type": "application/json", cookie: cookie }, body: JSON.stringify({ name: "Acme Corp" }) });
  var project = (await cr.json()).project;
  ok("create: 10 queued tasks", project.tasks.length === 10 && project.tasks.every(function (x) { return x.status === "queued"; }));
  ok("create: first is lucy/Orchestration", project.tasks[0].agent === "lucy" && project.tasks[0].phaseName === "Orchestration");
  ok("create: last is miakkcar", project.tasks[9].agent === "miakkcar");

  var pid = project.id, proj = project, guard = 0, sawLucyActive = false;
  while (proj.status !== "complete" && guard++ < 24) {
    var tk = await fetch(BASE + "/projects/" + pid + "/tick", { method: "POST", headers: { cookie: cookie } });
    proj = (await tk.json()).project;
    if (proj.tasks[0].status === "active") sawLucyActive = true;
  }
  ok("project completes", proj.status === "complete");
  ok("lucy went active", sawLucyActive);
  ok("kaira security done + message", proj.tasks[8].agent === "kaira" && /compliant/i.test(proj.tasks[8].message));
  ok("all tasks done", proj.tasks.every(function (x) { return x.status === "done"; }));

  var t2 = await fetch(BASE + "/email/trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: uniq + "-other@acme.com" }) });
  var cookie2 = (t2.headers.get("set-cookie") || "").split(";")[0];
  var forbidden = await fetch(BASE + "/projects/" + pid, { headers: { cookie: cookie2 } });
  ok("other user -> 403", forbidden.status === 403);

  var list = await fetch(BASE + "/projects", { headers: { cookie: cookie } });
  ok("list returns my project", (await list.json()).projects.some(function (p) { return p.id === pid; }));

  server.close();
  console.log(failures ? (failures + " FAILURE(S)") : ("projects[" + MODE + "]: ALL PASSED"));
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error("ERROR", e); process.exit(2); });
