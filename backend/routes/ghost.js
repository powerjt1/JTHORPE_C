"use strict";

/**
 * Ghost agents routes — powers JABB Power-AI-On-Demand (ghost-ai.html).
 *   GET  /ghost-agents          -> the 9-agent roster
 *   POST /ghost-agents/:id/ask -> a JARVIS-styled reply for one chat turn
 *
 * Same live-model-with-fallback shape as routes/agents.js: uses a real
 * Anthropic model (server-side, via src/llm.js) when ANTHROPIC_API_KEY is
 * configured, with the agent's persona as the system prompt and the client's
 * prior turns as history. Falls back to a deterministic in-character reply
 * otherwise. `simulated: true` marks the fallback.
 */

var express = require("express");
var router = express.Router();

var roster = require("../src/ghostroster");
var llm = require("../src/llm");

router.get("/", function (req, res) {
  return res.json({ ok: true, agents: roster.list(), pipeline: roster.PIPELINE });
});

router.post("/:id/ask", async function (req, res) {
  var id = String(req.params.id || "").toLowerCase();
  if (!roster.AGENTS[id]) return res.status(404).json({ ok: false, error: "Unknown agent." });

  var question = req.body && req.body.question ? String(req.body.question) : "";
  if (question.length > 4000) question = question.slice(0, 4000);

  var history = Array.isArray(req.body && req.body.history) ? req.body.history.slice(-20) : [];

  // The client may send a persona override (speech-style variant or a fully
  // custom prompt from Settings); fall back to this agent's default persona.
  var systemPrompt = (req.body && req.body.systemPrompt)
    ? String(req.body.systemPrompt).slice(0, 6000)
    : roster.systemPrompt(id);

  var base = { ok: true, agent: id, name: roster.AGENTS[id].name, question: question };

  if (llm.available() && question) {
    try {
      var out = await llm.complete(systemPrompt, question, 1000, history);
      return res.json(Object.assign({}, base, { answer: out.text, simulated: false, model: out.model }));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[ghost-agents] model call failed, using fallback:", e && e.message ? e.message : e);
    }
  }

  return res.json(Object.assign({}, base, { answer: roster.answer(id, question), simulated: true }));
});

module.exports = router;
