# MotherBridge Prompt Version Manager Specification

**Document:** MB-VERSIONS-SPEC · **Version:** 0.1.0 · **Status:** Implemented (V2)
**Company:** JABBNETWORKS LLC · **Product:** JABBNETWORKS AIOS Enterprise
**Implementation language:** Python 3.11+

> Every agent is a prompt, and every prompt is versioned. The Prompt Version
> Manager decides **which version of a prompt serves each agent** — the latest by
> default, or a pinned version for reproducibility and rollback. It refines §6.2 of
> the [Kernel Specification](./KERNEL-SPEC.md); the reference implementation lives
> in [`kernel/motherbridge/versions.py`](../../../kernel/motherbridge/versions.py)
> (backed by [`prompts.py`](../../../kernel/motherbridge/prompts.py)).

## 1. Goals

- **Single source of truth** — a prompt's version lives *in the prompt file*
  (section 16, Version History); no external version database to drift out of sync.
- **Latest by default** — an agent serves the highest SemVer found in its prompt.
- **Pinnable** — any agent can be pinned to an exact version for reproducibility,
  incident response, or staged rollout, and unpinned to resume latest.
- **Auditable & deterministic** — resolving a version is a pure function of the
  files on disk plus the pin table; the same inputs always resolve the same way.

## 2. Where versions come from

Each prompt is authored to the 16-section [standard](../standards.md); **section
16 (Version History)** carries a dated SemVer change log, e.g.:

```markdown
## 16. Version History
- v1.2.0 — 2026-07-20 — tiered escalation; connections section.
- v1.1.0 — 2026-06-30 — deepened guardrails and deliverables.
- v1.0.0 — 2026-06-01 — initial prompt.
```

The library scans the file for `vMAJOR.MINOR.PATCH` tokens and takes the
**highest** as the prompt's *current version*. A prompt with no version token
resolves to `0.0.0`. The version is a property of the prompt document — the
library re-derives it on every `load()`, so editing the file is the only step
needed to cut a new version.

## 3. SemVer policy (per prompt)

Each prompt carries its own SemVer, independent of the library version
(`docs/motherbridge/README.md`) and the kernel package version.

| Bump | When | Example |
|------|------|---------|
| **MAJOR** | Behavior-changing rewrite: mission, responsibilities, guardrails, or tool permissions change in a way that alters what the agent does. | `1.x → 2.0.0` |
| **MINOR** | Additive, backward-compatible: new deliverables, deeper guidance, an added section. | `1.1.0 → 1.2.0` |
| **PATCH** | Editorial: typos, formatting, clarifications with no behavioral change. | `1.2.0 → 1.2.1` |

Bump by **adding a new line** to section 16 — never rewrite history. The newest
line's version becomes current automatically.

## 4. Interface

```python
class PromptVersionManager:
    def current_version(self, agent_id: str) -> str: ...   # latest in the file, or "0.0.0"
    def pin(self, agent_id: str, version: str) -> None: ... # force an exact version
    def unpin(self, agent_id: str) -> None: ...             # resume latest
    def resolve(self, agent_id: str) -> str: ...            # pinned if set, else current
```

- **`current_version`** — the highest SemVer in the agent's prompt file.
- **`pin`** — records `agent_id → version` in the in-memory pin table. Pins are not
  validated against the file's history in v0.1 (a pin may point at a version that
  isn't the latest, which is the point — rollback).
- **`unpin`** — removes the pin; idempotent (unpinning an unpinned agent is a no-op).
- **`resolve`** — the version actually served: the pin if present, else the current
  version. This is the function every other subsystem calls.

## 5. How the kernel uses it

At [`Kernel.boot()`](../../../kernel/motherbridge/kernel.py) the manager wraps the
loaded Prompt Library. For each agent the kernel stamps the **resolved** version
onto the registered `Agent` record:

```python
self.registry.register(Agent(
    id=doc.id, name=doc.name, title=doc.title,
    version=self.versions.resolve(doc.id),   # pinned or latest
))
```

So the Agent Registry, routing, and telemetry all report the version that is
actually serving. `kernel.resolve_version(agent_id)` exposes this at runtime.

The CLI reflects the same source of truth:

```bash
cd kernel
python3 -m motherbridge list        # id · resolved version · title
python3 -m motherbridge validate    # every prompt must be well-formed (16 sections)
```

## 6. Rollback & staged rollout

- **Rollback** — pin the affected agent(s) to the last known-good version:
  `versions.pin("MB-003", "1.1.0")`. Serving switches immediately on the next
  `resolve`; the newer prompt file stays on disk untouched.
- **Cut forward** — add a new Version History line and (if agents were pinned)
  `unpin` to resume latest.
- **Reproducibility** — pinning the whole roster to a snapshot lets a run be
  reproduced against the exact prompts it used.

## 7. Security & governance

- Prompt files are code: changes flow through review and CI (`motherbridge
  validate` runs on every push). A malformed or unversioned prompt fails the build.
- **No secrets in prompts** — reference credentials by name/location only
  (see [standards.md](../standards.md)).
- Security review of prompt changes that touch tool permissions or guardrails is
  owned by **Kaira (MB-009)**.
- Human-in-the-loop: pinning/rolling back an agent in production is a
  policy-gated, Lucy-surfaced action (see the [Policy Engine](./KERNEL-SPEC.md)).

## 8. Roadmap

- **0.1 (this spec + reference):** file-derived current version, in-memory pins,
  `resolve` = pin-or-latest, boot-time stamping, CLI `list`/`validate`.
- **0.2:** persist the pin table (shared memory) and audit every pin/unpin as a
  memory record; validate a pin against the file's history; per-project pins
  (different projects serve different versions of the same agent).
- **0.3:** signed prompt versions + provenance; staged/percentage rollout with
  automatic rollback on health regression; a version diff/changelog view in the
  AIOS Command Center.

## 9. Version History
- v0.1.0 — 2026-07-20 — initial Prompt Version Manager spec documenting the
  reference implementation (file-derived versions, pins, resolve).
