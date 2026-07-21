/* =========================================================
   Agent Assembly — full 10-agent MotherBridge roster check-in.
   Agents check in one by one with a stagger. In live mode
   (window.AIOS_CONFIG + signed in) Online/Idle/Busy comes from
   GET /dashboard (workload); otherwise embedded defaults are used.
   ========================================================= */
(function () {
  "use strict";

  var CONFIG = Object.assign({ authBaseUrl: "", backendEnabled: false }, window.AIOS_CONFIG || {});

  // Canonical 10-agent roster (reconciled from Mother: Phoenix→Christina,
  // Sentinel→Kaira; adds Ryan + MiaKkcar). Avatars in assets/avatars/<id>.png.
  var ROSTER = [
    { id: "lucy",      name: "Lucy",         role: "Chief AI Orchestrator",            emoji: "🧠", status: "active" },
    { id: "julian",    name: "Julian",       role: "Enterprise Solution Architect",    emoji: "🏗️", status: "active" },
    { id: "alex",      name: "Alex",         role: "Automation Architect",             emoji: "⚙️", status: "idle" },
    { id: "brianna",   name: "Brianna",      role: "Power Apps Architect",             emoji: "📱", status: "active" },
    { id: "bianca",    name: "Bianca",       role: "Portal & Analytics Architect",     emoji: "📊", status: "active" },
    { id: "ryan",      name: "Ryan",         role: "Data & Fabric Architect",          emoji: "🗄️", status: "idle" },
    { id: "jabb",      name: "JABBNETWORKS", role: "Platform Operations Architect",    emoji: "🌐", status: "active" },
    { id: "christina", name: "Christina",    role: "QA & DevOps Director",             emoji: "🔧", status: "active" },
    { id: "kaira",     name: "Kaira",        role: "Security & Governance Director",   emoji: "🛡️", status: "active" },
    { id: "miakkcar",  name: "MiaKkcar",     role: "Product & CX Director",            emoji: "✨", status: "active" }
  ];

  var STAGGER_MS = 380;
  var autoPlay = true;
  var currentIndex = 0;
  var agents = ROSTER.slice();

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function statusClass(s) { return s === "active" ? "active" : s === "busy" ? "busy" : s === "offline" ? "offline" : "idle"; }
  function statusLabel(s) {
    return s === "active" ? "● Online" : s === "busy" ? "● Busy" : s === "offline" ? "● Offline" : "● Idle";
  }

  function renderAgent(a) {
    var sc = statusClass(a.status);
    var card = document.createElement("div");
    card.className = "a-card";
    card.innerHTML =
      '<div>' +
        '<div class="a-top">' +
          '<div class="a-avatar ' + sc + '">' +
            '<img src="assets/avatars/' + a.id + '.png" alt="" ' +
              "onerror=\"this.parentElement.textContent='" + a.emoji + "'\" />" +
          '</div>' +
          '<div class="a-info"><h3>' + esc(a.name) + '</h3><p>' + esc(a.role) + '</p></div>' +
        '</div>' +
        '<div class="a-status"><span class="a-dot ' + sc + '"></span>' +
          '<span class="a-stxt ' + sc + '">' + statusLabel(a.status) + '</span></div>' +
        '<div class="a-time">' + new Date().toLocaleTimeString() + '</div>' +
      '</div>' +
      '<div class="a-check">✓</div>';
    el("assemblyGrid").appendChild(card);
    setTimeout(function () { card.classList.add("in"); }, 40);
  }

  function step() {
    if (currentIndex >= agents.length) { finish(); return; }
    renderAgent(agents[currentIndex]);
    currentIndex++;
    if (autoPlay && currentIndex < agents.length) setTimeout(step, STAGGER_MS);
    else if (currentIndex >= agents.length) setTimeout(finish, 500);
  }

  function finish() {
    var active = agents.filter(function (a) { return a.status === "active" || a.status === "busy"; }).length;
    var ready = agents.filter(function (a) { return a.status !== "offline"; }).length;
    el("aActive").textContent = active;
    el("aReady").textContent = ready;
    el("aTotal").textContent = agents.length;
    el("assemblySummary").classList.add("show");
    el("assemblyControls").classList.add("show");
  }

  function reset() {
    currentIndex = 0; autoPlay = true;
    el("assemblyGrid").innerHTML = "";
    el("assemblySummary").classList.remove("show");
    el("assemblyControls").classList.remove("show");
    var pause = el("aPause"); if (pause) pause.textContent = "Pause";
    step();
  }

  function togglePause() {
    autoPlay = !autoPlay;
    var pause = el("aPause");
    if (autoPlay && currentIndex < agents.length) { if (pause) pause.textContent = "Pause"; step(); }
    else if (pause) pause.textContent = "Resume";
  }

  // Live status from the backend, then start the check-in sequence.
  function begin() {
    if (el("aReset")) el("aReset").addEventListener("click", reset);
    if (el("aPause")) el("aPause").addEventListener("click", togglePause);

    if (!CONFIG.backendEnabled) { step(); return; }

    var base = (CONFIG.authBaseUrl || "").replace(/\/$/, "");
    fetch(base + "/dashboard", { credentials: "include" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.ok) {
          var pct = {};
          (data.workload || []).forEach(function (w) { pct[w.agent] = w.pct; });
          var online = {};
          (data.agents || []).forEach(function (a) { online[a.id] = a.online !== false; });
          agents = ROSTER.map(function (a) {
            var s = a.status;
            if (online[a.id] === false) s = "offline";
            else if (pct[a.id] > 0) s = "active";
            else if (online[a.id]) s = a.status === "active" ? "active" : "idle";
            return Object.assign({}, a, { status: s });
          });
          if (el("assemblyMode")) el("assemblyMode").textContent = "· live";
        }
      })
      .catch(function () { /* keep defaults */ })
      .then(function () { step(); });
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", begin);
  else begin();
})();
