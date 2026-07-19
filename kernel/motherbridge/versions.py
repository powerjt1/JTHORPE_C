"""PromptVersionManager — resolve the prompt version serving each agent."""
from __future__ import annotations

from .prompts import PromptLibrary


class PromptVersionManager:
    def __init__(self, library: PromptLibrary) -> None:
        self._library = library
        self._pins: dict[str, str] = {}

    def current_version(self, agent_id: str) -> str:
        doc = self._library.get(agent_id)
        return doc.version if doc else "0.0.0"

    def pin(self, agent_id: str, version: str) -> None:
        self._pins[agent_id] = version

    def unpin(self, agent_id: str) -> None:
        self._pins.pop(agent_id, None)

    def resolve(self, agent_id: str) -> str:
        """The pinned version if set, else the current (latest) version."""
        return self._pins.get(agent_id) or self.current_version(agent_id)
