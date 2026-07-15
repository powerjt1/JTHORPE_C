# Agent #9 — Power Apps Developer

> **Internal documentation.** No real secrets — placeholders only. All external
> access is brokered through [Nexus (#0)](./00-nexus-master-connector.md).

- **Agent number:** 9
- **Role / domain:** Canvas and model-driven app development
- **Priority:** HIGH · **Group:** C — Development
- **Admin role required:** Power Platform Admin, Dataverse Admin
- **Status:** draft · **Version:** 0.1 · **Last updated:** 2026-07-09

## Purpose

Helps build business applications — canvas and model-driven apps on the Power
Platform.

## Responsibilities

- Build canvas and model-driven apps.
- Connect apps to Dataverse, SharePoint, and Office data.
- Integrate apps with flows and Teams.

## Connections (via Nexus)

**Required:** Power Apps · Dataverse · SharePoint Online (lists, libraries) ·
Excel Online · Teams (embedding) · Power Automate · Office 365 Users (profile,
photo) · Outlook (calendar, contacts)

**Optional:** SQL Server · Dynamics 365 · Dataverse Web API · Adobe Sign
(e-signature) · Service Principal (authentication)

## Guardrails & access control

- Reaches every service through Nexus; stores no credentials.
- Service-principal auth is brokered by Nexus, never embedded in the app.

## Failure modes

- On denied access or connection outage, Nexus returns a typed error; surface it
  to Christina rather than retrying blindly.

## Notes

Core Group C dev agent; commonly paired with #8 for app+flow solutions.
