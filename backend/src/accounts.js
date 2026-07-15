"use strict";

/**
 * Trial-account store — SCAFFOLD ONLY.
 *
 * This keeps accounts in memory so the flow runs end to end in dev. Replace
 * the Map with your real data store (and, if you provision Microsoft 365
 * access for the trial user, broker that connection through Nexus — see
 * docs/agents/00-nexus-master-connector.md — rather than storing tokens here).
 */

var byKey = new Map();

function keyFor(profile) {
  return profile.provider + ":" + (profile.sub || profile.email);
}

/**
 * Find an existing trial account for this profile or create one.
 * SSO sign-ins (provider !== "email") arrive with a provider-verified email,
 * so they're marked verified on creation; email-fallback sign-ups are not.
 * @returns {{ id, email, name, provider, emailVerified, isNew, trialStartedAt }}
 */
function findOrCreateTrialAccount(profile) {
  var key = keyFor(profile);
  var existing = byKey.get(key);
  if (existing) {
    return Object.assign({}, existing, { isNew: false });
  }
  var account = {
    id: key,
    email: profile.email,
    name: profile.name,
    provider: profile.provider,
    emailVerified: profile.provider !== "email",
    trialStartedAt: new Date().toISOString()
  };
  byKey.set(key, account);
  // TODO: persist to your database; kick off trial provisioning.
  return Object.assign({}, account, { isNew: true });
}

/** Return a copy of the first account matching this email, or null. */
function getByEmail(emailAddr) {
  var target = String(emailAddr || "").toLowerCase();
  for (var acc of byKey.values()) {
    if (acc.email && acc.email.toLowerCase() === target) {
      return Object.assign({}, acc);
    }
  }
  return null;
}

/** Mark every account with this email as verified. Returns the count updated. */
function markVerifiedByEmail(emailAddr) {
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

module.exports = {
  findOrCreateTrialAccount: findOrCreateTrialAccount,
  getByEmail: getByEmail,
  markVerifiedByEmail: markVerifiedByEmail
};
