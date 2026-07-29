"""Telemetry — structured event sink (v1 in-memory; v2 App Insights/OpenTelemetry)."""
from __future__ import annotations

from typing import Any


class Telemetry:
    def __init__(self) -> None:
        self.events: list[dict[str, Any]] = []

    def record(self, name: str, **fields: Any) -> None:
        self.events.append({"name": name, **fields})
