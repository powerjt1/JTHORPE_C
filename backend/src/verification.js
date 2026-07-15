"use strict";

/** Helpers for the email-verification link. */

var cfg = require("./config").config;
var tokens = require("./tokens");

/** Build a signed, expiring verification URL pointing at /auth/verify. */
function makeVerifyUrl(emailAddr) {
  var ttl = (cfg.verifyTtlMinutes || 1440) * 60;
  var token = tokens.sign({ email: emailAddr, purpose: "verify" }, ttl);
  return cfg.baseUrl.replace(/\/$/, "") + "/auth/verify?token=" + encodeURIComponent(token);
}

module.exports = { makeVerifyUrl: makeVerifyUrl };
