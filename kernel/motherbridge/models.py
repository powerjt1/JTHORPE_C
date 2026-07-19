"""Core data models for the MotherBridge kernel (dependency-free dataclasses)."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class Agent:
    id: str            # e.g. "MB-001"
    name: str          # e.g. "Lucy"
    title: str         # e.g. "Chief AI Orchestrator"
    version: str       # resolved prompt version, e.g. "1.1.0"
    capabilities: list[str] = field(default_factory=list)


@dataclass
class PromptDoc:
    id: str
    name: str
    title: str
    version: str       # latest version from the prompt's Version History
    path: str
    body: str = ""


@dataclass
class Task:
    id: str
    project_id: str
    agent_id: str
    intent: str
    status: str = "queued"   # queued | active | done | blocked
    result: dict = field(default_factory=dict)
    created_at: str = field(default_factory=now_iso)


@dataclass
class Project:
    id: str
    name: str
    owner: str
    status: str = "active"
    created_at: str = field(default_factory=now_iso)


@dataclass
class Event:
    topic: str
    payload: dict = field(default_factory=dict)
    ts: str = field(default_factory=now_iso)


@dataclass
class MemoryRecord:
    scope: str
    kind: str
    data: dict = field(default_factory=dict)
    ts: str = field(default_factory=now_iso)


@dataclass
class Decision:
    kind: str          # "allow" | "deny" | "needs_approval"
    reason: str = ""

    @property
    def allowed(self) -> bool:
        return self.kind == "allow"
