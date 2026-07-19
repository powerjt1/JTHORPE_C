# Copilot Studio Agent Summary — All 13 Agents & Required Connectors

> **Internal documentation.** Connector-requirements and deployment reference
> for the 13 specialist agents. All external access is brokered through **Nexus
> (Agent #0)** — see [00-nexus-master-connector.md](./00-nexus-master-connector.md).
> No secrets in this file.

## Quick reference

| # | Agent | Role | Key connectors | Priority |
|---|---|---|---|---|
| 1 | O365 & Power Platform MCP | Solution Development | Microsoft 365, Power Platform, GitHub, Azure | HIGH |
| 2 | DLP Architect | Data Protection Design | Microsoft 365, Purview, Azure Sentinel, Azure Key Vault | HIGH |
| 3 | PP Governance Officer | CoE & Governance | SharePoint, Power Platform, Microsoft 365, Excel | HIGH |
| 4 | M365 Administrator | Operations & Support | Microsoft 365, Exchange, SharePoint, Teams, Entra ID, Intune | HIGH |
| 5 | PP Security Architect | Security & Threats | Microsoft 365, Microsoft Defender, Azure Security, Audit Logs | HIGH |
| 6 | M365 Compliance Officer | Regulatory & Audit | Microsoft 365, Purview, SharePoint, eDiscovery, Audit | HIGH |
| 7 | Power BI Developer | Analytics & Reporting | Power BI, SQL Server, Dataverse, SharePoint, Excel | HIGH |
| 8 | Power Automate Developer | Automation & RPA | Power Automate, Dataverse, SharePoint, Outlook, Power Apps | HIGH |
| 9 | Power Apps Developer | App Development | Power Apps, Dataverse, SharePoint, Teams, Excel | HIGH |
| 10 | SharePoint Developer | Sites & SPFx | SharePoint, Microsoft 365, Dataverse, Teams | HIGH |
| 11 | M365 Search & Taxonomy Architect | Search & Metadata | SharePoint, M365 Search, Dataverse, Power Apps | MEDIUM |
| 12 | Microsoft Purview Admin | Protection & Compliance | Microsoft 365, Purview, Exchange, SharePoint, Teams, Entra ID | HIGH |
| 13 | PP Solution Architect | Enterprise Strategy | All Power Platform, Microsoft 365, Azure, Git, Monitoring | HIGH |

## Connector summary by category

**Core Microsoft 365 (all agents):** Microsoft 365 · Entra ID / Azure AD · Audit Logs · SharePoint Online

**Power Platform (8+ agents):** Power Apps · Power Automate · Power BI · Dataverse

**Data & Integration (7+ agents):** SQL Server · Dataverse · Azure (various) · GitHub / Azure DevOps

**Security & Compliance (6+ agents):** Microsoft Purview · Azure Key Vault · Microsoft Defender · Azure Sentinel

**Specialized (2–5 agents):** Exchange Online · Teams · Outlook · OneDrive · Intune · eDiscovery

## Admin roles required (per agent)

| Admin role | Agents |
|---|---|
| Dataverse Admin | 3, 8, 9 |
| Purview Admin | 2, 6, 12 |
| Power Platform Admin | 1, 7, 8, 9 |
| M365 Admin | 4, 6, 11, 12 |
| Security Admin | 2, 5 |
| SharePoint Admin | 10, 11 |

## Deployment groups

| Group | Agents | Focus | Setup effort | Dependencies |
|---|---|---|---|---|
| A | #3, #4 | Operations & Support | MEDIUM | None (deploy independently) |
| B | #2, #5, #6, #12 | Security & Compliance | HIGH | Entra ID, Azure services |
| C | #1, #7, #8, #9, #10 | Development | HIGH | Azure, GitHub/DevOps, dev tools |
| D | #11, #13 | Strategy & Architecture | MEDIUM (read-mostly) | All other infra must exist |

## Pre-deployment checklist

```
BEFORE DEPLOYING AGENTS:
☐ Microsoft 365 tenant (Exchange, SharePoint, Teams, Entra ID) active
☐ Power Platform tenant (Power Apps, Power Automate, Power BI, Dataverse) active
☐ Azure subscription (Key Vault, Storage, SQL, monitoring)
☐ GitHub / Azure DevOps repository setup
☐ Microsoft Purview / Compliance features enabled
☐ Audit logging enabled across M365
☐ Microsoft Defender configured
☐ Admin permissions assigned (see table above)

OPTIONAL:
☐ Azure Sentinel (for agents 2, 5, 12)
☐ Third-party connectors (SAP, Salesforce, Dynamics 365, ServiceNow, Slack, Splunk)
☐ Custom connector infrastructure (for agents 1, 8)
```

## Phased deployment scenarios

| Scenario | Agents | Connectors | Setup time | Cost |
|---|---|---|---|---|
| 1 · IT Operations only | #3, #4 | M365, Power Platform, SharePoint, Exchange, Teams, Entra ID | 1–2 weeks | Low |
| 2 · Security & Compliance | #2, #5, #6, #12 | M365, Purview, Azure, Sentinel, Key Vault, Audit | 2–4 weeks | Medium |
| 3 · Developer enablement | #1, #7, #8, #9, #10 | Power Platform, Dataverse, SQL, GitHub, Azure | 2–3 weeks | Medium |
| 4 · Full enterprise suite | All 13 | Everything | 4–8 weeks | High |

## Essential vs. optional connectors

**Essential (must have):** Microsoft 365 · Power Platform (Apps, Automate, BI, Dataverse) ·
SharePoint Online · Entra ID / Azure AD · Azure (Key Vault, Services) · SQL Server ·
GitHub / Azure DevOps · Microsoft Purview / Compliance

**High priority (recommended):** Exchange Online · Teams · Application Insights ·
Microsoft Defender · Audit Logs · Azure Sentinel

**Optional (as needed):** Dynamics 365 · Salesforce · SAP · Slack · ServiceNow · Splunk

---

*Created: 2026-07-09 · For: Copilot Studio deployment planning. Per-agent detail
lives in the numbered files in this directory; every connector is provisioned and
brokered through Nexus (Agent #0).*
