# MotherBridge — External Connections

Every outbound integration is **brokered by the MotherBridge kernel** — agents
call external services *through* the kernel, never directly, and credentials live
in a secrets manager (referenced by name, never stored here). This mirrors the
Nexus master-connector model. Registry:
[`kernel/motherbridge/connections.py`](../../kernel/motherbridge/connections.py).

## Registered connections

| id | Service | Kind | Endpoint | Auth (ref) | Status | Agents |
|----|---------|------|----------|-----------|--------|--------|
| `opus-pro-agent-mcp` | Opus Pro — Agent MCP | `mcp` | `https://api.opus.pro/api/agent-mcp` | `keyvault:opus-pro-token` | **pending** | MB-001 (Lucy) |
| `anthropic-claude` | Anthropic — Claude model | `llm` | `https://api.anthropic.com` | `env:ANTHROPIC_API_KEY` | **pending** | all (MB-001…MB-010) |

`anthropic-claude` powers **live agent replies** in the Workspace ask console
(`POST /agents/:id/ask`). The backend calls it **server-side** with the agent's
role as the system prompt; the key comes from `ANTHROPIC_API_KEY` (env) and is
never sent to the browser. Set the key (and optionally `ANTHROPIC_MODEL` /
`ANTHROPIC_BASE_URL`) to activate; without it, agents use the deterministic
grounded reply. See [`backend/.env.example`](../../backend/.env.example).

`status: pending` means the connection is declared but not usable yet — it needs
the two enablement steps below.

## Enabling `opus-pro-agent-mcp`

1. **Allow the domain.** This endpoint is currently blocked by the environment's
   network policy (a `403` at the proxy). Add `api.opus.pro` to the allowlist in
   your Claude Code environment's network policy — see
   [the docs](https://code.claude.com/docs/en/claude-code-on-the-web).
2. **Provide credentials.** Store the Opus Pro token in your secrets manager as
   `opus-pro-token` (the `auth` reference). Never commit the token.
3. **Activate.** Set the connection `status` to `active` and grant the agents
   that may use it (`ConnectionRegistry.grant(id, agent_id)`).

## Using it from Claude directly (alternative)

If instead you want **Claude / the AIOS to call Opus Pro's tools as an MCP
connector** (not brokered through this kernel), add it as a custom MCP server:

- **claude.ai** → connector settings → *Add custom connector* → the MCP URL, or
- **CLI** (interactive) → `claude mcp add opus-pro <url>` (see `claude mcp --help`).

That is a configuration step performed by you; it can't be done from a
non-interactive session, and the same domain-allowlist rule applies.

## Notes

- No secrets in this repo or the registry — `auth` is a **reference** to a
  Key Vault entry.
- Access is least-privilege: only the listed agents may use a connection; grant
  more with `grant(id, agent_id)`.
- Security review of any new external connection is owned by **Kaira (MB-009)**.
