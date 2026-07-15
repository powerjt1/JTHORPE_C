# Lucy AI — Agent Registry (Internal)

> **Internal documentation.** This directory is the system-of-record for the
> agent personas that make up **Lucy AI** (powered by JABB Networks). It is
> **not** published on the public marketing site. Do **not** commit real
> secrets, tokens, client secrets, or tenant IDs here — use placeholders and
> keep live credentials in a secrets manager (e.g. Azure Key Vault).

## Ecosystem overview

Lucy AI is a persona-driven, multi-agent system:

- **Christina** — Orchestrator. Receives requests, routes them to the right
  specialist, and synthesizes results.
- **Nexus (Agent #0)** — Master Connector. The single, centralized gateway for
  all authentication, credentials, and external connections. Every other agent
  reaches external services *through* Nexus and stores zero credentials of its
  own. See [00-nexus-master-connector.md](./00-nexus-master-connector.md).
- **Specialist agents (#1–#13)** — Focused personas that own a domain of work
  and call Nexus for any external access.

```
        User request
              │
         ┌────▼─────┐
         │ Christina │  orchestrator
         └────┬─────┘
      ┌───────┼───────────────┐
      ▼       ▼               ▼
  Agent #1  Agent #…       Agent #13   specialist personas (#1–#13)
      └───────┼───────────────┘
              ▼
        ┌───────────┐
        │   Nexus   │  Agent #0 — master connector (auth hub)
        └─────┬─────┘
              ▼
      External services / APIs
```

## Registry

| # | Agent | Role | Priority | Group | Spec |
|---|-------|------|----------|-------|------|
| 0 | **Nexus** | Master Connector — centralized auth, credentials, proxy, rate limiting, audit | — | Infra | [spec](./00-nexus-master-connector.md) ✅ |
| — | **Christina** | Orchestrator — request routing & synthesis | — | Infra | _pending_ |
| 1 | **O365 & Power Platform MCP** | Solution development for M365 + Power Platform | HIGH | C · Dev | [spec](./01-o365-pp-mcp.md) ✅ |
| 2 | **DLP Architect** | Data protection & loss-prevention design | HIGH | B · Sec/Comp | [spec](./02-dlp-architect.md) ✅ |
| 3 | **PP Governance Officer** | CoE leadership & governance | HIGH | A · Ops | [spec](./03-pp-governance-officer.md) ✅ |
| 4 | **M365 Administrator** | Day-to-day M365 operations & support | HIGH | A · Ops | [spec](./04-m365-administrator.md) ✅ |
| 5 | **PP Security Architect** | Threat modeling & incident response | HIGH | B · Sec/Comp | [spec](./05-pp-security-architect.md) ✅ |
| 6 | **M365 Compliance Officer** | Regulatory compliance, retention, eDiscovery | HIGH | B · Sec/Comp | [spec](./06-m365-compliance-officer.md) ✅ |
| 7 | **Power BI Developer** | Analytics, data modeling, reporting | HIGH | C · Dev | [spec](./07-power-bi-developer.md) ✅ |
| 8 | **Power Automate Developer** | Automation, flows, RPA | HIGH | C · Dev | [spec](./08-power-automate-developer.md) ✅ |
| 9 | **Power Apps Developer** | Canvas & model-driven app development | HIGH | C · Dev | [spec](./09-power-apps-developer.md) ✅ |
| 10 | **SharePoint Developer** | Site design & SPFx components | HIGH | C · Dev | [spec](./10-sharepoint-developer.md) ✅ |
| 11 | **M365 Search & Taxonomy Architect** | Search optimization & metadata governance | MEDIUM | D · Strategy | [spec](./11-m365-search-taxonomy-architect.md) ✅ |
| 12 | **Microsoft Purview Admin** | Sensitivity labels, DLP, encryption | HIGH | B · Sec/Comp | [spec](./12-purview-admin.md) ✅ |
| 13 | **PP Solution Architect** | Enterprise architecture & strategy | HIGH | D · Strategy | [spec](./13-pp-solution-architect.md) ✅ |

**Deployment groups:** A = Operations & Support · B = Security & Compliance ·
C = Development · D = Strategy & Architecture. See
[CONNECTOR-REQUIREMENTS.md](./CONNECTOR-REQUIREMENTS.md) for the full connector
matrix, admin-role assignments, and phased deployment scenarios.

## Conventions

- One markdown file per agent, prefixed with its number: `NN-short-name.md`.
- Every external call goes **through Nexus** — specialist agents reference
  connections by Nexus connection `id` and store no credentials of their own.
- Keep credentials out of these files — reference the secret's **name/location**
  (e.g. `Key Vault: christina-vault/MSGRAPH_CLIENT_SECRET`), never its value.
- Public-facing descriptions of the architecture live on the site and must be
  sanitized (no endpoints, scopes, env var names, or auth details).
- Use [`_TEMPLATE.md`](./_TEMPLATE.md) when documenting a new agent.
