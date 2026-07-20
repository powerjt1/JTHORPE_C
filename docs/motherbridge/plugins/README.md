# MotherBridge Plugins

Plugins extend the kernel with extra **capabilities** — tools, connector bindings,
UI panels, or workflows — that agents can be granted. Each plugin is a declarative
manifest, `<slug>.plugin.json`, discovered and **verified** by the kernel's
[`PluginManager`](../../../kernel/motherbridge/plugins.py). The full contract is in
the [Plugin SDK Specification](../specs/PLUGIN-SDK-SPEC.md).

> **v0.1 is declarative only** — the kernel registers and verifies manifests; it
> does not execute plugin code yet (that is the 0.2 sandbox). **No secrets in a
> manifest** — external access is declared as `connections` (ids brokered by the
> kernel), never inline credentials.

## Manifest fields

| field | required | meaning |
|-------|----------|---------|
| `id` | ✓ | `plg-<slug>` (lowercase, digits, hyphens). |
| `name` | ✓ | Human-readable name. |
| `version` | ✓ | SemVer `MAJOR.MINOR.PATCH`. |
| `kind` | ✓ | `tool` \| `connector` \| `ui` \| `workflow`. |
| `capabilities` | ✓ | Tool/permission names the plugin provides (≥1). |
| `agents` | | Agent ids granted the plugin (e.g. `MB-005`). |
| `connections` | | Connection ids it needs (kernel-brokered — see [connections.md](../connections.md)). |
| `entry` | | Optional entry reference (`module:callable`); **not executed in v0.1**. |
| `status` | | `registered` \| `enabled` \| `disabled` (default `registered`). |
| `description` | | What it does. |

## Adding a plugin

1. Drop a `<slug>.plugin.json` in this directory (see
   [`hello-report.plugin.json`](./hello-report.plugin.json) for the shape).
2. The kernel discovers and verifies it at boot; a malformed manifest fails.

```bash
cd kernel
python3 -c "from motherbridge import Kernel; k=Kernel().boot(); print([p.id for p in k.plugins.all()])"
```

Security review of any new plugin (especially `connector` kinds or new
capabilities) is owned by **Kaira (MB-009)**.
