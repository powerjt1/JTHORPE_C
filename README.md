# Lucy AI — JABBNETWORKS AIOS

Marketing site **and** the AIOS operator surface for **Lucy AI** — an AI
automation studio powered by [JABB Networks](https://jabbnetworks.com). The
public landing page sits in front of a multi-agent "AI Operating System" (AIOS)
of **12 agents** coordinated by the MotherBridge kernel.

## Overview

The frontend is a fast, self-contained static site (no build step, no runtime
dependencies) — plain HTML, CSS, and vanilla JavaScript. It can run entirely
front-end (scripted demo), or against the **Node backend** for real sign-in,
email, projects, dashboard metrics, and agent asks. A **Python MotherBridge
kernel** is the reference implementation of the coordination plane (routing,
policy, shared memory, events, A2A).

## Pages

| Page | What it is |
| --- | --- |
| `index.html` | Public marketing landing page |
| `welcome.html` / `signup.html` | Sign-in / sign-up flow (OAuth PKCE via backend) |
| `aios.html` | The AIOS "room" — talk to Lucy and the team |
| `assembly.html` / `jabb-assembly.html` | The full 12-agent assembly view |
| `team.html` | Agent roster / bios |
| `workspace.html` | Per-agent workspace surface |
| `projects.html` | Backend-tracked AIOS projects & tasks |
| `command-center.html` | Live operations dashboard (KPIs wired to `/dashboard`) |
| `city.html` | **Agent City** — a 3D city where each agent works from its own district; drives from live data when a backend is present (see below) |

## The 12 agents

The agents are the system-of-record for how the product behaves. Full,
versioned prompts (16 sections each) live under
[`docs/motherbridge/prompts/`](docs/motherbridge/prompts/) and are loaded by the
kernel:

Lucy (MB-001, orchestrator) · Julian (MB-002) · Alex (MB-003) · Brianna
(MB-004) · Bianca (MB-005) · Ryan (MB-006) · JABBNETWORKS (MB-007) · Christina
(MB-008) · Kaira (MB-009, security) · MiaKkcar (MB-010) · **Zeruiah** (MB-011,
Manager & Executive Producer) · **Don Colion** (MB-012, Music Producer).

## Structure

```
.
├── *.html               # Marketing + AIOS surfaces (see Pages)
├── css/                 # Styles (dark, responsive, accessible)
├── js/                  # Per-page vanilla JS (aios, assembly, command-center, …)
├── assets/
│   ├── avatars/         # Per-agent avatar images
│   └── vendor/          # Vendored libs (three.min.js for Agent City — no CDN)
├── backend/             # Node/Express: auth, email, projects, dashboard, agents
├── kernel/              # MotherBridge kernel (Python reference) + tests
├── db/                  # Optional Python SQLite bridge (remote store)
├── docs/                # Specs, agent prompts, standards (system-of-record)
├── Dockerfile           # App image (Node 22 backend serving the site)
├── DEPLOY.md            # Deployment + datastore + security env vars
└── README.md
```

## Run the static site

No build required. Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

In this mode the AIOS surfaces run their scripted demo and forms are front-end
only. Pages read an optional `aios-config.js` (a small file you provide at
deploy time defining `window.AIOS_CONFIG = { authBaseUrl, backendEnabled }`);
without it they fall back cleanly to the demo.

## Run the full stack (site + backend + datastore)

For live sign-in, email, backend-tracked projects, dashboard metrics, and agent
asks:

```bash
cp .env.example .env      # set COOKIE_SECRET (and DB_TOKEN if using the bridge)
docker compose up --build # then visit http://localhost:8787
```

The backend serves the site **same-origin**, so cookies + fetch work without
CORS. See **[DEPLOY.md](DEPLOY.md)** for the datastore options and full env-var
contract, and [`backend/README.md`](backend/README.md) / [`db/README.md`](db/README.md)
for the components.

### Datastore

Selectable via `ACCOUNTS_STORE`:

- **`sqlite`** (recommended, single-node) — native `node:sqlite`, persistent,
  **no extra service**; needs **Node ≥ 22.5**. Set `SQLITE_PATH`.
- **`remote`** — the separate Python SQLite bridge in [`db/`](db/).
- **`memory`** — dev only, non-persistent.

### Security

The backend ships dependency-free hardening in `backend/src/security.js`:
security headers (CSP, `X-Frame-Options`, `nosniff`, Referrer-Policy), per-IP
rate limiting on abuse-prone endpoints, and a **production boot audit** that
refuses to start on a weak `COOKIE_SECRET`. OAuth uses Authorization Code +
PKCE; provider secrets stay server-side. Set `COOKIE_SECURE=true` behind HTTPS
and `TRUST_PROXY=true` behind a TLS-terminating proxy. See DEPLOY.md.

## Agent City & live data

`city.html` renders a 3D "Agent City" (three.js, vendored locally at
`assets/vendor/three.min.js` — no CDN) where each agent operates from its own
district. It runs a self-contained **simulation** by default.

When a backend is serving the site, Agent City and the Command Center switch to
**live data**: they poll `/dashboard` (every 8s for the city) and drive the
scene from real metrics — per-agent online status and 24h workload, latest
inter-agent message, engagement-biased packet traffic, and a **"LIVE DATA"**
tag. If no backend is reachable the fetch fails silently and the simulation
continues, so the page always works.

## Deploy

- **Static only** — any static host (GitHub Pages, Netlify/Vercel/Cloudflare
  Pages, any CDN). AIOS surfaces run in demo mode.
- **Full stack** — the `Dockerfile` builds a Node 22 image that serves the site
  and backend on one origin. See [DEPLOY.md](DEPLOY.md).

## Internal docs

Lucy AI is a persona-driven, multi-agent system. The architecture, platform
specs, agent prompts, and standards live under
[`docs/motherbridge/`](docs/motherbridge/) (system-of-record — **not** published
on the public site). Start with the
[MotherBridge README](docs/motherbridge/README.md); the older Power-Platform
agent set is under [`docs/agents/`](docs/agents/).

> Keep real secrets out of the repo. `.env`, key files, and local settings are
> git-ignored; store live credentials in a secrets manager (e.g. Azure Key
> Vault) and reference them by name only.

## License

See [LICENSE](LICENSE).
