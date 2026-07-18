/* =========================================================
   Lucy AI — My Projects dashboard
   Lists the signed-in user's backend-tracked AIOS projects,
   opens one to view its board, and resumes unfinished ones.
   Requires live mode (window.AIOS_CONFIG.backendEnabled) + a
   signed-in session. Falls back to a "sign in" state otherwise.
   ========================================================= */
(function () {
  "use strict";

  var CONFIG = Object.assign({ authBaseUrl: "", backendEnabled: false }, window.AIOS_CONFIG || {});
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var states = {
    loading: document.getElementById("stateLoading"),
    signedOut: document.getElementById("stateSignedOut"),
    empty: document.getElementById("stateEmpty"),
    error: document.getElementById("stateError")
  };
  var listEl = document.getElementById("projList");
  var detailEl = document.getElementById("projDetail");

  function show(which) {
    Object.keys(states).forEach(function (k) { states[k].hidden = k !== which; });
    listEl.hidden = which !== "list";
    if (which !== "detail") detailEl.hidden = true;
  }
  function showList() { show("list"); }
  function showDetail() {
    Object.keys(states).forEach(function (k) { states[k].hidden = true; });
    listEl.hidden = true;
    detailEl.hidden = false;
  }

  function apiFetch(path, options) {
    var base = (CONFIG.authBaseUrl || "").replace(/\/$/, "");
    return fetch(base + path, Object.assign({
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    }, options || {}));
  }

  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
    catch (e) { return ""; }
  }

  function statusPill(status) {
    var label = status === "complete" ? "Complete" : "In progress";
    var cls = status === "complete" ? "done" : "active";
    return '<span class="ph-status" data-status="' + cls + '">' + label + "</span>";
  }

  function renderList(projects) {
    if (!projects.length) { show("empty"); return; }
    listEl.innerHTML = "";
    projects.forEach(function (p) {
      var card = document.createElement("button");
      card.className = "proj-card";
      card.type = "button";
      card.innerHTML =
        '<span class="proj-card-top">' + statusPill(p.status) +
        '<span class="proj-date">' + fmtDate(p.createdAt) + "</span></span>" +
        '<span class="proj-name">' + escapeHtml(p.name) + "</span>";
      card.addEventListener("click", function () { openProject(p.id); });
      listEl.appendChild(card);
    });
    showList();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var currentProject = null;

  function renderBoard(project) {
    currentProject = project;
    document.getElementById("detailName").textContent = project.name;
    document.getElementById("detailStatus").textContent =
      project.status === "complete" ? "Complete" : "In progress";
    var tasks = project.tasks || [];
    var done = tasks.filter(function (t) { return t.status === "done"; }).length;
    document.getElementById("detailProgress").style.width =
      tasks.length ? Math.round((done / tasks.length) * 100) + "%" : "0";

    var ol = document.getElementById("detailPhases");
    ol.innerHTML = "";
    tasks.forEach(function (t) {
      var li = document.createElement("li");
      if (t.status === "active") li.dataset.active = "1";
      var s = t.status === "queued" ? "idle" : t.status;
      var label = s === "active" ? "Active" : s === "done" ? "Done" : "Idle";
      li.innerHTML = '<span class="ph-name">' + escapeHtml(t.phaseName || t.agent) +
        '</span><span class="ph-status" data-status="' + s + '">' + label + "</span>";
      ol.appendChild(li);
    });

    var resumeBtn = document.getElementById("resumeBtn");
    resumeBtn.hidden = project.status === "complete";
  }

  function openProject(id) {
    showDetail();
    apiFetch("/projects/" + id).then(function (r) {
      if (!r.ok) throw new Error("load failed");
      return r.json();
    }).then(function (data) {
      renderBoard(data.project);
    }).catch(function () {
      show("error");
      document.getElementById("errorMsg").textContent = "Couldn't open that project.";
    });
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function resumeProject() {
    if (!currentProject) return;
    var id = currentProject.id;
    var btn = document.getElementById("resumeBtn");
    btn.disabled = true;
    var stepMs = reduceMotion ? 120 : 900;
    var project = currentProject;
    while (project && project.status !== "complete") {
      await sleep(stepMs);
      try {
        var r = await apiFetch("/projects/" + id + "/tick", { method: "POST" });
        if (!r.ok) break;
        project = (await r.json()).project;
        renderBoard(project);
      } catch (e) { break; }
    }
    btn.disabled = false;
  }

  function load() {
    show("loading");
    if (!CONFIG.backendEnabled) { show("signedOut"); return; }
    apiFetch("/projects").then(function (r) {
      if (r.status === 401) { show("signedOut"); return null; }
      if (!r.ok) throw new Error("list failed");
      return r.json();
    }).then(function (data) {
      if (!data) return;
      renderList(data.projects || []);
    }).catch(function () {
      show("error");
      document.getElementById("errorMsg").textContent = "We couldn't reach the backend.";
    });
  }

  document.getElementById("backBtn").addEventListener("click", load);
  document.getElementById("resumeBtn").addEventListener("click", resumeProject);
  document.getElementById("retryBtn").addEventListener("click", load);

  load();
})();
