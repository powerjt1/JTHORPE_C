"""HealthMonitor — subsystem/connection health (v1)."""
from __future__ import annotations


class HealthMonitor:
    def __init__(self) -> None:
        self._subsystems: dict[str, str] = {}

    def set(self, name: str, status: str) -> None:
        self._subsystems[name] = status

    def status(self) -> dict:
        degraded = [k for k, v in self._subsystems.items() if v != "healthy"]
        return {
            "ok": not degraded,
            "subsystems": dict(self._subsystems),
            "degraded": degraded,
        }
