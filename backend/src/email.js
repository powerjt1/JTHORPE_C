"use strict";

/**
 * Outbound email for the trial welcome/confirmation.
 *
 * Two transports, matching the sign-in ecosystem:
 *   - "graph"  -> Microsoft Graph (Outlook)  sendMail as EMAIL_FROM (app-only)
 *   - "gmail"  -> Gmail API                  send as EMAIL_FROM (refresh token)
 *   - "none"   -> logs to the console (default; no config required)
 *
 * Config is read at call time from src/config so it can be changed/tested
 * without re-requiring. Secrets come from env only.
 */

var cfg = require("./config").config;

// ---------- message content ----------

function buildWelcomeEmail(opts) {
  var name = (opts && opts.name) ? String(opts.name).split(" ")[0] : "there";
  var subject = "Welcome to Lucy AI — confirm your free trial";
  var html =
    '<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:auto;color:#1f2233">' +
    '<h1 style="font-size:22px">You\'re in, ' + escapeHtml(name) + '! 🎉</h1>' +
    "<p>Your 14-day Lucy AI free trial is ready. Here's what happens next:</p>" +
    "<ol><li>Confirm this email address.</li>" +
    "<li>Connect your Microsoft or Google account.</li>" +
    "<li>Tell Lucy what to automate first.</li></ol>" +
    '<p style="color:#5b6178;font-size:13px">Powered by JABB Networks.</p>' +
    "</div>";
  var text =
    "You're in, " + name + "!\n\n" +
    "Your 14-day Lucy AI free trial is ready.\n" +
    "1. Confirm this email address.\n" +
    "2. Connect your Microsoft or Google account.\n" +
    "3. Tell Lucy what to automate first.\n\n" +
    "Powered by JABB Networks.";
  return { subject: subject, html: html, text: text };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

// ---------- transports ----------

async function getGraphAppToken(g) {
  var url = "https://login.microsoftonline.com/" + (g.tenant || "common") + "/oauth2/v2.0/token";
  var body = new URLSearchParams({
    client_id: g.clientId,
    client_secret: g.clientSecret,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default"
  });
  var res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  var data = await res.json().catch(function () { return {}; });
  if (!res.ok) throw new Error(data.error_description || data.error || "graph token failed");
  return data.access_token;
}

async function sendViaGraph(email, to, msg) {
  var g = email.graph;
  if (!g.clientId || !g.clientSecret || !email.from) {
    throw new Error("Graph email not configured (need EMAIL_GRAPH_CLIENT_ID/SECRET + EMAIL_FROM).");
  }
  var token = await getGraphAppToken(g);
  var url = "https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(email.from) + "/sendMail";
  var payload = {
    message: {
      subject: msg.subject,
      body: { contentType: "HTML", content: msg.html },
      toRecipients: [{ emailAddress: { address: to } }]
    },
    saveToSentItems: false
  };
  var res = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (res.status !== 202 && !res.ok) {
    var err = await res.text().catch(function () { return ""; });
    throw new Error("graph sendMail failed (" + res.status + "): " + err.slice(0, 200));
  }
  return { transport: "graph", accepted: true };
}

async function getGmailAccessToken(gm) {
  var body = new URLSearchParams({
    client_id: gm.clientId,
    client_secret: gm.clientSecret,
    refresh_token: gm.refreshToken,
    grant_type: "refresh_token"
  });
  var res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  var data = await res.json().catch(function () { return {}; });
  if (!res.ok) throw new Error(data.error_description || data.error || "gmail token failed");
  return data.access_token;
}

function base64url(str) {
  return Buffer.from(str, "utf8").toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sendViaGmail(email, to, msg) {
  var gm = email.gmail;
  if (!gm.clientId || !gm.clientSecret || !gm.refreshToken || !email.from) {
    throw new Error("Gmail email not configured (need GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN + EMAIL_FROM).");
  }
  var token = await getGmailAccessToken(gm);
  var fromHeader = email.fromName ? (email.fromName + " <" + email.from + ">") : email.from;
  var raw = [
    "From: " + fromHeader,
    "To: " + to,
    "Subject: " + msg.subject,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    msg.html
  ].join("\r\n");
  var res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: base64url(raw) })
  });
  var data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    throw new Error("gmail send failed (" + res.status + "): " +
      ((data.error && data.error.message) || JSON.stringify(data)).slice(0, 200));
  }
  return { transport: "gmail", id: data.id };
}

// ---------- public API ----------

/** Send the trial welcome email to `to`. Resolves even for "none". */
async function sendTrialWelcome(to, opts) {
  var email = cfg.email;
  var msg = buildWelcomeEmail(opts || {});

  if (email.provider === "graph") return sendViaGraph(email, to, msg);
  if (email.provider === "gmail") return sendViaGmail(email, to, msg);

  // "none" — log so the flow is observable without email config.
  // eslint-disable-next-line no-console
  console.log("[email:none] would send to " + to + " — subject: " + msg.subject);
  return { transport: "none", logged: true };
}

module.exports = {
  sendTrialWelcome: sendTrialWelcome,
  buildWelcomeEmail: buildWelcomeEmail // exported for tests
};
