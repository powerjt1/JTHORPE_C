"""AgentRegistry — the kernel's map of live agents."""
from __future__ import annotations

from .models import Agent


class AgentRegistry:
    def __init__(self) -> None:
        self._agents: dict[str, Agent] = {}

    def register(self, agent: Agent) -> None:
        self._agents[agent.id] = agent

    def get(self, agent_id: str) -> Agent | None:
        return self._agents.get(agent_id)

    def all(self) -> list[Agent]:
        return [self._agents[k] for k in sorted(self._agents)]

    def __len__(self) -> int:
        return len(self._agents)
