"""Shared Memory Engine — scoped key/value + append-only audit log.

The SharedMemory Protocol lets production swap backends without changing callers.
Two reference backends: InMemoryStore (dev) and SqliteStore (persistent).
See docs/motherbridge/specs/SHARED-MEMORY-SPEC.md.
"""
from __future__ import annotations

import json
import sqlite3
import threading
from typing import Any, Protocol, runtime_checkable

from .models import MemoryRecord, now_iso


@runtime_checkable
class SharedMemory(Protocol):
    def put(self, scope: str, key: str, value: Any) -> None: ...
    def get(self, scope: str, key: str) -> Any | None: ...
    def keys(self, scope: str) -> list[str]: ...
    def delete(self, scope: str, key: str) -> bool: ...
    def append(self, scope: str, record: MemoryRecord) -> None: ...
    def history(self, scope: str) -> list[MemoryRecord]: ...


# ---------------------------------------------------------------------------
# In-memory backend
# ---------------------------------------------------------------------------
class InMemoryStore:
    def __init__(self) -> None:
        self._kv: dict[tuple[str, str], Any] = {}
        self._log: dict[str, list[MemoryRecord]] = {}

    def put(self, scope: str, key: str, value: Any) -> None:
        self._kv[(scope, key)] = value

    def get(self, scope: str, key: str) -> Any | None:
        return self._kv.get((scope, key))

    def keys(self, scope: str) -> list[str]:
        return [k for (s, k) in self._kv if s == scope]

    def delete(self, scope: str, key: str) -> bool:
        return self._kv.pop((scope, key), _MISSING) is not _MISSING

    def append(self, scope: str, record: MemoryRecord) -> None:
        self._log.setdefault(scope, []).append(record)

    def history(self, scope: str) -> list[MemoryRecord]:
        return list(self._log.get(scope, []))


_MISSING = object()


# ---------------------------------------------------------------------------
# SQLite backend (persistent, single-node)
# ---------------------------------------------------------------------------
class SqliteStore:
    def __init__(self, db_path: str) -> None:
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        with self._lock:
            self._conn.execute(
                "CREATE TABLE IF NOT EXISTS mem_kv "
                "(scope TEXT, key TEXT, value TEXT, PRIMARY KEY (scope, key))"
            )
            self._conn.execute(
                "CREATE TABLE IF NOT EXISTS mem_log "
                "(scope TEXT, kind TEXT, data TEXT, ts TEXT)"
            )
            self._conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_mem_log_scope ON mem_log(scope)"
            )
            self._conn.commit()

    def put(self, scope: str, key: str, value: Any) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT INTO mem_kv (scope, key, value) VALUES (?, ?, ?) "
                "ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value",
                (scope, key, json.dumps(value)),
            )
            self._conn.commit()

    def get(self, scope: str, key: str) -> Any | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT value FROM mem_kv WHERE scope = ? AND key = ?", (scope, key)
            ).fetchone()
        return json.loads(row["value"]) if row else None

    def keys(self, scope: str) -> list[str]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT key FROM mem_kv WHERE scope = ? ORDER BY key", (scope,)
            ).fetchall()
        return [r["key"] for r in rows]

    def delete(self, scope: str, key: str) -> bool:
        with self._lock:
            cur = self._conn.execute(
                "DELETE FROM mem_kv WHERE scope = ? AND key = ?", (scope, key)
            )
            self._conn.commit()
            return cur.rowcount > 0

    def append(self, scope: str, record: MemoryRecord) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT INTO mem_log (scope, kind, data, ts) VALUES (?, ?, ?, ?)",
                (scope, record.kind, json.dumps(record.data), record.ts or now_iso()),
            )
            self._conn.commit()

    def history(self, scope: str) -> list[MemoryRecord]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT scope, kind, data, ts FROM mem_log WHERE scope = ? ORDER BY rowid ASC",
                (scope,),
            ).fetchall()
        return [MemoryRecord(scope=r["scope"], kind=r["kind"], data=json.loads(r["data"]), ts=r["ts"]) for r in rows]

    def close(self) -> None:
        with self._lock:
            self._conn.close()
