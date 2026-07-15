# Agent #4 — M365 Administrator

> **Internal documentation.** No real secrets — placeholders only. All external
> access is brokered through [Nexus (#0)](./00-nexus-master-connector.md).

- **Agent number:** 4
- **Role / domain:** Day-to-day Microsoft 365 operations & support
- **Priority:** HIGH · **Group:** A — Operations & Support
- **Admin role required:** M365 Admin
- **Status:** draft · **Version:** 0.1 · **Last updated:** 2026-07-09

## Purpose

Helps with mailbox management, site administration, user access, and
troubleshooting across Microsoft 365.

## Responsibilities

- Manage mailboxes, sites, users, groups, and device compliance.
- Troubleshoot mail flow, access, and workspace issues.
- Review audit logs for user actions and compliance.

## Connections (via Nexus)

**Required:** Microsoft 365 · Exchange Online (mailbox, mail flow) · SharePoint
Online (site admin) · Teams (workspace, policies) · Entra ID / Azure AD
(users/groups, roles) · Microsoft Intune (device management) · OneDrive for
Business · Audit Logs

**Optional:** Microsoft Defender for Office 365 · PowerShell (command-line ops) ·
Compliance Manager

## Guardrails & access control

- Reaches every service through Nexus; stores no credentials.
- Administrative writes (user/role changes) should route through approval where
  configured.

## Failure modes

- On denied access or connection outage, Nexus returns a typed error; surface it
  to Christina rather than retrying blindly.

## Notes

Broadest M365 operational surface; frequently invoked by the orchestrator.
