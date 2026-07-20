"""Plugin SDK tests — manifest verification, registry, discovery, kernel wiring."""
import json
import tempfile
import unittest
from pathlib import Path

from motherbridge import (
    Kernel,
    PluginError,
    PluginManager,
    PluginManifest,
    verify_manifest,
)


def _valid(**over) -> PluginManifest:
    base = dict(id="plg-demo", name="Demo", version="1.0.0", kind="tool",
                capabilities=["demo.run"], agents=["MB-005"])
    base.update(over)
    return PluginManifest(**base)


class TestVerify(unittest.TestCase):
    def test_valid_manifest_has_no_issues(self):
        self.assertEqual(verify_manifest(_valid()), [])

    def test_bad_id_and_version_and_kind(self):
        issues = verify_manifest(_valid(id="demo", version="1.0", kind="magic"))
        self.assertTrue(any("id must match" in i for i in issues))
        self.assertTrue(any("SemVer" in i for i in issues))
        self.assertTrue(any("kind must be" in i for i in issues))

    def test_capabilities_required(self):
        self.assertTrue(any("capability" in i for i in verify_manifest(_valid(capabilities=[]))))

    def test_bad_agent_id(self):
        self.assertTrue(any("MB-0NN" in i for i in verify_manifest(_valid(agents=["bianca"]))))

    def test_no_secrets_allowed(self):
        issues = verify_manifest(_valid(entry="run --token=abc123"))
        self.assertTrue(any("no secrets" in i for i in issues))


class TestManager(unittest.TestCase):
    def test_register_and_lookup(self):
        m = PluginManager()
        m.register(_valid())
        self.assertEqual(len(m), 1)
        self.assertEqual(m.get("plg-demo").name, "Demo")
        self.assertEqual([p.id for p in m.by_kind("tool")], ["plg-demo"])
        self.assertEqual([p.id for p in m.by_agent("MB-005")], ["plg-demo"])

    def test_register_rejects_malformed(self):
        m = PluginManager()
        with self.assertRaises(PluginError):
            m.register(_valid(id="bad id", capabilities=[]))
        self.assertEqual(len(m), 0)

    def test_enable_disable_and_grant(self):
        m = PluginManager()
        m.register(_valid())
        self.assertTrue(m.enable("plg-demo"))
        self.assertEqual(m.get("plg-demo").status, "enabled")
        self.assertTrue(m.disable("plg-demo"))
        self.assertFalse(m.enable("nope"))
        self.assertTrue(m.grant("plg-demo", "MB-009"))
        self.assertFalse(m.grant("plg-demo", "MB-009"))  # idempotent
        self.assertIn("MB-009", m.get("plg-demo").agents)

    def test_from_dict_rejects_unknown_fields(self):
        with self.assertRaises(PluginError):
            PluginManifest.from_dict({"id": "plg-x", "name": "X", "version": "1.0.0",
                                      "kind": "tool", "capabilities": ["x"], "bogus": 1})


class TestDiscovery(unittest.TestCase):
    def test_discover_from_directory(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "a.plugin.json").write_text(json.dumps(
                {"id": "plg-a", "name": "A", "version": "1.0.0", "kind": "tool",
                 "capabilities": ["a.x"]}))
            m = PluginManager(plugins_dir=d)
            found = m.discover()
            self.assertEqual([p.id for p in found], ["plg-a"])

    def test_discover_missing_dir_is_empty(self):
        m = PluginManager(plugins_dir="/no/such/dir")
        self.assertEqual(m.discover(), [])

    def test_discover_bad_json_raises_with_filename(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "broken.plugin.json").write_text("{not json")
            m = PluginManager(plugins_dir=d)
            with self.assertRaises(PluginError) as ctx:
                m.discover()
            self.assertIn("broken.plugin.json", str(ctx.exception))


class TestKernelIntegration(unittest.TestCase):
    def test_kernel_discovers_shipped_sample_and_reports_health(self):
        k = Kernel().boot()
        self.assertIsInstance(k.plugins, PluginManager)
        self.assertEqual(k.health.status()["subsystems"].get("plugins"), "healthy")
        # the shipped sample manifest is discovered at boot
        self.assertIsNotNone(k.plugins.get("plg-hello-report"))
        self.assertIn("MB-005", k.plugins.get("plg-hello-report").agents)


if __name__ == "__main__":
    unittest.main()
