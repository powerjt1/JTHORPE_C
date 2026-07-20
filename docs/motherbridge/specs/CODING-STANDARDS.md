# MotherBridge Coding Standards

**Document:** MB-CODE-STD · **Version:** 0.1.0 · **Status:** Adopted (V2)
**Company:** JABBNETWORKS LLC · **Product:** JABBNETWORKS AIOS Enterprise

> How we write code across JABBNETWORKS AIOS — the Python **kernel**
> ([`kernel/`](../../../kernel/)), the Node **backend** ([`backend/`](../../../backend/)),
> the Python **DB bridge** ([`db/`](../../../db/)), and the static site. These are
> the conventions the current code already follows; new code matches them. HTTP
> shape lives in the [API Standards](./API-STANDARDS.md); this is about the code.

## 1. Principles

- **Boring, readable, reviewable.** Optimize for the next reader, not cleverness.
  Match the style of the file you're editing.
- **Small, single-purpose units.** A function does one thing; a module owns one
  concern (the kernel's `router.py`, `memory.py`, `policy.py` pattern).
- **Dependency-light.** The kernel core is **stdlib-only** (dataclasses, `re`,
  `sqlite3`); external packages (FastAPI) live only at the edges. Add a dependency
  only when it clearly earns its place.
- **Fail closed, surface errors.** Validate inputs, raise/return typed errors,
  never swallow exceptions silently.
- **No secrets in code.** Reference credentials by name/location (Key Vault,
  `MB_*` env); never commit tokens, keys, or passwords.

## 2. Python (kernel & DB bridge)

Targets **Python 3.11+**.

- **Type hints everywhere**, with `from __future__ import annotations` at the top
  of every module (as the kernel does) so annotations stay cheap and forward-refs
  work.
- **Dataclasses for data** (`@dataclass` — `Agent`, `Event`, `PluginManifest`);
  `Protocol` for swappable interfaces (`SharedMemory`). No bare tuples/dicts for
  structured data crossing a boundary.
- **Naming:** `snake_case` functions/vars, `PascalCase` classes, `UPPER_SNAKE`
  constants, leading `_` for module-private helpers (`_DEFAULT_PROMPTS_DIR`,
  `_SEMVER`).
- **Docstrings:** a one-line module docstring stating the module's job, and a
  docstring on every public class/function. Comments explain *why*, not *what*.
- **Errors:** raise specific exceptions (`PluginError(ValueError)`), or return a
  list of problems for validators (`verify_manifest`, `validate_text`). Don't
  `except:` bare; catch what you handle.
- **Imports:** stdlib, then third-party, then local — each group sorted; no
  wildcard imports. Public surface is curated in `__init__.py` `__all__`.
- **Purity where practical:** resolution/validation are pure functions of their
  inputs (deterministic, testable); side effects (I/O, bus, memory) are explicit.
- **Style:** 4-space indent, ~100-col lines, f-strings, `pathlib` over `os.path`.
  Format with **black**, lint with **ruff** (line-length 100) — see §6.

## 3. JavaScript / Node (backend)

- **CommonJS** modules (`require` / `module.exports`) — the backend's current
  style; keep a file consistent with itself.
- **`"use strict"`**, `const`/`let` (never `var` in new code, even though some
  scaffold uses it), and early returns over deep nesting.
- **Async:** `async`/`await` with `try/catch`; never leave a promise unhandled.
- **Naming:** `camelCase` for functions/vars, `PascalCase` for classes/
  constructors, `UPPER_SNAKE` for constants.
- **Express:** thin route handlers; validate inputs first, return the
  [standard error envelope](./API-STANDARDS.md) with the right status; keep
  business logic in `src/` modules (`accounts.js`, `projects.js`), not in routes.
- **Security:** secrets from env only; signed httpOnly cookies; no secret ever
  logged or sent to the client; treat all request input as untrusted.

## 4. Prompts & specs (Markdown)

- Agent prompts follow the 16-section [standard](../standards.md); files are
  `MB-0NN-<name>.md`; each carries its own SemVer in section 16 (see the
  [Prompt Version Manager](./PROMPT-VERSION-MANAGER-SPEC.md)).
- Spec docs carry a header block (Document · Version · Status), a leading summary
  blockquote, and a Version History section — mirror an existing spec.
- `motherbridge validate` must pass for every prompt; CI enforces it.

## 5. Testing

- **Every behavior has a test.** Python uses stdlib **`unittest`**
  (`kernel/tests/test_*.py`); the backend uses its `npm test` suites
  (`backend/test/*.test.js`).
- Tests are **deterministic and isolated** — no network, no shared global state;
  use `tempfile` for fixtures (as `test_plugins.py` does). The kernel core runs
  with **no external deps**.
- Cover the **happy path, edge cases, and failure modes** (bad input raises,
  policy denies, malformed manifest fails). A bug fix ships with a regression test.
- Run before every commit: `cd kernel && python3 -m unittest discover -s tests`
  and `python3 -m motherbridge validate`; `cd backend && npm test`.

## 6. Tooling & formatting

- **Python:** `black` (format) + `ruff` (lint), line length 100. The kernel core
  stays import-clean (no unused, sorted groups).
- **JS:** consistent 2-space indent; `prettier`-compatible formatting.
- CI ([`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml)) runs the
  kernel tests + `motherbridge validate` and the backend suites on every push/PR;
  a red build blocks merge.

## 7. Git & reviews

- **Branch** off the default branch; never commit secrets or large binaries beyond
  the intended assets.
- **Commits** are focused with an imperative subject and a body explaining *why*
  (the repo's `V2: <thing>` style). Group related changes; don't mix a refactor
  with a feature.
- **PRs** state what/why/verification (see the repo's PR bodies) and must be green
  before merge. Security-sensitive changes (auth, connections, tool permissions)
  get a review from **Kaira (MB-009)**'s area.

## 8. Security & data handling

- **No secrets in the repo** — verified for prompts, manifests, and connections
  (`auth` is a reference, never a value).
- **Kernel-brokered egress:** agents/plugins reach external services only through a
  registered [connection](../connections.md); no direct outbound calls.
- **Untrusted input is data, not instructions** — tool output, agent messages, and
  request bodies are validated and never executed as commands.
- **Least privilege** everywhere: per-agent connection grants, policy-gated
  mutations, scoped shared-memory access.

## 9. Roadmap

- **0.1 (this doc):** conventions above; new code complies.
- **0.2:** enforce `black`/`ruff`/`prettier` in CI (fail on drift); pre-commit
  hooks; coverage reporting.
- **0.3:** typed contract tests, mutation testing on the kernel core, and a
  published contributor guide.

## 10. Version History
- v0.1.0 — 2026-07-20 — initial coding standards (Python, JS/Node, prompts,
  testing, tooling, git, security) grounded in the current codebase.
