"use strict";

/**
 * Projects + tasks store facade (mirrors accounts.js).
 *   - "memory" (default): in-process Maps.
 *   - "remote": the Python SQLite bridge (db/).
 * Storage only — the orchestration logic (seeding + tick transitions) lives in
 * routes/projects.js.
 */

var config = require("./config").config;
var bridgeFetch = require("./bridge").bridgeFetch;

// ---------------------------------------------------------------------------
// In-memory backend
// ---------------------------------------------------------------------------
var P = new Map();          // id -> project
var T = new Map();          // projectId -> [task, ...]

function sortTasks(list) {
  return list.slice().sort(function (a, b) { return a.orderIndex - b.orderIndex; });
}

var memory = {
  async createProject(p) { P.set(p.id, Object.assign({}, p)); T.set(p.id, []); return p; },
  async addTask(t) { (T.get(t.projectId) || []).push(Object.assign({}, t)); return t; },
  async getProject(id) {
    var p = P.get(id);
    if (!p) return null;
    var tasks = sortTasks(T.get(id) || []).map(function (x) { return Object.assign({}, x); });
    return Object.assign({}, p, { tasks: tasks });
  },
  async listByOwner(email) {
    var target = String(email || "").toLowerCase();
    var out = [];
    for (var p of P.values()) {
      if (p.ownerEmail && p.ownerEmail.toLowerCase() === target) out.push(Object.assign({}, p));
    }
    return out.sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
  },
  async updateTask(id, fields) {
    for (var arr of T.values()) {
      for (var t of arr) { if (t.id === id) { Object.assign(t, fields); return; } }
    }
  },
  async updateProject(id, fields) {
    var p = P.get(id);
    if (p) Object.assign(p, fields);
  }
};

// ---------------------------------------------------------------------------
// Remote backend (Python SQLite bridge)
// ---------------------------------------------------------------------------
var remote = {
  async createProject(p) {
    await bridgeFetch("/projects/create", { method: "POST", body: JSON.stringify(p) });
    return p;
  },
  async addTask(t) {
    await bridgeFetch("/tasks/create", { method: "POST", body: JSON.stringify(t) });
    return t;
  },
  async getProject(id) {
    var data = await bridgeFetch("/projects/get?id=" + encodeURIComponent(id), { method: "GET" });
    return data.project || null;
  },
  async listByOwner(email) {
    var data = await bridgeFetch("/projects/list?email=" + encodeURIComponent(email), { method: "GET" });
    return data.projects || [];
  },
  async updateTask(id, fields) {
    await bridgeFetch("/tasks/update", {
      method: "POST",
      body: JSON.stringify(Object.assign({ id: id }, fields))
    });
  },
  async updateProject(id, fields) {
    await bridgeFetch("/projects/update", {
      method: "POST",
      body: JSON.stringify(Object.assign({ id: id }, fields))
    });
  }
};

function backend() {
  return config.accountsStore === "remote" ? remote : memory;
}

module.exports = {
  createProject: function (p) { return backend().createProject(p); },
  addTask: function (t) { return backend().addTask(t); },
  getProject: function (id) { return backend().getProject(id); },
  listByOwner: function (email) { return backend().listByOwner(email); },
  updateTask: function (id, fields) { return backend().updateTask(id, fields); },
  updateProject: function (id, fields) { return backend().updateProject(id, fields); }
};
