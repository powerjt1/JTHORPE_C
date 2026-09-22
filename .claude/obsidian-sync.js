#!/usr/bin/env node
"use strict";

/**
 * obsidian-sync.js — sync a Claude artifact into an Obsidian vault.
 *
 * Takes a produced artifact (an HTML page, a Markdown doc, an image, a PDF, …)
 * and files it into your Obsidian vault as a note: it copies the artifact into
 * an attachments folder and creates/updates a Markdown note with YAML
 * frontmatter that links (and, where it makes sense, embeds) the artifact. The
 * note is the durable, searchable record in your vault; the copied file is the
 * artifact itself.
 *
 * Dependency-free — plain Node (>= 16), no npm install.
 *
 * Usage:
 *   node .claude/obsidian-sync.js --artifact ./file.html --type html
 *
 * Flags:
 *   --artifact <path>   (required) the file to sync.
 *   --type <type>       artifact type: html | md | markdown | pdf | image | txt
 *                       | auto (default: inferred from the extension).
 *   --vault <path>      Obsidian vault root. Default: $OBSIDIAN_VAULT.
 *   --folder <name>     note folder inside the vault. Default: "Artifacts".
 *   --attachments <n>   attachments subfolder. Default: "Artifacts/attachments".
 *   --title <text>      note title. Default: the artifact's base name.
 *   --tags <a,b,c>      extra frontmatter tags (comma-separated).
 *   --source <text>     a source URL/reference recorded in frontmatter.
 *   --slug <text>       note filename slug. Default: derived from the title.
 *   --overwrite         replace an existing note of the same name (default: a
 *                       timestamp is appended so nothing is clobbered).
 *   --dry-run           print what would happen; write nothing.
 *   -h, --help          show this help.
 *
 * Exit codes: 0 ok · 1 usage/validation error · 2 runtime/IO error.
 */

const fs = require("fs");
const path = require("path");

