/* =========================================================
   Agents Workspace — live canvas of the AI team.
   - Serpentine pipeline of 10 agents with animated artifact hand-offs.
   - Live mode (window.AIOS_CONFIG + signed in): engaged agents + recent
     activity from GET /dashboard; ask via POST /agents/:id/ask.
   - Concept mode: ambient animation + grounded answers composed locally.
   ========================================================= */
(function () {
  "use strict";

  var CONFIG = Object.assign({ authBaseUrl: "", backendEnabled: false }, window.AIOS_CONFIG || {});

  // Base roster + role facts (mirrors backend/src/agentinfo.js for offline use).
  var AGENTS = [
    { id: "lucy",      name: "Lucy",         title: "Chief AI Orchestrator",            artifact: "project-brief.md",   inputs: ["your goal", "requirements"],       outputs: ["project brief", "task plan"] },
    { id: "julian",    name: "Julian",       title: "Enterprise Solution Architect",    artifact: "architecture.md",    inputs: ["project brief"],                   outputs: ["architecture", "ALM plan"] },
    { id: "jabb",      name: "JABBNETWORKS", title: "Platform Operations Architect",    artifact: "environments.json",  inputs: ["architecture"],                    outputs: ["environments", "connections"] },
    { id: "ryan",      name: "Ryan",         title: "Data & Fabric Architect",          artifact: "lakehouse.sql",      inputs: ["environments"],                    outputs: ["lakehouse", "semantic model"] },
    { id: "alex",      name: "Alex",         title: "Automation Architect",             artifact: "flows.json",         inputs: ["data foundation"],                 outputs: ["cloud flows", "functions"] },
    { id: "brianna",   name: "Brianna",      title: "Power Apps Architect",             artifact: "app.msapp",          inputs: ["flows", "data model"],             outputs: ["published app", "forms"] },
    { id: "bianca",    name: "Bianca",       title: "Portal & Analytics Architect",     artifact: "dashboards.pbix",    inputs: ["app", "semantic model"],           outputs: ["dashboards", "portal"] },
    { id: "christina", name: "Christina",    title: "QA & DevOps Director",             artifact: "test-report.xml",    inputs: ["app", "flows"],                    outputs: ["test report", "release"] },
    { id: "kaira",     name: "Kaira",        title: "Security & Governance Director",   artifact: "security-scan.sarif",inputs: ["release candidate"],               outputs: ["security scan", "sign-off"] },
    { id: "miakkcar",  name: "MiaKkcar",     title: "Product & CX Director",            artifact: "launch-plan.md",     inputs: ["validated release"],               outputs: ["launch plan", "UX polish"] }
  ];
  var BY_ID = {};
  AGENTS.forEach(function (a, i) { a.index = i; BY_ID[a.id] = a; });

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // ---- Clock ----
  var clock = el("wsClock");
  function tickClock() { if (clock) clock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  tickClock(); setInterval(tickClock, 30000);
  if (el("year")) el("year").textContent = new Date().getFullYear();

  // ---- Build the stage (serpentine 5-col grid) ----
  var stage = el("wsStage");
  var wires = el("wsWires");
  var nodes = [];
  AGENTS.forEach(function (a) {
    var row = Math.floor(a.index / 5);
    var col = row === 0 ? a.index : (4 - (a.index - 5)); // reverse row 2 -> snake
    var n = document.createElement("button");
    n.className = "ws-node";
    n.type = "button";
    n.style.gridColumn = (col + 1);
    n.style.gridRow = (row + 1);
    n.setAttribute("aria-label", "Open " + a.name + " console");
    n.innerHTML =
      '<span class="ws-n-dot"></span>' +
      '<img src="assets/avatars/' + a.id + '.png" alt="" />' +
      '<span class="ws-n-name">' + esc(a.name) + '</span>' +
      '<span class="ws-n-role">' + esc(a.title) + '</span>';
    n.addEventListener("click", function () { openConsole(a.id); });
    stage.appendChild(n);
    nodes[a.index] = n;
  });

  // ---- Wires + packet ----
  var packet = document.createElement("span");
  packet.className = "ws-packet";
  stage.appendChild(packet);

  function centerOf(node) {
    return { x: node.offsetLeft + node.offsetWidth / 2, y: node.offsetTop + node.offsetHeight / 2 };
  }
  function drawWires() {
    if (!wires) return;
    wires.innerHTML = "";
    for (var i = 0; i < nodes.length - 1; i++) {
      var a = centerOf(nodes[i]), b = centerOf(nodes[i + 1]);
      var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", a.x); line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x); line.setAttribute("y2", b.y);
      line.setAttribute("class", "ws-wire");
      line.setAttribute("data-seg", i);
      wires.appendChild(line);
    }
  }

  // ---- Ambient hand-off animation ----
  var step = 0;
  function positionPacket(node) {
    var c = centerOf(node);
    packet.style.left = c.x + "px";
    packet.style.top = c.y + "px";
  }
  function hotWire(seg, on) {
    var l = wires && wires.querySelector('[data-seg="' + seg + '"]');
    if (l) l.setAttribute("class", "ws-wire" + (on ? " hot" : ""));
  }
  function loop() {
    var from = step % (AGENTS.length - 1);
    var to = from + 1;
    var a = AGENTS[from], b = AGENTS[to];
    packet.textContent = a.artifact;
    // start at source
    positionPacket(nodes[from]);
    packet.style.opacity = "1";
    nodes[from].classList.add("sending");
    hotWire(from, true);
    // move to target on next frame (so transition fires)
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { positionPacket(nodes[to]); });
    });
    setTimeout(function () {
      nodes[to].classList.add("receiving", "active");
      if (el("wsFlowMsg")) el("wsFlowMsg").textContent = a.name + " → " + b.name + ": " + a.artifact;
    }, 900);
    setTimeout(function () {
      packet.style.opacity = "0";
      nodes[from].classList.remove("sending");
      nodes[to].classList.remove("receiving");
      hotWire(from, false);
      // keep 'active' only on the most recent unless live overrides
      nodes.forEach(function (n, i) { if (i !== to) n.classList.remove("active"); });
      step++;
    }, 1500);
  }

  function start() {
    drawWires();
    positionPacket(nodes[0]);
    loop();
    setInterval(loop, 1900);
  }
  // wait for layout, then start; redraw wires on resize
  setTimeout(start, 60);
  var rt;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(drawWires, 150); });

  // ---- Console ----
  var current = null;
  function openConsole(id) {
    var a = BY_ID[id];
    if (!a) return;
    current = a;
    if (el("wsEmpty")) el("wsEmpty").hidden = true;
    if (el("wsBody")) el("wsBody").hidden = false;
    el("wsAvatar").src = "assets/avatars/" + a.id + ".png";
    el("wsName").textContent = a.name;
    el("wsTitle").textContent = a.title;
    el("wsInputs").innerHTML = a.inputs.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
    el("wsOutputs").innerHTML = a.outputs.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
    el("wsArtifact").textContent = a.artifact;
    var next = AGENTS[a.index + 1];
    el("wsNext").textContent = next ? " → " + next.name : " → delivery";
    el("wsChat").innerHTML = "";
    addSuggestions(a);
    var input = el("wsAskInput");
    if (input) { input.value = ""; input.focus(); }
  }

  function addSuggestions(a) {
    var chat = el("wsChat");
    var wrap = document.createElement("div");
    wrap.className = "ws-suggest";
    ["What do you handle?", "How would you approach it?", "What are you working on?"].forEach(function (q) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = q;
      b.addEventListener("click", function () { ask(q); });
      wrap.appendChild(b);
    });
    chat.appendChild(wrap);
  }

  function bubble(kind, text) {
    var d = document.createElement("div");
    d.className = "ws-bub " + kind;
    d.textContent = text;
    el("wsChat").appendChild(d);
    el("wsChat").scrollTop = el("wsChat").scrollHeight;
    return d;
  }

  // Local grounded answer (mirrors backend/src/agentinfo.answer).
  function composeLocal(a, q) {
    var next = AGENTS[a.index + 1];
    var handoff = next ? " When my part is done I hand " + a.artifact + " to " + next.name + "."
                       : " I coordinate the whole team to bring it together.";
    var ql = q.toLowerCase(), body;
    if (!q) body = "Ask me anything about my work.";
    else if (/\b(what|which)\b.*\b(do|handle|own)/.test(ql) || /your (job|role)/.test(ql))
      body = "I take " + a.inputs.join(", ") + " and produce " + a.outputs.join(", ") + ".";
    else if (/\b(how|approach|plan|step)/.test(ql))
      body = "My approach: start from " + a.inputs[0] + ", then deliver " + a.outputs.join(", ") + ".";
    else if (/\b(status|progress|working|doing)/.test(ql))
      body = "I'm producing " + a.outputs.join(", ") + " for the current project.";
    else body = "On \"" + q + "\": that's in my lane — I'd deliver " + a.outputs.join(", ") + ".";
    return a.name + " here — " + a.title + ". " + body + handoff;
  }

  function ask(q) {
    var input = el("wsAskInput");
    if (input) input.value = q;
    submit();
  }

  function apiPost(path, body) {
    var base = (CONFIG.authBaseUrl || "").replace(/\/$/, "");
    return fetch(base + path, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  function submit() {
    if (!current) return;
    var input = el("wsAskInput");
    var q = (input.value || "").trim();
    if (!q) return;
    // drop any suggestion row
    var sg = el("wsChat").querySelector(".ws-suggest");
    if (sg) sg.remove();
    bubble("me", q);
    input.value = "";
    el("wsCore").textContent = "⚙️";
    if (el("wsStatus")) { el("wsStatus").textContent = "working"; el("wsStatus").classList.add("working"); }
    var typing = bubble("agent typing", current.name + " is thinking…");

    var done = function (text, simulated) {
      typing.remove();
      bubble("agent", text);
      if (el("wsStatus")) { el("wsStatus").textContent = "online"; el("wsStatus").classList.remove("working"); }
      if (el("wsSimNote")) el("wsSimNote").hidden = !simulated;
    };

    if (CONFIG.backendEnabled) {
      apiPost("/agents/" + current.id + "/ask", { question: q })
        .then(function (d) { done(d && d.answer ? d.answer : composeLocal(current, q), d ? d.simulated : true); })
        .catch(function () { done(composeLocal(current, q), true); });
    } else {
      setTimeout(function () { done(composeLocal(current, q), true); }, 420);
    }
  }

  if (el("wsAskForm")) el("wsAskForm").addEventListener("submit", function (e) { e.preventDefault(); submit(); });

  // ---- Live sync (engaged agents + recent activity) ----
  if (CONFIG.backendEnabled) {
    var syncLive = function () {
      var base = (CONFIG.authBaseUrl || "").replace(/\/$/, "");
      fetch(base + "/dashboard", { credentials: "include" }).then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (data) {
        if (!data || !data.ok) return;
        if (el("wsMode")) el("wsMode").textContent = "Live data";
        (data.workload || []).forEach(function (w) {
          var n = nodes[(BY_ID[w.agent] || {}).index];
          if (n) n.classList.toggle("engaged", w.pct > 0);
        });
        if (data.timeline && data.timeline.length) {
          var latest = data.timeline[0];
          if (el("wsFlowMsg")) el("wsFlowMsg").textContent =
            "Latest: " + (BY_ID[latest.agent] ? BY_ID[latest.agent].name : latest.agent) + " — " + (latest.message || "");
        }
      }).catch(function () {});
    };
    syncLive();
    setInterval(syncLive, 6000);
  }
})();
