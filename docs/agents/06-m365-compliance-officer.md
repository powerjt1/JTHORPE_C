# Agent #6 — M365 Compliance Officer

> **Internal documentation.** No real secrets — placeholders only. All external
> access is brokered through [Nexus (#0)](./00-nexus-master-connector.md).

- **Agent number:** 6
- **Role / domain:** Regulatory compliance, audit readiness, retention, eDiscovery
- **Priority:** HIGH · **Group:** B — Security & Compliance
- **Admin role required:** Purview Admin, M365 Admin
- **Status:** draft · **Version:** 0.1 · **Last updated:** 2026-07-09

## Purpose

Helps ensure compliance with regulations and manage legal holds, retention, and
eDiscovery.

## Responsibilities

- Configure retention, holds, and DLP for compliance.
- Run content searches and manage eDiscovery cases.
- Maintain audit readiness and compliance reporting.

## Connections (via Nexus)

**Required:** Microsoft 365 (all workloads) · Microsoft Purview / Compliance
Manager · Exchange Online (holds, retention) · SharePoint Online (retention, DLP) ·
Teams (message retention) · eDiscovery (legal holds, content search) · Audit
Logs · Entra ID (access reviews)

**Optional:** Microsoft Sentinel (compliance monitoring) · ServiceNow (request
tracking) · Power BI (compliance dashboards)

## Guardrails & access control

- Reaches every service through Nexus; stores no credentials.
- eDiscovery and hold actions are sensitive — require explicit approval.

## Failure modes

- On denied access or connection outage, Nexus returns a typed error; escalate
  compliance-relevant failures to Christina promptly.

## Notes

Overlaps with #12 (Purview Admin) on labels/DLP; this agent owns the regulatory
and legal-hold view.
