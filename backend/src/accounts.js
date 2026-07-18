"use strict";

/**
 * Trial-account store facade.
 *
 * Two backends, chosen by ACCOUNTS_STORE:
 *   - "memory" (default) — in-process Map; resets on restart. Fine for dev.
 *   - "remote"           — the Python SQLite bridge in ../../db (persistent).
 *
 * All methods are async so the two backends are interchangeable. If you later
 * provision Microsoft 365 access for a trial user, broker that connection
 * through Nexus (docs/agents/00-nexus-master-connector.md) — don't store
 * provider tokens here.
 */

var config = require("./config").config;
var bridgeFetch = require("./bridge").bridgeFetch;

// ---------------------------------------------------------------------------
// In-memory backend
// ---------------------------------------------------------------------------
var byKey = new Map();

function keyFor(profile) {
  return profile.provider + ":" + (profile.sub || profile.email);
}

var memory = {
  async findOrCreate(profile) {
    var key = keyFor(profile);
    var existing = byKey.get(key);
    if (existing) return Object.assign({}, existing, { isNew: false });
    var account = {
      id: key,
      email: profile.email,
      name: profile.name,
      provider: profile.provider,
      emailVerified: profile.provider !== "email",
      trialStartedAt: new Date().toISOString(),
      verifiedAt: null
    };
    byKey.set(key, account);
    return Object.assign({}, account, { isNew: true });
  },
  async getByEmail(emailAddr) {
    var target = String(emailAddr || "").toLowerCase();
    for (var acc of byKey.values()) {
      if (acc.email && acc.email.toLowerCase() === target) return Object.assign({}, acc);
    }
    return null;
  },
  async markVerifiedByEmail(emailAddr) {
    var target = String(emailAddr || "").toLowerCase();
    var n = 0;
    for (var acc of byKey.values()) {
      if (acc.email && acc.email.toLowerCase() === target && !acc.emailVerified) {
        acc.emailVerified = true;
        acc.verifiedAt = new Date().toISOString();
        n++;
      }
    }
    return n;
  }
};

// ---------------------------------------------------------------------------
// Remote backend (Python SQLite bridge)
// ---------------------------------------------------------------------------
var remote = {
  async findOrCreate(profile) {
    var data = await bridgeFetch("/accounts/find-or-create", {
      method: "POST",
      body: JSON.stringify({
        provider: profile.provider,
        sub: profile.sub || null,
        email: profile.email,
        name: profile.name || null
      })
    });
    return data.account;
  },
  async getByEmail(emailAddr) {
    var data = await bridgeFetch("/accounts/by-email?email=" + encodeURIComponent(emailAddr), { method: "GET" });
    return data.account || null;
  },
  async markVerifiedByEmail(emailAddr) {
    var data = await bridgeFetch("/accounts/verify", {
      method: "POST",
      body: JSON.stringify({ email: emailAddr })
    });
    return data.updated || 0;
  }
};

// ---------------------------------------------------------------------------
// Facade
// ---------------------------------------------------------------------------
function backend() {
  return config.accountsStore === "remote" ? remote : memory;
}

module.exports = {
  findOrCreateTrialAccount: function (profile) { return backend().findOrCreate(profile); },
  getByEmail: function (emailAddr) { return backend().getByEmail(emailAddr); },
  markVerifiedByEmail: function (emailAddr) { return backend().markVerifiedByEmail(emailAddr); }
};
