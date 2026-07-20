# MotherBridge Kernel Specification

**Document:** MB-KERNEL-SPEC · **Version:** 0.1.0 · **Status:** Draft (V2)
**Company:** JABBNETWORKS LLC · **Product:** JABBNETWORKS AIOS Enterprise
**Implementation language:** Python 3.11+

> The MotherBridge kernel is the invisible operating system beneath the AIOS.
> Users talk to **Lucy (MB-001)**; the kernel coordinates everything else. This
> spec defines the kernel's responsibilities, subsystems, Python interfaces, data
> models, and API. A reference implementation lives in [`/kernel`](../../../kernel/).

## 1. Purpose & role

MotherBridge is to the AIOS what a kernel is to an operating system: essential,
always-on, invisible. It:

1. **Registers** every agent and its capabilities.
2. **Loads prompt versions** (the MotherBridge Prompt Library) and pins them.
3. **Manages shared memory** and project history.
4. **Routes work** between agents over an event bus.
5. **Enforces coding & security policy** at the connection layer.
6. **Manages plugins** and coordinates **voice** sessions.
7. **Collects telemetry** and **monitors health**.

It is the evolution of the earlier "Nexus" master-connector into a full kernel;
it owns all external credentials and brokers every outbound connection.

## 2. Design principles

- **Kernel-first, agent-thin.** Agents hold no credentials and make no direct
  external calls — the kernel brokers, enforces, and audits everything.
- **Human-in-the-loop.** High-impact/mutating actions require approval, surfaced
  through Lucy.
- **Deterministic & reconstructable.** Every plan, dispatch, approval, and result
  is recorded to shared memory; a run can be replayed and audited.
- **Least privilege & least blast radius.** Default-deny; scopes are granted per
  agent per connection.
- **Async, event-driven.** Subsystems communicate over an event bus; the kernel
  is non-blocking (asyncio).
- **Versioned everything.** Prompts, contracts, and the kernel API carry SemVer.

## 3. Technology

| Concern | Choice |
|---|---|
| Language | Python 3.11+ |
| API | FastAPI + Uvicorn |
| Models/validation | Pydantic v2 (API), dataclasses (core, dependency-free) |
| Concurrency | `asyncio` |
| Event bus (v1) | in-process pub/sub; (v2) Azure Service Bus / Event Grid |
| Memory (v1) | in-memory + SQLite; (v2) Dataverse / Postgres |
| Secrets | Azure Key Vault (referenced by name; never inlined) |
| Telemetry | Application Insights / OpenTelemetry |

The current Node/Express `backend/` (auth, projects) is a **thin slice** of the
eventual kernel; the projects engine maps onto kernel routing + memory and can be
migrated behind this Python kernel over time.

## 4. Architecture

```
                         ┌──────────────────────────────────────────┐
   Lucy (MB-001)  ◀────▶ │                 KERNEL                    │
                         │  Registry · PromptVersionManager          │
   Specialists   ◀────▶ │  Router · EventBus · SharedMemory         │
   (MB-002..010)         │  PolicyEngine · PluginManager             │
                         │  VoiceCoordinator · Telemetry · Health     │
                         └───────────────────┬──────────────────────┘
                                             │ brokered, audited
                                   External services / APIs
```

## 5. Module layout (reference package)

```
kernel/
├─ motherbridge/
│  ├─ __init__.py        # public exports
│  ├─ models.py          # dataclasses: Agent, PromptDoc, Task, Project, Event, MemoryRecord
│  ├─ prompts.py         # PromptLibrary — loads docs/motherbridge/prompts/MB-*.md
│  ├─ versions.py        # PromptVersionManager — current/pin/resolve (SemVer)
│  ├─ registry.py        # AgentRegistry
│  ├─ memory.py          # SharedMemory protocol + InMemoryStore
│  ├─ bus.py             # EventBus (in-process pub/sub)
│  ├─ messaging.py       # MessageBroker — A2A messages (notify/request/reply/escalate)
│  ├─ router.py          # Router — intent → agent id
│  ├─ policy.py          # PolicyEngine — allow/deny + approvals
│  ├─ telemetry.py       # Telemetry sink
│  ├─ health.py          # HealthMonitor
│  └─ kernel.py          # Kernel facade tying it together
├─ app.py                # FastAPI surface
├─ tests/                # unittest (stdlib) — no external deps to run core
├─ pyproject.toml
└─ README.md
```

## 6. Core subsystems & interfaces

Interfaces are given as Python `Protocol`/dataclass signatures. The reference
package implements the in-process/in-memory variants; production swaps the
implementation without changing callers.

