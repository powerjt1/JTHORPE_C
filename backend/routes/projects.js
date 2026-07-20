"use strict";

/**
 * Projects routes — the server-tracked orchestration for the AIOS room.
 *   POST /projects            { name }   -> create a project + seed 8 tasks
 *   GET  /projects                       -> list the signed-in user's projects
 *   GET  /projects/:id                   -> project + tasks
 *   POST /projects/:id/tick              -> advance one step (server-driven)
 *
 * Requires a signed-in session (the lucy_session cookie set at sign-in).
 * NOTE: task "results" are simulated status messages tracked/persisted by the
 * backend. Real Power Platform execution is a later phase (see
 * docs/avatar-system.md) and would run through Nexus.
 */

var express = require("express");
var router = express.Router();
var crypto = require("crypto");

var projects = require("../src/projects");

var SESSION_COOKIE = "lucy_session";

// The orchestration script: one task per specialist, in order.
var PHASES = [
  { agent: "lucy",      name: "Orchestration",         active: "Briefing the team and planning the work.",        done: "Plan set. Team briefed." },
  { agent: "julian",    name: "Architecture",          active: "Designing the architecture and environments.",     done: "Architecture approved." },
  { agent: "jabb",      name: "Environment setup",     active: "Provisioning environments and connections.",       done: "Environments provisioned." },
  { agent: "ryan",      name: "Data & Fabric",         active: "Building the lakehouse and semantic models.",       done: "Data foundation ready." },
  { agent: "alex",      name: "Automation & RPA",      active: "Building the automations and flows.",              done: "Flows built and passing." },
  { agent: "brianna",   name: "App development",       active: "Building the app and its screens.",                done: "App built and published." },
  { agent: "bianca",    name: "Dashboards & portals",  active: "Creating dashboards and the client portal.",       done: "Dashboards and portal live." },
  { agent: "christina", name: "QA & release",          active: "Running tests and preparing the release.",         done: "Tests green. Release staged." },
  { agent: "kaira",     name: "Security & compliance", active: "Scanning for threats and validating compliance.",  done: "Security validated. Compliant." },
  { agent: "miakkcar",  name: "Product & launch",      active: "Polishing the experience and prepping launch.",    done: "Experience polished. Ready to launch." }
];

function session(req) {
  var raw = req.signedCookies && req.signedCookies[SESSION_COOKIE];
  if (!raw) return null;
  try { var s = JSON.parse(raw); return s && s.email ? s : null; } catch (e) { return null; }
}

function requireOwner(req, res, project) {
  var s = session(req);
  if (!s) { res.status(401).json({ ok: false, error: "Sign in to run a live project." }); return null; }
  if (project && project.ownerEmail !== s.email) { res.status(403).json({ ok: false, error: "Not your project." }); return null; }
  return s;
}

// Create a project + seed one queued task per phase.
router.post("/", async function (req, res) {
  var s = session(req);
  if (!s) return res.status(401).json({ ok: false, error: "Sign in to run a live project." });

  var name = (req.body && req.body.name && String(req.body.name).trim()) || "New client project";
  var id = crypto.randomUUID();
  var project = { id: id, name: name, ownerEmail: s.email, status: "active", createdAt: new Date().toISOString() };

  try {
    await projects.createProject(project);
    for (var i = 0; i < PHASES.length; i++) {
      await projects.addTask({
        id: crypto.randomUUID(), projectId: id, agent: PHASES[i].agent,
        phase: i, phaseName: PHASES[i].name, orderIndex: i, status: "queued", message: ""
      });
    }
    var full = await projects.getProject(id);
    return res.json({ ok: true, project: full });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[projects] create failed:", e && e.message ? e.message : e);
    return res.status(500).json({ ok: false, error: "Could not create project." });
  }
});

// List the signed-in user's projects.
router.get("/", async function (req, res) {
  var s = session(req);
  if (!s) return res.status(401).json({ ok: false, error: "Sign in." });
  var list = await projects.listByOwner(s.email);
  return res.json({ ok: true, projects: list });
});

// Get one project + its tasks.
router.get("/:id", async function (req, res) {
  var project = await projects.getProject(req.params.id);
  if (!project) return res.status(404).json({ ok: false, error: "Not found." });
  if (!requireOwner(req, res, project)) return;
  return res.json({ ok: true, project: project });
});

// Advance one step: complete the active task, activate the next queued one.
router.post("/:id/tick", async function (req, res) {
  var project = await projects.getProject(req.params.id);
  if (!project) return res.status(404).json({ ok: false, error: "Not found." });
  if (!requireOwner(req, res, project)) return;

  try {
    var active = project.tasks.find(function (t) { return t.status === "active"; });
    if (active) {
      await projects.updateTask(active.id, { status: "done", message: PHASES[active.phase].done });
    }
    var next = project.tasks.find(function (t) { return t.status === "queued"; });
    if (next) {
      await projects.updateTask(next.id, { status: "active", message: PHASES[next.phase].active });
    }

    var refreshed = await projects.getProject(req.params.id);
    var open = refreshed.tasks.some(function (t) { return t.status !== "done"; });
    if (!open && refreshed.status !== "complete") {
      await projects.updateProject(req.params.id, { status: "complete" });
      refreshed.status = "complete";
    }
    return res.json({ ok: true, project: refreshed });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[projects] tick failed:", e && e.message ? e.message : e);
    return res.status(500).json({ ok: false, error: "Could not advance project." });
  }
});

module.exports = router;
