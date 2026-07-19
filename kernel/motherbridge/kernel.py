"""Kernel — the MotherBridge facade tying the subsystems together."""
from __future__ import annotations

import uuid

from .bus import EventBus
from .health import HealthMonitor
from .memory import InMemoryStore, SharedMemory
from .models import Agent, Event, MemoryRecord, Task
from .policy import PolicyEngine
from .prompts import PromptLibrary
from .registry import AgentRegistry
from .router import Router
from .telemetry import Telemetry
from .versions import PromptVersionManager


class Kernel:
    def __init__(self, prompts_dir=None, memory: SharedMemory | None = None) -> None:
        self.library = PromptLibrary(prompts_dir)
        self.versions = PromptVersionManager(self.library)
        self.registry = AgentRegistry()
        self.memory: SharedMemory = memory or InMemoryStore()
        self.bus = EventBus()
        self.router = Router()
        self.policy = PolicyEngine()
        self.telemetry = Telemetry()
        self.health = HealthMonitor()
        self._booted = False

    def boot(self) -> "Kernel":
        """Load the prompt library and register every agent."""
        for doc in self.library.load():
            self.registry.register(Agent(
                id=doc.id, name=doc.name, title=doc.title,
                version=self.versions.resolve(doc.id),
            ))
        for name in ("registry", "prompts", "memory", "bus", "router", "policy"):
            self.health.set(name, "healthy")
        self.telemetry.record("kernel.boot", agents=len(self.registry))
        self._booted = True
        return self

    def agents(self) -> list[Agent]:
        return self.registry.all()

    def resolve_version(self, agent_id: str) -> str:
        return self.versions.resolve(agent_id)

    def dispatch(self, project_id: str, intent: str) -> Task:
        """Route an intent to an agent, record it, and emit an event.

        This is coordination only — actual agent execution happens outside the
        kernel and reports back via task.updated / task.completed events.
        """
        agent_id = self.router.route(intent)
        task = Task(id=str(uuid.uuid4()), project_id=project_id, agent_id=agent_id,
                    intent=intent, status="queued")
        self.memory.append(project_id, MemoryRecord(
            scope=project_id, kind="task.created",
            data={"task_id": task.id, "agent_id": agent_id, "intent": intent},
        ))
        self.bus.publish(Event(topic="task.created",
                               payload={"task_id": task.id, "agent_id": agent_id, "intent": intent}))
        self.telemetry.record("kernel.dispatch", agent_id=agent_id)
        return task
