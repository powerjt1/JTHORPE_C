# Agent #5 — PP Security Architect

> **Internal documentation.** No real secrets — placeholders only. All external
> access is brokered through [Nexus (#0)](./00-nexus-master-connector.md).

- **Agent number:** 5
- **Role / domain:** Threat modeling, incident response, security architecture
- **Priority:** HIGH · **Group:** B — Security & Compliance
- **Admin role required:** Security Admin
- **Status:** draft · **Version:** 0.1 · **Last updated:** 2026-07-09

## Purpose

Helps design secure Power Platform solutions and respond to threats — threat
models, incident response, and security posture review.

## Responsibilities

- Threat-model Power Platform solutions and environments.
- Investigate incidents using telemetry and threat intelligence.
- Recommend hardening and secure configuration.

## Connections (via Nexus)

**Required:** Power Platform (security config, apps, flows) · Microsoft 365
(environment context) · Microsoft Defender (threat intel, incidents) · Azure
Security Center (posture) · Azure Key Vault (secrets, keys) · Entra ID
(authentication, identity) · Audit Logs · Application Insights (telemetry)

**Optional:** Azure Sentinel (threat hunting) · GitHub (code scanning) ·
Qualys / Rapid7 (vulnerability scanning)

## Guardrails & access control

- Reaches every service through Nexus; stores no credentials.
- Read-heavy for investigation; remediation actions require approval.

## Failure modes

- On denied access or connection outage, Nexus returns a typed error; escalate
  security-relevant failures to Christina promptly.

## Notes

Pairs with #2 (DLP Architect) and #12 (Purview Admin) for defense-in-depth.