// ── arg parsing ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  const flags = new Set(["overwrite", "dry-run", "help", "h"]);
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i];
    if (!a.startsWith("--") && !(a === "-h")) continue;
    const key = a.replace(/^--?/, "");
    if (flags.has(key)) {
      args[key] = true;
    } else {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        args[key] = true; // valueless
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

const HELP = `obsidian-sync — file a Claude artifact into an Obsidian vault.

  node .claude/obsidian-sync.js --artifact <path> --type <type> [options]

Options:
  --artifact <path>   (required) file to sync
  --type <type>       html | md | markdown | pdf | image | txt | auto
  --vault <path>      vault root (default: $OBSIDIAN_VAULT)
  --folder <name>     note folder in vault (default: Artifacts)
  --attachments <n>   attachments subfolder (default: Artifacts/attachments)
  --title <text>      note title (default: artifact base name)
  --tags <a,b,c>      extra tags
  --source <text>     source reference recorded in frontmatter
  --slug <text>       note filename slug
  --overwrite         replace an existing note instead of timestamping
  --dry-run           print actions, write nothing
  -h, --help          this help
`;

// ── helpers ───────────────────────────────────────────────────────────────────
function fail(msg, code) {
  process.stderr.write("obsidian-sync: " + msg + "\n");
  process.exit(code || 1);
}

const TYPE_BY_EXT = {
  ".html": "html", ".htm": "html",
  ".md": "markdown", ".markdown": "markdown",
  ".pdf": "pdf",
  ".png": "image", ".jpg": "image", ".jpeg": "image", ".gif": "image",
  ".svg": "image", ".webp": "image",
  ".txt": "txt", ".csv": "txt", ".json": "txt",
};

function inferType(file) {
  return TYPE_BY_EXT[path.extname(file).toLowerCase()] || "auto";
}

function normalizeType(t) {
  if (!t || t === "auto") return null;
  if (t === "md") return "markdown";
  return t;
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "artifact";
}

function pad(n) { return String(n).padStart(2, "0"); }
function stamp(d) {
  return (
    d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" +
    pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds())
  );
}
function isoDate(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

// Escape a value for a single-quoted YAML scalar.
function yamlStr(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}

// ── main ──────────────────────────────────────────────────────────────────────
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) { process.stdout.write(HELP); return; }

  const artifact = args.artifact;
  if (!artifact || artifact === true) fail("--artifact <path> is required. See --help.");
  if (!fs.existsSync(artifact)) fail("artifact not found: " + artifact);
  if (!fs.statSync(artifact).isFile()) fail("artifact is not a file: " + artifact);

  const vaultRoot = args.vault || process.env.OBSIDIAN_VAULT;
  if (!vaultRoot) {
    fail(
      "no vault. Pass --vault <path> or set OBSIDIAN_VAULT.\n" +
      "  e.g. export OBSIDIAN_VAULT=\"$HOME/Obsidian/MyVault\"",
    );
  }
  if (!args["dry-run"] && !fs.existsSync(vaultRoot)) {
    fail("vault does not exist: " + vaultRoot + " (create it or fix --vault)", 2);
  }

  const type = normalizeType(args.type) || inferType(artifact);
  const now = new Date();
  const baseName = path.basename(artifact, path.extname(artifact));
  const title = (typeof args.title === "string" && args.title) || baseName;
  const slug = (typeof args.slug === "string" && args.slug) || slugify(title);

  const noteFolder = (typeof args.folder === "string" && args.folder) || "Artifacts";
  const attachFolder =
    (typeof args.attachments === "string" && args.attachments) ||
    path.join(noteFolder, "attachments");

  // Copy the artifact into the vault attachments folder with a stamped name so
  // repeated syncs never collide.
  const artExt = path.extname(artifact);
  const attachName = slug + "-" + stamp(now) + artExt;
  const attachAbsDir = path.join(vaultRoot, attachFolder);
  const attachAbs = path.join(attachAbsDir, attachName);
  // Vault-relative POSIX path for links.
  const attachRel = path.join(attachFolder, attachName).split(path.sep).join("/");

  // Note file.
  let noteName = slug + ".md";
  const noteAbsDir = path.join(vaultRoot, noteFolder);
  let noteAbs = path.join(noteAbsDir, noteName);
  if (fs.existsSync(noteAbs) && !args.overwrite) {
    noteName = slug + "-" + stamp(now) + ".md";
    noteAbs = path.join(noteAbsDir, noteName);
  }

  // Build note body per type.
  const tags = ["artifact", "claude"];
  if (type && type !== "auto") tags.push(type);
  if (typeof args.tags === "string") {
    args.tags.split(",").map((t) => t.trim()).filter(Boolean).forEach((t) => tags.push(t));
  }

  const fm = [
    "---",
    "title: " + yamlStr(title),
    "type: " + yamlStr(type || "auto"),
    "created: " + yamlStr(isoDate(now)),
    "tags: [" + tags.map((t) => yamlStr(t)).join(", ") + "]",
    "attachment: " + yamlStr(attachRel),
  ];
  if (typeof args.source === "string") fm.push("source: " + yamlStr(args.source));
  fm.push("---", "");

  let body;
  switch (type) {
    case "markdown": {
      // Inline the markdown so it's fully searchable, and link the original.
      const md = fs.readFileSync(artifact, "utf8");
      body = "> Synced from `" + path.basename(artifact) + "`. Original: [[" + attachRel + "]]\n\n" + md + "\n";
      break;
    }
    case "image":
      body = "# " + title + "\n\n![[" + attachRel + "]]\n";
      break;
    case "pdf":
      body = "# " + title + "\n\n![[" + attachRel + "]]\n\n" +
             "> PDF artifact. Open the embed above, or the file at `" + attachRel + "`.\n";
      break;
    case "txt": {
      const txt = fs.readFileSync(artifact, "utf8");
      const fence = artExt === ".json" ? "json" : "";
      body = "# " + title + "\n\n```" + fence + "\n" + txt + "\n```\n";
      break;
    }
    case "html":
    default:
      // Obsidian won't render a full external HTML page inline; link it so it
      // opens in the browser/preview, and record it as an attachment.
      body =
        "# " + title + "\n\n" +
        "HTML artifact synced to your vault.\n\n" +
        "- Open: [" + attachName + "](" + attachRel + ")\n" +
        "- File: `" + attachRel + "`\n\n" +
        "> Tip: open with the local-graph/preview, or right-click → *Open in default app*\n" +
        "> to view the rendered page in your browser.\n";
      break;
  }

  const noteContent = fm.join("\n") + body;

  if (args["dry-run"]) {
    process.stdout.write(
      "[dry-run] would sync\n" +
      "  artifact : " + path.resolve(artifact) + "\n" +
      "  type     : " + (type || "auto") + "\n" +
      "  vault    : " + vaultRoot + "\n" +
      "  copy ->  : " + path.join(attachFolder, attachName) + "\n" +
      "  note ->  : " + path.join(noteFolder, noteName) + "\n",
    );
    return;
  }

  try {
    fs.mkdirSync(attachAbsDir, { recursive: true });
    fs.mkdirSync(noteAbsDir, { recursive: true });
    fs.copyFileSync(artifact, attachAbs);
    fs.writeFileSync(noteAbs, noteContent, "utf8");
  } catch (e) {
    fail("write failed: " + (e && e.message ? e.message : e), 2);
  }

  process.stdout.write(
    "synced ✓\n" +
    "  note : " + path.join(noteFolder, noteName) + "\n" +
    "  file : " + path.join(attachFolder, attachName) + "\n" +
    "  vault: " + vaultRoot + "\n",
  );
}

main();
