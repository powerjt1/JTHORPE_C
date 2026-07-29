"use strict";

/**
 * Agents routes — powers the Agents Workspace.
 *   GET  /agents            -> roster + role info + the handoff workflow
 *   POST /agents/:id/ask    -> a grounded, role-based answer to a question
 *
 * Answers use a real Anthropic model when ANTHROPIC_API_KEY is configured
 * (server-side, via src/llm.js), with the agent's MotherBridge role as the
 * system prompt. When no key is set or the call fails, it falls back to a
 * deterministic grounded reply (src/agentinfo.answer). `simulated: true` marks
 * the fallback; a live reply carries `simulated: false` + the model id.
 */

var express = require("express");
var router = express.Router();

var agentinfo = require("../src/agentinfo");
var llm = require("../src/llm");

router.get("/", function (req, res) {
  return res.json({ ok: true, agents: agentinfo.list(), workflow: agentinfo.WORKFLOW });
});

router.post("/:id/ask", async function (req, res) {
  var id = String(req.params.id || "").toLowerCase();
  if (!agentinfo.INFO[id]) return res.status(404).json({ ok: false, error: "Unknown agent." });

  var question = req.body && req.body.question ? String(req.body.question) : "";
  if (question.length > 500) question = question.slice(0, 500);

  var base = {
    ok: true,
    agent: id,
    name: agentinfo.INFO[id].name,
    question: question,
    artifact: agentinfo.artifactOf(id),
    next: agentinfo.nextOf(id)
  };

  // Live model reply when configured; otherwise the grounded fallback.
  if (llm.available() && question) {
    try {
      var out = await llm.complete(
        agentinfo.systemPrompt(id),
        question,
        400
      );
      return res.json(Object.assign({}, base, {
        answer: out.text, simulated: false, model: out.model
      }));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[agents] model call failed, using fallback:", e && e.message ? e.message : e);
    }
  }

  return res.json(Object.assign({}, base, {
    answer: agentinfo.answer(id, question),
    simulated: true
  }));
});

module.exports = router;
