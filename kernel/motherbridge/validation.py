"""Validate agent prompt files against the 16-section standard."""
from __future__ import annotations

import re
from pathlib import Path

_H1 = re.compile(r"^#\s+MB-\d+\s+[—-]+\s+[^,]+,\s+.+?\s*$", re.MULTILINE)
_SECTION = re.compile(r"^##\s+(\d+)\.\s+", re.MULTILINE)
_VER = re.compile(r"\bv\d+\.\d+\.\d+\b")

REQUIRED_SECTIONS = list(range(1, 17))  # 1..16


def validate_text(text: str) -> list[str]:
    """Return a list of problems; empty means the prompt is well-formed."""
    issues: list[str] = []

    if not _H1.search(text):
        issues.append("H1 must be '# MB-0NN — <Name>, <Title>'")

    found = {int(n) for n in _SECTION.findall(text)}
    missing = [n for n in REQUIRED_SECTIONS if n not in found]
    if missing:
        issues.append("missing section(s): " + ", ".join(f"{n}" for n in missing))

    if not _VER.search(text):
        issues.append("no version (expected a vX.Y.Z in Version History)")

    return issues


def validate_file(path: str | Path) -> list[str]:
    p = Path(path)
    if not p.exists():
        return [f"file not found: {p}"]
    return validate_text(p.read_text(encoding="utf-8"))


def validate_library(prompts_dir: str | Path) -> dict[str, list[str]]:
    """Validate every MB-*.md in a directory. Returns {filename: [issues]}."""
    d = Path(prompts_dir)
    results: dict[str, list[str]] = {}
    for path in sorted(d.glob("MB-*.md")):
        results[path.name] = validate_file(path)
    return results
