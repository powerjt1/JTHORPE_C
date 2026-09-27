# Agent Reach

Tools that let this agent "reach" out of the repo into your other tools.

## `obsidian-sync.js` — push artifacts into Obsidian

Syncs a Claude artifact (HTML/Markdown/text) into an Obsidian vault through the
[Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api)
community plugin.

```bash
node .claude/obsidian-sync.js --artifact ./file.html --type html
```

### One-time setup

1. In Obsidian: **Settings → Community plugins → Browse** → install
   **Local REST API** and enable it.
2. Open the plugin's settings and copy the **API Key**. Note the port
   (HTTPS `27124` by default; you can also enable plain HTTP on `27123`).
3. Export the config (add to your shell profile, or a local `.env` you source):

   ```bash
   export OBSIDIAN_API_KEY="paste-the-key-here"
   export OBSIDIAN_API_URL="https://127.0.0.1:27124"   # optional (this is the default)
   export OBSIDIAN_SYNC_FOLDER="AgentReach"            # optional vault folder
   ```

   The plugin uses a self-signed certificate on the HTTPS port, so TLS
   verification is skipped automatically for loopback hosts
   (`127.0.0.1`/`localhost`). Pass `--insecure` for any other host.

> **Note:** the script talks to Obsidian on *your* machine. Run it locally
> where Obsidian is running — a remote/cloud shell can't reach your localhost.

### Usage

```
node .claude/obsidian-sync.js --artifact <path> [--type html|md] [options]

  --artifact <path>   Artifact to sync (required)
  --type <html|md>    Content type; inferred from the extension when omitted
  --name <basename>   Vault file name (default: the artifact's name)
  --folder <path>     Vault folder (default: $OBSIDIAN_SYNC_FOLDER or "AgentReach")
  --url <url>         Local REST API base URL (default: $OBSIDIAN_API_URL)
  --api-key <key>     API key (default: $OBSIDIAN_API_KEY)
  --no-note           For HTML, skip the companion Markdown note
  --insecure          Skip TLS verification (auto-on for loopback hosts)
  --open              Open the note in Obsidian after syncing
  --dry-run           Show what would happen without contacting Obsidian
  -h, --help          Show this help
```

### What it writes

- For `--type html`: writes `<folder>/<name>.html` (the raw artifact) **and** a
  companion `<folder>/<name>.md` note with frontmatter (`source: agent-reach`,
  sync timestamp, origin path) and a wiki-link to the rendered file, so the
  artifact is searchable as a native Obsidian note. Use `--no-note` to skip it.
- For `--type md`: writes `<folder>/<name>.md` directly.
- Otherwise: writes the file verbatim using the artifact's extension.

### Quick check

```bash
# Verify args/plan without contacting Obsidian:
node .claude/obsidian-sync.js --artifact ./file.html --type html --dry-run
```
