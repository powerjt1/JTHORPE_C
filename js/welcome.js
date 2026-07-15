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

  var note = document.getElementById("welcomeNote");
  var resend = document.getElementById("resendBtn");
  if (resend) {
    resend.addEventListener("click", function () {
      // TODO: call your backend to re-send the confirmation email.
      if (note) {
        note.textContent = email
          ? "Confirmation email re-sent to " + email + "."
          : "Confirmation email re-sent.";
        note.className = "form-note success";
      }
    });
  }
})();
