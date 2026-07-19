"""PromptLibrary — loads the MotherBridge Prompt Library (docs/motherbridge/prompts)."""
from __future__ import annotations

import re
from pathlib import Path

from .models import PromptDoc

# kernel/motherbridge/prompts.py -> parents[2] == repo root
_DEFAULT_PROMPTS_DIR = Path(__file__).resolve().parents[2] / "docs" / "motherbridge" / "prompts"

# "# MB-001 — Lucy, Chief AI Orchestrator"  (title may itself contain commas)
_H1 = re.compile(r"^#\s+(MB-\d+)\s+[—-]+\s+([^,]+),\s+(.+?)\s*$", re.MULTILINE)
_VER = re.compile(r"\bv(\d+)\.(\d+)\.(\d+)\b")


def _latest_version(text: str) -> str:
    versions = [(int(a), int(b), int(c)) for a, b, c in _VER.findall(text)]
    if not versions:
        return "0.0.0"
    a, b, c = max(versions)
    return f"{a}.{b}.{c}"


class PromptLibrary:
    """Reads MB-0NN-*.md files and exposes id/name/title/current version."""

    def __init__(self, prompts_dir: str | Path | None = None) -> None:
        self.prompts_dir = Path(prompts_dir) if prompts_dir else _DEFAULT_PROMPTS_DIR
        self._docs: dict[str, PromptDoc] = {}

    def load(self) -> list[PromptDoc]:
        self._docs.clear()
        for path in sorted(self.prompts_dir.glob("MB-*.md")):
            text = path.read_text(encoding="utf-8")
            m = _H1.search(text)
            if m:
                agent_id, name, title = m.group(1), m.group(2).strip(), m.group(3).strip()
            else:
                # fall back to the filename: MB-001-lucy.md
                stem = path.stem
                agent_id = "-".join(stem.split("-")[:2]).upper()
                name = stem.split("-", 2)[-1].title()
                title = ""
            doc = PromptDoc(
                id=agent_id, name=name, title=title,
                version=_latest_version(text), path=str(path), body=text,
            )
            self._docs[agent_id] = doc
        return self.list()

    def list(self) -> list[PromptDoc]:
        return [self._docs[k] for k in sorted(self._docs)]

    def get(self, agent_id: str) -> PromptDoc | None:
        if not self._docs:
            self.load()
        return self._docs.get(agent_id)
