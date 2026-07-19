# Agent #10 — SharePoint Developer

> **Internal documentation.** No real secrets — placeholders only. All external
> access is brokered through [Nexus (#0)](./00-nexus-master-connector.md).

- **Agent number:** 10
- **Role / domain:** Site design, SPFx component development, governance
- **Priority:** HIGH · **Group:** C — Development
- **Admin role required:** SharePoint Admin
- **Status:** draft · **Version:** 0.1 · **Last updated:** 2026-07-09

## Purpose

Helps build SharePoint solutions and manage platforms — site design, SPFx
components, and governance.

## Responsibilities

- Design sites, libraries, and content types.
- Develop and deploy SPFx components.
- Integrate SharePoint with Power Platform and Teams.

## Connections (via Nexus)

**Required:** SharePoint Online (sites, libraries, content types) · Microsoft 365 ·
Dataverse · Power Apps · Power Automate · Teams · Search (content search API) ·
GitHub (SPFx repo)

**Optional:** Azure DevOps (deployment, source control) · Visual Studio Code ·
PnP PowerShell (bulk ops) · Azure (SPFx hosting, functions)

## Guardrails & access control

- Reaches every service through Nexus; stores no credentials.
- SPFx deployment pipelines route through governed source control.

## Failure modes

- On denied access or connection outage, Nexus returns a typed error; surface it
  to Christina rather than retrying blindly.

## Notes

Shares Search surface with #11 (Search & Taxonomy Architect).
