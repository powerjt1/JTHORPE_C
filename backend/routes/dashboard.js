"use strict";

/**
 * GET /dashboard — aggregate real state for the AIOS Command Center.
 *
 * Live figures are derived from the signed-in user's projects/tasks:
 * active/completed projects, per-agent workload, success rate, and a recent
 * activity timeline. Infrastructure-style metrics (API calls, tokens, CPU,
 * etc.) are NOT tracked by this backend and stay illustrative on the page.
 */

var express = require("express");
var router = express.Router();

var projects = require("../src/projects");
var roster = require("../src/roster");

var SESSION_COOKIE = "lucy_session";

function session(req) {
  var raw = req.signedCookies && req.signedCookies[SESSION_COOKIE];
  if (!raw) return null;
  try { var s = JSON.parse(raw); return s && s.email ? s : null; } catch (e) { return null; }
}

router.get("/", async function (req, res) {
  var s = session(req);
  if (!s) return res.status(401).json({ ok: false, error: "Sign in." });

  try {
    var list = await projects.listByOwner(s.email);
    var details = await Promise.all(list.map(function (p) { return projects.getProject(p.id); }));
    details = details.filter(Boolean);

    var active = details.filter(function (p) { return p.status !== "complete"; });
    var completed = details.filter(function (p) { return p.status === "complete"; });

    var allTasks = [];
    details.forEach(function (p) { (p.tasks || []).forEach(function (t) { allTasks.push(t); }); });
    var done = allTasks.filter(function (t) { return t.status === "done"; });
    var successRate = allTasks.length ? Math.round((done.length / allTasks.length) * 1000) / 10 : 0;

    // Per-agent workload = done / total tasks for that agent.
    var workload = roster.map(function (a) {
      var mine = allTasks.filter(function (t) { return t.agent === a.id; });
      var d = mine.filter(function (t) { return t.status === "done"; }).length;
      return { agent: a.id, name: a.name, pct: mine.length ? Math.round((d / mine.length) * 100) : 0 };
    });

    // Recent completed tasks -> timeline.
    var timeline = done
      .filter(function (t) { return t.updatedAt; })
      .sort(function (x, y) { return String(y.updatedAt).localeCompare(String(x.updatedAt)); })
      .slice(0, 6)
      .map(function (t) { return { agent: t.agent, message: t.message, at: t.updatedAt }; });

    return res.json({
      ok: true,
      live: true,
      agents: roster.map(function (a) { return { id: a.id, name: a.name, title: a.title, online: true }; }),
      kpis: {
        activeProjects: active.length,
        completedProjects: completed.length,
        totalProjects: details.length,
        agentsOnline: roster.length,
        agentsTotal: roster.length,
        tasksDone: done.length,
        successRate: successRate
      },
      health: { onTrack: active.length, atRisk: 0, delayed: 0, completed: completed.length },
      workload: workload,
      timeline: timeline
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[dashboard]", e && e.message ? e.message : e);
    return res.status(500).json({ ok: false, error: "Could not build dashboard." });
  }
});

module.exports = router;
