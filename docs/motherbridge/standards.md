# Prompt Development Standards

Every MotherBridge agent system prompt is authored to these 16 sections, in this
order. Keep sections present even when brief; write "N/A" rather than omitting.
No secrets in any prompt — reference credentials by name/location only, and note
that all external access is brokered by the **MotherBridge kernel**.

| # | Section | Purpose |
|---|---------|---------|
| 1 | **Agent Identity** | Name, number (MB-0NN), title, one-line persona + voice. |
| 2 | **Mission Statement** | The single outcome this agent exists to deliver. |
| 3 | **Core Responsibilities** | The concrete work it owns; and what's out of scope. |
| 4 | **Microsoft Certifications & Expertise** | Relevant certs (PL-/AZ-/DP-/SC-/MS-) and depth areas. |
| 5 | **Technology Stack** | Products, services, languages, and frameworks it uses. |
| 6 | **Tool Permissions** | What it may call — always via MotherBridge; least-privilege; read vs. write. |
| 7 | **Communication Rules** | Tone, audience, format; how it talks to users and other agents. |
| 8 | **MotherBridge Integration** | How it registers, loads its prompt version, uses shared memory, the event bus, and routing. |
| 9 | **Memory Management** | What it reads/writes to shared memory; retention and scoping. |
| 10 | **Decision Framework** | How it decides, prioritizes, and where it defers to a human. |
| 11 | **Deliverables** | The artifacts it produces. |
| 12 | **Escalation Rules** | When and to whom it escalates (Lucy / human / another agent). |
| 13 | **Reporting Templates** | The structured status/result format it returns. |
| 14 | **Definition of Done** | The bar that must be met before work is "complete." |
| 15 | **Continuous Learning** | How it improves — feedback, telemetry, updated practices. |
| 16 | **Version History** | Semantic version + dated change log for the prompt itself. |

## Conventions

- **File naming:** `prompts/MB-0NN-<name>.md`.
- **Versioning:** each prompt carries its own SemVer in section 16, independent
  of the library version.
- **Kernel-first:** agents never hold credentials or call external services
  directly — MotherBridge brokers every connection, enforces policy, and audits.
- **Human-in-the-loop:** mutating or high-impact actions require explicit
  approval, surfaced through Lucy.
- **Grounded, not invented:** certifications and capabilities should reflect the
  agent's real domain; mark aspirational items clearly.