### 6.1 Agent Registry
Registers agents (from the Prompt Library) and their capabilities.
```python
class AgentRegistry:
    def register(self, agent: Agent) -> None: ...
    def get(self, agent_id: str) -> Agent | None: ...
    def all(self) -> list[Agent]: ...
```

### 6.2 Prompt Library & Version Manager
Loads the `MB-0NN-*.md` files, exposes id/name/title/current version, and pins.
Full contract in the
[Prompt Version Manager Specification](./PROMPT-VERSION-MANAGER-SPEC.md).
```python
class PromptLibrary:
    def load(self) -> list[PromptDoc]: ...
    def get(self, agent_id: str) -> PromptDoc | None: ...

class PromptVersionManager:
    def current_version(self, agent_id: str) -> str: ...
    def pin(self, agent_id: str, version: str) -> None: ...
    def unpin(self, agent_id: str) -> None: ...
    def resolve(self, agent_id: str) -> str: ...   # pinned or current
```
Current version = the highest SemVer in the prompt's Version History.

### 6.3 Shared Memory Engine
Scoped key/value + an append-only audit log for reconstructable runs. Full
contract in the [Shared Memory Engine Specification](./SHARED-MEMORY-SPEC.md).
```python
class SharedMemory(Protocol):
    def put(self, scope: str, key: str, value: Any) -> None: ...
    def get(self, scope: str, key: str) -> Any | None: ...
    def keys(self, scope: str) -> list[str]: ...
    def delete(self, scope: str, key: str) -> bool: ...
    def append(self, scope: str, record: MemoryRecord) -> None: ...
    def history(self, scope: str) -> list[MemoryRecord]: ...
```
Backends: `InMemoryStore` (dev) and `SqliteStore(db_path)` (persistent); same
semantics, swappable.

### 6.4 Event Bus
Decoupled pub/sub for agent-to-agent coordination. Full contract in the
[Event Bus Specification](./EVENT-BUS-SPEC.md).
```python
class EventBus:
    def subscribe(self, topic: str, handler: Callable[[Event], None]) -> None: ...
    def publish(self, event: Event) -> None: ...
```
Topics (v1): `task.created`, `task.updated`, `task.completed`, `approval.required`,
`policy.denied`, `health.degraded`; plus A2A topics `a2a.message` and per-recipient
`agent.<MB-0NN>` (see §6.4a).

### 6.4a Message Broker (A2A)
Typed agent-to-agent messages, brokered over the Event Bus (delivery) and Shared
Memory (append-only audit). Full contract in the
[Agent-to-Agent Communication Protocol](./A2A-PROTOCOL-SPEC.md).
```python
class MessageBroker:
    def on(self, agent_id: str, handler: Callable[[Message], None]) -> None: ...
    def send(self, from_agent, intent, body=None, to_agent=None,
             kind="notify", conversation_id=None, reply_to=None) -> Message: ...
    def request(self, from_agent, intent, body=None, to_agent=None,
                conversation_id=None) -> Message: ...
    def reply(self, to_message, from_agent, body=None) -> Message: ...
    def escalate(self, from_agent, intent, body=None) -> Message: ...  # up the org chart
    def inbox(self, agent_id) -> list[Message]: ...
    def thread(self, conversation_id) -> list[Message]: ...
```
Recipient = explicit `to_agent`, else routed from `intent`. `escalate` targets the
sender's lead via `org.escalation_chain`. Exposed on the facade as `kernel.messaging`.

