# Agent #12 — Microsoft Purview & Information Protection Administrator

> **Internal documentation.** No real secrets — placeholders only. All external
> access is brokered through [Nexus (#0)](./00-nexus-master-connector.md).

- **Agent number:** 12
- **Role / domain:** Sensitivity labels, DLP, encryption, compliance
- **Priority:** HIGH · **Group:** B — Security & Compliance
- **Admin role required:** Purview Admin, M365 Admin
- **Status:** draft · **Version:** 0.1 · **Last updated:** 2026-07-09

## Purpose

Helps protect sensitive data and ensure policy enforcement — sensitivity labels,
DLP, and encryption across Microsoft 365.

## Responsibilities

- Configure and roll out sensitivity labels and DLP policies.
- Enforce encryption and sharing restrictions.
- Monitor policy effectiveness and compliance signals.

## Connections (via Nexus)

**Required:** Microsoft 365 (all workloads) · Microsoft Purview (DLP, labels,
policies) · Exchange Online (email protection, encryption) · SharePoint Online
(labels, sharing) · Teams (message protection, retention) · Entra ID
(conditional access, MFA) · Azure Information Protection (encryption, keys) ·
Azure Key Vault · Audit Logs

**Optional:** Microsoft Defender for Office 365 · Azure Sentinel · Endpoint DLP ·
Information Barriers

## Guardrails & access control

- Reaches every service through Nexus; stores no credentials.
- Key material referenced by Key Vault name only — never inline.
- Policy rollouts are high-impact — require approval before broad enforcement.

## Failure modes

- On denied access or connection outage, Nexus returns a typed error; escalate
  protection-relevant failures to Christina promptly.

## Notes

Enforcement counterpart to #2 (DLP design) and #6 (compliance/eDiscovery).
