# Agent #11 — M365 Search & Taxonomy Architect

> **Internal documentation.** No real secrets — placeholders only. All external
> access is brokered through [Nexus (#0)](./00-nexus-master-connector.md).

- **Agent number:** 11
- **Role / domain:** Search optimization, metadata governance, discoverability
- **Priority:** MEDIUM · **Group:** D — Strategy & Architecture
- **Admin role required:** M365 Admin, SharePoint Admin
- **Status:** draft · **Version:** 0.1 · **Last updated:** 2026-07-09

## Purpose

Helps design effective search and taxonomy frameworks — improving findability
through metadata governance and search configuration.

## Responsibilities

- Design taxonomy, managed metadata, and tagging strategy.
- Tune search relevance and configure verticals.
- Report on search analytics and discoverability.

## Connections (via Nexus)

**Required:** SharePoint Online (search API, content) · Microsoft 365 Search
(tenant-wide) · Dataverse (tagging, metadata) · Power Apps · Teams (search
context) · Excel Online (taxonomy management) · Power BI (search analytics)

**Optional:** Azure Cognitive Search (advanced scenarios) · Delve · Microsoft
Graph (advanced querying)

## Guardrails & access control

- Reaches every service through Nexus; stores no credentials.
- Largely read/configure; taxonomy changes route through governance (#3).

## Failure modes

- On denied access or connection outage, Nexus returns a typed error; surface it
  to Christina rather than retrying blindly.

## Notes

Only MEDIUM-priority agent; Group D depends on other infrastructure existing.
