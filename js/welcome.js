/* =========================================================
   Lucy AI — post-signup welcome screen
   Reads the trial email handed off by signup.js (sessionStorage)
   to personalize the confirmation, without putting PII in the URL.
   ========================================================= */
(function () {
  "use strict";

  var email = "";
  try { email = sessionStorage.getItem("lucy_trial_email") || ""; } catch (e) {}

  var lede = document.getElementById("welcomeLede");
  if (lede && email) {
    lede.innerHTML =
      "We've sent a confirmation link to <strong>" +
      email.replace(/[<>&]/g, "") +
      "</strong>. Click it to activate your 14-day free trial.";
  }

  // Keep in sync with js/signup.js. When the backend is live, resend calls it;
  // otherwise it just shows a confirmation message.
  var CONFIG = { authBaseUrl: "", backendEnabled: false };

  var note = document.getElementById("welcomeNote");
  var resend = document.getElementById("resendBtn");

  function setNote(msg, kind) {
    if (!note) return;
    note.textContent = msg;
    note.className = "form-note" + (kind ? " " + kind : "");
  }

  if (resend) {
    resend.addEventListener("click", function () {
      if (CONFIG.backendEnabled) {
        var base = (CONFIG.authBaseUrl || "").replace(/\/$/, "");
        setNote("Sending…", "");
        fetch(base + "/email/resend", { method: "POST", credentials: "include" })
          .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
          .then(function (res) {
            if (res.ok) setNote("Confirmation email re-sent" + (email ? " to " + email : "") + ".", "success");
            else setNote((res.d && res.d.error) || "Couldn't resend right now.", "error");
          })
          .catch(function () { setNote("Couldn't resend right now.", "error"); });
        return;
      }
      setNote(email ? "Confirmation email re-sent to " + email + "." : "Confirmation email re-sent.", "success");
    });
  }
})();
