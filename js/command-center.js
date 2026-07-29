/* =========================================================
   Lucy AI — AIOS Command Center
   Clock + live data. When a backend is available (window.AIOS_CONFIG)
   and the visitor is signed in, KPIs, health, workload, timeline, and the
   system gauges go live via GET /dashboard (real counters + os/fs metrics).
   AI Tokens are estimated from real automation runs.
   ========================================================= */
(function () {
  "use strict";

  var CONFIG = Object.assign({ authBaseUrl: "", backendEnabled: false }, window.AIOS_CONFIG || {});

  // ---- Clock ----
  var clock = document.getElementById("ccClock");
  function tick() {
    if (clock) clock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  tick();
  setInterval(tick, 30000);

  if (!CONFIG.backendEnabled) return; // stay on concept data

  function apiFetch(path) {
    var base = (CONFIG.authBaseUrl || "").replace(/\/$/, "");
    return fetch(base + path, { credentials: "include", headers: { "Content-Type": "application/json" } });
  }

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var NAMES = {
    lucy: "Lucy", julian: "Julian", jabb: "JABBNETWORKS", ryan: "Ryan", alex: "Alex",
    brianna: "Brianna", bianca: "Bianca", christina: "Christina", kaira: "Kaira", miakkcar: "MiaKkcar"
  };

  function fmt(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
    return String(n);
  }
  function set(id, v) { if (el(id)) el(id).textContent = v; }

  function renderKpis(k) {
    set("kActiveProjects", k.activeProjects);
    set("kAgents", k.agentsOnline + "/" + k.agentsTotal);
    set("kSuccess", k.successRate + "%");
    if (k.automationRuns != null) set("kAutomationRuns", fmt(k.automationRuns));
    if (k.apiCalls != null) set("kApiCalls", fmt(k.apiCalls));
    if (k.securityScore != null) set("kSecurity", k.securityScore + "%");
    if (k.deployments != null) set("kDeployments", k.deployments);
    if (k.tokensEst != null) set("kTokens", fmt(k.tokensEst));
    if (el("kActiveDelta")) el("kActiveDelta").textContent = (k.totalProjects || 0) + " total";
    if (el("kRunsDelta")) el("kRunsDelta").textContent = (k.tasksDone || 0) + " tasks done";
  }

  function gauge(id, v, unit) {
    var g = el(id);
    if (!g) return;
    v = Math.max(0, Math.min(100, Math.round(v)));
    g.style.setProperty("--v", v);
    var span = g.querySelector("span");
    if (span) span.textContent = v + (unit || "%");
  }
  function renderGauges(sys) {
    if (!sys) return;
    gauge("gCpu", sys.cpu);
    gauge("gMemory", sys.memory);
    gauge("gStorage", sys.storage);
    gauge("gLoad", sys.load);
  }

  function renderHealth(h) {
    var total = h.onTrack + h.atRisk + h.delayed + h.completed;
    if (el("ccDonutTotal")) el("ccDonutTotal").textContent = total;
    var donut = el("ccDonut");
    if (donut && total > 0) {
      var a = (h.onTrack / total) * 100;
      var b = a + (h.atRisk / total) * 100;
      var c = b + (h.delayed / total) * 100;
      donut.style.setProperty("--ontrack", a + "%");
      donut.style.setProperty("--atrisk", b + "%");
      donut.style.setProperty("--delayed", c + "%");
    }
    var legend = el("ccLegend");
    if (legend) {
      legend.innerHTML =
        '<li><i style="background:#43e08a"></i>On track <b>' + h.onTrack + "</b></li>" +
        '<li><i style="background:#f59e0b"></i>At risk <b>' + h.atRisk + "</b></li>" +
        '<li><i style="background:#ff6b6b"></i>Delayed <b>' + h.delayed + "</b></li>" +
        '<li><i style="background:#22d3ee"></i>Completed <b>' + h.completed + "</b></li>";
    }
  }

  function renderWorkload(rows) {
    var ul = el("ccWorkload");
    if (!ul || !rows.length) return;
    rows = rows.slice().sort(function (x, y) { return y.pct - x.pct; });
    ul.innerHTML = rows.map(function (r) {
      return "<li><span>" + esc(r.name || NAMES[r.agent] || r.agent) + '</span>' +
             '<div class="cc-bar"><i style="width:' + r.pct + '%"></i></div><b>' + r.pct + "%</b></li>";
    }).join("");
  }

  function renderTimeline(items) {
    var ul = el("ccTimeline");
    if (!ul) return;
    if (!items.length) {
      ul.innerHTML = '<li>No activity yet — start a project in the ' +
                     '<a href="aios.html">AIOS room</a>.</li>';
      return;
    }
    ul.innerHTML = items.map(function (t) {
      var time = "";
      try { time = new Date(t.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch (e) {}
      return '<li><span class="cc-t-time">' + time + "</span> <b>" +
             esc(NAMES[t.agent] || t.agent) + "</b> " + esc(t.message || "") + "</li>";
    }).join("");
  }

  apiFetch("/dashboard").then(function (r) {
    if (!r.ok) return null; // 401 (signed out) or error -> keep concept data
    return r.json();
  }).then(function (data) {
    if (!data || !data.ok) return;
    if (el("ccMode")) el("ccMode").textContent = "Live data";
    renderKpis(data.kpis);
    renderGauges(data.metrics && data.metrics.system);
    renderHealth(data.health);
    renderWorkload(data.workload || []);
    renderTimeline(data.timeline || []);
  }).catch(function () { /* keep concept data */ });
})();
