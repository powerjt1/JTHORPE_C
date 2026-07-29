# MotherBridge API Standards

**Document:** MB-API-STD · **Version:** 0.1.0 · **Status:** Adopted (V2)
**Company:** JABBNETWORKS LLC · **Product:** JABBNETWORKS AIOS Enterprise

> The conventions every JABBNETWORKS AIOS HTTP surface follows — the Node
> auth/API backend (`/auth`, `/email`, `/projects`, `/dashboard`), the Python
> **kernel** API ([`kernel/app.py`](../../../kernel/app.py), §8 of the
> [Kernel Spec](./KERNEL-SPEC.md)), and the Python **DB bridge** (`db/`). New
> endpoints follow these rules; existing endpoints converge on them.

## 1. Principles

- **Predictable over clever** — same shapes, same status codes, same errors
  everywhere. A client that knows one endpoint can guess the next.
- **Secure by default** — auth required unless explicitly public; secrets stay
  server-side; every mutation is policy-checked and audited.
- **Versioned & additive** — clients never break on a deploy; changes are additive
  within a version.
- **JSON everywhere** — `application/json` request and response bodies, UTF-8.

## 2. Resources & methods

- **Nouns, plural, lowercase, hyphenated:** `/projects`, `/kernel/agents`,
  `/dashboard`. Sub-resources nest: `/projects/{id}/tick`.
- **Methods mean what they say:** `GET` (safe, no side effects), `POST` (create /
  action), `PUT` (idempotent replace), `PATCH` (partial), `DELETE` (remove).
- **Path params** identify a resource (`/projects/{id}`); **query params** filter,
  sort, and paginate (`?status=active&limit=20`).
- Actions that aren't CRUD are a `POST` sub-resource verb (`POST
  /projects/{id}/tick`, `POST /kernel/prompts/{id}/pin`), not a verb in the path
  root.

## 3. Versioning

- The surface carries a version: the kernel app declares `version` (FastAPI
  `title`/`version`), and public HTTP APIs are served under a **`/v1` prefix**
  (e.g. `/v1/projects`). `GET /healthz` / `/kernel/health` stay unversioned.
- **Backward-compatible** changes (new endpoint, new optional field, new enum
  value a client can ignore) ship within a version. Breaking changes get a new
  prefix (`/v2`) and a deprecation window on `/v1`.

## 4. Request & response envelope

**Success** — return the resource (or a small wrapper) directly, with an `ok`
flag on action/collection responses:

```json
{ "ok": true, "project": { "id": "…", "status": "active" } }
```

- **Collections** return an array under a named key plus paging metadata:
  `{ "ok": true, "projects": [ … ], "page": { "limit": 20, "next": "…" } }`.
- **Timestamps** are ISO-8601 UTC (`2026-07-20T14:03:00Z`). **IDs** are strings.
- **Booleans/enums** are explicit; avoid overloading `null` with meaning.

## 5. Errors

One error envelope across all surfaces:

```json
{ "ok": false, "error": { "code": "not_found", "message": "Unknown agent." } }
```

- `error.code` — a **stable, machine-readable** snake_case slug (clients branch on
  this, never on `message`). `error.message` — a short human sentence.
- **Status codes:** `200` ok · `201` created · `202` accepted (async) · `400`
  invalid input · `401` unauthenticated · `403` forbidden / policy-denied · `404`
  not found · `409` conflict · `422` semantic validation · `429` rate-limited ·
  `500`/`502` server/upstream. Use the most specific code.
- Never leak internals (stack traces, SQL, secrets, upstream tokens) in a body.

> **Current state → target.** The Node backend already returns `{ ok:false,
> error:"…" }` (string); the kernel/FastAPI returns `{ detail:"…" }`. Both migrate
> to the structured `error:{code,message}` above — additively (keep the old field
> during the window) so clients don't break.

## 6. Authentication & authorization

- **User surfaces** (backend) use a signed, httpOnly **session cookie** (OAuth
  Authorization Code + PKCE established it); state/PKCE live in signed cookies.
- **Service-to-service** (Node ↔ DB bridge) uses a shared secret header
  (`X-DB-Token`); the kernel holds all external credentials (Key Vault) and brokers
  connections — clients never see them.
- **Authorization is per-resource:** ownership is checked (`project.ownerEmail ===
  session.email` → `403` otherwise), and mutating kernel endpoints pass the
  **PolicyEngine** (`deny` → `403`, `needs_approval` → surfaced via Lucy).
- Missing/invalid auth → `401`; authenticated-but-not-allowed → `403`.

## 7. Mutations: policy, idempotency, audit

- Every mutating endpoint is **policy-checked** and **audited** — an append-only
  shared-memory record with actor, action, and before/after (see
  [Shared Memory Spec](./SHARED-MEMORY-SPEC.md)).
- **Idempotency:** `PUT` is naturally idempotent; unsafe `POST`s that create should
  accept an `Idempotency-Key` header (0.2) so retries don't double-apply.
- High-impact actions return `202 Accepted` and emit an event
  ([`approval.required`](./EVENT-BUS-SPEC.md)) rather than doing the work inline.

## 8. Pagination, filtering, sorting

- **Cursor pagination** preferred: `?limit=20&cursor=…` → response `page.next`
  (opaque cursor) or `null` at the end. `limit` has a sane default and hard max.
- **Filtering** by query param (`?status=active`); **sorting** via `?sort=-created`
  (leading `-` = descending). Unknown params are ignored, not errors.

## 9. Headers, CORS & content

- `Content-Type: application/json; charset=utf-8` on JSON bodies.
- CORS is **allowlist-based** (explicit origins), credentials enabled only for the
  known app origin — never `*` with credentials.
- Standard cache headers on cacheable `GET`s; mutations are `no-store`.

## 10. Health, observability & limits

- Every service exposes an **unversioned health check** (`/healthz`,
  `/kernel/health`) returning subsystem status — used by Docker/Compose and load
  balancers.
- Requests carry/propagate a **correlation id** (`X-Request-Id`); telemetry records
  latency and outcome per route.
- **Rate limiting** (0.2) returns `429` with `Retry-After`.

## 11. Roadmap

- **0.1 (this doc):** conventions above; new endpoints comply, existing ones
  converge (error envelope, `/v1` prefix).
- **0.2:** structured error migration complete; idempotency keys; rate limiting +
  `Retry-After`; correlation-id propagation end-to-end.
- **0.3:** published OpenAPI for every surface; contract tests in CI; SDK
  generation for the AIOS Command Center.

## 12. Version History
- v0.1.0 — 2026-07-20 — initial API standards (resources, versioning, envelope,
  unified error shape, auth, mutations/policy/audit, pagination, health).
