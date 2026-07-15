/* =========================================================
   Lucy AI — free-trial sign-up (SSO + email)
   ---------------------------------------------------------
   Front-end only. Real "Continue with Microsoft/Google"
   requires:
     1) An OAuth app registration per provider (client IDs).
     2) A backend callback that exchanges the auth code for
        tokens (never done in the browser).
   Fill in the CONFIG below and implement the callback, then
   the buttons will redirect users into the real consent flow.
   Until CONFIG is filled, buttons show a friendly notice
   instead of sending users into a broken redirect.
   See docs/auth-setup.md.
   ========================================================= */
(function () {
  "use strict";

  var CONFIG = {
    microsoft: {
      clientId: "",                 // Azure AD app (client) ID
      tenant: "common",             // "common" | "organizations" | your tenant GUID
      authorizeUrl: "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize",
      redirectUri: window.location.origin + "/auth/callback",
      scopes: "openid profile email User.Read"
    },
    google: {
      clientId: "",                 // Google OAuth 2.0 client ID
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      redirectUri: window.location.origin + "/auth/callback",
      scopes: "openid profile email"
    }
  };

  var note = document.getElementById("authNote");

  function showNote(msg, kind) {
    if (!note) return;
    note.textContent = msg;
    note.className = "form-note" + (kind ? " " + kind : "");
  }

  function randomState() {
    var a = new Uint8Array(16);
    (window.crypto || {}).getRandomValues && window.crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (b) {
      return ("0" + b.toString(16)).slice(-2);
    }).join("");
  }

  // Build a standards-compliant authorization-code redirect URL.
  function buildAuthUrl(provider) {
    var c = CONFIG[provider];
    var base = c.authorizeUrl.replace("{tenant}", c.tenant || "common");
    var state = randomState();
    try { sessionStorage.setItem("lucy_oauth_state", state); } catch (e) {}
    var params = new URLSearchParams({
      client_id: c.clientId,
      response_type: "code",
      redirect_uri: c.redirectUri,
      scope: c.scopes,
      state: state
    });
    if (provider === "microsoft") { params.set("response_mode", "query"); }
    if (provider === "google") { params.set("access_type", "offline"); params.set("prompt", "consent"); }
    return base + "?" + params.toString();
  }

  function startSso(provider, label) {
    var c = CONFIG[provider];
    if (!c || !c.clientId) {
      showNote(
        "Sign-in with " + label + " isn't connected yet. Add the " + label +
        " client ID in js/signup.js (see docs/auth-setup.md) to enable it.",
        "error"
      );
      return;
    }
    showNote("Redirecting to " + label + "…", "success");
    window.location.assign(buildAuthUrl(provider));
  }

  var msBtn = document.getElementById("ssoMicrosoft");
  var gBtn = document.getElementById("ssoGoogle");
  if (msBtn) msBtn.addEventListener("click", function () { startSso("microsoft", "Microsoft"); });
  if (gBtn) gBtn.addEventListener("click", function () { startSso("google", "Google"); });

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
      // TODO: POST to your trial-provisioning endpoint (JABB backend / service).
      // eslint-disable-next-line no-console
      console.log("Trial sign-up (demo):", { email: email });
      showNote("Thanks! Check " + email + " to confirm and start your trial.", "success");
      form.reset();
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
