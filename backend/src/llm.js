"use strict";

/**
 * Anthropic model client for real agent replies.
 *
 * Server-side only — the API key comes from ANTHROPIC_API_KEY (env), never the
 * browser and never the repo. When no key is set (or a call fails), callers fall
 * back to the deterministic grounded reply, so the app always works.
 *
 * Env:
 *   ANTHROPIC_API_KEY   required to enable live model replies
 *   ANTHROPIC_MODEL     model id (default below); set to whatever your account has
 *   ANTHROPIC_BASE_URL  override the API base (e.g. a gateway/proxy)
 */

var DEFAULT_MODEL = "claude-sonnet-4-5";
var DEFAULT_BASE = "https://api.anthropic.com";
var TIMEOUT_MS = 20000;

function available() {
  return !!process.env.ANTHROPIC_API_KEY;
}

function model() {
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
}

/**
 * Call the Anthropic Messages API. Resolves { text, model } or rejects on error.
 */
async function complete(system, user, maxTokens) {
  var key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");

  var base = (process.env.ANTHROPIC_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

  try {
    var res = await fetch(base + "/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: model(),
        max_tokens: maxTokens || 400,
        system: system,
        messages: [{ role: "user", content: user }]
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      var errBody = "";
      try { errBody = await res.text(); } catch (e) { /* ignore */ }
      throw new Error("Anthropic API " + res.status + ": " + String(errBody).slice(0, 200));
    }

    var data = await res.json();
    var text = (data.content || [])
      .map(function (b) { return b && b.text ? b.text : ""; })
      .join("")
      .trim();
    if (!text) throw new Error("empty completion");
    return { text: text, model: model() };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { available: available, complete: complete, model: model };
