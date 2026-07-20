/* =========================================================
   Lucy AI — AIOS Command Center
   Clock + live data. When a backend is available (window.AIOS_CONFIG)
   and the visitor is signed in, project-derived metrics go live via
   GET /dashboard. Infrastructure-style KPIs stay illustrative.
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

  function renderKpis(k) {
    if (el("kActiveProjects")) el("kActiveProjects").textContent = k.activeProjects;
    if (el("kAgents")) el("kAgents").textContent = k.agentsOnline + "/" + k.agentsTotal;
    if (el("kSuccess")) el("kSuccess").textContent = k.successRate + "%";
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
    renderHealth(data.health);
    renderWorkload(data.workload || []);
    renderTimeline(data.timeline || []);
  }).catch(function () { /* keep concept data */ });
})();
