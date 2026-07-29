"""Shared Memory Engine tests — InMemoryStore + persistent SqliteStore."""
import os
import tempfile
import unittest

from motherbridge import InMemoryStore, Kernel, SqliteStore
from motherbridge.models import MemoryRecord


class _SharedMemoryContract:
    """Reusable contract tests; subclasses provide self.store."""

    def test_put_get_and_missing(self):
        self.store.put("proj:1", "plan", {"steps": 3})
        self.assertEqual(self.store.get("proj:1", "plan"), {"steps": 3})
        self.assertIsNone(self.store.get("proj:1", "nope"))

    def test_keys_and_delete(self):
        self.store.put("proj:1", "a", 1)
        self.store.put("proj:1", "b", 2)
        self.assertEqual(sorted(self.store.keys("proj:1")), ["a", "b"])
        self.assertTrue(self.store.delete("proj:1", "a"))
        self.assertFalse(self.store.delete("proj:1", "a"))
        self.assertEqual(self.store.keys("proj:1"), ["b"])

    def test_append_only_log_is_chronological(self):
        for i in range(3):
            self.store.append("proj:1", MemoryRecord(scope="proj:1", kind="step", data={"i": i}))
        hist = self.store.history("proj:1")
        self.assertEqual([r.data["i"] for r in hist], [0, 1, 2])

    def test_scope_isolation(self):
        self.store.put("a", "k", "va")
        self.store.put("b", "k", "vb")
        self.assertEqual(self.store.get("a", "k"), "va")
        self.assertEqual(self.store.get("b", "k"), "vb")
        self.store.append("a", MemoryRecord(scope="a", kind="x", data={}))
        self.assertEqual(len(self.store.history("a")), 1)
        self.assertEqual(len(self.store.history("b")), 0)


class TestInMemory(_SharedMemoryContract, unittest.TestCase):
    def setUp(self):
        self.store = InMemoryStore()


class TestSqlite(_SharedMemoryContract, unittest.TestCase):
    def setUp(self):
        self._dir = tempfile.TemporaryDirectory()
        self.store = SqliteStore(os.path.join(self._dir.name, "mem.db"))

    def tearDown(self):
        self.store.close()
        self._dir.cleanup()

    def test_persists_across_instances(self):
        path = os.path.join(self._dir.name, "persist.db")
        s1 = SqliteStore(path)
        s1.put("proj:9", "k", {"v": 42})
        s1.append("proj:9", MemoryRecord(scope="proj:9", kind="done", data={"ok": True}))
        s1.close()
        s2 = SqliteStore(path)
        self.assertEqual(s2.get("proj:9", "k"), {"v": 42})
        self.assertEqual(len(s2.history("proj:9")), 1)
        s2.close()


class TestKernelWithSqlite(unittest.TestCase):
    def test_dispatch_records_to_persistent_memory(self):
        with tempfile.TemporaryDirectory() as d:
            store = SqliteStore(os.path.join(d, "k.db"))
            k = Kernel(memory=store).boot()
            k.dispatch("proj:cc", "design the architecture")
            hist = store.history("proj:cc")
            self.assertEqual(len(hist), 1)
            self.assertEqual(hist[0].kind, "task.created")
            self.assertEqual(hist[0].data["agent_id"], "MB-002")
            store.close()


if __name__ == "__main__":
    unittest.main()
