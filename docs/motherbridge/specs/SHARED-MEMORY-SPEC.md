# MotherBridge Shared Memory Engine Specification

**Document:** MB-MEMORY-SPEC · **Version:** 0.1.0 · **Status:** Draft (V2)
**Company:** JABBNETWORKS LLC · **Product:** JABBNETWORKS AIOS Enterprise
**Implementation language:** Python 3.11+

> The Shared Memory Engine is how the kernel and agents remember. It stores
> scoped key/value state plus an **append-only audit log**, so any run is
> reconstructable and every action is traceable. This spec defines the contract,
> semantics, backends, and retention. It refines §6.3 of the
> [Kernel Specification](./KERNEL-SPEC.md); the reference implementation lives in
> [`kernel/motherbridge/memory.py`](../../../kernel/motherbridge/memory.py).

## 1. Goals

- **Scoped** state — memory is partitioned by `scope` (e.g. a project id, an
  agent id, or `global`); scopes never leak into each other.
- **Auditable** — an append-only log per scope records what happened; history is
  never mutated or deleted by callers.
- **Swappable** — one interface, multiple backends (in-memory, SQLite today;
  Dataverse/Postgres later) with identical semantics.
- **Simple** — a tiny surface that agents and the kernel can rely on.

## 2. Concepts

| Term | Meaning |
|---|---|
| **scope** | A namespace string. Convention: `project:<id>`, `agent:<id>`, `global`. The kernel currently uses the project id directly. |
| **key/value** | Mutable, last-write-wins state within a scope. Values are JSON-serializable. |
| **record** | An immutable entry appended to a scope's log (`kind`, `data`, `ts`). |
| **kind** | A short label for a record type, e.g. `task.created`, `approval.granted`. |

## 3. Interface (Python `Protocol`)

```python
class SharedMemory(Protocol):
    # key/value (last-write-wins, JSON-serializable values)
    def put(self, scope: str, key: str, value: Any) -> None: ...
    def get(self, scope: str, key: str) -> Any | None: ...
    def keys(self, scope: str) -> list[str]: ...
    def delete(self, scope: str, key: str) -> bool: ...     # True if a key was removed

    # append-only audit log
    def append(self, scope: str, record: MemoryRecord) -> None: ...
    def history(self, scope: str) -> list[MemoryRecord]: ...   # chronological
```

`MemoryRecord` = `{ scope, kind, data, ts }` (ISO-8601 UTC `ts`).

## 4. Semantics & guarantees

- **Last-write-wins** for `put`; `get` returns `None` for missing keys.
- **Append-only** log: `append` never overwrites; `history` returns records in
  insertion (chronological) order. There is no public API to edit or delete log
  records — auditability is a guarantee, not a convention.
- **Scope isolation**: reads/writes in scope A never observe scope B.
- **JSON values**: values must round-trip through JSON; storing non-serializable
  objects is an error.
- **Concurrency**: implementations must be safe for concurrent callers (the
  reference SQLite store serializes writes with a lock).

## 5. Backends

| Backend | Class | Use |
|---|---|---|
| In-memory | `InMemoryStore` | Dev/tests; resets on restart. |
| SQLite | `SqliteStore(db_path)` | Single-node persistence; survives restarts. |
| Dataverse / Postgres | _(future)_ | Multi-node, enterprise scale. |

All backends implement the same `SharedMemory` protocol; callers never change.

### SQLite schema (reference)

```sql
CREATE TABLE mem_kv  (scope TEXT, key TEXT, value TEXT, PRIMARY KEY (scope, key));
CREATE TABLE mem_log (scope TEXT, kind TEXT, data TEXT, ts TEXT);
CREATE INDEX idx_mem_log_scope ON mem_log(scope);
```
`value` and `data` are JSON text. `mem_log` is append-only (INSERT only).

## 6. Retention (design)

The v1 engine keeps everything. Retention is a backend concern layered on top,
never exposed as a mutating API to agents:

- **Age-based**: prune `mem_log` rows older than N days per scope.
- **Count-based**: keep the most recent N records per scope.
- **Legal hold**: scopes under hold are exempt from pruning (governed by Kaira,
  MB-009).

Pruning runs as a maintenance job, is itself audited, and never touches key/value
state (only the log tail).

## 7. Usage in the kernel

- The kernel writes the plan, dispatches, approvals, and task lifecycle to the
  scope of the active project (see `Kernel.dispatch`), so a run can be replayed.
- Agents read their task context and write results through the same engine —
  they never hold private, unaudited state.
- Secrets are **never** stored here; reference them by name (Key Vault), per the
  kernel security model.

## 8. Compatibility & versioning

- The `SharedMemory` protocol carries SemVer; additive methods bump minor,
  breaking changes bump major with a migration note.
- Swapping backends must not change observable semantics (§4).

## 9. Roadmap

- **0.1 (this spec + reference):** `InMemoryStore` and `SqliteStore` with
  put/get/keys/delete/append/history; scope isolation; append-only log.
- **0.2:** retention jobs (age/count) + legal-hold exemption.
- **0.3:** Dataverse/Postgres backend; query by `kind`/time range; snapshots.

## 10. Version History
- v0.1.0 — 2026-07-20 — initial shared-memory specification + SQLite backend.
