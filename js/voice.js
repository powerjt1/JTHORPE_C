/* =========================================================
   AIOSVoice — per-agent speech (TTS) + voice input (STT).
   Uses the browser Web Speech API (no keys, works offline). This is the
   working v1 of the Voice Integration Spec; a server gateway (Azure Speech)
   is the eventual production path. Each agent gets a distinct voice via a
   deterministic pitch/rate profile + a stable pick from available voices.
   Exposes window.AIOSVoice.
   ========================================================= */
(function () {
  "use strict";

  var synth = window.speechSynthesis || null;
  var ttsSupported = !!synth;
  var enabled = true;

  // Distinct pitch/rate per agent so voices are recognizably different.
  var PROFILES = {
    lucy:      { pitch: 1.15, rate: 1.00 },
    julian:    { pitch: 0.90, rate: 0.98 },
    alex:      { pitch: 1.00, rate: 1.06 },
    brianna:   { pitch: 1.22, rate: 1.03 },
    bianca:    { pitch: 1.10, rate: 1.00 },
    ryan:      { pitch: 0.85, rate: 0.97 },
    jabb:      { pitch: 0.80, rate: 0.95 },
    christina: { pitch: 1.25, rate: 1.04 },
    kaira:     { pitch: 1.05, rate: 0.99 },
    miakkcar:  { pitch: 1.30, rate: 1.05 }
  };
  var ORDER = Object.keys(PROFILES);

  var voices = [];
  function loadVoices() { voices = synth ? synth.getVoices() : []; }
  if (synth) {
    loadVoices();
    if (typeof synth.onvoiceschanged !== "undefined") synth.onvoiceschanged = loadVoices;
  }

  function pickVoice(agentId) {
    if (!voices.length) loadVoices();
    if (!voices.length) return null;
    var en = voices.filter(function (v) { return /^en/i.test(v.lang); });
    var pool = en.length ? en : voices;
    var i = ORDER.indexOf(agentId);
    if (i < 0) i = 0;
    return pool[i % pool.length];
  }

  function speak(agentId, text) {
    if (!ttsSupported || !enabled || !text) return;
    try {
      synth.cancel();
      var u = new SpeechSynthesisUtterance(String(text));
      var prof = PROFILES[agentId] || { pitch: 1, rate: 1 };
      u.pitch = prof.pitch; u.rate = prof.rate; u.volume = 1;
      var v = pickVoice(agentId);
      if (v) u.voice = v;
      synth.speak(u);
    } catch (e) { /* no-op */ }
  }

  function stop() { if (ttsSupported) { try { synth.cancel(); } catch (e) {} } }
  function setEnabled(v) { enabled = !!v; if (!enabled) stop(); }
  function isEnabled() { return enabled; }

  // --- Voice input (speech-to-text) ---
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var sttSupported = !!SR;

  function listen(onResult, onEnd) {
    if (!SR) { if (onEnd) onEnd("unsupported"); return null; }
    var rec;
    try { rec = new SR(); } catch (e) { if (onEnd) onEnd("error"); return null; }
    rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = function (e) {
      var t = e.results && e.results[0] && e.results[0][0] ? e.results[0][0].transcript : "";
      if (onResult) onResult(t);
    };
    rec.onerror = function (e) { if (onEnd) onEnd(e && e.error ? e.error : "error"); };
    rec.onend = function () { if (onEnd) onEnd(null); };
    try { rec.start(); } catch (e) { if (onEnd) onEnd("error"); return null; }
    return rec;
  }

  window.AIOSVoice = {
    speak: speak, stop: stop, setEnabled: setEnabled, isEnabled: isEnabled,
    listen: listen, ttsSupported: ttsSupported, sttSupported: sttSupported
  };
})();
