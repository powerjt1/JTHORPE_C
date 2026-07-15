# Agent #N — <Name> ("<Persona>")

> **Internal documentation.** No real secrets — placeholders only.

- **Agent number:** N
- **Role / domain:**
- **Status:** draft | ready | deployed
- **Owner:**
- **Version:** 0.1
- **Last updated:** YYYY-MM-DD

## Purpose

One or two sentences: what this agent is responsible for and why it exists.

## Responsibilities

- …
- …

## Connections used (via Nexus)

List the external connections this agent needs. Reference them by Nexus
connection `id` only — Nexus owns the credentials.

| Connection id | Service | Scopes needed | Access pattern |
|---|---|---|---|
| `msgraph-global` | Microsoft Graph | `Directory.Read.All` | proxy |

## Inputs & outputs

- **Receives:** (from Christina / other agents)
- **Returns:** (to Christina / other agents)

## Interfaces / API surface

Public methods, tools, or endpoints this agent exposes.

## Guardrails & access control

- What this agent may **not** do.
- Human-in-the-loop / approval points.
- Rate-limit or cost considerations.

## Failure modes

- What happens on error, timeout, or denied access.

## Notes

Anything else worth recording.
