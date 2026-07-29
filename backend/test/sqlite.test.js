"use strict";
// Native SQLite store: accounts + projects round-trip and real on-disk persistence.
var os = require("os");
var path = require("path");
var fs = require("fs");

var DBFILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "aios-sqlite-")), "test.db");
process.env.ACCOUNTS_STORE = "sqlite";
process.env.SQLITE_PATH = DBFILE;
process.env.COOKIE_SECRET = "test-secret-000000000000000000000000";

var accounts = require("../src/accounts");
var projects = require("../src/projects");

var failures = 0;
function ok(name, cond) { console.log((cond ? "PASS" : "FAIL") + " " + name); if (!cond) failures++; }

(async function () {
  // --- accounts ---
  var a1 = await accounts.findOrCreateTrialAccount({ provider: "email", email: "Sam@acme.com", name: "Sam" });
  ok("account created isNew", a1.isNew === true && a1.emailVerified === false);
  var a2 = await accounts.findOrCreateTrialAccount({ provider: "email", email: "Sam@acme.com", name: "Sam" });
  ok("second find is not new", a2.isNew === false);
  ok("getByEmail case-insensitive", (await accounts.getByEmail("sam@acme.com")).email === "Sam@acme.com");
  ok("markVerified updates 1", (await accounts.markVerifiedByEmail("sam@acme.com")) === 1);
  ok("now verified", (await accounts.getByEmail("sam@acme.com")).emailVerified === true);
  ok("verify is idempotent (0 the 2nd time)", (await accounts.markVerifiedByEmail("sam@acme.com")) === 0);

  // --- projects + tasks ---
  var pid = "proj-" + Date.now();
  await projects.createProject({ id: pid, name: "Acme", ownerEmail: "sam@acme.com", status: "active", createdAt: new Date().toISOString() });
  await projects.addTask({ id: "t1", projectId: pid, agent: "lucy", phase: 0, phaseName: "Orchestration", orderIndex: 0, status: "queued", message: "" });
  await projects.addTask({ id: "t2", projectId: pid, agent: "julian", phase: 1, phaseName: "Architecture", orderIndex: 1, status: "queued", message: "" });
  var full = await projects.getProject(pid);
  ok("project has 2 tasks in order", full.tasks.length === 2 && full.tasks[0].agent === "lucy" && full.tasks[1].agent === "julian");
  await projects.updateTask("t1", { status: "done", message: "Plan set.", updatedAt: new Date().toISOString() });
  var full2 = await projects.getProject(pid);
  ok("task update persisted", full2.tasks[0].status === "done" && /Plan set/.test(full2.tasks[0].message));
  await projects.updateProject(pid, { status: "complete" });
  ok("project status updated", (await projects.getProject(pid)).status === "complete");
  ok("listByOwner returns project", (await projects.listByOwner("sam@acme.com")).some(function (p) { return p.id === pid; }));

  // --- persistence to disk: reopen the same file with a fresh handle ---
  var DatabaseSync = require("node:sqlite").DatabaseSync;
  var raw = new DatabaseSync(DBFILE);
  var accN = raw.prepare("SELECT COUNT(*) c FROM accounts").get().c;
  var projN = raw.prepare("SELECT COUNT(*) c FROM projects WHERE id = ?").get(pid).c;
  var taskN = raw.prepare("SELECT COUNT(*) c FROM tasks WHERE project_id = ?").get(pid).c;
  raw.close();
  ok("rows persisted on disk (accounts>=1)", Number(accN) >= 1);
  ok("project row on disk", Number(projN) === 1);
  ok("task rows on disk (2)", Number(taskN) === 2);

  try { fs.rmSync(path.dirname(DBFILE), { recursive: true, force: true }); } catch (e) {}
  console.log(failures ? (failures + " FAILURE(S)") : "sqlite: ALL PASSED");
  process.exit(failures ? 1 : 0);
})().catch(function (e) { console.error("ERROR", e); process.exit(2); });
