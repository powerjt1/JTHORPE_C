# JABB System Architecture (Mother)

> Knowledge-base entry extracted from `JABB-key.py` (single-file consolidation:
> FastAPI backend + JABB agent runtime + unit tests). Source is authoritative;
> everything below is pulled directly from the code, not inferred.
> Captured: 2026-07-20.

## System Identity
- **Company:** JABBNETWORKS
- **Product:** AIOS — "Enterprise Command Center for Microsoft Power Platform"
- **API version:** 0.1.0 (`FastAPI(title="JABBNETWORKS AIOS API")`)
- **Team:** 8-agent workforce
  - **Build (4):** Julian (Enterprise Architect / lead), Alex (Automation/RPA), Brianna (Power Apps), Bianca (Power BI & Analytics)
  - **Ops (4):** Lucy (AI Orchestrator), JABBNETWORKS (Platform Ops), Phoenix (QA & DevOps), Sentinel (Security)
- **Runtime-registered agents** (`AGENTS` dict) with default status:

  | id | name | role | default status |
  |----|------|------|----------------|
  | `lucy` | Lucy | AI Orchestrator | active |
  | `julian` | Julian | Enterprise Architect | active |
  | `alex` | Alex | Automation / RPA | idle |
  | `brianna` | Brianna | Power Apps | active |
  | `bianca` | Bianca | Power BI & Analytics | active |
  | `jabbnetworks` | JABBNETWORKS | Platform Ops | active |
  | `phoenix` | Phoenix | QA & DevOps | idle |
  | `sentinel` | Sentinel | Security | active |

  > Only the 4 **build** agents are runnable from the agent CLI
  > (`JABB_AGENTS = {julian, alex, brianna, bianca}`); the other 4 exist as
  > orchestration/roster entries surfaced through the API.

## Core Data Models (Pydantic schemas)
- **`AgentStatus`** (enum): `active | idle | busy | offline`
- **`Agent`**: `id: str`, `name: str`, `role: str`, `status: AgentStatus`, `current_task: str|None`, `utilization: int = 0`
- **`KPIData`**: `flows_executed: int`, `apps_deployed: int`, `automations_active: int`, `teams_integrations: int`, `ai_tokens_used: int`, `security_score: int`, `avg_response_time_ms: int`, `uptime_percentage: float`, `as_of: datetime`
- **`TaskStatus`** (enum): `pending | in_progress | completed | failed`
- **`Task`**: `id: str`, `agent_id: str`, `title: str`, `status: TaskStatus`, `progress: int = 0`, `created_at: datetime`
- **`TaskCreate`**: `agent_id: str`, `title: str`
- **`CommandRequest`**: `text: str`
- **`CommandResponse`**: `routed_to: str`, `message: str`, `tasks_created: list[Task]`

## Services (orchestration + KPIs)
- In-memory stores: `AGENTS` (seeded), `TASKS` (empty).
- `list_agents()`, `get_agent(id)`, `list_tasks()`.
- `create_task(agent_id, title)` → new `in_progress` Task; sets that agent to **busy** and records `current_task`.
- `route_command(text)` — **naive keyword router** (marked "replaced by Lucy/Copilot Studio in Phase 2"):
  - contains `project` or `create` → **lucy** routes to **Julian** ("Architecture analysis") + **Alex** ("Automation framework setup"); returns 2 tasks.
  - contains `status` → **lucy**: "All systems operational. 8 agents ready."
  - contains `security` → **sentinel**: "Security posture: score 94. No active threats."
  - else → **lucy**: awaiting clarification.
- `get_kpis()` — fixed mock snapshot: flows_executed **1247**, apps_deployed **23**, automations_active **156**, teams_integrations **8**, ai_tokens_used **45230**, security_score **94**, avg_response_time_ms **142**, uptime_percentage **99.98**.

