"""External connection registry — MotherBridge brokers every outbound integration.

Agents never call external services directly; they go through the kernel, which
holds the connection catalog and (in production) the credentials. This mirrors
the Nexus master-connector concept. No secrets live here — `auth` is a reference
(e.g. a Key Vault name), never a value.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Connection:
    id: str
    service: str
    kind: str                 # "mcp" | "rest" | "database" | "graph" | ...
    endpoint: str
    auth: str = "none"        # reference only, e.g. "keyvault:opus-pro-token"
    status: str = "pending"   # pending | active | disabled
    scopes: list[str] = field(default_factory=list)
    agents: list[str] = field(default_factory=list)  # agent ids allowed to use it
    notes: str = ""


class ConnectionRegistry:
    def __init__(self) -> None:
        self._c: dict[str, Connection] = {}

    def register(self, conn: Connection) -> None:
        self._c[conn.id] = conn

    def get(self, conn_id: str) -> Connection | None:
        return self._c.get(conn_id)

    def all(self) -> list[Connection]:
        return [self._c[k] for k in sorted(self._c)]

    def by_kind(self, kind: str) -> list[Connection]:
        return [c for c in self.all() if c.kind == kind]

    def grant(self, conn_id: str, agent_id: str) -> bool:
        c = self._c.get(conn_id)
        if not c or agent_id in c.agents:
            return False
        c.agents.append(agent_id)
        return True

    def __len__(self) -> int:
        return len(self._c)


def default_connections() -> list[Connection]:
    """Seed connections registered at kernel boot."""
    return [
        Connection(
            id="opus-pro-agent-mcp",
            service="Opus Pro — Agent MCP",
            kind="mcp",
            endpoint="https://api.opus.pro/api/agent-mcp",
            auth="keyvault:opus-pro-token",   # reference only; no secret here
            status="pending",                 # needs domain allowlist + credentials
            agents=["MB-001"],                # Lucy (orchestrator) by default
            notes="External MCP server. Brokered by the kernel; agents call it "
                  "via MotherBridge, never directly. See docs/motherbridge/connections.md.",
        ),
        Connection(
            id="anthropic-claude",
            service="Anthropic — Claude model",
            kind="llm",
            endpoint="https://api.anthropic.com",
            auth="env:ANTHROPIC_API_KEY",       # reference only; key lives in the environment
            status="pending",                   # active once ANTHROPIC_API_KEY is set server-side
            agents=["MB-001", "MB-002", "MB-003", "MB-004", "MB-005",
                    "MB-006", "MB-007", "MB-008", "MB-009", "MB-010"],
            notes="Live agent replies. Used server-side by the backend "
                  "(/agents/:id/ask); the key is never exposed to clients. "
                  "See docs/motherbridge/connections.md.",
        ),
    ]
