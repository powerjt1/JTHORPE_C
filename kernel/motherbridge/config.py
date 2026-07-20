"""ConfigManager — kernel configuration (defaults + environment overlay).

Phase 1 roadmap item. Values come from provided defaults, overlaid by environment
variables with a prefix (default MB_), e.g. MB_LOG_LEVEL -> config.get("log_level").
"""
from __future__ import annotations

import os
from typing import Any


class ConfigManager:
    def __init__(self, defaults: dict[str, Any] | None = None, env_prefix: str = "MB_") -> None:
        self._env_prefix = env_prefix
        self._data: dict[str, Any] = dict(defaults or {})
        for key, value in os.environ.items():
            if key.startswith(env_prefix):
                self._data[key[len(env_prefix):].lower()] = value

    def get(self, key: str, default: Any = None) -> Any:
        return self._data.get(key, default)

    def set(self, key: str, value: Any) -> None:
        self._data[key] = value

    def all(self) -> dict[str, Any]:
        return dict(self._data)
