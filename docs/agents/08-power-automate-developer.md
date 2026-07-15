# Agent #8 — Power Automate Developer

> **Internal documentation.** No real secrets — placeholders only. All external
> access is brokered through [Nexus (#0)](./00-nexus-master-connector.md).

- **Agent number:** 8
- **Role / domain:** Automation, flow design, RPA implementation
- **Priority:** HIGH · **Group:** C — Development
- **Admin role required:** Power Platform Admin, Dataverse Admin
- **Status:** draft · **Version:** 0.1 · **Last updated:** 2026-07-09

## Purpose

Helps build automated workflows and integrations across Microsoft and
third-party systems, including RPA.

## Responsibilities

- Design cloud and desktop flows (RPA).
- Integrate Dataverse, SharePoint, mail, and external APIs.
- Handle error handling, retries, and notifications.

## Connections (via Nexus)

**Required:** Power Automate · Dataverse (CRUD) · SharePoint Online (lists, docs) ·
Outlook / Exchange (mail, calendar) · Power Apps · Teams (notifications) · HTTP
(REST APIs) · SQL Server · Desktop Flow / RPA (UI automation)

**Optional:** Dynamics 365 · Salesforce · SAP · Custom connectors (proprietary
APIs) · Slack

## Guardrails & access control

- Reaches every service through Nexus; stores no credentials.
- Custom/HTTP connectors are provisioned and governed by Nexus, not the flow.

## Failure modes

- On denied access or connection outage, Nexus returns a typed error; surface it
  to Christina rather than retrying blindly.

## Notes

May require custom-connector infrastructure (shared with #1).
