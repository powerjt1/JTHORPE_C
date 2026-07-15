# Agent #3 — PP Governance Officer

> **Internal documentation.** No real secrets — placeholders only. All external
> access is brokered through [Nexus (#0)](./00-nexus-master-connector.md).

- **Agent number:** 3
- **Role / domain:** Center of Excellence leadership & governance
- **Priority:** HIGH · **Group:** A — Operations & Support
- **Admin role required:** Dataverse Admin
- **Status:** draft · **Version:** 0.1 · **Last updated:** 2026-07-09

## Purpose

Helps establish governance frameworks and CoE operations — scaling governance,
cost management, and app inventory oversight.

## Responsibilities

- Stand up and run Center of Excellence processes.
- Maintain app inventory and governance database.
- Track adoption, cost, and policy compliance.

## Connections (via Nexus)

**Required:** Power Platform (Apps, Automate, BI) · SharePoint (CoE docs,
policies, tracking) · Microsoft 365 (Teams) · Dataverse (app inventory,
governance DB) · Excel Online (tracking sheets) · Microsoft Forms (surveys)

**Optional:** Power BI (governance dashboards) · Azure DevOps (deployment tracking)

## Guardrails & access control

- Reaches every service through Nexus; stores no credentials.
- Governance data is read/aggregate-focused; changes go through approvals.

## Failure modes

- On denied access or connection outage, Nexus returns a typed error; surface it
  to Christina rather than retrying blindly.

## Notes

Group A can deploy independently of the security/dev groups.
