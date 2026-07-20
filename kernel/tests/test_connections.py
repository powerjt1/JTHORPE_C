"""External connection registry tests (incl. the Opus Pro MCP seed)."""
import unittest

from motherbridge import Connection, ConnectionRegistry, Kernel, default_connections


class TestConnectionRegistry(unittest.TestCase):
    def test_register_get_all_by_kind(self):
        r = ConnectionRegistry()
        r.register(Connection(id="c1", service="S", kind="rest", endpoint="https://x"))
        r.register(Connection(id="c2", service="M", kind="mcp", endpoint="https://y"))
        self.assertEqual(len(r), 2)
        self.assertEqual(r.get("c1").service, "S")
        self.assertEqual([c.id for c in r.by_kind("mcp")], ["c2"])

    def test_grant_is_idempotent(self):
        r = ConnectionRegistry()
        r.register(Connection(id="c1", service="S", kind="mcp", endpoint="https://x"))
        self.assertTrue(r.grant("c1", "MB-003"))
        self.assertFalse(r.grant("c1", "MB-003"))  # already granted
        self.assertIn("MB-003", r.get("c1").agents)


class TestOpusProSeed(unittest.TestCase):
    def test_seed_and_kernel_registration(self):
        k = Kernel().boot()
        conn = k.connections.get("opus-pro-agent-mcp")
        self.assertIsNotNone(conn)
        self.assertEqual(conn.kind, "mcp")
        self.assertEqual(conn.endpoint, "https://api.opus.pro/api/agent-mcp")
        self.assertEqual(conn.status, "pending")   # needs allowlist + credentials
        self.assertIn("MB-001", conn.agents)        # Lucy by default

    def test_no_secrets_in_seed(self):
        for c in default_connections():
            # auth is a reference (e.g. "keyvault:..."), never a raw secret
            self.assertFalse(c.auth.lower().startswith("bearer "))
            self.assertNotIn("token=", c.endpoint.lower())
            self.assertTrue(c.auth == "none" or ":" in c.auth)


if __name__ == "__main__":
    unittest.main()
