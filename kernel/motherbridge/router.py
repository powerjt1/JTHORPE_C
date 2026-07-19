"""Router — resolve an intent to the owning agent (mirrors Lucy's routing table)."""
from __future__ import annotations

# Checked in order; first keyword match wins. Orchestration (MB-001) is default.
_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("MB-009", ("security", "governance", "compliance", "dlp", "identity", "purview", "threat")),
    ("MB-008", ("qa", "test", "testing", "devops", "ci/cd", "release", "quality")),
    ("MB-006", ("fabric", "lakehouse", "data pipeline", "semantic model", "etl", "warehouse", "dataflow")),
    ("MB-007", ("platform", "environment", "provision", "deploy", "operations", "ops", "monitor")),
    ("MB-005", ("power bi", "dashboard", "report", "power pages", "portal", "analytics")),
    ("MB-004", ("power apps", "canvas app", "model-driven", "app build", "form")),
    ("MB-003", ("automation", "automate", "flow", "rpa", "azure function", "logic app")),
    ("MB-002", ("architecture", "architect", "solution design", "integration pattern", "alm")),
    ("MB-010", ("product", "strategy", "customer", "roadmap", "requirement", "ux research")),
]


class Router:
    def route(self, intent: str) -> str:
        text = (intent or "").lower()
        for agent_id, keywords in _RULES:
            if any(k in text for k in keywords):
                return agent_id
        return "MB-001"  # orchestration / default
