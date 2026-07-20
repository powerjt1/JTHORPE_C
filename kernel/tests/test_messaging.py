"""Agent-to-Agent (A2A) messaging tests — see specs/A2A-PROTOCOL-SPEC.md."""
import unittest

from motherbridge import (
    EventBus,
    InMemoryStore,
    Kernel,
    Message,
    MessageBroker,
    Router,
)
from motherbridge.messaging import TOPIC_MESSAGE, _agent_topic
from motherbridge import org


def _broker() -> MessageBroker:
    return MessageBroker(EventBus(), InMemoryStore(), Router(),
                         escalation_chain=org.escalation_chain)


class TestSendAndRoute(unittest.TestCase):
    def test_explicit_recipient_wins(self):
        b = _broker()
        msg = b.send("MB-001", "anything", to_agent="MB-004")
        self.assertEqual(msg.to_agent, "MB-004")
        self.assertEqual(msg.kind, "notify")
        self.assertIn(msg, b.inbox("MB-004"))

    def test_intent_routes_when_no_recipient(self):
        b = _broker()
        # "security review" routes to Kaira (MB-009) via the Router.
        msg = b.send("MB-001", "please run a security review")
        self.assertEqual(msg.to_agent, "MB-009")

    def test_unknown_kind_rejected(self):
        b = _broker()
        with self.assertRaises(ValueError):
            b.send("MB-001", "x", to_agent="MB-002", kind="shout")


class TestRequestReply(unittest.TestCase):
    def test_reply_correlates_conversation_and_reply_to(self):
        b = _broker()
        req = b.request("MB-002", "review.security", to_agent="MB-009",
                        body={"pr": 42})
        self.assertEqual(req.kind, "request")
        rep = b.reply(req, "MB-009", body={"verdict": "approved"})
        self.assertEqual(rep.kind, "reply")
        self.assertEqual(rep.reply_to, req.id)
        self.assertEqual(rep.conversation_id, req.conversation_id)
        self.assertEqual(rep.to_agent, "MB-002")  # back to the requester

    def test_thread_returns_conversation_in_order(self):
        b = _broker()
        req = b.request("MB-002", "review.security", to_agent="MB-009")
        b.reply(req, "MB-009", body={"ok": True})
        thread = b.thread(req.conversation_id)
        self.assertEqual([m.kind for m in thread], ["request", "reply"])
        self.assertTrue(all(isinstance(m, Message) for m in thread))


class TestEscalation(unittest.TestCase):
    def test_alex_escalates_to_julian(self):
        b = _broker()
        msg = b.escalate("MB-003", "blocked.integration")  # Alex
        self.assertEqual(msg.kind, "escalate")
        self.assertEqual(msg.to_agent, "MB-002")  # Julian

    def test_ryan_escalates_to_jabbnetworks(self):
        b = _broker()
        msg = b.escalate("MB-006", "pipeline.down")  # Ryan
        self.assertEqual(msg.to_agent, "MB-007")  # JABBNETWORKS

    def test_lead_escalates_to_lucy(self):
        b = _broker()
        msg = b.escalate("MB-002", "need.decision")  # Julian (a lead)
        self.assertEqual(msg.to_agent, "MB-001")  # Lucy

    def test_lucy_escalates_to_lucy_fallback(self):
        # Lucy has no lead; escalate falls back to MB-001 (human is out-of-band).
        b = _broker()
        msg = b.escalate("MB-001", "top.level")
        self.assertEqual(msg.to_agent, "MB-001")


class TestDeliveryAndAudit(unittest.TestCase):
    def test_handler_receives_message(self):
        b = _broker()
        received = []
        b.on("MB-009", received.append)
        b.send("MB-001", "x", to_agent="MB-009")
        self.assertEqual(len(received), 1)
        self.assertEqual(received[0].to_agent, "MB-009")

    def test_bus_publishes_general_and_per_recipient_topics(self):
        bus = EventBus()
        b = MessageBroker(bus, InMemoryStore(), Router(),
                          escalation_chain=org.escalation_chain)
        seen = []
        bus.subscribe(_agent_topic("MB-009"), seen.append)
        b.send("MB-001", "x", to_agent="MB-009")
        self.assertEqual(len(seen), 1)
        topics = [e.topic for e in bus.published]
        self.assertIn(TOPIC_MESSAGE, topics)
        self.assertIn(_agent_topic("MB-009"), topics)

    def test_audit_trail_is_append_only_in_memory(self):
        b = _broker()
        m1 = b.send("MB-001", "a", to_agent="MB-002", conversation_id="C1")
        b.send("MB-002", "b", to_agent="MB-001", conversation_id="C1")
        thread = b.thread("C1")
        self.assertEqual(len(thread), 2)
        self.assertEqual(thread[0].id, m1.id)


class TestKernelIntegration(unittest.TestCase):
    def test_kernel_exposes_messaging(self):
        k = Kernel().boot()
        self.assertIsInstance(k.messaging, MessageBroker)
        self.assertEqual(k.health.status()["subsystems"].get("messaging"), "healthy")

    def test_kernel_convenience_methods(self):
        k = Kernel().boot()
        msg = k.send_message("MB-001", "x", to_agent="MB-005")
        self.assertEqual(msg.to_agent, "MB-005")
        esc = k.escalate("MB-008", "qa.blocked")  # Christina -> JABBNETWORKS
        self.assertEqual(esc.to_agent, "MB-007")

    def test_message_shares_kernel_memory_audit(self):
        mem = InMemoryStore()
        k = Kernel(memory=mem).boot()
        msg = k.send_message("MB-001", "hello", to_agent="MB-002",
                             conversation_id="CONV")
        # audit landed in the shared kernel memory under the conv scope.
        hist = mem.history("conv:CONV")
        self.assertEqual(len(hist), 1)
        self.assertEqual(hist[0].data["id"], msg.id)


if __name__ == "__main__":
    unittest.main()
