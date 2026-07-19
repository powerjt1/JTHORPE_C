"""Scaffold a new agent prompt file from the 16-section standard."""
from __future__ import annotations

import re
from datetime import date
from pathlib import Path

# kernel/motherbridge/scaffold.py -> parents[2] == repo root
DEFAULT_PROMPTS_DIR = Path(__file__).resolve().parents[2] / "docs" / "motherbridge" / "prompts"

_NUM = re.compile(r"MB-(\d+)")

_TEMPLATE = """# MB-{num} — {name}, {title}

> **MotherBridge Prompt Library.** No secrets — all external access is brokered
> by the MotherBridge kernel. See [../standards.md](../standards.md).

## 1. Agent Identity
- **Name / number:** {name} · MB-{num}
- **Title:** {title}
- **Persona & voice:** <one line>

## 2. Mission Statement
<The single outcome this agent exists to deliver.>

## 3. Core Responsibilities
- …
**Out of scope (route elsewhere):** …

## 4. Microsoft Certifications & Expertise
- **Certifications:** …
- **Depth areas:** …

## 5. Technology Stack
<products · services · languages · frameworks>

## 6. Tool Permissions (via MotherBridge)
- **Read:** …
- **Write (gated):** …

## 7. Communication Rules
<tone · audience · format · agent-to-agent>

## 8. MotherBridge Integration
<registration · prompt version load · shared memory · event bus · routing>

## 9. Memory Management
- **Reads:** …
- **Writes:** …

## 10. Decision Framework
1. …

## 11. Deliverables
- …

## 12. Escalation Rules
- **To the human:** …
- **To Lucy:** …

## 13. Reporting Template
```json
{{ "agent": "MB-{num}", "status": "...", "summary": "...", "artifacts": [], "next": [] }}
```

## 14. Definition of Done
- …

## 15. Continuous Learning
<feedback · telemetry · updated practices>

## 16. Version History
- v1.0.0 — {today} — initial system prompt.
"""


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower()) or "agent"


def next_number(prompts_dir: str | Path = DEFAULT_PROMPTS_DIR) -> int:
    d = Path(prompts_dir)
    nums = [int(m.group(1)) for p in d.glob("MB-*.md") if (m := _NUM.search(p.name))]
    return (max(nums) + 1) if nums else 1


def render(number: int, name: str, title: str, today: str | None = None) -> str:
    return _TEMPLATE.format(
        num=f"{number:03d}", name=name.strip(), title=title.strip(),
        today=today or date.today().isoformat(),
    )


def create_agent(
    name: str, title: str,
    prompts_dir: str | Path = DEFAULT_PROMPTS_DIR,
    number: int | None = None,
    overwrite: bool = False,
) -> Path:
    """Create MB-0NN-<slug>.md and return its path."""
    d = Path(prompts_dir)
    d.mkdir(parents=True, exist_ok=True)
    n = number if number is not None else next_number(d)
    path = d / f"MB-{n:03d}-{slugify(name)}.md"
    if path.exists() and not overwrite:
        raise FileExistsError(f"{path} already exists (use overwrite=True to replace)")
    path.write_text(render(n, name, title), encoding="utf-8")
    return path
