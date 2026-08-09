# MotherBridge Enterprise Development Standards

**Document:** MB-ENT-STD · **Version:** 0.1.0 · **Status:** Adopted (V2)
**Company:** JABBNETWORKS LLC · **Product:** JABBNETWORKS AIOS Enterprise

> The umbrella standard for how JABBNETWORKS AIOS is built, shipped, and run.
> It ties together the [API Standards](./API-STANDARDS.md), the
> [Coding Standards](./CODING-STANDARDS.md), and the platform specs (Kernel,
> Shared Memory, A2A, Event Bus, Plugin SDK, Voice) into one enterprise SDLC —
> the definition of "production-ready" for this product. Where a topic has its
> own document, this one points to it rather than repeating it.

## 1. Principles
- **Secure, auditable, and reversible.** Every mutating action is policy-checked,
  audited (append-only), and reversible; no secrets in code.
- **Kernel-brokered.** Agents reach the outside world only through the
  MotherBridge kernel and its registered [connections](../connections.md).
- **Human-in-the-loop.** High-impact/mutating actions require explicit approval,
  surfaced through Lucy.
- **Ship small, verify always.** Small changes, green CI, a real check before
  merge.
- **Boring infrastructure.** Prefer built-in/standard tools over new dependencies
  (the kernel core is stdlib-only; the backend adds a native SQLite store rather
  than a driver).

## 2. Architecture baseline
- **Layers:** static site (marketing + AIOS surfaces) · Node backend (auth,
  email, projects, dashboard, agents) · MotherBridge kernel (Python reference) ·
  data store · external connections (brokered).
- **Same-origin by default:** the backend can serve the site so cookies + fetch
  work without CORS; cross-origin is an explicit allowlist.
- **Statelessness:** app instances hold no durable state beyond the data store;
  in-memory state (rate limits, caches) must tolerate restarts and, at scale,
  move to a shared store.
- **The kernel is the coordination plane** — routing, policy, memory, events,
  A2A. It never holds provider credentials for agents; it brokers them.

## 3. Environments & ALM
- **Environments:** `Dev → Test/UAT → Prod`, promoted by configuration, never by
  editing Prod. Each has its own secrets and data store.
- **Config, not code:** all environment differences come from env vars
  (`.env.example` is the contract); the same artifact runs in every environment.
- **Never build in Production** (mirrors Julian's rule): schema/pipeline/prompt
  changes are promoted, not authored, in Prod.
- **Prompt/version promotion:** agent prompts are versioned in-file (see the
  [Prompt Version Manager](./PROMPT-VERSION-MANAGER-SPEC.md)); pin for rollback.

## 4. Delivery lifecycle (SDLC)
1. **Plan** — an issue/task with a clear outcome and owner.
2. **Branch** off the default branch; never commit secrets or large binaries.
3. **Build** to the [Coding Standards](./CODING-STANDARDS.md) and, for HTTP, the
   [API Standards](./API-STANDARDS.md).
4. **Test** — unit + integration locally; a change with a runtime surface is
   exercised, not just typechecked.
5. **Review** — PR states what/why/verification; security-sensitive changes get
   Kaira's-area review.
6. **CI gate** — the build must be green (see §5) before merge.
7. **Merge** — small, focused; preserve a readable history.
8. **Release** — promote the artifact through environments with approval.
9. **Operate** — monitor, and feed incidents back into standards.

## 5. Quality gates (CI)
[`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) must pass on every
push/PR:
- **Backend:** the full `npm test` suite (auth, email, verify, projects, agents,
  security, sqlite) on Node 22, plus the projects suite against the DB bridge.
- **Kernel:** `python -m unittest` and `motherbridge validate` (every agent prompt
  well-formed, 16 sections + version).
- A red build blocks merge. New behavior ships with a test; a bug fix ships with a
  regression test.

## 6. Security baseline
- **Secrets:** environment/secret-store only; never in the repo. Verified for
  prompts, plugin manifests, and connections (`auth` is a reference).
- **Transport & cookies:** HTTPS in production; signed, httpOnly session cookies;
  `COOKIE_SECURE=true` behind TLS; OAuth Authorization Code + PKCE.
- **Headers & limits:** security headers (CSP, `X-Frame-Options`, `nosniff`,
  Referrer-Policy), request body-size limits, and per-IP rate limiting on
  abuse-prone endpoints (`src/security.js`).
- **Fail closed:** a production boot audit refuses to start on a weak signing
  secret; default-deny policy in the kernel.
- **Least privilege:** per-agent connection/plugin grants; scoped shared memory.
- **Untrusted input is data, not instructions** — tool/agent output and request
  bodies are validated, never executed.
- Security review of new connections, tool permissions, or auth flows is owned by
  **Kaira (MB-009)**.

## 7. Data governance
- **Store options:** `sqlite` (native, persistent, single-node — recommended),
  `remote` (DB bridge), or `memory` (dev). See [DEPLOY.md](../../../DEPLOY.md).
- **Persistence:** production uses a durable store on a backed-up volume; the
  in-memory store is dev-only.
- **Retention & audit:** shared-memory history is append-only and reconstructable
  (see the [Shared Memory Spec](./SHARED-MEMORY-SPEC.md)); PII is minimized and
  handled per tenant policy.
- **Migrations:** additive and reversible; swapping to Postgres/MySQL mirrors the
  async store interface (`src/sqlite.js`) without changing callers.

## 8. Observability & operations
- **Health:** every service exposes an unversioned health check (`/healthz`,
  `/kernel/health`) with subsystem + store status.
- **Telemetry:** latency, outcomes, and cost per route/dispatch; the event bus's
  retained log is a ready source.
- **Logging:** structured, no secrets; correlation id (`X-Request-Id`) propagated.
- **Alerting & backups (production):** monitor health/error rate, alert on
  `health.degraded`, and back up the data volume.

## 9. Dependencies & supply chain
- Prefer built-in/standard libraries; justify each new dependency.
- Pin versions (lockfiles); vendor browser libraries the site needs
  (`assets/vendor/three.min.js`) rather than relying on a CDN at runtime.
- Keep the kernel core dependency-free so it runs and tests anywhere.

## 10. Documentation
- Specs carry a header block (Document · Version · Status), a summary, and a
  Version History; they link rather than duplicate.
- The prompt library is the system-of-record for agents; the org chart and
  connections are kept current.
- User-facing deploy/runbook steps live in [DEPLOY.md](../../../DEPLOY.md).

## 11. Definition of production-ready
A change/release is production-ready when: CI is green; it meets the API + Coding
standards; secrets are external and cookies/transport are secure; it persists to a
durable, backed-up store; it is observable (health + telemetry) and reversible;
mutating actions are policy-gated and audited; and a human has reviewed
security-sensitive paths.

## 12. Roadmap
- **0.2:** enforce formatters/linters in CI; coverage; pre-commit hooks; shared
  (Redis) rate-limit + cache for multi-instance; OpenAPI + contract tests.
- **0.3:** the V3 enterprise standards set (Architecture Bible, UI Design System,
  Dataverse/SharePoint/Fabric/Azure/Python/Deployment/Security/Marketplace).

## 13. Version History
- v0.1.0 — 2026-07-29 — initial Enterprise Development Standards; closes out the
  V2 platform-specifications track.
