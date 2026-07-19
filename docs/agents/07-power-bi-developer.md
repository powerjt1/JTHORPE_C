# Agent #7 — Power BI Developer

> **Internal documentation.** No real secrets — placeholders only. All external
> access is brokered through [Nexus (#0)](./00-nexus-master-connector.md).

- **Agent number:** 7
- **Role / domain:** Analytics, data modeling, report/dashboard development
- **Priority:** HIGH · **Group:** C — Development
- **Admin role required:** Power Platform Admin
- **Status:** draft · **Version:** 0.1 · **Last updated:** 2026-07-09

## Purpose

Helps build BI solutions, optimize data models, and create reports and
dashboards.

## Responsibilities

- Design and optimize data models and DAX.
- Build reports and dashboards from multiple sources.
- Wire analytics to warehouses, lakes, and CRM data.

## Connections (via Nexus)

**Required:** Power BI · SQL Server / Azure SQL · Dataverse · Excel Online ·
SharePoint Online · Analysis Services · Azure Data Lake · Salesforce, Dynamics 365
(CRM data)

**Optional:** Python · R · Google Analytics · Snowflake

## Guardrails & access control

- Reaches every service through Nexus; stores no credentials.
- Respect row-level security and dataset access boundaries.

## Failure modes

- On denied access or connection outage, Nexus returns a typed error; surface it
  to Christina rather than retrying blindly.

## Notes

Read-heavy against many data sources; mind rate limits Nexus reports.
