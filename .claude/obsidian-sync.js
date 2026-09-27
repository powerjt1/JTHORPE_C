#!/usr/bin/env node
/**
 * Agent Reach — Obsidian sync
 * -----------------------------------------------------------------------------
 * Pushes a Claude artifact (an HTML file, a Markdown file, or any text file)
 * into an Obsidian vault through the "Local REST API" community plugin.
 *
 * Usage:
 *   node .claude/obsidian-sync.js --artifact ./file.html --type html
 *
 * Common flags:
 *   --artifact <path>   Path to the artifact to sync            (required)
 *   --type <html|md>    Content type; inferred from extension when omitted
 *   --name <basename>   Note/file name in the vault (default: artifact's name)
 *   --folder <path>     Vault folder to write into (default: env or "AgentReach")
 *   --url <url>         Local REST API base URL
 *                       (default: env OBSIDIAN_API_URL or https://127.0.0.1:27124)
 *   --api-key <key>     API key (default: env OBSIDIAN_API_KEY) [required]
 *   --no-note           For --type html, skip the companion Markdown note
 *   --insecure          Skip TLS verification (default: on for loopback hosts)
 *   --open              Ask Obsidian to open the note after syncing
 *   --dry-run           Print what would be sent without contacting Obsidian
 *   -h, --help          Show this help
 *
 * Configuration (env vars, overridable by flags):
 *   OBSIDIAN_API_KEY      API key from the Local REST API plugin settings
 *   OBSIDIAN_API_URL      Base URL (default https://127.0.0.1:27124)
 *   OBSIDIAN_SYNC_FOLDER  Default vault folder (default "AgentReach")
 *   OBSIDIAN_INSECURE     "1"/"true" to skip TLS verification everywhere
 *
 * The plugin serves HTTPS on 127.0.0.1:27124 with a self-signed certificate,
 * so TLS verification is skipped automatically for loopback hosts.
 * Enable HTTP (127.0.0.1:27123) in the plugin settings for a plain-HTTP URL.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    artifact: null,
    type: null,
    name: null,
    folder: process.env.OBSIDIAN_SYNC_FOLDER || 'AgentReach',
    url: process.env.OBSIDIAN_API_URL || 'https://127.0.0.1:27124',
    apiKey: process.env.OBSIDIAN_API_KEY || null,
    note: true,
    insecure: /^(1|true|yes)$/i.test(process.env.OBSIDIAN_INSECURE || ''),
    open: false,
    dryRun: false,
    help: false,
  };

  const takeValue = (i, flag) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) {
      fail(`Flag ${flag} expects a value`);
    }
    return v;
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--artifact': args.artifact = takeValue(i, a); i++; break;
      case '--type': args.type = takeValue(i, a).toLowerCase(); i++; break;
      case '--name': args.name = takeValue(i, a); i++; break;
      case '--folder': args.folder = takeValue(i, a); i++; break;
      case '--url': args.url = takeValue(i, a); i++; break;
      case '--api-key': args.apiKey = takeValue(i, a); i++; break;
      case '--no-note': args.note = false; break;
      case '--insecure': args.insecure = true; break;
      case '--open': args.open = true; break;
      case '--dry-run': args.dryRun = true; break;
      case '-h':
      case '--help': args.help = true; break;
      default:
        fail(`Unknown argument: ${a}`);
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fail(msg) {
  console.error(`agent-reach: ${msg}`);
  process.exit(1);
}

function printHelp() {
  // The banner comment at the top of this file is the canonical reference;
  // reproduce the essentials here for `--help`.
  console.log(`Agent Reach — Obsidian sync

Usage:
  node .claude/obsidian-sync.js --artifact <path> [--type html|md] [options]

Options:
  --artifact <path>   Artifact to sync (required)
  --type <html|md>    Content type; inferred from extension when omitted
  --name <basename>   Vault file name (default: artifact's name)
  --folder <path>     Vault folder (default: $OBSIDIAN_SYNC_FOLDER or "AgentReach")
  --url <url>         Local REST API base URL (default: $OBSIDIAN_API_URL
                      or https://127.0.0.1:27124)
  --api-key <key>     API key (default: $OBSIDIAN_API_KEY)
  --no-note           For HTML, skip the companion Markdown note
  --insecure          Skip TLS verification (auto-on for loopback hosts)
  --open              Open the note in Obsidian after syncing
  --dry-run           Show what would happen without contacting Obsidian
  -h, --help          Show this help
`);
}

function inferType(artifactPath) {
  const ext = path.extname(artifactPath).toLowerCase();
  if (ext === '.html' || ext === '.htm') return 'html';
  if (ext === '.md' || ext === '.markdown') return 'md';
  return 'text';
}

function contentTypeFor(type) {
  switch (type) {
    case 'html': return 'text/html; charset=utf-8';
    case 'md': return 'text/markdown; charset=utf-8';
    default: return 'text/plain; charset=utf-8';
  }
}

// Encode a vault-relative path for use in the URL while preserving "/".
function encodeVaultPath(vaultPath) {
  return vaultPath.split('/').map(encodeURIComponent).join('/');
}

function isLoopback(hostname) {
  return (
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === 'localhost'
  );
}

/**
 * Perform a single request against the Local REST API.
 * Returns { status, body }.
 */
