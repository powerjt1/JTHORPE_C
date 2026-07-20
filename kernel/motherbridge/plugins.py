"""Plugin SDK — discover, verify, and register MotherBridge plugins.

A plugin is a **declarative manifest** (a `*.plugin.json` file) describing a unit
of capability the kernel can offer to agents: extra tools, a connector binding, a
UI panel, or a workflow. v0.1 is registration + verification only — the kernel
does not execute plugin code yet (that is the 0.2 sandbox). Manifests hold **no
secrets**; external access is declared as connection ids brokered by the kernel.

See docs/motherbridge/specs/PLUGIN-SDK-SPEC.md.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

# kernel/motherbridge/plugins.py -> parents[2] == repo root
_DEFAULT_PLUGINS_DIR = Path(__file__).resolve().parents[2] / "docs" / "motherbridge" / "plugins"

KINDS = ("tool", "connector", "ui", "workflow")
_SEMVER = re.compile(r"^\d+\.\d+\.\d+$")
_PLUGIN_ID = re.compile(r"^plg-[a-z0-9][a-z0-9-]*$")
_AGENT_ID = re.compile(r"^MB-\d{3}$")

# crude secret sniff — manifests must reference secrets by name, never inline them.
_SECRET_HINT = re.compile(r"(bearer\s|secret=|password=|api[_-]?key=|token=)", re.I)


class PluginError(ValueError):
    """Raised when a plugin manifest fails verification."""


@dataclass
class PluginManifest:
    id: str                      # "plg-<slug>"
    name: str
    version: str                 # SemVer, e.g. "1.0.0"
    kind: str                    # tool | connector | ui | workflow
    capabilities: list[str] = field(default_factory=list)  # tool/permission names it provides
    entry: str = ""              # optional entry reference (e.g. "module:callable") — not executed in v0.1
    agents: list[str] = field(default_factory=list)        # agent ids granted this plugin
    connections: list[str] = field(default_factory=list)   # connection ids it needs (kernel-brokered)
    status: str = "registered"   # registered | enabled | disabled
    description: str = ""

    @classmethod
    def from_dict(cls, data: dict) -> "PluginManifest":
        fields = {
            "id", "name", "version", "kind", "capabilities", "entry",
            "agents", "connections", "status", "description",
        }
        unknown = set(data) - fields
        if unknown:
            raise PluginError(f"unknown manifest field(s): {', '.join(sorted(unknown))}")
        try:
            return cls(**data)
        except TypeError as e:  # missing required field
            raise PluginError(str(e)) from e


def verify_manifest(m: PluginManifest) -> list[str]:
    """Return a list of problems; empty means the manifest is well-formed."""
    issues: list[str] = []
    if not _PLUGIN_ID.match(m.id or ""):
        issues.append("id must match 'plg-<slug>' (lowercase, digits, hyphens)")
    if not (m.name or "").strip():
        issues.append("name is required")
    if not _SEMVER.match(m.version or ""):
        issues.append("version must be SemVer 'MAJOR.MINOR.PATCH'")
    if m.kind not in KINDS:
        issues.append(f"kind must be one of {', '.join(KINDS)}")
    if not m.capabilities:
        issues.append("at least one capability is required")
    for a in m.agents:
        if not _AGENT_ID.match(a):
            issues.append(f"agent id '{a}' must look like 'MB-0NN'")
    if m.status not in ("registered", "enabled", "disabled"):
        issues.append("status must be registered | enabled | disabled")
    if _SECRET_HINT.search(m.entry) or any(_SECRET_HINT.search(c) for c in m.capabilities):
        issues.append("no secrets in a manifest — reference connections by id")
    return issues


class PluginManager:
    """Registry of verified plugin manifests. Discovery + verification only (v0.1)."""

    def __init__(self, plugins_dir: str | Path | None = None) -> None:
        self.plugins_dir = Path(plugins_dir) if plugins_dir else _DEFAULT_PLUGINS_DIR
        self._p: dict[str, PluginManifest] = {}

    def register(self, manifest: PluginManifest) -> PluginManifest:
        """Verify and register a manifest. Raises PluginError if malformed."""
        issues = verify_manifest(manifest)
        if issues:
            raise PluginError(f"{manifest.id or '<no id>'}: " + "; ".join(issues))
        self._p[manifest.id] = manifest
        return manifest

    def get(self, plugin_id: str) -> PluginManifest | None:
        return self._p.get(plugin_id)

    def all(self) -> list[PluginManifest]:
        return [self._p[k] for k in sorted(self._p)]

    def by_kind(self, kind: str) -> list[PluginManifest]:
        return [p for p in self.all() if p.kind == kind]

    def by_agent(self, agent_id: str) -> list[PluginManifest]:
        return [p for p in self.all() if agent_id in p.agents]

    def enable(self, plugin_id: str) -> bool:
        return self._set_status(plugin_id, "enabled")

    def disable(self, plugin_id: str) -> bool:
        return self._set_status(plugin_id, "disabled")

    def grant(self, plugin_id: str, agent_id: str) -> bool:
        p = self._p.get(plugin_id)
        if not p or agent_id in p.agents:
            return False
        if not _AGENT_ID.match(agent_id):
            raise PluginError(f"agent id '{agent_id}' must look like 'MB-0NN'")
        p.agents.append(agent_id)
        return True

    def discover(self, plugins_dir: str | Path | None = None) -> list[PluginManifest]:
        """Load and register every '*.plugin.json' in a directory (idempotent).

        A malformed manifest raises PluginError naming the offending file.
        """
        d = Path(plugins_dir) if plugins_dir else self.plugins_dir
        found: list[PluginManifest] = []
        if not d.exists():
            return found
        for path in sorted(d.glob("*.plugin.json")):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as e:
                raise PluginError(f"{path.name}: invalid JSON — {e}") from e
            try:
                found.append(self.register(PluginManifest.from_dict(data)))
            except PluginError as e:
                raise PluginError(f"{path.name}: {e}") from e
        return found

    def _set_status(self, plugin_id: str, status: str) -> bool:
        p = self._p.get(plugin_id)
        if not p:
            return False
        p.status = status
        return True

    def __len__(self) -> int:
        return len(self._p)
