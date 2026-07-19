"use strict";

/**
 * Stateless, signed, expiring tokens (HMAC-SHA256) for email verification.
 * Format:  base64url(JSON payload) + "." + base64url(HMAC)
 * No database needed — the signature + exp make it self-validating.
 */

var crypto = require("crypto");
var cfg = require("./config").config;

function b64url(buf) {
  return Buffer.from(buf).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64").toString("utf8");
}

function secret() {
  return cfg.tokenSecret || cfg.cookieSecret || "";
}

function hmac(data) {
  return b64url(crypto.createHmac("sha256", secret()).update(data).digest());
}

/**
 * Sign a payload into a token.
 * @param {object} claims - arbitrary claims (e.g. { email, purpose })
 * @param {number} ttlSeconds - lifetime in seconds
 */
function sign(claims, ttlSeconds) {
  var now = Math.floor(Date.now() / 1000);
  var payload = Object.assign({}, claims, { iat: now, exp: now + (ttlSeconds || 3600) });
  var body = b64url(JSON.stringify(payload));
  return body + "." + hmac(body);
}

/**
 * Verify a token. Throws on tampering or expiry; returns the claims on success.
 */
function verify(token) {
  if (typeof token !== "string" || token.indexOf(".") === -1) {
    throw new Error("malformed token");
  }
  var parts = token.split(".");
  var body = parts[0];
  var sig = parts[1];
  var expected = hmac(body);
  var a = Buffer.from(sig);
  var b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error("bad signature");
  }
  var claims = JSON.parse(b64urlDecode(body));
  if (!claims.exp || Math.floor(Date.now() / 1000) > claims.exp) {
    throw new Error("expired");
  }
  return claims;
}

module.exports = { sign: sign, verify: verify };
