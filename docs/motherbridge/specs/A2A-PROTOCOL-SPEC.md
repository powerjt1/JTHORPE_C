# MotherBridge Agent-to-Agent (A2A) Communication Protocol

**Document:** MB-A2A-SPEC · **Version:** 0.1.0 · **Status:** Implemented (V2)
**Company:** JABBNETWORKS LLC · **Product:** JABBNETWORKS AIOS Enterprise
**Implementation language:** Python 3.11+

> How agents talk to each other. All messages flow **through the kernel** — over
> the [event bus](./KERNEL-SPEC.md) for delivery and the
> [shared memory](./SHARED-MEMORY-SPEC.md) for an append-only audit trail. Agents
> never message peers out-of-band. Reference implementation:
> [`kernel/motherbridge/messaging.py`](../../../kernel/motherbridge/messaging.py).

## 1. Goals

- **Typed, auditable messages** between agents, with correlation for request/reply.
- **Routing by intent** — a sender can address a peer explicitly *or* let the
  kernel route to the agent that owns the work (Router).
- **Tiered escalation** — escalate up the org chart (see
  [org-chart.md](../org-chart.md)) without hard-coding who the lead is.
- **Kernel-brokered** — delivery, audit, and (later) policy all happen in one place.

## 2. Message envelope

```python
@dataclass
class Message:
    id: str
    conversation_id: str          # groups a request/reply thread
    from_agent: str               # MB-0NN
    to_agent: str                 # MB-0NN (resolved if addressed by intent)
    kind: str                     # "notify" | "request" | "reply" | "escalate"
    intent: str                   # short label, e.g. "review.security"
    body: dict                    # payload (JSON-serializable)
    reply_to: str | None          # message id this replies to (for "reply")
    ts: str                       # ISO-8601 UTC
```

`body` must be JSON-serializable. No secrets in messages — reference them by name.

## 3. Kinds & semantics

| kind | Meaning | reply_to |
|------|---------|----------|
| `notify` | Fire-and-forget information. | — |
| `request` | Asks a peer to do something; expects a `reply`. | — |
| `reply` | Response to a specific `request`. | the request's `id` |
| `escalate` | Raise an issue up the reporting chain. | — |

- A **conversation** (`conversation_id`) threads a request with its replies and
  any follow-ups. `reply` messages carry `reply_to` = the request `id` and share
  the request's `conversation_id`.
- **Routing:** if `to_agent` is omitted, the kernel resolves it from `intent` via
  the Router (same table Lucy uses). Explicit `to_agent` wins.

## 4. Delivery & audit

For every message the broker:
1. Resolves the recipient (explicit or routed).
2. Appends the message to shared memory under the conversation scope
   (`conv:<conversation_id>`) — the **audit trail** (append-only).
3. Publishes an event (`a2a.message`, plus a per-recipient topic
   `agent.<to_agent>`) on the event bus.
4. Delivers to the recipient's registered handler, if any (in-process v1).

Ordering within a conversation is the append order in shared memory.

## 5. Escalation

`escalate(from_agent, intent, body)` sends an `escalate` message to the sender's
**lead** (first hop of `org.escalation_chain`). Leads escalate to Lucy (MB-001);
Lucy escalates to the human. This encodes the org chart:

- Alex/Brianna/Bianca → **Julian (MB-002)** → Lucy → human
- Ryan/Christina/MiaKkcar → **JABBNETWORKS (MB-007)** → Lucy → human
- Julian / JABBNETWORKS / Kaira → **Lucy (MB-001)** → human

## 6. API (reference)

```python
class MessageBroker:
    def on(self, agent_id: str, handler: Callable[[Message], None]) -> None: ...
    def send(self, from_agent, intent, body=None, to_agent=None,
             kind="notify", conversation_id=None, reply_to=None) -> Message: ...
    def request(self, from_agent, intent, body=None, to_agent=None,
                conversation_id=None) -> Message: ...
    def reply(self, to_message: Message, from_agent, body=None) -> Message: ...
    def escalate(self, from_agent, intent, body=None) -> Message: ...
    def inbox(self, agent_id: str) -> list[Message]: ...
    def thread(self, conversation_id: str) -> list[Message]: ...
```

The kernel exposes these on the `Kernel` facade (`kernel.messaging`).

## 7. Security & policy

- Messages are data, not commands — a recipient decides what to act on and treats
  `body` as untrusted input.
- Mutating actions triggered by a message still pass the **PolicyEngine** and
  human-approval gates; a message can request, not authorize.
- Security review of new message intents/flows is owned by **Kaira (MB-009)**.
- No secrets in `body`; reference Key Vault names.

## 8. Roadmap

- **0.1 (this spec + reference):** typed envelope, notify/request/reply/escalate,
  intent routing, in-process delivery, shared-memory audit, org-based escalation.
- **0.2:** async delivery over the real event bus (Service Bus/Event Grid);
  policy checks on message intents; delivery/read receipts.
- **0.3:** cross-tenant/federated messaging; schema registry for `body` per intent.

## 9. Version History
- v0.1.0 — 2026-07-20 — initial A2A protocol spec + reference MessageBroker.
