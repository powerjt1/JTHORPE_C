"use strict";
// Ghost agents endpoints (JABB Power-AI-On-Demand / ghost-ai.html).
process.env.COOKIE_SECRET = "test-secret-000000000000000000000000";
process.env.BASE_URL = "http://localhost:9963";
process.env.WELCOME_URL = "http://localhost:8000/welcome.html";
process.env.SIGNUP_URL = "http://localhost:8000/signup.html";
delete process.env.ANTHROPIC_API_KEY; // force the deterministic fallback path

var http = require("http");
var express = require("express");
var cookieParser = require("cookie-parser");
var cfg = require("../src/config");
var ghostRoutes = require("../routes/ghost");

var failures = 0;
function ok(name, cond) { console.log((cond ? "PASS" : "FAIL") + " " + name); if (!cond) failures++; }

(async function () {
  cfg.config.email.provider = "none";
  var app = express();
  app.use(cookieParser(cfg.config.cookieSecret));
  app.use(express.json());
  app.use("/ghost-agents", ghostRoutes);
  var server = http.createServer(app);
  await new Promise(function (r) { server.listen(9963, r); });
  var BASE = "http://localhost:9963";

  // --- /ghost-agents ---
  var list = await (await fetch(BASE + "/ghost-agents")).json();
  ok("GET /ghost-agents ok", list.ok === true);
  ok("9 agents", list.agents.length === 9);
  ok("pipeline has 5 steps", list.pipeline.length === 5);
  ok("research agent present", list.agents.some(function (a) { return a.id === "research" && a.name === "Research Agent"; }));

  // --- ask (no key configured -> deterministic fallback) ---
  var ask = await (await fetch(BASE + "/ghost-agents/qa/ask", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "what edge cases should I worry about?" })
  })).json();
  ok("ask qa ok + simulated", ask.ok === true && ask.simulated === true);
  ok("ask answer in character", /stress-tested|sir/i.test(ask.answer));

  var unknown = await fetch(BASE + "/ghost-agents/nobody/ask", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: "hi" })
  });
  ok("ask unknown -> 404", unknown.status === 404);

  var customPrompt = await (await fetch(BASE + "/ghost-agents/research/ask", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "status?", systemPrompt: "irrelevant while no model key is set" })
  })).json();
  ok("custom systemPrompt accepted without erroring", customPrompt.ok === true);

  server.close();
  console.log(failures ? (failures + " FAILURE(S)") : "ghost-agents: ALL PASSED");
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error("ERROR", e); process.exit(2); });
