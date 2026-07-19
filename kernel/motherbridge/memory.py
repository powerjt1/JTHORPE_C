"""SharedMemory — project-scoped key/value + append-only audit records.

The Protocol lets production swap in Dataverse/Postgres without changing callers.
InMemoryStore is the v1 reference implementation.
"""
from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from .models import MemoryRecord


@runtime_checkable
class SharedMemory(Protocol):
    def put(self, scope: str, key: str, value: Any) -> None: ...
    def get(self, scope: str, key: str) -> Any | None: ...
    def append(self, scope: str, record: MemoryRecord) -> None: ...
    def history(self, scope: str) -> list[MemoryRecord]: ...


class InMemoryStore:
    def __init__(self) -> None:
        self._kv: dict[tuple[str, str], Any] = {}
        self._log: dict[str, list[MemoryRecord]] = {}

    def put(self, scope: str, key: str, value: Any) -> None:
        self._kv[(scope, key)] = value

    def get(self, scope: str, key: str) -> Any | None:
        return self._kv.get((scope, key))

    def append(self, scope: str, record: MemoryRecord) -> None:
        self._log.setdefault(scope, []).append(record)

    def history(self, scope: str) -> list[MemoryRecord]:
        return list(self._log.get(scope, []))
