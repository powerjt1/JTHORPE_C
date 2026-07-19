"""Kernel tests — stdlib unittest, no external deps.

Run from the kernel/ directory:  python3 -m unittest discover -s tests
"""
import unittest

from motherbridge import (
    Event, InMemoryStore, Kernel, MemoryRecord, PromptLibrary,
    PromptVersionManager, Router,
)


class TestPromptLibrary(unittest.TestCase):
    def setUp(self):
        self.lib = PromptLibrary()
        self.docs = self.lib.load()

    def test_loads_ten_agents(self):
        self.assertEqual(len(self.docs), 10)
        ids = [d.id for d in self.docs]
        self.assertEqual(ids, [f"MB-{n:03d}" for n in range(1, 11)])

    def test_parses_title_with_commas(self):
        christina = self.lib.get("MB-008")
        self.assertEqual(christina.name, "Christina")
        self.assertEqual(christina.title, "QA, Testing & DevOps Director")

    def test_lucy_identity_and_version(self):
        lucy = self.lib.get("MB-001")
        self.assertEqual(lucy.name, "Lucy")
        self.assertEqual(lucy.title, "Chief AI Orchestrator")
        self.assertEqual(lucy.version, "1.1.0")

    def test_specialists_are_v110(self):
        self.assertEqual(self.lib.get("MB-003").version, "1.1.0")
        self.assertEqual(self.lib.get("MB-009").version, "1.1.0")


class TestVersions(unittest.TestCase):
    def test_pin_and_resolve(self):
        lib = PromptLibrary(); lib.load()
        vm = PromptVersionManager(lib)
        self.assertEqual(vm.current_version("MB-002"), "1.1.0")
        vm.pin("MB-002", "1.0.0")
        self.assertEqual(vm.resolve("MB-002"), "1.0.0")
        vm.unpin("MB-002")
        self.assertEqual(vm.resolve("MB-002"), "1.1.0")


class TestRouter(unittest.TestCase):
    def setUp(self):
        self.r = Router()

    def test_routing(self):
        self.assertEqual(self.r.route("we need the solution architecture"), "MB-002")
        self.assertEqual(self.r.route("build an automation flow"), "MB-003")
        self.assertEqual(self.r.route("a new power apps canvas app"), "MB-004")
        self.assertEqual(self.r.route("a power bi dashboard"), "MB-005")
        self.assertEqual(self.r.route("fabric lakehouse pipeline"), "MB-006")
        self.assertEqual(self.r.route("provision the environment and deploy"), "MB-007")
        self.assertEqual(self.r.route("run the tests / ci/cd release"), "MB-008")
        self.assertEqual(self.r.route("security and compliance review"), "MB-009")
        self.assertEqual(self.r.route("product strategy and roadmap"), "MB-010")

    def test_default_is_orchestrator(self):
        self.assertEqual(self.r.route("hello lucy"), "MB-001")


class TestMemoryAndBus(unittest.TestCase):
    def test_memory(self):
        m = InMemoryStore()
        m.put("proj1", "k", {"a": 1})
        self.assertEqual(m.get("proj1", "k"), {"a": 1})
        m.append("proj1", MemoryRecord(scope="proj1", kind="note", data={"x": 1}))
        self.assertEqual(len(m.history("proj1")), 1)

    def test_bus(self):
        from motherbridge import EventBus
        bus = EventBus()
        seen = []
        bus.subscribe("task.created", lambda e: seen.append(e))
        bus.publish(Event(topic="task.created", payload={"id": "t1"}))
        self.assertEqual(len(seen), 1)
        self.assertEqual(seen[0].payload["id"], "t1")


class TestPolicy(unittest.TestCase):
    def test_read_allow_write_needs_approval(self):
        k = Kernel().boot()
        self.assertTrue(k.policy.check("MB-004", "read", "app").allowed)
        self.assertEqual(k.policy.check("MB-004", "publish", "app").kind, "needs_approval")


class TestKernel(unittest.TestCase):
    def test_boot_registers_agents(self):
        k = Kernel().boot()
        self.assertEqual(len(k.agents()), 10)
        self.assertEqual(k.resolve_version("MB-001"), "1.1.0")

    def test_dispatch_routes_records_and_emits(self):
        k = Kernel().boot()
        seen = []
        k.bus.subscribe("task.created", lambda e: seen.append(e))
        task = k.dispatch("proj1", "please design the architecture")
        self.assertEqual(task.agent_id, "MB-002")
        self.assertEqual(len(seen), 1)
        self.assertEqual(len(k.memory.history("proj1")), 1)


if __name__ == "__main__":
    unittest.main()
