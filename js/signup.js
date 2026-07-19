/* =========================================================
   Lucy AI — free-trial sign-up (SSO + email)
   ---------------------------------------------------------
   The secure half of OAuth (PKCE, state, code<->token exchange
   with the client secret) lives in the backend (see backend/).
   The buttons here just hand off to the backend's start route:
       GET {authBaseUrl}/auth/microsoft/start
       GET {authBaseUrl}/auth/google/start
   Set ssoEnabled = true and authBaseUrl once the backend is
   deployed and its providers are configured. See docs/auth-setup.md.
   ========================================================= */
(function () {
  "use strict";

  var CONFIG = {
    // Base URL of the deployed auth backend. "" = same origin as this site
    // (e.g. when the backend serves the site with SERVE_STATIC=true).
    authBaseUrl: "",
    // Flip to true once the backend is live and providers are configured.
    ssoEnabled: false
  };

  var note = document.getElementById("authNote");

  function showNote(msg, kind) {
    if (!note) return;
    note.textContent = msg;
    note.className = "form-note" + (kind ? " " + kind : "");
  }

  function startSso(provider, label) {
    if (!CONFIG.ssoEnabled) {
      showNote(
        "Sign-in with " + label + " isn't connected yet. Deploy the auth backend " +
        "(see backend/README.md) and set ssoEnabled + authBaseUrl in js/signup.js.",
        "error"
      );
      return;
    }
    showNote("Redirecting to " + label + "…", "success");
    var base = (CONFIG.authBaseUrl || "").replace(/\/$/, "");
    window.location.assign(base + "/auth/" + provider + "/start");
  }

  var msBtn = document.getElementById("ssoMicrosoft");
  var gBtn = document.getElementById("ssoGoogle");
  if (msBtn) msBtn.addEventListener("click", function () { startSso("microsoft", "Microsoft"); });
  if (gBtn) gBtn.addEventListener("click", function () { startSso("google", "Google"); });

  // Surface an error passed back from the backend callback (?error=...).
  try {
    var params = new URLSearchParams(window.location.search);
    var err = params.get("error");
    if (err) showNote(err, "error");
  } catch (e) {}

  // Email fallback — front-end capture only (wire to a backend/service later).
  var form = document.getElementById("trialForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      showNote("", "");
      if (!form.checkValidity()) {
        showNote("Please enter a valid work email.", "error");
        var invalid = form.querySelector(":invalid");
        if (invalid) invalid.focus();
        return;
      }
      var email = form.email.value.trim();
      // Hand the email to the welcome screen without putting PII in the URL.
      try { sessionStorage.setItem("lucy_trial_email", email); } catch (err) {}

      if (CONFIG.ssoEnabled) {
        // Backend is live: create the trial + send the welcome email (Gmail or
        // Outlook, per the backend's EMAIL_PROVIDER).
        showNote("Setting up your trial…", "success");
        var base = (CONFIG.authBaseUrl || "").replace(/\/$/, "");
        fetch(base + "/email/trial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: email })
        }).then(function () {
          window.location.assign("welcome.html");
        }).catch(function () {
          window.location.assign("welcome.html");
        });
        return;
      }

      // Front-end only (backend not wired yet).
      // eslint-disable-next-line no-console
      console.log("Trial sign-up (demo):", { email: email });
      showNote("Thanks! Taking you to the next step…", "success");
      window.location.assign("welcome.html");
    });
  }

  var signin = document.getElementById("signinLink");
  if (signin) {
    signin.addEventListener("click", function (e) {
      e.preventDefault();
      showNote("Sign-in isn't available yet — this is the trial sign-up flow.", "");
    });
  }
})();
