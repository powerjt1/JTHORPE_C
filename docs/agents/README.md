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
  own.
- **Specialist agents (#1–#13)** — Focused personas that own a domain of work
  and call Nexus for any external access.

```
        Alexander (user)
              │
         ┌────▼────┐
         │ Christina│  orchestrator
         └────┬────┘
      ┌───────┼───────────────┐
      ▼       ▼               ▼
  Agent #1  Agent #…       Agent #13   specialist personas
      └───────┼───────────────┘
              ▼
        ┌───────────┐
        │   Nexus   │  Agent #0 — master connector
        │ (auth hub)│
        └─────┬─────┘
              ▼
      External services / APIs
```

## Registry

| # | Agent | Role | Spec |
|---|-------|------|------|
| 0 | **Nexus** | Master Connector — centralized auth, credentials, connection proxy, rate limiting, audit | [00-nexus-master-connector.md](./00-nexus-master-connector.md) ✅ |
| — | **Christina** | Orchestrator — request routing & synthesis | _pending_ |
| 1 | MCP Server | Model Context Protocol server / tool surface | _pending_ |
| 2 | DLP Architect | Data-loss-prevention design | _pending_ |
| 3 | Governance Officer | Policy & governance | _pending_ |
| 4 | M365 Administrator | Microsoft 365 administration | _pending_ |
| 5 | PP Security | Power Platform security | _pending_ |
| 6 | Compliance Officer | Compliance, audit, retention | _pending_ |
| 7 | Power BI | Analytics & reporting | _pending_ |
| 8 | Power Automate | Workflow automation | _pending_ |
| 9 | Power Apps Developer | Low-code app development | _pending_ |
| 10 | SharePoint Developer | SharePoint solutions | _pending_ |
| 11 | Search Architect | Enterprise search | _pending_ |
| 12 | Purview Administrator | Microsoft Purview | _pending_ |
| 13 | Solution Architect | Cross-cutting architecture (read-only) | _pending_ |

> Note: the agent count is still being finalized. The rows above are drawn from
> the Nexus spec's own integration table; add, remove, or rename as the roster
> settles. Use [`_TEMPLATE.md`](./_TEMPLATE.md) when documenting a new agent.

## Conventions

- One markdown file per agent, prefixed with its number: `NN-short-name.md`.
- Keep credentials out of these files — reference the secret's **name/location**
  (e.g. `Key Vault: christina-vault/MSGRAPH_CLIENT_SECRET`), never its value.
- Public-facing descriptions of the architecture live on the site and must be
  sanitized (no endpoints, scopes, env var names, or auth details).
