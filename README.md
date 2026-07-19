# Lucy AI

Marketing landing site for **Lucy AI** — an AI automation studio that builds custom
AI agents and automations for growing businesses. Powered by
[JABB Networks](https://jabbnetworks.com).

## Overview

A fast, self-contained static site (no build step, no dependencies). Just plain
HTML, CSS, and vanilla JavaScript — deploy it anywhere.

## Structure

```
.
├── index.html          # Single-page landing site
├── css/
│   └── styles.css      # All styles (dark, responsive, accessible)
├── js/
│   └── main.js         # Nav toggle, footer year, lead-form handling
├── assets/
│   └── favicon.svg     # Logo / favicon
└── README.md
```

## Run the static site

No build required. Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

In this mode the AIOS room runs its scripted demo and the sign-up form is
front-end only.

## Run the full stack (site + backend + database)

For live sign-in, email, and backend-tracked AIOS projects, run everything with
Docker Compose:

```bash
cp .env.example .env      # set COOKIE_SECRET and DB_TOKEN
docker compose up --build # then visit http://localhost:8787
```

See **[DEPLOY.md](DEPLOY.md)** for details, and
[`backend/README.md`](backend/README.md) / [`db/README.md`](db/README.md) for the
components.

## Deploy

Because it's fully static, it works on any static host:

- **GitHub Pages** — enable Pages on this repo (serve from the branch root)
- **Netlify / Vercel / Cloudflare Pages** — point at the repo, no build command
- Any web server / CDN — upload the files as-is

## Customize

- **Content & copy** — edit `index.html`
- **Colors & theme** — CSS variables at the top of `css/styles.css` (`:root`)
- **Lead form** — `js/main.js` currently logs submissions to the console as a demo.
  Replace the marked block with a POST to your form handler (a JABB Networks
  backend, Formspree, Netlify Forms, etc.) to start collecting real leads.

## Internal docs

Lucy AI is a persona-driven, multi-agent system. Internal architecture and the
per-agent specs live under [`docs/agents/`](docs/agents/) (system-of-record —
**not** published on the public site). Start with the
[agent registry](docs/agents/README.md).

> Keep real secrets out of the repo. `.env`, key files, and local settings are
> git-ignored; store live credentials in a secrets manager (e.g. Azure Key Vault)
> and reference them by name only.

## License

See [LICENSE](LICENSE).
