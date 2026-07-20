"use strict";
// Agents Workspace endpoints + real dashboard metrics.
process.env.COOKIE_SECRET = "test-secret-000000000000000000000000";
process.env.BASE_URL = "http://localhost:9962";
process.env.WELCOME_URL = "http://localhost:8000/welcome.html";
process.env.SIGNUP_URL = "http://localhost:8000/signup.html";

var http = require("http");
var express = require("express");
var cookieParser = require("cookie-parser");
var cfg = require("../src/config");
var emailRoutes = require("../routes/email");
var projectRoutes = require("../routes/projects");
var dashboardRoutes = require("../routes/dashboard");
var agentRoutes = require("../routes/agents");
var metrics = require("../src/metrics");

var failures = 0;
function ok(name, cond) { console.log((cond ? "PASS" : "FAIL") + " " + name); if (!cond) failures++; }

(async function () {
  cfg.config.email.provider = "none";
  var app = express();
  app.use(cookieParser(cfg.config.cookieSecret));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(function (req, res, next) {
    if (/^\/(email|projects|dashboard|agents)\b/.test(req.path)) metrics.recordApiCall();
    next();
  });
  app.use("/email", emailRoutes);
  app.use("/projects", projectRoutes);
  app.use("/dashboard", dashboardRoutes);
  app.use("/agents", agentRoutes);
  var server = http.createServer(app);
  await new Promise(function (r) { server.listen(9962, r); });
  var BASE = "http://localhost:9962";

  // --- /agents ---
  var ag = await (await fetch(BASE + "/agents")).json();
  ok("GET /agents ok", ag.ok === true);
  ok("10 agents", ag.agents.length === 10);
  ok("workflow has 10 steps", ag.workflow.length === 10);
  ok("first agent lucy w/ artifact", ag.agents[0].id === "lucy" && ag.agents[0].artifact === "project-brief.md");
  ok("agents carry inputs/outputs", Array.isArray(ag.agents[0].inputs) && Array.isArray(ag.agents[0].outputs));

  // --- ask ---
  var ask = await (await fetch(BASE + "/agents/kaira/ask", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "what do you handle?" })
  })).json();
  ok("ask kaira ok + simulated", ask.ok === true && ask.simulated === true);
  ok("ask answer mentions Kaira", /Kaira/.test(ask.answer));
  ok("ask answer references role", /security|compliance|governance/i.test(ask.answer));

  var unknown = await fetch(BASE + "/agents/nobody/ask", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: "hi" })
  });
  ok("ask unknown -> 404", unknown.status === 404);

  // --- dashboard metrics (real) ---
  var uniq = "metrics" + Date.now();
  var t = await fetch(BASE + "/email/trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: uniq + "@acme.com" }) });
  var cookie = (t.headers.get("set-cookie") || "").split(";")[0];
  var cr = await fetch(BASE + "/projects", { method: "POST", headers: { "Content-Type": "application/json", cookie: cookie }, body: JSON.stringify({ name: "Metrics Co" }) });
  var pid = (await cr.json()).project.id;
  for (var i = 0; i < 3; i++) await fetch(BASE + "/projects/" + pid + "/tick", { method: "POST", headers: { cookie: cookie } });

  var dash = await (await fetch(BASE + "/dashboard", { headers: { cookie: cookie } })).json();
  ok("dashboard ok", dash.ok === true);
  ok("metrics present", !!dash.metrics && !!dash.metrics.system);
  ok("apiCalls counted", dash.kpis.apiCalls > 0);
  ok("automationRuns >= 3", dash.metrics.automationRuns >= 3);
  ok("tokensEst derived from runs", dash.kpis.tokensEst === dash.metrics.automationRuns * 420);
  ok("system cpu is a number 0-100", typeof dash.metrics.system.cpu === "number" && dash.metrics.system.cpu >= 0 && dash.metrics.system.cpu <= 100);
  ok("system memory is a number 0-100", typeof dash.metrics.system.memory === "number" && dash.metrics.system.memory >= 0 && dash.metrics.system.memory <= 100);

  server.close();
  console.log(failures ? (failures + " FAILURE(S)") : "agents+metrics: ALL PASSED");
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error("ERROR", e); process.exit(2); });
