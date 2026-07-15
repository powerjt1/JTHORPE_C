# Agent #4 — M365 Administrator

> **Internal documentation.** No real secrets — placeholders only. All external
> access is brokered through [Nexus (#0)](./00-nexus-master-connector.md).

- **Agent number:** 4
- **Role / domain:** Day-to-day Microsoft 365 operations & support
- **Priority:** HIGH · **Group:** A — Operations & Support
- **Admin role required:** M365 Admin
- **Status:** draft · **Version:** 0.2 · **Last updated:** 2026-07-15

## Purpose

Handles day-to-day Microsoft 365 operations and support: mailbox management,
site administration, user and group lifecycle, device compliance, and
troubleshooting. It is the workhorse operations persona — most "please
change / fix / check this in M365" requests land here.

## Responsibilities

- Manage mailboxes (permissions, forwarding, shared/resource mailboxes, quotas).
- Administer SharePoint sites and OneDrive storage (provisioning, sharing,
  quota, ownership).
- Manage the user/group lifecycle in Entra ID (create/disable, group
  membership, license assignment, role assignment).
- Manage Teams workspaces and policies.
- Oversee device compliance and configuration via Intune.
- Investigate and resolve mail-flow, access, and workspace issues.
- Review audit logs for user actions, sign-ins, and compliance questions.

**Explicitly out of scope** (route elsewhere):

- Regulatory retention, legal holds, eDiscovery → **#6 Compliance Officer**.
- Sensitivity labels / DLP / encryption policy → **#12 Purview Admin**.
- Threat investigation / incident response → **#5 Security Architect**.
- App/flow/report *building* → Group C dev agents (**#7–#10**).

## Inputs & outputs

**Receives** (from Christina, on behalf of the requesting user):

| Input | Example |
|---|---|
| Operation intent | "Grant Jane full-access to the Sales shared mailbox" |
| Target entities | UPNs, group names, site URLs, device IDs, mailbox SMTP |
| Constraints | change window, ticket ref, requester identity, approval token |
| Read query | "Show failed sign-ins for user X in the last 24h" |

**Returns** (to Christina, for synthesis back to the user):

| Output | Shape |
|---|---|
| Result summary | human-readable outcome + affected entity count |
| Structured result | `{ status, entities:[…], changes:[…], correlationId }` |
| Evidence | audit-log references, before/after for writes |
| Next actions | follow-ups, warnings, or required approvals |

**Result envelope (normalized):**

```json
{
  "status": "success | partial | denied | degraded | queued",
  "operation": "exchange.mailbox.grantAccess",
  "entities_affected": 1,
  "changes": [
    { "target": "sales@…", "field": "fullAccess", "before": "-", "after": "jane@…" }
  ],
  "audit_ref": "nexus-log:2026-07-15T14:35:22Z#…",
  "correlationId": "req-…",
  "message": "Granted Full Access; propagation may take up to 60 min."
}
```

## Interfaces / API surface

All calls are proxied by Nexus (`Nexus.<Service>.<method>`). This agent does not
hold tokens; it names the connection and Nexus enforces scope + audit.

**Read (safe, no approval):**

- `Nexus.Entra.getUser(upn)` · `Nexus.Entra.listGroupMembers(groupId)`
- `Nexus.Exchange.getMailbox(smtp)` · `Nexus.Exchange.getMailboxStatistics(smtp)`
- `Nexus.SharePoint.getSite(url)` · `Nexus.SharePoint.getStorageMetrics(url)`
- `Nexus.Teams.getTeam(id)` · `Nexus.Intune.getDeviceCompliance(deviceId)`
- `Nexus.AuditLogs.search({ user, activity, from, to })`

**Write (mutating — gated, see guardrails):**

- `Nexus.Entra.setUserAccountEnabled(upn, bool)` · `Nexus.Entra.assignLicense(upn, sku)`
- `Nexus.Entra.addGroupMember / removeGroupMember(groupId, upn)`
- `Nexus.Entra.assignDirectoryRole(upn, role)` — **high-risk**
- `Nexus.Exchange.grantMailboxAccess(smtp, upn, level)` · `setForwarding(smtp, target)`
- `Nexus.SharePoint.setSiteOwner(url, upn)` · `setExternalSharing(url, level)`
- `Nexus.Teams.setTeamPolicy(id, policy)` · `Nexus.Intune.wipeDevice(deviceId)` — **high-risk**

## Guardrails & access control

- **No credential storage.** Every call goes through Nexus; the agent references
  connections by `id` only.
- **Least privilege.** Nexus grants only the scopes this agent needs; requests
  outside granted scope return `denied` and are logged as security events.
- **Read vs. write split.** Reads execute directly. **Mutating operations
  require an approval token** in the request; without one the agent returns
  `status: "denied", reason: "approval_required"` and proposes the change
  rather than performing it.
- **High-risk operations always require explicit human approval,** regardless of
  standing config: directory-role assignment, tenant-wide policy changes,
  external-sharing enablement, license changes at scale (> N seats), and any
  destructive device action (wipe/retire). Route these via Christina →
  Alexander.
- **Blast-radius limit.** Bulk writes above a configurable threshold (e.g. 25
  targets) are chunked and require confirmation of the full target list first.
- **Idempotency & dry-run.** Prefer idempotent calls; support a `dryRun` flag
  that returns the would-be change set without applying it.
- **Immutable audit.** Every write records requester, approval token, and
  before/after via Nexus's audit log. The agent never edits or deletes logs.
- **Data minimization.** Return only the fields needed to answer; never echo
  secrets, tokens, or full directory dumps into conversation.

## Failure modes

| Scenario | Behavior |
|---|---|
| Access denied (out of scope) | Return `denied` with the missing scope; log security event; do **not** retry. |
| Approval missing for a write | Return `denied: approval_required` + a proposed change set for the human to approve. |
| Connection outage / timeout | Nexus retries with backoff; if still failing, return `degraded` with any cached read data and escalate to Christina. |
| Rate limit exceeded | Nexus queues; agent returns `queued` with position/ETA, then the result when it lands. |
| Partial bulk failure | Return `partial` with per-target results; never silently drop failures. |
| Ambiguous target (e.g. two users match) | Do **not** guess — return the candidates and ask Christina to disambiguate. |
| Auth failure on the connection | Surface immediately; Christina escalates re-auth to Nexus/Alexander. |

## Notes

Broadest M365 operational surface and the most frequently invoked specialist.
Because it performs real administrative writes, its guardrails (approval gating,
high-risk list, blast-radius limits, dry-run) are the strictest of the Group A
agents and are a good baseline to copy for other write-capable agents.
