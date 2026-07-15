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
 * @returns {{ id, email, name, provider, isNew, trialStartedAt }}
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
    trialStartedAt: new Date().toISOString()
  };
  byKey.set(key, account);
  // TODO: persist to your database; kick off trial provisioning + welcome email.
  return Object.assign({}, account, { isNew: true });
}

module.exports = { findOrCreateTrialAccount: findOrCreateTrialAccount };
