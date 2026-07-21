"use strict";

/**
 * Per-agent knowledge used by the Agents Workspace and the /agents/:id/ask
 * endpoint. Grounded in each agent's MotherBridge role (docs/motherbridge/prompts).
 *
 * NOTE: answers here are *grounded, role-based responses* composed from this
 * data — deterministic, not a live language model. Wiring a real model is a
 * kernel connection step (see docs/motherbridge/connections.md).
 */

// The orchestration pipeline: each agent produces an artifact handed to the next.
var WORKFLOW = [
  { id: "lucy",      artifact: "project-brief.md" },
  { id: "julian",    artifact: "architecture.md" },
  { id: "jabb",      artifact: "environments.json" },
  { id: "ryan",      artifact: "lakehouse.sql" },
  { id: "alex",      artifact: "flows.json" },
  { id: "brianna",   artifact: "app.msapp" },
  { id: "bianca",    artifact: "dashboards.pbix" },
  { id: "christina", artifact: "test-report.xml" },
  { id: "kaira",     artifact: "security-scan.sarif" },
  { id: "miakkcar",  artifact: "launch-plan.md" }
];

var INFO = {
  lucy: {
    name: "Lucy", title: "Chief AI Orchestrator",
    focus: "planning the work, briefing the team, and coordinating every agent end to end",
    inputs: ["your goal", "requirements", "constraints"],
    outputs: ["project brief", "task plan", "team assignments"],
    tools: ["MotherBridge kernel", "router", "shared memory"]
  },
  julian: {
    name: "Julian", title: "Enterprise Solution Architect",
    focus: "the solution architecture, integration patterns, environments and ALM",
    inputs: ["project brief", "requirements"],
    outputs: ["architecture doc", "integration design", "ALM plan"],
    tools: ["Power Platform", "Azure", "Dataverse"]
  },
  jabb: {
    name: "JABBNETWORKS", title: "Platform Operations Architect",
    focus: "provisioning environments, connections, and platform operations",
    inputs: ["architecture doc"],
    outputs: ["provisioned environments", "connection references", "ops runbook"],
    tools: ["Power Platform admin", "Azure", "DLP policies"]
  },
  ryan: {
    name: "Ryan", title: "Data & Fabric Architect",
    focus: "the data foundation — lakehouse, semantic models, and pipelines",
    inputs: ["environments", "source systems"],
    outputs: ["lakehouse", "semantic model", "dataflows"],
    tools: ["Microsoft Fabric", "Dataverse", "SQL"]
  },
  alex: {
    name: "Alex", title: "Automation Architect",
    focus: "automations, flows, RPA, and Azure Functions",
    inputs: ["data foundation", "process definitions"],
    outputs: ["cloud flows", "RPA bots", "functions"],
    tools: ["Power Automate", "Azure Functions", "Logic Apps"]
  },
  brianna: {
    name: "Brianna", title: "Power Apps Architect",
    focus: "building the app — canvas and model-driven, forms and screens",
    inputs: ["flows", "data model"],
    outputs: ["published app", "forms", "components"],
    tools: ["Power Apps", "Dataverse", "Power Fx"]
  },
  bianca: {
    name: "Bianca", title: "Portal & Analytics Architect",
    focus: "dashboards, reports, and the client portal",
    inputs: ["app", "semantic model"],
    outputs: ["Power BI dashboards", "Power Pages portal"],
    tools: ["Power BI", "Power Pages", "analytics"]
  },
  christina: {
    name: "Christina", title: "QA & DevOps Director",
    focus: "quality — testing, CI/CD, and releases",
    inputs: ["app", "flows", "dashboards"],
    outputs: ["test report", "release pipeline", "staged release"],
    tools: ["Azure DevOps", "test automation", "CI/CD"]
  },
  kaira: {
    name: "Kaira", title: "Security & Governance Director",
    focus: "security, compliance, DLP, and governance",
    inputs: ["release candidate"],
    outputs: ["security scan", "compliance sign-off", "DLP policies"],
    tools: ["Microsoft Purview", "Defender", "Entra"]
  },
  miakkcar: {
    name: "MiaKkcar", title: "Product & Customer Experience Director",
    focus: "product experience, launch, and customer success",
    inputs: ["validated release"],
    outputs: ["launch plan", "UX polish", "success metrics"],
    tools: ["product analytics", "UX research", "roadmap"]
  }
};

