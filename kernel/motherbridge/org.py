"""Organization hierarchy — the MotherBridge reporting/escalation chain.

Routing stays flat (see router.py); this captures *reporting lines* so escalation
follows the org chart:

    Lucy (MB-001)
      ├─ Julian (MB-002)  ── Alex (MB-003), Brianna (MB-004), Bianca (MB-005)
      ├─ JABBNETWORKS (MB-007) ── Ryan (MB-006), Christina (MB-008), MiaKkcar (MB-010)
      ├─ Kaira (MB-009)
      ├─ Zeruiah (MB-011)      # Manager & Executive Producer (media)
      └─ Don Colion (MB-012)   # Special Ops Developer
"""
from __future__ import annotations

# agent_id -> the agent it escalates to (its lead). None = top (reports to Lucy/kernel).
REPORTS_TO: dict[str, str | None] = {
    "MB-001": None,        # Lucy — Chief Orchestrator
    "MB-002": "MB-001",    # Julian — lead: Architecture
    "MB-007": "MB-001",    # JABBNETWORKS — lead: Platform Operations
    "MB-009": "MB-001",    # Kaira — lead: Security & Governance
    "MB-003": "MB-002",    # Alex     -> Julian
    "MB-004": "MB-002",    # Brianna  -> Julian
    "MB-005": "MB-002",    # Bianca   -> Julian
    "MB-006": "MB-007",    # Ryan     -> JABBNETWORKS
    "MB-008": "MB-007",    # Christina-> JABBNETWORKS
    "MB-010": "MB-007",    # MiaKkcar -> JABBNETWORKS
    "MB-011": "MB-001",    # Zeruiah  -> Lucy (media/production line)
    "MB-012": "MB-001",    # Don Colion -> Lucy (special ops, direct line)
}


def lead_of(agent_id: str) -> str | None:
    """The agent this one escalates to first, or None if top-level."""
    return REPORTS_TO.get(agent_id)


def escalation_chain(agent_id: str) -> list[str]:
    """Ordered escalation path up to (and including) Lucy — excludes the agent itself."""
    chain: list[str] = []
    cur = REPORTS_TO.get(agent_id)
    while cur is not None:
        chain.append(cur)
        cur = REPORTS_TO.get(cur)
    return chain


def direct_reports(agent_id: str) -> list[str]:
    """Agents that report directly to this one."""
    return sorted(a for a, lead in REPORTS_TO.items() if lead == agent_id)
