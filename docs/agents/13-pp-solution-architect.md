# Agent #13 — Power Platform Solution Architect

> **Internal documentation.** No real secrets — placeholders only. All external
> access is brokered through [Nexus (#0)](./00-nexus-master-connector.md).

- **Agent number:** 13
- **Role / domain:** Enterprise architecture, strategy, solution design at scale
- **Priority:** HIGH · **Group:** D — Strategy & Architecture
- **Admin role required:** Read-mostly access across services (no single write role)
- **Status:** draft · **Version:** 0.1 · **Last updated:** 2026-07-09

## Purpose

Helps design enterprise-grade Power Platform solutions — architecture, strategy,
ALM, cost, and scale.

## Responsibilities

- Define enterprise solution architecture and ALM strategy.
- Advise on cost, capacity, monitoring, and governance at scale.
- Establish integration patterns with third-party systems.

## Connections (via Nexus)

**Required:** Power Platform (all — Apps, Automate, BI, Dataverse) · Microsoft 365
(Exchange, SharePoint, Teams, Entra ID) · Azure (App Service, Functions, Key
Vault, Storage, SQL, monitoring) · GitHub / Azure DevOps (source control, CI/CD) ·
Application Insights (telemetry) · Cost Management / Azure Pricing · Audit Logs ·
SQL Server

**Optional:** Dynamics 365 · Microsoft Sentinel · Power BI (perf analytics) ·
Load-testing tools · ALM tools · Third-party systems (SAP, Salesforce, NetSuite)

## Guardrails & access control

- Reaches every service through Nexus; stores no credentials.
- Read-mostly by design — architectural review, not direct production change.

## Failure modes

- On denied access or connection outage, Nexus returns a typed error; surface it
  to Christina rather than retrying blindly.

## Notes

Broadest read surface; Group D assumes all other infrastructure already exists.
