# JABBNETWORKS AIOS — Avatar System

The vision, personas, and technical roadmap for turning the Lucy AI agent team
into an interactive **AI mission-control room**: animated AI avatars with their
own personality, voice, and workspace, collaborating live.

- **Public page:** [`aios.html`](../aios.html) (interactive concept demo)
- **Internal agent specs:** [`docs/agents/`](./agents/)

## What ships today (Phase 0 — concept demo)

`aios.html` is a self-contained, front-end **interactive concept**:

- The 8 avatars arranged around a **mission-control board** with project phases.
- Animated avatar **states** (idle / listening / thinking / speaking / active /
  done) in pure CSS.
- A scripted **orchestration demo**: type a command (or "Run project demo") and
  Lucy delegates down the line — each specialist activates in turn, the phase
  board advances, and an activity log narrates it.
- Click any avatar to open its **workspace** (role, personality, capabilities).

No real AI, voice, or backend is involved yet — it previews the experience and
serves as a client-facing demo.

## The cast

| Avatar | Role | Maps to (internal) |
|---|---|---|
| **Lucy** | AI Orchestrator | Christina orchestrator |
| **Julian** | Enterprise Architect | #13 PP Solution Architect |
| **JABBNETWORKS** | Platform Operations | Nexus #0 + #4 M365 Admin |
| **Alex** | Automation & RPA | #8 Power Automate |
| **Brianna** | Power Apps Developer | #9 Power Apps |
| **Bianca** | Power Pages & Power BI | #7 Power BI (+ Power Pages) |
| **Phoenix** | QA & DevOps | (new capability) |
| **Sentinel** | Security & Governance | #5 Security / #2 DLP / #12 Purview |

> The public cast is a curated 8-persona lineup; the internal system has the
> full 13 specialists + Nexus + Christina. Keep the friendly public names in
> sync with the internal specs as the roster settles.

## Target experience (long-term)

An AI mission-control room:

1. A large central dashboard shows project status.
2. The eight avatars are arranged around the workspace.
3. You speak naturally: *"Lucy, start a new client project."*
4. Lucy responds and assigns tasks; each specialist begins its part —
   architecture, environment setup, automation, app, dashboards/portals, QA,
   security — reacting and collaborating.
5. Click any avatar to open its detailed workspace or keep talking to that
   specialist.

## Technology roadmap

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + TypeScript | Component/state model for the room + avatars |
| 3D avatars | Three.js or Babylon.js | Ready Player Me or custom avatars |
| Facial animation | Mixamo / NVIDIA Audio2Face | Lip-sync + expression from audio |
| Speech-to-text | Azure AI Speech | Natural voice input ("Lucy, …") |
| Text-to-speech | Azure AI Speech | Per-avatar voices/personas |
| Backend | Python (FastAPI) | Orchestration API + agent routing |
| Real-time | SignalR or WebSockets | Push avatar state + activity to the room |
| Execution | Power Platform, Microsoft Graph, Dataverse, SharePoint, Azure | Real work, brokered via Nexus (#0) |

## Phased delivery

- **Phase 0 — Concept demo (done):** `aios.html` — animated states + scripted
  orchestration, no backend. Great for pitching clients.
- **Phase 1 — Live orchestration:** wire the room to the real backend so Lucy
  routes to actual agents; stream state over WebSockets/SignalR; keep 2D/CSS
  avatars. Activity log reflects real task results.
- **Phase 2 — Voice:** Azure Speech STT for commands + TTS per-avatar voices.
- **Phase 3 — 3D avatars:** Three.js/Babylon + Ready Player Me; Audio2Face
  lip-sync driven by the TTS audio.
- **Phase 4 — Real execution:** specialists perform real Power Platform work
  through Nexus (environments, apps, dashboards, tests, security scans), with
  human-in-the-loop approval for anything sensitive.

## Design & implementation notes

- **Accessibility:** honor `prefers-reduced-motion` (the concept page already
  disables avatar animation under it); ensure voice has text equivalents;
  avatars are buttons with labels.
- **Security:** any real execution goes through **Nexus** with least-privilege
  scopes and audit — never store provider tokens in the browser or the room.
- **Performance:** 3D + facial animation is heavy — lazy-load the 3D layer,
  cap concurrent animated avatars, and provide a 2D fallback (the current CSS
  avatars) for low-power devices.
- **Voice cost/latency:** cache TTS for stock lines; stream STT; debounce.
