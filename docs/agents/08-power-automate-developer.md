# Agent #8 — Power Automate Developer

> **Internal documentation.** No real secrets — placeholders only. All external
> access is brokered through [Nexus (#0)](./00-nexus-master-connector.md).

- **Agent number:** 8
- **Role / domain:** Automation, flow design, RPA implementation
- **Priority:** HIGH · **Group:** C — Development
- **Admin role required:** Power Platform Admin, Dataverse Admin
- **Status:** draft · **Version:** 0.2 · **Last updated:** 2026-07-15

## Purpose

Builds automated workflows and integrations across Microsoft and third-party
systems, including desktop RPA. Owns the design, testing, and deployment of
cloud and desktop flows and the data operations they perform.

## Responsibilities

- Design cloud flows (triggers, actions, conditions, error handling).
- Build desktop flows (RPA / UI automation) for legacy systems.
- Perform Dataverse and SharePoint CRUD as part of automation.
- Integrate mail, Teams, HTTP/REST, SQL, and custom connectors.
- Test, version, and deploy flows across environments.

**Explicitly out of scope** (route elsewhere):

- App UI development → **#9 Power Apps Developer**.
- Tenant policy / DLP that *governs* connectors → **#3 Governance**, **#12 Purview**.
- Report/dashboard building → **#7 Power BI Developer**.

## Inputs & outputs

**Receives** (from Christina):

| Input | Example |
|---|---|
| Automation intent | "When a form is submitted, create a Dataverse row and email the owner." |
| Trigger & data spec | source system, schema, mapping, filters |
| Target environment | dev / test / prod, solution name |
| Constraints | run-as identity, connection references, approval token |

**Returns** (to Christina):

| Output | Shape |
|---|---|
| Result summary | what was built/changed/run + affected artifacts |
| Structured result | `{ status, flowId, version, run:{…}, changes:[…], correlationId }` |
| Evidence | run history reference, test output, audit refs |
| Next actions | required approvals, connector consent, follow-ups |

**Result envelope (normalized):**

```json
{
  "status": "success | partial | denied | degraded | queued",
  "operation": "automate.flow.deploy",
  "flowId": "…", "version": "1.4",
  "changes": [ { "artifact": "flow:Onboarding", "action": "published", "environment": "prod" } ],
  "run": { "id": "…", "outcome": "succeeded", "duration_ms": 2400 },
  "audit_ref": "nexus-log:2026-07-15T…", "correlationId": "req-…",
  "message": "Deployed v1.4 to prod; smoke-test run succeeded."
}
```

## Interfaces / API surface

All calls are proxied by Nexus (`Nexus.<Service>.<method>`); the agent holds no
tokens and connections are provisioned/consented through Nexus.

**Read (safe, no approval):**

- `Nexus.Automate.getFlow(id)` · `listFlows(env)` · `getRunHistory(id)`
- `Nexus.Dataverse.query(table, filter)` · `getSchema(table)`
- `Nexus.SharePoint.getListItems(url, query)`

**Write (mutating — gated, see guardrails):**

- `Nexus.Automate.createFlow / updateFlow(def)` · `publishFlow(id, env)`
- `Nexus.Automate.runFlow(id, input)` · `turnOn / turnOff(id)`
- `Nexus.Dataverse.create / update / delete(table, record)` — deletes **high-risk**
- `Nexus.SharePoint.createItem / updateItem / deleteItem(url, item)`
- `Nexus.Outlook.sendMail(msg)` · `Nexus.Teams.postMessage(channel, msg)`
- `Nexus.Http.call(request)` — external side effects; **high-risk**

## Guardrails & access control

- **No credential storage.** All access via Nexus; connectors reference Nexus
  connection `id`s and inherit Nexus's consent + audit.
- **Read vs. write split.** Reads run directly; creating/updating/publishing
  flows, mutating data, sending mail, or calling external HTTP require an
  **approval token**.
- **High-risk always needs human approval:** production deploys, bulk data
  writes/deletes, `Http.call` with side effects, enabling a flow that acts on
  live data, and any destructive Dataverse/SharePoint delete.
- **Environment discipline.** Build and test in dev/test; promotion to prod is a
  separate, explicitly-approved step. Never edit prod flows in place without
  approval.
- **Dry-run first.** Support a validate/what-if pass that reports the change set
  and a test run before applying to real data.
- **Blast-radius limit.** Batch data operations above a threshold are chunked and
  require confirmation of the full target set.
- **Idempotency.** Prefer idempotent actions; guard triggers against loops and
  duplicate runs.
- **Immutable audit.** Deploys and data writes record requester + approval token
  + before/after via Nexus.

## Failure modes

| Scenario | Behavior |
|---|---|
| Approval missing for a write/deploy | Return `denied: approval_required` + proposed change set / flow diff. |
| Connector not consented | Return `denied: consent_required`; Nexus/Christina drive consent, don't hardcode creds. |
| Run fails mid-flow | Return `partial` with the failing action + run reference; do not mask it. |
| External HTTP side effect fails | Report `degraded`; note whether the call was idempotent / safe to retry. |
| Rate limit exceeded | Nexus queues; return `queued` with ETA, then the result. |
| Ambiguous schema / mapping | Ask Christina to clarify rather than guessing field mappings. |
| Prod change requested without env promotion | Refuse in-place prod edit; propose the dev→test→prod path. |

## Notes

Frequently paired with **#9** (app + flow solutions) and may require custom /
HTTP connector infrastructure (shared with **#1**). Its side effects reach
external systems, so HTTP and production actions carry the same approval weight
as admin writes in #4.