### 6.5 Router
Maps an intent to the owning agent (mirrors Lucy's routing table).
```python
class Router:
    def route(self, intent: str) -> str: ...          # -> agent_id (MB-0NN)
```
Intent → agent: architecture→MB-002 · automation/azure→MB-003 · apps→MB-004 ·
pages/bi→MB-005 · fabric/data→MB-006 · platform/ops→MB-007 · qa/devops→MB-008 ·
security/governance→MB-009 · product/cx→MB-010 · (orchestration→MB-001).

### 6.6 Policy Engine
Default-deny enforcement + approval gating for mutating/high-impact actions.
```python
class PolicyEngine:
    def check(self, agent_id: str, action: str, resource: str) -> Decision: ...
# Decision: allow | deny(reason) | needs_approval(reason)
```

### 6.7 Configuration Manager
Kernel configuration from defaults overlaid by environment (`MB_*`).
```python
class ConfigManager:
    def get(self, key: str, default: Any = None) -> Any: ...
    def set(self, key: str, value: Any) -> None: ...
    def all(self) -> dict: ...
```

### 6.8 Org hierarchy (reporting/escalation)
Routing stays flat; the org module encodes *reporting lines* so escalation
follows the chart (see [org-chart.md](../org-chart.md)).
```python
def lead_of(agent_id: str) -> str | None: ...
def escalation_chain(agent_id: str) -> list[str]: ...   # up to Lucy (MB-001)
def direct_reports(agent_id: str) -> list[str]: ...
```
Leads: Julian (MB-002), JABBNETWORKS (MB-007), Kaira (MB-009) report to Lucy.
Alex/Brianna/Bianca → Julian; Ryan/Christina/MiaKkcar → JABBNETWORKS.

### 6.9 Plugin Manager, Voice Coordinator, Telemetry, Health
- **PluginManager** — discover/load/verify plugins against the Plugin SDK
  contract (V2 doc).
- **VoiceCoordinator** — manage Azure Speech STT/TTS sessions per agent voice
  (Voice Integration Spec, V2).
- **Telemetry** — structured events (latency, outcomes, cost) to the sink.
- **HealthMonitor** — subsystem/connection health; emits `health.degraded`.

## 7. Data models (dataclasses)

```python
@dataclass
class Agent:      id: str; name: str; title: str; version: str; capabilities: list[str]
@dataclass
class PromptDoc:  id: str; name: str; title: str; version: str; path: str; body: str
@dataclass
class Task:       id: str; project_id: str; agent_id: str; intent: str; status: str; result: dict
@dataclass
class Project:    id: str; name: str; owner: str; status: str; created_at: str
@dataclass
class Event:      topic: str; payload: dict; ts: str
@dataclass
class MemoryRecord: scope: str; kind: str; data: dict; ts: str
```

## 8. Kernel API (FastAPI)

| Method | Path | Purpose |
|---|---|---|
| GET | `/kernel/health` | Liveness + subsystem status |
| GET | `/kernel/agents` | Registered agents (id, title, resolved version) |
| GET | `/kernel/prompts/{agent_id}` | Prompt metadata + resolved version |
| POST | `/kernel/prompts/{agent_id}/pin` | Pin a prompt version |
| GET | `/kernel/memory/{scope}/{key}` | Read shared memory |
| PUT | `/kernel/memory/{scope}/{key}` | Write shared memory (policy-checked) |
| POST | `/kernel/route` | Resolve an intent to an agent |
| POST | `/kernel/events` | Publish an event |

All mutating endpoints pass through the PolicyEngine and are audited.

## 9. Lifecycle

1. **Startup** — `PromptLibrary.load()` → build `AgentRegistry` → resolve versions
   → start `EventBus`, `HealthMonitor`, `Telemetry`.
2. **Run** — Lucy publishes a plan; the kernel routes each task to its agent,
   records to memory, enforces policy, streams results, and gates approvals.
3. **Shutdown** — flush telemetry, drain the bus, checkpoint memory.

## 10. Security model

- The kernel is the **only** holder of external credentials (Key Vault); agents
  reference connections by id.
- **Default-deny**; least-privilege scopes per agent per connection.
- High-impact/mutating actions → `needs_approval`, surfaced via Lucy → human.
- Every action is **audited** (append-only) with actor, approval, and before/after.
- Untrusted content (tool/agent output) is treated as data, never instructions.

## 11. Mapping to the current codebase

- `backend/routes/projects.js` (projects + tasks + tick) ≈ kernel **Router +
  SharedMemory + task lifecycle** — a working thin slice today.
- `backend/src/accounts.js` / `db/` (SQLite bridge) ≈ kernel **SharedMemory**
  persistence backends (memory / SQLite).
- The public AIOS room (`aios.html`) is a **client** of the kernel's routing +
  memory. Migrating it onto this Python kernel is a later phase.

## 12. Versioning & compatibility

- Kernel API and each subsystem contract carry SemVer; breaking changes bump
  major and ship a migration note.
- Prompt versions are resolved per agent (pinned or latest); the kernel records
  which version served each task.

## 13. Roadmap

- **0.1 (this doc + reference package):** Registry, Prompt Library + Version
  Manager, in-memory SharedMemory, in-process EventBus, Router, Policy stub,
  Health, FastAPI surface. Loads the real MB-0NN prompts.
- **0.2:** SQLite memory (`SqliteStore`) ✅; Dataverse memory, real approval
  flow, and plugin discovery next.
- **0.3:** Service Bus/Event Grid bus, voice coordinator, telemetry to App
  Insights.
- **1.0:** production hardening; migrate the AIOS room + projects onto the kernel.

## 14. Version History
- v0.1.0 — 2026-07-19 — initial kernel specification (V2) + reference package.
