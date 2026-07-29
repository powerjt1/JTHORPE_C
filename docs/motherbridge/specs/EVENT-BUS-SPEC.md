# MotherBridge Event Bus Specification

**Document:** MB-EVENTBUS-SPEC · **Version:** 0.1.0 · **Status:** Implemented (V2)
**Company:** JABBNETWORKS LLC · **Product:** JABBNETWORKS AIOS Enterprise
**Implementation language:** Python 3.11+

> The Event Bus is the kernel's nervous system: a decoupled **publish/subscribe**
> channel over which subsystems and agents coordinate without knowing about each
> other. Task routing, A2A messaging, health, and telemetry all ride on it. This
> spec refines §6.4 of the [Kernel Specification](./KERNEL-SPEC.md); the reference
> implementation lives in [`kernel/motherbridge/bus.py`](../../../kernel/motherbridge/bus.py).

## 1. Goals

- **Decoupled** — a publisher names a *topic*, not a recipient; subscribers opt in
  by topic. Producers and consumers never hold references to each other.
- **Observable** — every published event is retained for inspection, so a run can
  be replayed and telemetry/health can be derived after the fact.
- **Uniform envelope** — one `Event` shape for all topics, JSON-serializable.
- **Swappable** — the in-process bus today shares one interface with a future
  distributed broker (Azure Service Bus / Event Grid), so callers don't change.

## 2. Event envelope

```python
@dataclass
class Event:
    topic: str            # well-known topic name (see §4)
    payload: dict         # JSON-serializable body
    ts: str               # ISO-8601 UTC (auto-stamped)
```

`payload` must be JSON-serializable. **No secrets in payloads** — reference Key
Vault entries by name, never inline a credential.

## 3. Interface

```python
class EventBus:
    def subscribe(self, topic: str, handler: Callable[[Event], None]) -> None: ...
    def publish(self, event: Event) -> None: ...
    published: list[Event]     # append-only record of everything published
```

- **`subscribe(topic, handler)`** — register `handler` for a topic. Multiple
  handlers per topic are allowed and invoked in registration order.
- **`publish(event)`** — append the event to `published`, then synchronously
  invoke every handler subscribed to `event.topic`. Delivery is **in-process and
  synchronous** in v0.1: `publish` returns only after all handlers have run.
- **`published`** — the retained log of all events, in publish order; used for
  inspection, telemetry, and test assertions.

### Delivery semantics (v0.1)

- **At-most-once, in-order, per topic** — handlers fire in the order events were
  published and in the order handlers subscribed.
- **Fan-out** — one event reaches every handler on its topic.
- **No topic filter on `published`** — the full ordered stream is retained; filter
  by `event.topic` when reading.
- **Errors** — a handler that raises propagates to the publisher in v0.1 (no
  isolation). Handlers should be defensive; isolation/retry is a 0.2 concern.

## 4. Topics

Topics are **well-known strings**. Coordination topics are enumerated in
[`bus.TOPICS`](../../../kernel/motherbridge/bus.py); the A2A layer adds its own.

| Topic | Published by | Meaning |
|-------|--------------|---------|
| `task.created` | `Kernel.dispatch` | An intent was routed to an agent; a task exists. |
| `task.updated` | agent runtime | A task changed state/progress. |
| `task.completed` | agent runtime | A task finished (result in payload). |
| `approval.required` | PolicyEngine flow | A mutating action needs human approval. |
| `policy.denied` | PolicyEngine flow | An action was denied by policy. |
| `health.degraded` | HealthMonitor flow | A subsystem/connection went unhealthy. |
| `a2a.message` | MessageBroker | Any agent-to-agent message (see [A2A spec](./A2A-PROTOCOL-SPEC.md)). |
| `agent.<MB-0NN>` | MessageBroker | Per-recipient copy of an A2A message. |

**Naming convention:** dotted, lowercase, `noun.verb` for lifecycle
(`task.created`) or `namespace.<id>` for addressed streams (`agent.MB-009`). New
topics are additive; existing topic names and payload shapes are a compatibility
surface — bump this spec's version to change them.

## 5. How subsystems use it

- **Task routing** — `Kernel.dispatch` routes an intent, records it in shared
  memory, and publishes `task.created`; agent runtimes publish `task.updated` /
  `task.completed` back.
- **A2A messaging** — the [MessageBroker](./A2A-PROTOCOL-SPEC.md) publishes
  `a2a.message` plus a per-recipient `agent.<MB-0NN>` for every message, so an
  agent can subscribe to just its own stream.
- **Health & telemetry** — degradations surface as `health.degraded`; the retained
  `published` log is a ready source for telemetry rollups.
- **Policy** — approval/denial flows announce on `approval.required` /
  `policy.denied` so the Command Center and Lucy can surface them.

The bus does **coordination only** — it moves events, it does not execute agent
work or enforce policy. Actions triggered by an event still pass the
[Policy Engine](./KERNEL-SPEC.md) and human-approval gates.

## 6. Security & governance

- **No secrets in events** — payloads reference credentials by name; the retained
  `published` log would otherwise leak them.
- **Payloads are untrusted input** — a subscriber treats an event body as data,
  not a command, and validates before acting.
- **Least privilege (0.2)** — topic-level authorization so an agent only receives
  the streams it is entitled to; today the in-process bus is trusted.
- Security review of new topics or cross-tenant event flows is owned by
  **Kaira (MB-009)**.

## 7. Roadmap

- **0.1 (this spec + reference):** in-process synchronous pub/sub, one `Event`
  envelope, well-known topics, retained `published` log, per-recipient A2A topics.
- **0.2:** handler isolation + retry/dead-letter; topic-level authorization;
  bounded/paged `published` history with retention; async delivery.
- **0.3:** distributed broker (Azure Service Bus / Event Grid) behind the same
  interface; durable subscriptions and delivery receipts; a schema registry for
  payloads per topic; a live event view in the AIOS Command Center.

## 8. Version History
- v0.1.0 — 2026-07-20 — initial Event Bus spec documenting the reference
  in-process pub/sub, the `Event` envelope, and the v1 topic set (incl. A2A).
