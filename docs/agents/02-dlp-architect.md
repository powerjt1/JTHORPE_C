# Agent #2 — DLP Architect

> **Internal documentation.** No real secrets — placeholders only. All external
> access is brokered through [Nexus (#0)](./00-nexus-master-connector.md).

- **Agent number:** 2
- **Role / domain:** Data Protection Design (encryption & loss prevention)
- **Priority:** HIGH · **Group:** B — Security & Compliance
- **Admin role required:** Purview Admin, Security Admin
- **Status:** draft · **Version:** 0.1 · **Last updated:** 2026-07-09

## Purpose

Helps build comprehensive data-protection frameworks — DLP policy design,
sensitive-data classification, encryption, and loss-prevention strategy.

## Responsibilities

- Design DLP policies and sensitive-information-type coverage.
- Define encryption, labeling, and conditional-access strategy.
- Integrate protection signals with SIEM and threat protection.

## Connections (via Nexus)

**Required:** Microsoft 365 (email, files, chat) · Microsoft Purview (DLP, SITs) ·
Azure Information Protection (encryption, labels) · Entra ID (users/groups,
conditional access) · Microsoft Defender · Azure Key Vault · Azure Sentinel (SIEM)

**Optional:** Splunk (SIEM) · ServiceNow (incident management)

## Guardrails & access control

- Reaches every service through Nexus; stores no credentials.
- Key material referenced by Key Vault name only — never inline.

## Failure modes

- On denied access or connection outage, Nexus returns a typed error; escalate
  security-relevant failures to Christina promptly.

## Notes

Design-focused; pairs with #5 (Security Architect) and #12 (Purview Admin).
