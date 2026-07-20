"use strict";

/**
 * Real runtime metrics for the AIOS Command Center.
 *
 * These are genuine numbers from this process/host — not illustrative:
 *   - apiCalls / automationRuns / projectsCreated: counters incremented by the
 *     request middleware and the orchestration routes.
 *   - system.{cpu,memory,storage,load}: sampled from `os` and `fs.statfs`.
 *   - tokensEst: an *estimate* derived from real automation runs (labelled est.).
 * No external telemetry service is required; everything is measured locally.
 */

var os = require("os");
var fs = require("fs");

var counters = {
  apiCalls: 0,
  automationRuns: 0,   // orchestration steps executed (project ticks)
  projectsCreated: 0,
  startedAt: Date.now()
};

// Rough token estimate per orchestration step (agent reasoning + I/O). Real
// token accounting arrives when a model connection is wired via the kernel.
var TOKENS_PER_RUN = 420;

function recordApiCall() { counters.apiCalls += 1; }
function recordAutomationRun() { counters.automationRuns += 1; }
function recordProjectCreated() { counters.projectsCreated += 1; }

function pct(n) { return Math.max(0, Math.min(100, Math.round(n))); }

function cpuPercent() {
  // 1-minute load average normalized by core count (Linux/macOS).
  var cores = os.cpus() ? os.cpus().length : 1;
  var load1 = os.loadavg()[0] || 0;
  return pct((load1 / cores) * 100);
}

function memoryPercent() {
  var total = os.totalmem();
  var free = os.freemem();
  return total ? pct((1 - free / total) * 100) : 0;
}

function storagePercent() {
  try {
    var st = fs.statfsSync("/");
    var used = st.blocks - st.bfree;
    return st.blocks ? pct((used / st.blocks) * 100) : 0;
  } catch (e) {
    return 0; // statfs unavailable on this platform
  }
}

function loadPercent() {
  var cores = os.cpus() ? os.cpus().length : 1;
  return pct((os.loadavg()[0] / (cores * 2)) * 100); // headroom against 2x cores
}

function system() {
  return { cpu: cpuPercent(), memory: memoryPercent(), storage: storagePercent(), load: loadPercent() };
}

/** A snapshot for the dashboard. `derived` values come from live project data. */
function snapshot(derived) {
  derived = derived || {};
  var tokensEst = counters.automationRuns * TOKENS_PER_RUN;
  return {
    apiCalls: counters.apiCalls,
    automationRuns: counters.automationRuns,
    projectsCreated: counters.projectsCreated,
    tokensEst: tokensEst,
    deployments: derived.completedProjects || 0,   // a completed project = a deployment
    securityScore: derived.securityScore != null ? derived.securityScore : 100,
    uptimeSec: Math.round((Date.now() - counters.startedAt) / 1000),
    system: system()
  };
}

module.exports = {
  recordApiCall: recordApiCall,
  recordAutomationRun: recordAutomationRun,
  recordProjectCreated: recordProjectCreated,
  snapshot: snapshot,
  _counters: counters
};
