/* =========================================================
   Lucy AI — AIOS Mission Control (interactive concept demo)
   Pure front-end simulation: avatar states, a scripted
   orchestration sequence, and a click-to-open workspace.
   No real AI/voice — see docs/avatar-system.md for the roadmap.
   ========================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Phase 1: when a deployed backend is available and the visitor is signed in,
  // the room is driven by real, backend-tracked project state. Otherwise it
  // runs the local scripted demo. A deployer sets window.AIOS_CONFIG.
  var CONFIG = Object.assign({ authBaseUrl: "", backendEnabled: false }, window.AIOS_CONFIG || {});

  var AGENTS = {
    lucy: {
      name: "Lucy", role: "Chief AI Orchestrator", face: "🧠", accent: "#7c5cff",
      img: "assets/avatars/lucy.png",
      personality: "Calm, confident, executive. Lucy runs the room — she reads your intent, plans the work, and delegates to the right specialist.",
      caps: ["Turns a request into a project plan", "Assigns tasks to the right specialist", "Tracks status and keeps a human in the loop", "Synthesizes everyone's work into one answer"],
      anim: "Gestures while assigning tasks and looks toward each specialist as she delegates."
    },
    julian: {
      name: "Julian", role: "Enterprise Solution Architect", face: "🏗️", accent: "#3b82f6",
      img: "assets/avatars/julian.png",
      personality: "Big-picture and precise. Julian designs solutions that scale and hold up under real load.",
      caps: ["Designs enterprise solution architecture", "Chooses the right Power Platform + Azure services", "Plans ALM, environments, and integration patterns", "Reviews for cost and scale"],
      anim: "Draws solution diagrams in the air and rotates 3D system models."
    },
    jabb: {
      name: "JABBNETWORKS", role: "Platform Operations Architect", face: "⚙️", accent: "#6366f1",
      img: "assets/avatars/jabb.png",
      personality: "The steady hand on the platform. Provisions, connects, and keeps everything running.",
      caps: ["Provisions environments, Dataverse & SharePoint", "Links APIs, Python, FTP/SFTP (via the kernel)", "Monitors servers and health", "Deploys solutions"],
      anim: "Configures environments, links APIs, monitors servers, and deploys solutions."
    },
    ryan: {
      name: "Ryan", role: "Data & Fabric Architect", face: "🌐", accent: "#0ea5e9",
      img: "assets/avatars/ryan.png",
      personality: "Rigorous data engineer. Cares about lineage, quality, and a single source of truth.",
      caps: ["Builds Microsoft Fabric lakehouse & warehouses", "Designs pipelines and semantic models", "Enforces data quality and lineage", "Publishes certified datasets"],
      anim: "Assembles OneLake pipelines and lights up a medallion data flow."
    },
    alex: {
      name: "Alex", role: "Automation Architect", face: "🤖", accent: "#f59e0b",
      img: "assets/avatars/alex.png",
      personality: "Relentless about removing busywork. If it repeats, Alex automates it.",
      caps: ["Designs cloud and desktop flows (RPA)", "Builds Azure Functions & Logic Apps", "Handles retries and error paths", "Watches automations execute"],
      anim: "Connects flow blocks and watches cloud and desktop flow paths light up."
    },
    brianna: {
      name: "Brianna", role: "Power Apps Architect", face: "📱", accent: "#ec4899",
      img: "assets/avatars/brianna.png",
      personality: "Design-minded builder. Turns requirements into apps people actually enjoy using.",
      caps: ["Builds canvas and model-driven apps", "Designs forms and responsive layouts", "Connects apps to Dataverse and flows", "Previews across devices"],
      anim: "Builds forms, drags controls onto a canvas, and previews responsive layouts."
    },
    bianca: {
      name: "Bianca", role: "Portal & Analytics Architect", face: "📊", accent: "#14b8a6",
      img: "assets/avatars/bianca.png",
      personality: "Storyteller with data. Makes information clear, live, and beautiful.",
      caps: ["Builds Power BI dashboards", "Creates Power Pages portals", "Models RLS and refreshes data", "Publishes live reports"],
      anim: "Charts animate into view, dashboards update live, and portals render on floating screens."
    },
    christina: {
      name: "Christina", role: "QA & DevOps Director", face: "🚀", accent: "#f97316",
      img: "assets/avatars/christina.png",
      personality: "Calm under pressure. Ships confidently because everything is tested and reversible.",
      caps: ["Runs automated tests (unit → E2E)", "Manages CI/CD release pipelines", "Gates deployments on quality", "Rolls back safely when needed"],
      anim: "Runs automated tests, shows green checkmarks, and manages release pipelines."
    },
    kaira: {
      name: "Kaira", role: "Security & Governance Director", face: "🛡️", accent: "#10b981",
      img: "assets/avatars/kaira.png",
      personality: "Watchful and exacting. Protects data and enforces the rules, quietly and constantly.",
      caps: ["Manages Entra ID, RBAC & Key Vault", "Enforces DLP and access policy", "Validates compliance and audit", "Locks down sensitive resources"],
      anim: "Scans systems, highlights threats, locks resources, and validates compliance."
    },
    miakkcar: {
      name: "MiaKkcar", role: "Product & Customer Experience Director", face: "💼", accent: "#a855f7",
      img: "assets/avatars/miakkcar.png",
      personality: "Customer-obsessed and outcome-driven. Keeps the team building what matters.",
      caps: ["Owns product strategy and roadmap", "Leads UI/UX, branding & onboarding", "Defines success metrics/KPIs", "Prepares the marketplace launch"],
      anim: "Maps the customer journey and lights up KPIs on an executive dashboard."
    }
  };

  // Ordered orchestration script (agent + what they say + phase index).
  var SCRIPT = [
    { id: "lucy",      say: "On it. Spinning up the project and briefing the team.", phase: 0 },
    { id: "julian",    say: "Designing the architecture and target environments.",   phase: 1 },
    { id: "jabb",      say: "Provisioning environments and linking connections.",     phase: 2 },
    { id: "ryan",      say: "Building the data foundation — lakehouse and models.",   phase: 3 },
    { id: "alex",      say: "Building the automations and flows.",                    phase: 4 },
    { id: "brianna",   say: "Building the app and its screens.",                      phase: 5 },
    { id: "bianca",    say: "Creating dashboards and the client portal.",            phase: 6 },
    { id: "christina", say: "Running tests and preparing the release.",              phase: 7 },
    { id: "kaira",     say: "Scanning for threats and validating compliance.",        phase: 8 },
    { id: "miakkcar",  say: "Polishing the experience and prepping launch.",          phase: 9 }
  ];

  var cards = {};
  document.querySelectorAll(".agent-card").forEach(function (card) {
    cards[card.dataset.agent] = card;
  });
  var phaseItems = Array.prototype.slice.call(document.querySelectorAll("#phases li"));
  var progressBar = document.getElementById("progressBar");
  var logEl = document.getElementById("log");
  var projectName = document.getElementById("projectName");
  var timers = [];

  function setAvatarState(id, state) {
    var card = cards[id];
    if (!card) return;
    var av = card.querySelector(".agent-avatar");
    var label = card.querySelector(".agent-state-label");
    if (av) av.dataset.state = state;
    if (label) label.textContent = state.charAt(0).toUpperCase() + state.slice(1);
    card.dataset.active = (state === "speaking" || state === "active") ? "1" : "";
  }

  function setPhase(index, status) {
    var li = phaseItems[index];
    if (!li) return;
    var pill = li.querySelector(".ph-status");
    pill.dataset.status = status;
    pill.textContent = status === "active" ? "Active" : status === "done" ? "Done" : "Idle";
    li.dataset.active = status === "active" ? "1" : "";
  }

  function log(id, message) {
    var empty = logEl.querySelector(".log-empty");
    if (empty) empty.remove();
    var li = document.createElement("li");
    li.style.setProperty("--accent", AGENTS[id] ? AGENTS[id].accent : "var(--brand)");
    var who = AGENTS[id] ? AGENTS[id].name : id;
    li.innerHTML = '<span class="log-agent">' + who + ":</span> " + message;
    logEl.appendChild(li);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function resetAll(keepLog) {
    clearTimers();
    Object.keys(cards).forEach(function (id) { setAvatarState(id, "idle"); });
    phaseItems.forEach(function (_, i) { setPhase(i, "idle"); });
    progressBar.style.width = "0";
    projectName.textContent = "No active project";
    if (!keepLog) logEl.innerHTML = '<li class="log-empty">Awaiting your command…</li>';
  }

  function runDemo(project) {
    resetAll(true);
    projectName.textContent = project || "New client project";
    log("lucy", "Starting <strong>" + (project || "New client project") + "</strong>. Briefing the team…");

    var stepMs = reduceMotion ? 0 : 1100;

    SCRIPT.forEach(function (step, i) {
      timers.push(setTimeout(function () {
        // Everyone not-current goes to listening; current speaks/works.
        Object.keys(cards).forEach(function (id) {
          if (id !== step.id) {
            var av = cards[id].querySelector(".agent-avatar");
            if (av.dataset.state !== "done") setAvatarState(id, "listening");
          }
        });
        setAvatarState(step.id, step.id === "lucy" ? "speaking" : "active");
        setPhase(step.phase, "active");
        progressBar.style.width = Math.round(((i + 0.5) / SCRIPT.length) * 100) + "%";
        log(step.id, step.say);

        // Mark the step done shortly after (except keep last visible).
        timers.push(setTimeout(function () {
          setPhase(step.phase, "done");
          setAvatarState(step.id, "done");
          if (i === SCRIPT.length - 1) {
            progressBar.style.width = "100%";
            log("lucy", "✅ Project ready. Everything's tested, secured, and live.");
            setAvatarState("lucy", "active");
          }
        }, reduceMotion ? 0 : stepMs * 0.7));
      }, stepMs * i));
    });
  }

  // ---- Backend-driven (live) project ----
  var liveStatus = {}; // taskId -> last seen status (for delta logging)

  function apiFetch(path, options) {
    var base = (CONFIG.authBaseUrl || "").replace(/\/$/, "");
    return fetch(base + path, Object.assign({
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    }, options || {}));
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function renderState(project) {
    projectName.textContent = project.name;
    var tasks = project.tasks || [];
    var doneCount = tasks.filter(function (t) { return t.status === "done"; }).length;
    var anyActive = tasks.some(function (t) { return t.status === "active"; });
    progressBar.style.width = tasks.length ? Math.round((doneCount / tasks.length) * 100) + "%" : "0";

    tasks.forEach(function (t) {
      // phase board
      setPhase(t.phase, t.status === "queued" ? "idle" : t.status);
      // avatar
      var state = "idle";
      if (t.status === "active") state = (t.agent === "lucy") ? "speaking" : "active";
      else if (t.status === "done") state = "done";
      else state = anyActive ? "listening" : "idle";
      setAvatarState(t.agent, state);
      // delta log
      if (liveStatus[t.id] !== t.status && t.message &&
          (t.status === "active" || t.status === "done")) {
        log(t.agent, t.message);
      }
      liveStatus[t.id] = t.status;
    });
  }

  async function runBackendProject(name) {
    resetAll(false);
    liveStatus = {};
    projectName.textContent = name;
    var stepMs = reduceMotion ? 150 : 1100;

    var project;
    try {
      var res = await apiFetch("/projects", { method: "POST", body: JSON.stringify({ name: name }) });
      if (res.status === 401) {
        log("lucy", "Sign in to run a live project — showing the demo instead.");
        return runDemo(name);
      }
      if (!res.ok) throw new Error("create failed");
      project = (await res.json()).project;
    } catch (e) {
      log("lucy", "Backend unavailable — showing the demo instead.");
      return runDemo(name);
    }

    renderState(project);
    while (project && project.status !== "complete") {
      await sleep(stepMs);
      try {
        var tick = await apiFetch("/projects/" + project.id + "/tick", { method: "POST" });
        if (!tick.ok) break;
        project = (await tick.json()).project;
        renderState(project);
      } catch (e) { break; }
    }
    if (project && project.status === "complete") {
      log("lucy", "✅ Project ready. Everything's tested, secured, and live.");
      setAvatarState("lucy", "active");
    }
  }

  function startProject(name) {
    if (CONFIG.backendEnabled) return runBackendProject(name);
    return runDemo(name);
  }

  // ---- Command bar ----
  var form = document.getElementById("commandForm");
  var input = document.getElementById("command");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var cmd = (input.value || "").trim();
      // Extract a project name: prefer "for <name>", else "project (called) <name>".
      var project = "New client project";
      var m = cmd.match(/\bfor\s+(.+)$/i) ||
              cmd.match(/\bproject\s+(?:called\s+|named\s+)?(.+)$/i) ||
              cmd.match(/\bclient\s+(.+)$/i);
      if (m && m[1]) {
        var name = m[1].replace(/^(?:the\s+)?(?:project|client)\s+/i, "").replace(/[."]+$/, "").trim();
        if (name) project = name;
      }
      startProject(project);
      input.value = "";
      input.blur();
    });
  }

  // The demo button always runs the local scripted sequence.
  document.getElementById("runDemo").addEventListener("click", function () { runDemo("New client project"); });
  document.getElementById("resetDemo").addEventListener("click", function () { resetAll(false); });

  // ---- Workspace modal ----
  var modal = document.getElementById("agentModal");
  var mFace = document.getElementById("modalFace");
  var mImg = document.getElementById("modalImg");
  var mName = document.getElementById("modalName");
  var mRole = document.getElementById("modalRole");
  var mPers = document.getElementById("modalPersonality");
  var mCaps = document.getElementById("modalCaps");
  var mAnim = document.getElementById("modalAnim");
  var lastFocused = null;

  function openModal(id) {
    var a = AGENTS[id];
    if (!a) return;
    lastFocused = document.activeElement;
    modal.style.setProperty("--accent", a.accent);
    mFace.textContent = a.face;
    // Portrait over the emoji fallback.
    if (mImg) {
      if (a.img) {
        mImg.style.display = "";
        mImg.onerror = function () { mImg.style.display = "none"; };
        mImg.src = a.img;
      } else {
        mImg.style.display = "none";
        mImg.removeAttribute("src");
      }
    }
    mName.textContent = a.name;
    mRole.textContent = a.role;
    mPers.textContent = a.personality;
    mAnim.textContent = "Animation: " + a.anim;
    mCaps.innerHTML = "";
    a.caps.forEach(function (c) {
      var li = document.createElement("li");
      li.textContent = c;
      mCaps.appendChild(li);
    });
    modal.hidden = false;
    var closeBtn = modal.querySelector(".agent-modal-close");
    if (closeBtn) closeBtn.focus();
  }
  function closeModal() {
    modal.hidden = true;
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  Object.keys(cards).forEach(function (id) {
    cards[id].addEventListener("click", function () { openModal(id); });
  });
  modal.addEventListener("click", function (e) {
    if (e.target.hasAttribute("data-close")) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });
})();
