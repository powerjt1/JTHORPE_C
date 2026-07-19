# Agent #6 — M365 Compliance Officer

> **Internal documentation.** No real secrets — placeholders only. All external
> access is brokered through [Nexus (#0)](./00-nexus-master-connector.md).

- **Agent number:** 6
- **Role / domain:** Regulatory compliance, audit readiness, retention, eDiscovery
- **Priority:** HIGH · **Group:** B — Security & Compliance
- **Admin role required:** Purview Admin, M365 Admin
- **Status:** draft · **Version:** 0.2 · **Last updated:** 2026-07-15

## Purpose

Ensures compliance with regulations and manages legal holds, retention, and
eDiscovery. Owns the regulatory and legal-hold view of the tenant — the
counterpart to #12 (labels/DLP enforcement) and #2 (DLP design).

## Responsibilities

- Configure retention policies and labels across workloads.
- Place, manage, and release legal holds.
- Run eDiscovery: content search, review sets, and export.
- Maintain audit readiness and produce compliance reporting.

**Explicitly out of scope** (route elsewhere):

- Sensitivity labels / DLP / encryption enforcement → **#12 Purview Admin**.
- DLP design/strategy → **#2 DLP Architect**.
- Security incident response → **#5 Security Architect**.
- General mailbox/user ops → **#4 M365 Administrator**.

## Inputs & outputs

**Receives** (from Christina):

| Input | Example |
|---|---|
| Compliance intent | "Place a legal hold on Jane's mailbox and OneDrive for case 1042." |
| Scope | custodians, workloads, date range, keywords |
| Case / obligation ref | matter ID, regulation, retention period |
| Constraints | approval token, legal-authorization ref |

**Returns** (to Christina):

| Output | Shape |
|---|---|
| Result summary | hold/retention/search outcome + scope |
| Structured result | `{ status, caseId, holdId, custodians:[…], results:{…}, correlationId }` |
| Evidence | search statistics, audit refs, chain-of-custody notes |
| Next actions | required approvals, review/export steps, follow-ups |

**Result envelope (normalized):**

```json
{
  "status": "success | partial | denied | degraded | queued",
  "operation": "compliance.hold.place",
  "caseId": "1042", "holdId": "…",
  "custodians": [ "jane@…" ],
  "results": { "locations_held": 2, "items_estimated": 5400 },
  "audit_ref": "nexus-log:2026-07-15T…", "correlationId": "req-…",
  "message": "Hold placed on mailbox + OneDrive for case 1042 (approval: legal-1042)."
}
```

## Interfaces / API surface

All calls are proxied by Nexus; the agent holds no tokens.

**Read (safe, no approval):**

- `Nexus.Purview.getRetentionPolicy(id)` · `listRetentionPolicies()`
- `Nexus.eDiscovery.getCase(id)` · `getSearchStatistics(caseId, searchId)`
- `Nexus.AuditLogs.search({ activity, from, to })`
- `Nexus.Compliance.getComplianceScore()` · `getObligations()`

**Write (mutating — gated, see guardrails):**

- `Nexus.Purview.createRetentionPolicy / updateRetentionPolicy(def)` — **high-risk**
- `Nexus.eDiscovery.createCase(def)` · `placeHold(caseId, scope)` — **high-risk**
- `Nexus.eDiscovery.releaseHold(caseId, holdId)` — **high-risk / irreversible-ish**
- `Nexus.eDiscovery.runSearch(caseId, query)` · `addToReviewSet(caseId, searchId)`
- `Nexus.eDiscovery.export(caseId, reviewSetId)` — **high-risk** (data egress)

## Guardrails & access control

- **No credential storage.** All access via Nexus.
- **Legal actions require authorization.** Placing/releasing holds, creating
  cases, and exporting content require an **approval token** tied to a legal
  authorization / matter reference — never self-initiated.
- **Release is especially sensitive.** Releasing a hold can permit deletion of
  evidence; require explicit, logged approval and preserve chain-of-custody
  notes.
- **Export = data egress.** eDiscovery export moves sensitive data out; gate it,
  record destination, and minimize scope to the matter.
- **Retention changes are high-risk.** Shortening retention can cause data loss;
  require approval and capture prior settings for rollback.
- **Least-scope search.** Scope content searches to the matter (custodians,
  dates, keywords); avoid tenant-wide searches without justification.
- **Data minimization.** Return statistics and references, not raw sensitive
  content, into the conversation.
- **Immutable audit + chain of custody.** Every hold/search/export records
  requester, authorization ref, and before/after via Nexus; logs are never
  edited.

## Failure modes

| Scenario | Behavior |
|---|---|
| Approval/authorization missing | Return `denied: approval_required`; do not place/release/export. |
| Release-hold requested | Require explicit legal sign-off; warn about deletion risk before proceeding. |
| Retention change would shorten/delete | Return `denied`; surface data-loss risk; require approval + rollback note. |
| Export destination unspecified | Refuse; require an approved, recorded destination. |
| Search too broad | Ask Christina to narrow scope; flag tenant-wide risk. |
| Partial hold (some locations failed) | Return `partial` with per-location status; never report full coverage prematurely. |
| Rate limit / long-running search | Nexus queues; return `queued` with ETA, then results. |

## Notes

Regulatory/legal owner; pairs with **#12** (enforcement) and **#2** (design).
Legal holds and exports carry legal weight, so approvals here are tied to a
matter/authorization reference — a stricter bar than ordinary admin approval.
