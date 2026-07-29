# MotherBridge Kernel (reference package)

Python reference implementation of the **MotherBridge kernel** — the invisible AI
OS beneath JABBNETWORKS AIOS Enterprise. See the
[Kernel Specification](../docs/motherbridge/specs/KERNEL-SPEC.md).

The core package (`motherbridge/`) is **dependency-free** (stdlib + dataclasses),
so it runs and tests anywhere. Only the optional HTTP surface needs FastAPI.

## What it does today (v0.1.0)

- **Loads the real prompt library** — parses `docs/motherbridge/prompts/MB-*.md`
  into agents with name, title, and resolved version.
- **Registers agents** and resolves prompt versions (pinning supported).
- **Routes intents** to the owning agent (mirrors Lucy's routing table).
- **Shared memory** — scoped key/value + append-only audit log, with a
  persistent `SqliteStore` alongside the in-memory backend (same interface).
  See the [Shared Memory Engine spec](../docs/motherbridge/specs/SHARED-MEMORY-SPEC.md).
- **Event bus** (in-process pub/sub), **policy engine** (default-deny + approval
  gating), **telemetry**, and **health** — all as swappable interfaces.
- **FastAPI surface** exposing the kernel API.

## Quick start

```python
from motherbridge import Kernel

k = Kernel().boot()
print(len(k.agents()))              # 10
print(k.resolve_version("MB-001"))  # 1.1.0

task = k.dispatch("project-123", "design the solution architecture")
print(task.agent_id)                # MB-002  (routed to Julian)
```

## Add / validate / list agents (CLI)

Adding an agent to the library is one command — the kernel auto-discovers the file.

```bash
python3 -m motherbridge new --name "Zoe" --title "Localization Architect"
python3 -m motherbridge validate          # every agent must be well-formed
python3 -m motherbridge list              # id, version, title
```

`new` scaffolds the next-numbered `MB-0NN-<name>.md` from the 16-section standard;
fill it in and commit. `validate` also runs in CI, so a malformed agent fails the
build. (Installed via `pip install .`, the same commands are available as the
`motherbridge` console script.)

## Run the tests

```bash
cd kernel
python3 -m unittest discover -s tests -v
```

## Run the HTTP API (optional)

```bash
cd kernel
pip install ".[api]"          # or: pip install fastapi uvicorn pydantic
uvicorn app:app --port 8080
# GET http://localhost:8080/kernel/agents
```

## Layout

See the module layout in the
[Kernel Specification §5](../docs/motherbridge/specs/KERNEL-SPEC.md). Production
swaps the in-memory/in-process implementations (memory, bus) for Dataverse/
Postgres and Service Bus/Event Grid without changing callers.

## Status

v0.1.0 — foundation (registry, prompt library + version manager, memory, bus,
router, policy stub, health, FastAPI). Roadmap in the spec §13.
