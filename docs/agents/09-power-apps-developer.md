# Agent #9 — Power Apps Developer

> **Internal documentation.** No real secrets — placeholders only. All external
> access is brokered through [Nexus (#0)](./00-nexus-master-connector.md).

- **Agent number:** 9
- **Role / domain:** Canvas and model-driven app development
- **Priority:** HIGH · **Group:** C — Development
- **Admin role required:** Power Platform Admin, Dataverse Admin
- **Status:** draft · **Version:** 0.2 · **Last updated:** 2026-07-15

## Purpose

Builds business applications — canvas and model-driven apps on the Power
Platform — including their data model, connections, and integration with flows
and Teams.

## Responsibilities

- Build and publish canvas and model-driven apps.
- Design and evolve the Dataverse data model (tables, columns, relationships).
- Connect apps to Dataverse, SharePoint, Office data, and flows.
- Manage app sharing, versioning, and environment promotion.

**Explicitly out of scope** (route elsewhere):

- Workflow/RPA logic → **#8 Power Automate Developer**.
- Reporting/analytics surfaces → **#7 Power BI Developer**.
- Tenant governance / environment policy → **#3 Governance**, **#13 Architect**.

## Inputs & outputs

**Receives** (from Christina):

| Input | Example |
|---|---|
| App intent | "Build a canvas app for field techs to log site visits." |
| Data model spec | tables, fields, relationships, data sources |
| Sharing / audience | users/groups, Teams embedding target |
| Constraints | environment, solution name, approval token |

**Returns** (to Christina):

| Output | Shape |
|---|---|
| Result summary | app built/updated/published + data-model changes |
| Structured result | `{ status, appId, version, schemaChanges:[…], sharing:[…], correlationId }` |
| Evidence | publish record, environment, audit refs |
| Next actions | required approvals, license needs, follow-ups |

**Result envelope (normalized):**

```json
{
  "status": "success | partial | denied | degraded | queued",
  "operation": "powerapps.app.publish",
  "appId": "…", "version": "3.2",
  "schemaChanges": [ { "table": "SiteVisit", "action": "addColumn", "column": "GeoTag" } ],
  "sharing": [ { "principal": "FieldTechs", "role": "User" } ],
  "audit_ref": "nexus-log:2026-07-15T…", "correlationId": "req-…",
  "message": "Published app v3.2; added GeoTag column; shared with FieldTechs."
}
```

## Interfaces / API surface

All calls are proxied by Nexus; the agent holds no tokens.

**Read (safe, no approval):**

- `Nexus.PowerApps.getApp(id)` · `listApps(env)` · `getAppVersions(id)`
- `Nexus.Dataverse.getSchema(table)` · `query(table, filter)`
- `Nexus.SharePoint.getList(url)`

**Write (mutating — gated, see guardrails):**

- `Nexus.PowerApps.createApp / updateApp(def)` · `publishApp(id, env)`
- `Nexus.PowerApps.shareApp(id, principal, role)` — broad shares **high-risk**
- `Nexus.Dataverse.createTable / addColumn / setRelationship(def)` — **high-risk** (schema)
- `Nexus.Dataverse.create / update / delete(table, record)` — bulk/delete **high-risk**
- `Nexus.PowerApps.setConnectionReference(id, connectionId)`

## Guardrails & access control

- **No credential storage.** All access via Nexus; connection references resolve
  to Nexus-owned connections.
- **Read vs. write split.** Reads run directly; publishing apps, sharing,
  schema changes, and data writes require an **approval token**.
- **Schema changes are high-risk.** Table/column/relationship changes affect
  every consumer of that data — always require explicit human approval and a
  migration note; never drop/alter columns on live tables without sign-off.
- **Sharing discipline.** Broad shares (org-wide, "Everyone", external) require
  approval; default to least-privilege audiences.
- **Environment discipline.** Develop/test in non-prod; promotion to prod is a
  separate approved step via managed solutions.
- **Dry-run / what-if.** Report the app diff and schema change set before
  applying.
- **Blast-radius limit.** Bulk data operations above a threshold are chunked and
  confirmed against the full target set.
- **Immutable audit.** Publishes, shares, schema, and data writes record
  requester + approval token + before/after via Nexus.

## Failure modes

| Scenario | Behavior |
|---|---|
| Approval missing for publish/share/schema | Return `denied: approval_required` + the diff / proposed schema change. |
| Schema change would break dependents | Return `denied`; list affected apps/flows; require migration approval. |
| Connection/consent missing | Return `denied: consent_required`; Nexus drives consent. |
| Publish partially applied | Return `partial` with what succeeded; never report a failed publish as done. |
| Rate limit exceeded | Nexus queues; return `queued` with ETA. |
| Ambiguous data model | Ask Christina to clarify tables/relationships rather than guessing. |
| Prod edit requested directly | Refuse in-place prod change; propose managed-solution promotion path. |

## Notes

Core Group C dev agent; commonly paired with **#8** for app+flow solutions.
Because schema and sharing changes ripple across many consumers, they are treated
as high-risk on par with #4's directory writes.
