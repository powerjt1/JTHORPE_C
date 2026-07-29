"use strict";

/**
 * Native SQLite store (Node's built-in `node:sqlite`) — real single-process
 * persistence with no extra service and no native npm dependency.
 *
 * Selected by ACCOUNTS_STORE=sqlite; file path from SQLITE_PATH (default
 * ./data/aios.db). The module is only require()'d when that backend is chosen,
 * so the memory/remote paths never load the experimental module.
 *
 * Exposes `accounts` and `projects` objects with the same async interface as
 * the memory/remote backends in accounts.js / projects.js.
 */

var fs = require("fs");
var path = require("path");
var config = require("./config").config;

var _db = null;
function db() {
  if (_db) return _db;
  var DatabaseSync = require("node:sqlite").DatabaseSync;
  var file = config.sqlitePath || "./data/aios.db";
  if (file !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  _db = new DatabaseSync(file);
  _db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  _db.exec(
    "CREATE TABLE IF NOT EXISTS accounts (" +
    " id TEXT PRIMARY KEY, email TEXT, name TEXT, provider TEXT," +
    " email_verified INTEGER DEFAULT 0, trial_started_at TEXT, verified_at TEXT);" +
    "CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);" +
    "CREATE TABLE IF NOT EXISTS projects (" +
    " id TEXT PRIMARY KEY, name TEXT, owner_email TEXT, status TEXT, created_at TEXT);" +
    "CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_email);" +
    "CREATE TABLE IF NOT EXISTS tasks (" +
    " id TEXT PRIMARY KEY, project_id TEXT, agent TEXT, phase INTEGER, phase_name TEXT," +
    " order_index INTEGER, status TEXT, message TEXT, updated_at TEXT);" +
    "CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);"
  );
  return _db;
}

function nowIso() { return new Date().toISOString(); }
function rowToTask(r) {
  return {
    id: r.id, projectId: r.project_id, agent: r.agent, phase: r.phase,
    phaseName: r.phase_name, orderIndex: r.order_index, status: r.status,
    message: r.message, updatedAt: r.updated_at
  };
}

var accounts = {
  async findOrCreate(profile) {
    var d = db();
    var id = profile.provider + ":" + (profile.sub || profile.email);
    var existing = d.prepare("SELECT * FROM accounts WHERE id = ?").get(id);
    if (existing) {
      return {
        id: existing.id, email: existing.email, name: existing.name, provider: existing.provider,
        emailVerified: !!existing.email_verified, trialStartedAt: existing.trial_started_at,
        verifiedAt: existing.verified_at, isNew: false
      };
    }
    var verified = profile.provider !== "email" ? 1 : 0;
    var started = nowIso();
    d.prepare(
      "INSERT INTO accounts (id,email,name,provider,email_verified,trial_started_at,verified_at)" +
      " VALUES (?,?,?,?,?,?,NULL)"
    ).run(id, profile.email, profile.name || null, profile.provider, verified, started);
    return {
      id: id, email: profile.email, name: profile.name, provider: profile.provider,
      emailVerified: !!verified, trialStartedAt: started, verifiedAt: null, isNew: true
    };
  },
  async getByEmail(emailAddr) {
    var r = db().prepare("SELECT * FROM accounts WHERE lower(email) = lower(?)").get(String(emailAddr || ""));
    if (!r) return null;
    return {
      id: r.id, email: r.email, name: r.name, provider: r.provider,
      emailVerified: !!r.email_verified, trialStartedAt: r.trial_started_at, verifiedAt: r.verified_at
    };
  },
  async markVerifiedByEmail(emailAddr) {
    var res = db().prepare(
      "UPDATE accounts SET email_verified = 1, verified_at = ?" +
      " WHERE lower(email) = lower(?) AND email_verified = 0"
    ).run(nowIso(), String(emailAddr || ""));
    return Number(res.changes) || 0;
  }
};

var TASK_COLS = { status: "status", message: "message", updatedAt: "updated_at" };
var projects = {
  async createProject(p) {
    db().prepare("INSERT INTO projects (id,name,owner_email,status,created_at) VALUES (?,?,?,?,?)")
      .run(p.id, p.name, p.ownerEmail, p.status || "active", p.createdAt || nowIso());
    return p;
  },
  async addTask(t) {
    db().prepare(
      "INSERT INTO tasks (id,project_id,agent,phase,phase_name,order_index,status,message,updated_at)" +
      " VALUES (?,?,?,?,?,?,?,?,?)"
    ).run(t.id, t.projectId, t.agent, t.phase, t.phaseName, t.orderIndex,
          t.status || "queued", t.message || "", t.updatedAt || null);
    return t;
  },
  async getProject(id) {
    var p = db().prepare("SELECT * FROM projects WHERE id = ?").get(id);
    if (!p) return null;
    var tasks = db().prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY order_index ASC").all(id);
    return {
      id: p.id, name: p.name, ownerEmail: p.owner_email, status: p.status,
      createdAt: p.created_at, tasks: tasks.map(rowToTask)
    };
  },
  async listByOwner(emailAddr) {
    var rows = db().prepare(
      "SELECT * FROM projects WHERE lower(owner_email) = lower(?) ORDER BY created_at DESC"
    ).all(String(emailAddr || ""));
    return rows.map(function (p) {
      return { id: p.id, name: p.name, ownerEmail: p.owner_email, status: p.status, createdAt: p.created_at };
    });
  },
  async updateTask(id, fields) {
    var sets = [], vals = [];
    Object.keys(fields || {}).forEach(function (k) {
      if (TASK_COLS[k]) { sets.push(TASK_COLS[k] + " = ?"); vals.push(fields[k]); }
    });
    if (!sets.length) return;
    vals.push(id);
    var stmt = db().prepare("UPDATE tasks SET " + sets.join(", ") + " WHERE id = ?");
    stmt.run.apply(stmt, vals);
  },
  async updateProject(id, fields) {
    if (fields && fields.status) db().prepare("UPDATE projects SET status = ? WHERE id = ?").run(fields.status, id);
  }
};

module.exports = { accounts: accounts, projects: projects, _db: db };
