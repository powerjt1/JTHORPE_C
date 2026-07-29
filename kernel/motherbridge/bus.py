"""EventBus — in-process pub/sub for agent-to-agent coordination (v1)."""
from __future__ import annotations

from typing import Callable

from .models import Event

# Well-known topics (v1).
TOPICS = (
    "task.created",
    "task.updated",
    "task.completed",
    "approval.required",
    "policy.denied",
    "health.degraded",
)


class EventBus:
    def __init__(self) -> None:
        self._subs: dict[str, list[Callable[[Event], None]]] = {}
        self.published: list[Event] = []  # kept for inspection/telemetry

    def subscribe(self, topic: str, handler: Callable[[Event], None]) -> None:
        self._subs.setdefault(topic, []).append(handler)

    def publish(self, event: Event) -> None:
        self.published.append(event)
        for handler in self._subs.get(event.topic, []):
            handler(event)
