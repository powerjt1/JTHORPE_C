# MotherBridge Plugin SDK Specification

**Document:** MB-PLUGIN-SPEC · **Version:** 0.1.0 · **Status:** Implemented (V2 — declarative)
**Company:** JABBNETWORKS LLC · **Product:** JABBNETWORKS AIOS Enterprise
**Implementation language:** Python 3.11+

> How the kernel is **extended**. A plugin adds a capability — a tool, a connector
> binding, a UI panel, or a workflow — that agents can be granted. Plugins are
> **declarative manifests** the kernel discovers and verifies; v0.1 does not
> execute plugin code (that is the 0.2 sandbox). It defines the `PluginManager`
> named in §6.9 of the [Kernel Specification](./KERNEL-SPEC.md); the reference
> implementation lives in
> [`kernel/motherbridge/plugins.py`](../../../kernel/motherbridge/plugins.py) and
> sample manifests in [`docs/motherbridge/plugins/`](../plugins/).

## 1. Goals

- **Declarative first** — a plugin is a `*.plugin.json` manifest, not a blob of
  code. The kernel can reason about, verify, and audit it before anything runs.
- **Least privilege** — a plugin declares exactly the capabilities it provides and
  the agents allowed to use it; nothing is granted implicitly.
- **Kernel-brokered** — a plugin that needs the outside world references a
  [connection](../connections.md) id; it never holds credentials or calls out
  directly. Manifests carry **no secrets**.
- **Verified & fail-closed** — a malformed manifest fails discovery (and CI), so a
  bad plugin can't half-register.

## 2. Manifest

```jsonc
{
  "id": "plg-hello-report",        // plg-<slug> (lowercase, digits, hyphens)
  "name": "Hello Report",
  "version": "1.0.0",              // SemVer
  "kind": "tool",                  // tool | connector | ui | workflow
  "capabilities": ["report.generate", "report.export.pdf"],
  "agents": ["MB-005"],            // agent ids granted the plugin
  "connections": [],               // connection ids it needs (kernel-brokered)
  "entry": "",                     // optional module:callable — NOT executed in v0.1
  "status": "registered",          // registered | enabled | disabled
  "description": "…"
}
```

| field | required | meaning |
|-------|----------|---------|
| `id` | ✓ | `plg-<slug>`. |
| `name` | ✓ | Human-readable name. |
| `version` | ✓ | SemVer `MAJOR.MINOR.PATCH`. |
| `kind` | ✓ | `tool` \| `connector` \| `ui` \| `workflow`. |
| `capabilities` | ✓ | Tool/permission names it provides (≥1). |
| `agents` | | Agent ids granted the plugin. |
| `connections` | | Connection ids it needs. |
| `entry` | | Optional entry reference; not executed in v0.1. |
| `status` | | `registered` \| `enabled` \| `disabled` (default `registered`). |
| `description` | | What it does. |

## 3. Verification rules

`verify_manifest(manifest)` returns a list of problems (empty = well-formed).
`PluginManager.register` raises `PluginError` if any problem is found:

- `id` matches `plg-<slug>`; `name` non-empty; `version` is SemVer; `kind` is one
  of the four; at least one `capability`.
- every `agents[*]` looks like `MB-0NN`; `status` is a valid value.
- **no secrets** — neither `entry` nor any `capability` may contain a credential
  pattern (`token=`, `bearer …`, `api_key=`, …); external access goes through
  `connections`.
- `from_dict` rejects unknown fields, so typos fail loudly instead of being
  silently ignored.

## 4. Interface

```python
class PluginManager:
    def register(self, manifest: PluginManifest) -> PluginManifest: ...  # verifies; raises PluginError
    def get(self, plugin_id: str) -> PluginManifest | None: ...
    def all(self) -> list[PluginManifest]: ...
    def by_kind(self, kind: str) -> list[PluginManifest]: ...
    def by_agent(self, agent_id: str) -> list[PluginManifest]: ...
    def enable(self, plugin_id: str) -> bool: ...
    def disable(self, plugin_id: str) -> bool: ...
    def grant(self, plugin_id: str, agent_id: str) -> bool: ...          # idempotent
    def discover(self, plugins_dir=None) -> list[PluginManifest]: ...    # register all *.plugin.json
```

## 5. Discovery & the kernel

At [`Kernel.boot()`](../../../kernel/motherbridge/kernel.py) the manager runs
`discover()` over [`docs/motherbridge/plugins/`](../plugins/), registering and
verifying every `*.plugin.json`. Discovered plugins are available at
`kernel.plugins`, and a `plugins` subsystem is reported by the HealthMonitor.

```bash
cd kernel
python3 -c "from motherbridge import Kernel; k=Kernel().boot(); print([p.id for p in k.plugins.all()])"
# -> ['plg-hello-report']
```

Adding a plugin is just dropping a manifest in that directory — no kernel code
changes — exactly like adding an agent prompt. A malformed manifest raises
`PluginError` naming the offending file, so CI catches it.

## 6. Capabilities → agents

A capability is a named unit of function (`report.export.pdf`) a plugin provides.
Granting a plugin to an agent (`grant(plugin_id, agent_id)` or the manifest's
`agents` list) is what lets that agent use those capabilities. This is
least-privilege: an agent sees only the plugins it was granted (`by_agent`).
Capabilities that trigger mutating actions still pass the
[Policy Engine](./KERNEL-SPEC.md) and human-approval gates at call time.

## 7. Security & governance

- **No secrets in manifests** — verified at registration; external access is a
  brokered connection id.
- **Declarative in v0.1** — the kernel does not execute `entry`; there is no code
  execution surface yet. Execution (0.2) will run in a capability-scoped sandbox.
- **Fail-closed** — verification errors block registration and the build.
- Security review of any new plugin — especially `connector` kinds or new
  capabilities — is owned by **Kaira (MB-009)**; plugin/marketplace UX is owned by
  **MiaKkcar (MB-010)**.

## 8. Roadmap

- **0.1 (this spec + reference):** manifest schema, verification, registry,
  directory discovery at boot, enable/disable/grant, health subsystem.
- **0.2:** sandboxed execution of `entry` with capability-scoped permissions;
  per-capability policy checks; signed manifests + provenance; plugin versions via
  the [Prompt/version manager](./PROMPT-VERSION-MANAGER-SPEC.md) pattern.
- **0.3:** a plugin marketplace (submit/review/publish), dependency resolution
  between plugins, and a plugin panel in the AIOS Command Center.

## 9. Version History
- v0.1.0 — 2026-07-20 — initial Plugin SDK: declarative manifest, verification,
  PluginManager registry, boot-time discovery, and a sample plugin.