## API surface (FastAPI)
Mounted under **`/api/v1`** (WebSocket at root). CORS allows `http://localhost:3000` and `http://localhost:5173`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/health` | `{status: healthy, service: jabbnetworks-aios-api}` |
| GET | `/api/v1/agents/` | list agents |
| GET | `/api/v1/agents/{agent_id}` | one agent (404 if unknown) |
| GET | `/api/v1/kpi/` | KPI snapshot |
| GET | `/api/v1/tasks/` | list tasks |
| POST | `/api/v1/tasks/` | create task (201) |
| POST | `/api/v1/commands/` | route a command; broadcasts over WS |
| WS | `/ws` | echo socket; `command_routed` broadcasts |
| GET | `/` | service banner |

## Agent Personalities & Roles

### Julian — Enterprise Architect (JABB lead)
- **System prompt:** "You are Julian, Enterprise Architect of the JABB team. Produce a governed Power Platform solution architecture: restate goal, data model, component breakdown (Brianna=apps, Alex=flows, Bianca=reports, you=platform), integration/governance, build order, precise handoffs. **Never build in Prod. Confirm writes.**"
- **`run(task, dry_run=True)`** pipeline:
  1. `whoami()` + `list_tables(custom_only=True)` → build tenant **context** (read-only inspect).
  2. `_reason(SYSTEM, task, context)` → design (real Anthropic reasoning if `ANTHROPIC_API_KEY` set, else deterministic mock).
  3. `_derive_table(task)` → a `TableSpec` (core noun chosen from keywords: loan, request, asset, equipment, ticket, order, project, approval; primary field `Title`; fields Status, RequestedBy, RequestedOn).
  4. `_derive_handoffs(task, spec)` → specs for Brianna (app), Alex (flow), Bianca (report).
  5. `create_table(spec, dry_run)` → **gated write**.
- **Mock reasoning** emits a structured 6-point design: GOAL → DATA MODEL → COMPONENT BREAKDOWN → INTEGRATION & GOVERNANCE (standard connectors only, DLP-safe, Approvals connector, no external calls) → BUILD ORDER (table → app → flow → report → managed solution) → HANDOFFS.

### Alex — Automation / RPA (Power Automate)
- A `ReceivingAgent`. **Receives Julian's handoff** and acknowledges/queues it. Typical handoff: "on create of `<table>`, if Status = 'Submitted', start an approval and write the outcome back to Status."
- Does not self-initiate; the CLI tells non-Julian agents to run Julian first to generate a handoff.

### Brianna — Power Apps
- A `ReceivingAgent`. Typical handoff: "Build a canvas/model-driven app over `<table>` with a list screen and an edit form exposing Title, Status, RequestedBy, RequestedOn."

### Bianca — Power BI & Analytics
- A `ReceivingAgent`. Typical handoff: "Build a Power BI report over `<table>`: counts by Status over time, and average approval turnaround."

## Power Platform Integration
- **Client:** `PowerPlatformClient` — Dataverse **Web API v9.2** (`/api/data/v9.2/`).
- **Auth:** MSAL `ConfidentialClientApplication` (service principal / app registration), client-credentials flow, scope `<DATAVERSE_URL>/.default`. **Mock fallback** when credentials/libraries are missing (`msal`, `requests`).
- **Methods:** `whoami()`, `list_tables(custom_only)`, `query(entity_set, top)`, `create_table(spec, dry_run)`.
- **Domain types:** `TableSpec` (→ `to_dataverse_body()` builds Dataverse `EntityMetadata` with a primary `String` attribute); `Handoff(to_agent, spec)`.
- **Configuration** (`Config.from_env`, all via environment):
  `TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`, `DATAVERSE_URL`, `DATAVERSE_ENV` (default `Dev`), `SOLUTION_PREFIX` (default `jabb`), `ANTHROPIC_API_KEY`.

## Guardrails (Julian enforces)
1. **Never build in Production.** `create_table` returns `{status: blocked, reason: "Julian refuses to build in Production. Promote via solution."}` when `env == "prod"`.
2. **Dry-run by default.** `dry_run=True` unless `--execute` is passed; a dry run returns `{status: dry_run, would_POST, body}` — the change is **echoed back for audit**, not applied.
3. **Writes are gated.** Only an explicit `--execute` on a non-Prod environment performs the POST (`{status: created, ...}`); mock mode never writes.
4. **Read-only inspection is free.** `whoami` / `list_tables` / `--list-tables` require no confirmation.
5. **Non-lead agents receive handoffs from Julian.** Alex/Brianna/Bianca only act on specs Julian derives; they don't self-initiate builds.
6. **Reasoning fails safe.** If the Anthropic call errors, `_reason` falls back to deterministic mock reasoning rather than failing the run. (Note: source pins model id `claude-sonnet-4-6`.)

## Operational Modes
1. **FastAPI server** — REST API + WebSocket on `:8000` (`--server`; needs `fastapi`, `uvicorn`).
2. **Agent CLI** — interactive picker (the dropdown, `[1-4]`) or direct (`--agent julian --task "…"`).
3. **Unit tests** — `--test`, **7 tests** (health, list_agents=8, get_agent 404, kpi security_score=94, create_task+list, command routes project → 2 tasks, websocket echo).
4. **Tenant inspection** — read-only `--list-tables` (Julian runs `whoami` + `list_tables`, prints, exits).

## Running JABB
```bash
python JABB-key.py                               # interactive agent picker (dropdown)
python JABB-key.py --agent julian --task "Track loans with approvals"
python JABB-key.py --server                      # FastAPI (REST + WS) on :8000
python JABB-key.py --test                        # run unit tests (7)
python JABB-key.py --list-tables                 # inspect tenant (read-only)

# Flags
--live       # use live Dataverse (needs TENANT_ID/CLIENT_ID/CLIENT_SECRET/DATAVERSE_URL + msal,requests)
--execute    # perform writes (default is dry-run; blocked in Prod)
```
Server endpoints: REST `http://localhost:8000/api/v1` · WebSocket `ws://localhost:8000/ws` · Docs `http://localhost:8000/docs`.

Environment for live Power Platform:
`TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`, `DATAVERSE_URL`, `DATAVERSE_ENV`, `SOLUTION_PREFIX`, `ANTHROPIC_API_KEY`.

## ⚠ Reconciliation note (JABB-key vs. the MotherBridge repo roster)
`JABB-key.py` describes an **8-agent** team. The `powerjt1/jthorpe_c` MotherBridge
system currently runs a **10-agent** roster. Overlap and differences:

| Role area | JABB-key.py | MotherBridge repo (10-agent) |
|-----------|-------------|------------------------------|
| Orchestrator | Lucy | Lucy (Chief AI Orchestrator) |
| Architect | Julian | Julian |
| Automation | Alex | Alex |
| Power Apps | Brianna | Brianna |
| Analytics/Portal | Bianca | Bianca |
| Platform Ops | JABBNETWORKS | JABBNETWORKS |
| QA & DevOps | **Phoenix** | **Christina** |
| Security | **Sentinel** | **Kaira** (Security & Governance) |
| Data & Fabric | — | **Ryan** (new) |
| Product & CX | — | **MiaKkcar** (new) |

Likely mapping: **Phoenix → Christina**, **Sentinel → Kaira**; the repo adds
**Ryan** and **MiaKkcar**. Decide whether Mother treats JABB-key as a superseded
earlier build or as a distinct product line before merging the rosters.
