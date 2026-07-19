# Agent #1 — O365 & Power Platform MCP

> **Internal documentation.** No real secrets — placeholders only. All external
> access is brokered through [Nexus (#0)](./00-nexus-master-connector.md).

- **Agent number:** 1
- **Role / domain:** Solution Development (M365 + Power Platform integrations)
- **Priority:** HIGH · **Group:** C — Development
- **Admin role required:** Power Platform Admin
- **Status:** draft · **Version:** 0.1 · **Last updated:** 2026-07-09

## Purpose

Helps developers design and implement integrated Microsoft 365 + Power Platform
solutions — architecture guidance, code examples, and end-to-end implementation.

## Responsibilities

- Design integrated M365 + Power Platform solution architectures.
- Provide implementation guidance and code examples.
- Bridge development tooling (GitHub, Azure) with the Power Platform.

## Connections (via Nexus)

**Required:** Microsoft 365 (Outlook, Teams, SharePoint) · Power Platform (Apps,
Automate, BI) · Dataverse · GitHub · Azure (App Service, Functions) · SQL Server ·
SharePoint

**Optional:** Azure DevOps (deployment pipelines) · Visual Studio Code
integration · NPM registry

## Guardrails & access control

- Reaches every service through Nexus; stores no credentials.
- Respect least-privilege scopes granted per connection.

## Failure modes

- On denied access or connection outage, Nexus returns a typed error; surface it
  to Christina rather than retrying blindly.

## Notes

Primary developer-enablement agent; overlaps with the other Group C dev agents.
