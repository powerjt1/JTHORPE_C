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

## Run locally

No build required. Open `index.html` directly, or serve the folder:

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Then visit http://localhost:8000

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

## License

See [LICENSE](LICENSE).
