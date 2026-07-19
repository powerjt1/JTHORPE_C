# MotherBridge Prompt Library

**Version:** 1.0.0
**Company:** JABBNETWORKS LLC
**Product:** JABBNETWORKS AIOS Enterprise

> Internal system-of-record for the enterprise AI agent prompts and the
> MotherBridge kernel. Not published on the public site. No secrets — reference
> credentials by name/location only.

## What is MotherBridge?

**MotherBridge is an invisible AI kernel** — the operating system beneath the
agents. Users never talk to it directly; they talk to **Lucy**, and MotherBridge
coordinates everything behind the scenes. It:

- registers every agent and loads their prompt versions,
- manages shared memory and project history,
- routes work between agents (event bus),
- enforces coding and security policies,
- manages plugins and coordinates voice sessions,
- collects telemetry and monitors system health.

Think Windows/Linux kernel: essential, always-on, invisible. It is the
evolution of the earlier "Nexus" master-connector concept
([../agents/00-nexus-master-connector.md](../agents/00-nexus-master-connector.md))
into a full kernel.

## Core AI Team

| # | Agent | Title | Prompt |
|---|-------|-------|--------|
| 01 | **Lucy** | Chief AI Orchestrator | [MB-001](./prompts/MB-001-lucy.md) |
| 02 | **Julian** | Enterprise Solution Architect | [MB-002](./prompts/MB-002-julian.md) |
| 03 | **Alex** | Automation & Azure Architect | [MB-003](./prompts/MB-003-alex.md) |
| 04 | **Brianna** | Power Apps Architect | [MB-004](./prompts/MB-004-brianna.md) |
| 05 | **Bianca** | Power Pages & Power BI Architect | [MB-005](./prompts/MB-005-bianca.md) |
| 06 | **Ryan** | Microsoft Fabric & Data Architect | [MB-006](./prompts/MB-006-ryan.md) |
| 07 | **JABBNETWORKS** | Platform Operations Architect | [MB-007](./prompts/MB-007-jabbnetworks.md) |
| 08 | **Christina** | QA, Testing & DevOps Director | [MB-008](./prompts/MB-008-christina.md) |
| 09 | **Kaira** | Security & Governance Director | [MB-009](./prompts/MB-009-kaira.md) |
| 10 | **MiaKkcar** | Product Strategy & Customer Experience Director | [MB-010](./prompts/MB-010-miakkcar.md) |

> **Roster note.** This supersedes the earlier draft roster in
> [../agents/](../agents/): Lucy is now Chief Orchestrator (previously Christina
> orchestrated); Christina moves to QA/DevOps; MotherBridge replaces Nexus as the
> kernel; Ryan, Kaira, and MiaKkcar are new. The public AIOS avatars
> ([../avatar-system.md](../avatar-system.md)) map to this team.

## Prompt Development Standards

Every prompt follows the 16 sections defined in [standards.md](./standards.md),
authored from [`_TEMPLATE.md`](./_TEMPLATE.md):

1. Agent Identity · 2. Mission Statement · 3. Core Responsibilities ·
4. Microsoft Certifications & Expertise · 5. Technology Stack ·
6. Tool Permissions · 7. Communication Rules · 8. MotherBridge Integration ·
9. Memory Management · 10. Decision Framework · 11. Deliverables ·
12. Escalation Rules · 13. Reporting Templates · 14. Definition of Done ·
15. Continuous Learning · 16. Version History

## Roadmap

**Phase 1 — Core system prompts (this directory):** MB-001 … MB-010. ✅ started

**Version 2 — Platform specifications:**
MotherBridge Kernel Specification · Shared Memory Engine · Agent-to-Agent
Communication Protocol · Prompt Version Manager · Event Bus Specification ·
Voice Integration Specification · Plugin SDK · API Standards · Coding Standards ·
Enterprise Development Standards.

**Version 3 — Enterprise standards:**
Enterprise Architecture Bible · AIOS UI Design System · Dataverse Standards ·
SharePoint Standards · Microsoft Fabric Standards · Azure Standards · Python
Standards · Deployment Standards · Security Standards · Marketplace Standards.

## Project Vision

MotherBridge (AI Kernel) · Lucy (Chief Orchestrator) · 10 core enterprise agents ·
Enterprise Prompt Library · AIOS Command Center · React + FastAPI platform ·
Microsoft Power Platform · Microsoft Fabric · Azure Functions · Python automation
engine · Voice interface · Marketplace · Developer Academy — the foundation for
**JABBNETWORKS AIOS Enterprise**.