function nextOf(id) {
  var i = WORKFLOW.findIndex(function (w) { return w.id === id; });
  return i >= 0 && i < WORKFLOW.length - 1 ? WORKFLOW[i + 1].id : null;
}

function artifactOf(id) {
  var w = WORKFLOW.find(function (x) { return x.id === id; });
  return w ? w.artifact : null;
}

/**
 * Compose a grounded, role-based answer to a free-text question.
 * Deterministic — references the agent's role and the question, no model call.
 */
function answer(id, question) {
  var a = INFO[id];
  if (!a) return null;
  var q = String(question || "").trim();
  var next = nextOf(id);
  var nextName = next && INFO[next] ? INFO[next].name : null;
  var handoff = nextName
    ? " When my part is done I hand " + artifactOf(id) + " to " + nextName + "."
    : " I coordinate the whole team to bring it together.";

  var opener = a.name + " here — " + a.title + ". ";
  var role = "I focus on " + a.focus + ". ";

  var body;
  var ql = q.toLowerCase();
  if (!q) {
    body = "Ask me anything about " + a.focus + ".";
  } else if (/\b(what|which)\b.*\b(do|handle|own|responsib)/.test(ql) || /your (job|role)/.test(ql)) {
    body = "For your request, I'd take " + a.inputs.join(", ") + " and produce " +
           a.outputs.join(", ") + " using " + a.tools.join(", ") + ".";
  } else if (/\b(how|approach|plan|steps?)\b/.test(ql)) {
    body = "My approach: start from " + a.inputs[0] + ", then deliver " +
           a.outputs.join(", ") + " — built on " + a.tools.join(", ") + ".";
  } else if (/\b(status|progress|working|doing)\b/.test(ql)) {
    body = "I'm producing " + a.outputs.join(", ") + " for the current project.";
  } else {
    body = "On \"" + q + "\": that's in my lane. I'd deliver " + a.outputs.join(", ") +
           " using " + a.tools.join(", ") + ".";
  }
  return opener + role + body + handoff;
}

/** Build a system prompt that puts a real model in this agent's role. */
function systemPrompt(id) {
  var a = INFO[id];
  if (!a) return "";
  var next = nextOf(id);
  var nextName = next && INFO[next] ? INFO[next].name : null;
  return [
    "You are " + a.name + ", the " + a.title + " on the JABBNETWORKS AIOS enterprise AI team (powered by JABB Networks).",
    "You focus on " + a.focus + ".",
    "Your typical inputs are " + a.inputs.join(", ") + "; you deliver " + a.outputs.join(", ") +
      "; you work with " + a.tools.join(", ") + ".",
    nextName ? ("When your part is done you hand " + artifactOf(id) + " to " + nextName + ".")
             : "You coordinate the whole team to bring the work together.",
    "Reply in first person as this agent, concise (2-4 sentences), practical and grounded in your role.",
    "Never reveal or invent secrets or credentials — reference them by name only. Mutating or high-impact actions require human approval; you can propose, not authorize."
  ].join(" ");
}

module.exports = {
  WORKFLOW: WORKFLOW,
  INFO: INFO,
  nextOf: nextOf,
  artifactOf: artifactOf,
  answer: answer,
  systemPrompt: systemPrompt,
  list: function () {
    return WORKFLOW.map(function (w) {
      var a = INFO[w.id];
      return {
        id: w.id, name: a.name, title: a.title, focus: a.focus,
        inputs: a.inputs, outputs: a.outputs, tools: a.tools,
        artifact: w.artifact, next: nextOf(w.id)
      };
    });
  }
};
