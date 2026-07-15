"use strict";

/**
 * OAuth 2.0 Authorization Code + PKCE helpers, plus token exchange and
 * userinfo. All secret-bearing calls happen here, server-side only.
 */

var crypto = require("crypto");

function base64url(buf) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Random URL-safe token (default 32 bytes). */
function randomToken(bytes) {
  return base64url(crypto.randomBytes(bytes || 32));
}

/** PKCE: verifier + S256 challenge. */
function createPkce() {
  var verifier = randomToken(48);
  var challenge = base64url(
    crypto.createHash("sha256").update(verifier).digest()
  );
  return { verifier: verifier, challenge: challenge };
}

/**
 * Build the provider authorize URL.
 * @param {object} provider - a config.providers[name] object
 * @param {string} redirectUri
 * @param {string} state
 * @param {string} codeChallenge
 */
function buildAuthorizeUrl(provider, redirectUri, state, codeChallenge) {
  var params = new URLSearchParams({
    client_id: provider.clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: provider.scopes,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256"
  });
  var extra = provider.extraAuthParams || {};
  Object.keys(extra).forEach(function (k) {
    params.set(k, extra[k]);
  });
  return provider.authorizeUrl + "?" + params.toString();
}

/** Exchange an authorization code for tokens (server-side; sends the secret). */
async function exchangeCodeForTokens(provider, code, codeVerifier, redirectUri) {
  var body = new URLSearchParams({
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    code: code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code_verifier: codeVerifier
  });

  var res = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString()
  });

  var data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    var msg = data.error_description || data.error || ("token exchange failed (" + res.status + ")");
    throw new Error(msg);
  }
  return data; // { access_token, id_token, refresh_token?, expires_in, ... }
}

/** Fetch the OpenID Connect userinfo with the access token. */
async function fetchUserInfo(provider, accessToken) {
  var res = await fetch(provider.userInfoUrl, {
    headers: { Authorization: "Bearer " + accessToken, Accept: "application/json" }
  });
  var data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    throw new Error(data.error_description || data.error || ("userinfo failed (" + res.status + ")"));
  }
  return data; // { sub, email, name, ... }
}

/** Normalize provider userinfo into a common profile shape. */
function normalizeProfile(providerName, info) {
  return {
    provider: providerName,
    sub: info.sub || info.oid || info.id || null,
    email: info.email || info.preferred_username || info.upn || null,
    name: info.name || info.given_name || null
  };
}

module.exports = {
  randomToken: randomToken,
  createPkce: createPkce,
  buildAuthorizeUrl: buildAuthorizeUrl,
  exchangeCodeForTokens: exchangeCodeForTokens,
  fetchUserInfo: fetchUserInfo,
  normalizeProfile: normalizeProfile
};
