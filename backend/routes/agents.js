"use strict";

/**
 * Agents routes — powers the Agents Workspace.
 *   GET  /agents            -> roster + role info + the handoff workflow
 *   POST /agents/:id/ask    -> a grounded, role-based answer to a question
 *
 * Answers are composed from each agent's MotherBridge role (src/agentinfo.js) —
 * deterministic and grounded, NOT a live language model. `simulated: true` marks
 * that. A real model is wired via a kernel connection (docs/motherbridge).
 */

var express = require("express");
var router = express.Router();

var agentinfo = require("../src/agentinfo");

router.get("/", function (req, res) {
  return res.json({ ok: true, agents: agentinfo.list(), workflow: agentinfo.WORKFLOW });
});

router.post("/:id/ask", function (req, res) {
  var id = String(req.params.id || "").toLowerCase();
  if (!agentinfo.INFO[id]) return res.status(404).json({ ok: false, error: "Unknown agent." });

  var question = req.body && req.body.question ? String(req.body.question) : "";
  if (question.length > 500) question = question.slice(0, 500);

  var text = agentinfo.answer(id, question);
  return res.json({
    ok: true,
    agent: id,
    name: agentinfo.INFO[id].name,
    question: question,
    answer: text,
    artifact: agentinfo.artifactOf(id),
    next: agentinfo.nextOf(id),
    simulated: true   // grounded role-based reply, not a live model
  });
});

module.exports = router;
