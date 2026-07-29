"""Agent-to-Agent (A2A) messaging — typed, kernel-brokered messages.

Every message flows through the broker: it is appended to shared memory under a
conversation scope (append-only audit trail), published on the event bus, and
delivered to the recipient's registered handler. Agents never message peers
out-of-band. See docs/motherbridge/specs/A2A-PROTOCOL-SPEC.md.
"""
from __future__ import annotations

import uuid
from dataclasses import asdict, dataclass, field
from typing import Callable

from .bus import EventBus
from .memory import SharedMemory
from .models import Event, MemoryRecord, now_iso
from .router import Router

# Message kinds.
KINDS = ("notify", "request", "reply", "escalate")

# Event bus topics (see bus.TOPICS for the coordination topics).
TOPIC_MESSAGE = "a2a.message"


def _conv_scope(conversation_id: str) -> str:
    return f"conv:{conversation_id}"


def _agent_topic(agent_id: str) -> str:
    return f"agent.{agent_id}"


@dataclass
class Message:
    id: str
    conversation_id: str          # groups a request/reply thread
    from_agent: str               # MB-0NN
    to_agent: str                 # MB-0NN (resolved if addressed by intent)
    kind: str                     # notify | request | reply | escalate
    intent: str                   # short label, e.g. "review.security"
    body: dict = field(default_factory=dict)
    reply_to: str | None = None   # message id this replies to (for "reply")
    ts: str = field(default_factory=now_iso)

    def as_dict(self) -> dict:
        return asdict(self)


class MessageBroker:
    """Broker that routes, audits, and delivers A2A messages through the kernel.

    Requires an EventBus (delivery), a SharedMemory (audit), and a Router
    (intent → agent resolution). Escalation uses an ``escalation_chain`` callable
    (the kernel wires in ``org.escalation_chain``) so the org chart is not
    hard-coded here.
    """

    def __init__(self, bus: EventBus, memory: SharedMemory, router: Router,
                 escalation_chain: Callable[[str], list[str]] | None = None) -> None:
        self._bus = bus
        self._memory = memory
        self._router = router
        self._escalation_chain = escalation_chain
        self._handlers: dict[str, list[Callable[[Message], None]]] = {}
        self._inboxes: dict[str, list[Message]] = {}

    # --- registration -----------------------------------------------------
    def on(self, agent_id: str, handler: Callable[[Message], None]) -> None:
        """Register a handler for messages delivered to ``agent_id``."""
        self._handlers.setdefault(agent_id, []).append(handler)

    # --- sending ----------------------------------------------------------
    def send(self, from_agent: str, intent: str, body: dict | None = None,
             to_agent: str | None = None, kind: str = "notify",
             conversation_id: str | None = None,
             reply_to: str | None = None) -> Message:
        """Create, audit, publish, and deliver a message.

        If ``to_agent`` is omitted the recipient is resolved from ``intent`` via
        the Router (the same table Lucy uses). Explicit ``to_agent`` wins.
        """
        if kind not in KINDS:
            raise ValueError(f"unknown message kind: {kind!r}")
        recipient = to_agent or self._router.route(intent)
        msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id or str(uuid.uuid4()),
            from_agent=from_agent,
            to_agent=recipient,
            kind=kind,
            intent=intent,
            body=dict(body or {}),
            reply_to=reply_to,
        )
        self._deliver(msg)
        return msg

    def request(self, from_agent: str, intent: str, body: dict | None = None,
                to_agent: str | None = None,
                conversation_id: str | None = None) -> Message:
        """Ask a peer to do something; expects a ``reply``."""
        return self.send(from_agent, intent, body=body, to_agent=to_agent,
                          kind="request", conversation_id=conversation_id)

    def reply(self, to_message: Message, from_agent: str,
              body: dict | None = None) -> Message:
        """Reply to a specific ``request`` — same conversation, correlated."""
        return self.send(from_agent, to_message.intent, body=body,
                         to_agent=to_message.from_agent, kind="reply",
                         conversation_id=to_message.conversation_id,
                         reply_to=to_message.id)

    def escalate(self, from_agent: str, intent: str,
                 body: dict | None = None) -> Message:
        """Raise an issue to the sender's lead (first hop up the org chart).

        Encodes the tiered escalation from org-chart.md without hard-coding who
        the lead is; leads escalate to Lucy (MB-001), who escalates to a human.
        """
        chain = self._escalation_chain(from_agent) if self._escalation_chain else []
        target = chain[0] if chain else "MB-001"
        return self.send(from_agent, intent, body=body, to_agent=target,
                         kind="escalate")

    # --- reading ----------------------------------------------------------
    def inbox(self, agent_id: str) -> list[Message]:
        """Messages delivered to ``agent_id`` (in delivery order)."""
        return list(self._inboxes.get(agent_id, []))

    def thread(self, conversation_id: str) -> list[Message]:
        """All messages in a conversation, in append (audit) order."""
        out: list[Message] = []
        for rec in self._memory.history(_conv_scope(conversation_id)):
            if rec.kind == TOPIC_MESSAGE:
                out.append(Message(**rec.data))
        return out

    # --- delivery ---------------------------------------------------------
    def _deliver(self, msg: Message) -> None:
        # 1. audit: append to the conversation scope (append-only trail).
        self._memory.append(
            _conv_scope(msg.conversation_id),
            MemoryRecord(scope=_conv_scope(msg.conversation_id),
                         kind=TOPIC_MESSAGE, data=msg.as_dict(), ts=msg.ts),
        )
        # 2. inbox.
        self._inboxes.setdefault(msg.to_agent, []).append(msg)
        # 3. publish on the event bus (general + per-recipient topic).
        payload = msg.as_dict()
        self._bus.publish(Event(topic=TOPIC_MESSAGE, payload=payload, ts=msg.ts))
        self._bus.publish(Event(topic=_agent_topic(msg.to_agent), payload=payload, ts=msg.ts))
        # 4. deliver to the recipient's registered handler(s), if any.
        for handler in self._handlers.get(msg.to_agent, []):
            handler(msg)
