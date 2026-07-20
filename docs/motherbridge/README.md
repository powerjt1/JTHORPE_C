# MotherBridge Prompt Library

**Version:** 1.2.0
**Company:** JABBNETWORKS LLC
**Product:** JABBNETWORKS AIOS Enterprise
**Kernel implementation:** Python 3.11+ (FastAPI) — see the
[Kernel Specification](./specs/KERNEL-SPEC.md) and the reference package in
[`/kernel`](../../kernel/).

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
- brokers **external connections** (APIs, MCP servers) — see
  [connections.md](./connections.md); agents never call out directly.

Think Windows/Linux kernel: essential, always-on, invisible. It is the
evolution of the earlier "Nexus" master-connector concept
([../agents/00-nexus-master-connector.md](../agents/00-nexus-master-connector.md))
into a full kernel.

## Core AI Team

| # | Agent | Title | Prompt |
|---|-------|-------|--------|
| 01 | **Lucy** | Chief AI Orchestrator | [MB-001](./prompts/MB-001-lucy.md) |
| 02 | **Julian** | Enterprise Solution Architect | [MB-002](./prompts/MB-002-julian.md) |
| 03 | **Alex** | Automation Architect | [MB-003](./prompts/MB-003-alex.md) |
| 04 | **Brianna** | Power Apps Architect | [MB-004](./prompts/MB-004-brianna.md) |
| 05 | **Bianca** | Portal & Analytics Architect | [MB-005](./prompts/MB-005-bianca.md) |
| 06 | **Ryan** | Data & Fabric Architect | [MB-006](./prompts/MB-006-ryan.md) |
| 07 | **JABBNETWORKS** | Platform Operations Architect | [MB-007](./prompts/MB-007-jabbnetworks.md) |
| 08 | **Christina** | QA & DevOps Director | [MB-008](./prompts/MB-008-christina.md) |
| 09 | **Kaira** | Security & Governance Director | [MB-009](./prompts/MB-009-kaira.md) |
| 10 | **MiaKkcar** | Product & Customer Experience Director | [MB-010](./prompts/MB-010-miakkcar.md) |

See the [org chart, structure & motto](./org-chart.md) for reporting lines and
the v1.0 roadmap.

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

## Adding a new agent

Adding an agent is just adding a well-formed `MB-0NN-<name>.md` file — the kernel
auto-discovers it and CI validates it. Easiest path is the CLI:

```bash
cd kernel
# scaffold the next-numbered agent from the 16-section template:
python3 -m motherbridge new --name "Zoe" --title "Localization Architect"
# -> creates docs/motherbridge/prompts/MB-011-zoe.md

# fill in the sections, then check it:
python3 -m motherbridge validate        # every agent must pass
python3 -m motherbridge list            # shows id, version, title
```

Then commit the file. No code changes needed: `PromptLibrary` globs `MB-*.md`, so
the new agent appears in the kernel, registry, and routing automatically. CI runs
`motherbridge validate` on every push, so a malformed agent fails the build. (You
can also copy [`_TEMPLATE.md`](./_TEMPLATE.md) by hand instead of the CLI.)

## Roadmap

**Phase 1 — Core system prompts (this directory):** MB-001 … MB-010. ✅ started

**Version 2 — Platform specifications:**
[MotherBridge Kernel Specification](./specs/KERNEL-SPEC.md) ✅ ·
[Shared Memory Engine](./specs/SHARED-MEMORY-SPEC.md) ✅ ·
[Agent-to-Agent Communication Protocol](./specs/A2A-PROTOCOL-SPEC.md) ✅ ·
[Prompt Version Manager](./specs/PROMPT-VERSION-MANAGER-SPEC.md) ✅ ·
[Event Bus Specification](./specs/EVENT-BUS-SPEC.md) ✅ ·
[Voice Integration Specification](./specs/VOICE-INTEGRATION-SPEC.md) ✅ (design) ·
[Plugin SDK](./specs/PLUGIN-SDK-SPEC.md) ✅ ·
[API Standards](./specs/API-STANDARDS.md) ✅ · Coding Standards ·
Enterprise Development Standards.

The kernel is implemented in **Python**; a reference package lives in
[`/kernel`](../../kernel/) and already loads these prompt files.

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
