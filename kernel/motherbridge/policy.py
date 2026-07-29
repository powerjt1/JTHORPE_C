"""PolicyEngine — default-deny enforcement with approval gating (v1 stub)."""
from __future__ import annotations

from .models import Decision

# Actions that mutate or have external impact require human approval.
_MUTATING = ("write", "create", "update", "delete", "deploy", "publish", "enforce", "share", "send")
_READ = ("read", "get", "list", "query", "route")


class PolicyEngine:
    def check(self, agent_id: str, action: str, resource: str = "") -> Decision:
        a = (action or "").lower()
        if any(a.startswith(r) or r in a for r in _READ):
            return Decision("allow")
        if any(m in a for m in _MUTATING):
            return Decision("needs_approval", f"{action} on {resource or 'resource'} requires approval")
        # Default-deny anything unrecognized.
        return Decision("deny", f"unknown action '{action}'")