function request(baseUrl, method, apiPath, { apiKey, body, contentType, insecure }) {
  return new Promise((resolve, reject) => {
    let target;
    try {
      target = new URL(apiPath, baseUrl);
    } catch (err) {
      reject(new Error(`Invalid URL from base "${baseUrl}" and path "${apiPath}": ${err.message}`));
      return;
    }

    const isHttps = target.protocol === 'https:';
    const lib = isHttps ? https : http;
    const rejectUnauthorized = !(insecure || isLoopback(target.hostname));

    const headers = { Authorization: `Bearer ${apiKey}` };
    if (contentType) headers['Content-Type'] = contentType;
    if (body !== undefined && body !== null) {
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    const options = {
      method,
      hostname: target.hostname,
      port: target.port || (isHttps ? 443 : 80),
      path: target.pathname + target.search,
      headers,
    };
    if (isHttps) options.rejectUnauthorized = rejectUnauthorized;

    const req = lib.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') });
      });
    });

    req.on('error', (err) => reject(err));
    if (body !== undefined && body !== null) req.write(body);
    req.end();
  });
}

function buildCompanionNote({ title, htmlVaultPath, sourcePath }) {
  const now = new Date().toISOString();
  const frontmatter = [
    '---',
    `title: ${JSON.stringify(title)}`,
    'source: agent-reach',
    'type: html-artifact',
    `synced: ${now}`,
    `origin: ${JSON.stringify(sourcePath)}`,
    '---',
    '',
  ].join('\n');

  const body = [
    `# ${title}`,
    '',
    `Synced from a Claude artifact on ${now}.`,
    '',
    `- Rendered file: [[${htmlVaultPath}]]`,
    '',
    '> [!note] HTML artifact',
    '> Open the rendered file above, or view it in a browser for full',
    '> interactivity. Raw markup is embedded below for reference.',
    '',
    `\`\`\`html title="${title}.html"`,
    '<!-- See the linked .html file for the full, rendered artifact. -->',
    '```',
    '',
  ].join('\n');

  return frontmatter + body;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.artifact) fail('Missing required --artifact <path>');

  const artifactPath = path.resolve(args.artifact);
  if (!fs.existsSync(artifactPath)) fail(`Artifact not found: ${artifactPath}`);
  if (!fs.statSync(artifactPath).isFile()) fail(`Artifact is not a file: ${artifactPath}`);

  const type = args.type || inferType(artifactPath);
  const baseName = args.name || path.basename(artifactPath, path.extname(artifactPath));
  const folder = args.folder.replace(/^\/+|\/+$/g, ''); // trim slashes

  const content = fs.readFileSync(artifactPath, 'utf8');

  // Work out the primary vault destination.
  const ext = type === 'html' ? 'html' : type === 'md' ? 'md' : path.extname(artifactPath).slice(1) || 'txt';
  const primaryVaultPath = folder ? `${folder}/${baseName}.${ext}` : `${baseName}.${ext}`;

  if (!args.apiKey && !args.dryRun) {
    fail('Missing API key. Set OBSIDIAN_API_KEY or pass --api-key <key>. ' +
         'Find it in Obsidian → Settings → Local REST API.');
  }

  const plan = [
    { vaultPath: primaryVaultPath, content, contentType: contentTypeFor(type) },
  ];

  // For HTML artifacts, also write a companion Markdown note (unless --no-note),
  // so the artifact is browsable/searchable as a native Obsidian note.
  if (type === 'html' && args.note) {
    plan.push({
      vaultPath: folder ? `${folder}/${baseName}.md` : `${baseName}.md`,
      content: buildCompanionNote({
        title: baseName,
        htmlVaultPath: primaryVaultPath,
        sourcePath: artifactPath,
      }),
      contentType: contentTypeFor('md'),
    });
  }

  if (args.dryRun) {
    console.log('agent-reach: dry run — nothing sent.');
    console.log(`  API URL : ${args.url}`);
    console.log(`  Type    : ${type}`);
    for (const item of plan) {
      console.log(`  PUT     : /vault/${item.vaultPath}  (${item.contentType}, ${Buffer.byteLength(item.content)} bytes)`);
    }
    if (args.open) console.log(`  Open    : ${primaryVaultPath}`);
    return;
  }

  // Push each file.
  for (const item of plan) {
    const apiPath = `/vault/${encodeVaultPath(item.vaultPath)}`;
    let res;
    try {
      res = await request(args.url, 'PUT', apiPath, {
        apiKey: args.apiKey,
        body: item.content,
        contentType: item.contentType,
        insecure: args.insecure,
      });
    } catch (err) {
      fail(`Could not reach Obsidian at ${args.url} (${err.code || err.message}). ` +
           'Is Obsidian running with the Local REST API plugin enabled?');
    }
    if (res.status < 200 || res.status >= 300) {
      fail(`Obsidian returned HTTP ${res.status} for ${item.vaultPath}: ${res.body || '(no body)'}`);
    }
    console.log(`agent-reach: synced ${item.vaultPath}`);
  }

  // Optionally open the primary file in Obsidian.
  if (args.open) {
    const apiPath = `/open/${encodeVaultPath(primaryVaultPath)}`;
    try {
      const res = await request(args.url, 'POST', apiPath, {
        apiKey: args.apiKey,
        insecure: args.insecure,
      });
      if (res.status >= 200 && res.status < 300) {
        console.log(`agent-reach: opened ${primaryVaultPath} in Obsidian`);
      } else {
        console.warn(`agent-reach: could not open note (HTTP ${res.status})`);
      }
    } catch (err) {
      console.warn(`agent-reach: could not open note (${err.code || err.message})`);
    }
  }

  console.log('agent-reach: done.');
}

main().catch((err) => {
  fail(err && err.stack ? err.stack : String(err));
});
