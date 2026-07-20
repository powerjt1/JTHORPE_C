"""Tests for adding agents: scaffolding + validation + round-trip discovery."""
import tempfile
import unittest
from pathlib import Path

from motherbridge import (
    PromptLibrary, create_agent, next_number, render_agent,
    validate_text, validate_library,
)
from motherbridge.validation import validate_file


class TestValidation(unittest.TestCase):
    def test_real_library_is_valid(self):
        prompts = Path(__file__).resolve().parents[2] / "docs" / "motherbridge" / "prompts"
        results = validate_library(prompts)
        self.assertEqual(len(results), 10)
        for name, issues in results.items():
            self.assertEqual(issues, [], f"{name} has issues: {issues}")

    def test_catches_missing_sections(self):
        bad = "# MB-099 — Bad, Agent\n\n## 1. Agent Identity\nonly one section, no version"
        issues = validate_text(bad)
        self.assertTrue(any("missing section" in i for i in issues))
        self.assertTrue(any("version" in i for i in issues))

    def test_catches_bad_h1(self):
        issues = validate_text("# Not a valid heading\n")
        self.assertTrue(any("H1" in i for i in issues))


class TestScaffold(unittest.TestCase):
    def test_next_number_and_slug(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(next_number(d), 1)
            create_agent("Alpha", "First Architect", prompts_dir=d)
            create_agent("Beta", "Second Architect", prompts_dir=d)
            self.assertEqual(next_number(d), 3)

    def test_created_agent_is_valid_and_discovered(self):
        with tempfile.TemporaryDirectory() as d:
            path = create_agent("Zoe", "Localization Architect", prompts_dir=d)
            self.assertTrue(path.name.startswith("MB-001-zoe"))
            # scaffolded file passes validation (all 16 sections + version)
            self.assertEqual(validate_file(path), [])
            # the kernel's loader discovers it
            docs = PromptLibrary(d).load()
            self.assertEqual(len(docs), 1)
            self.assertEqual(docs[0].id, "MB-001")
            self.assertEqual(docs[0].name, "Zoe")
            self.assertEqual(docs[0].title, "Localization Architect")
            self.assertEqual(docs[0].version, "1.0.0")

    def test_explicit_number_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as d:
            create_agent("Nova", "Ops", prompts_dir=d, number=11)
            self.assertEqual(next_number(d), 12)
            with self.assertRaises(FileExistsError):
                create_agent("Nova", "Ops", prompts_dir=d, number=11)

    def test_render_has_all_sections(self):
        self.assertEqual(validate_text(render_agent(11, "Nova", "Ops")), [])

    def test_title_with_comma_parses(self):
        # The H1 parser must split name from a comma-containing title correctly.
        with tempfile.TemporaryDirectory() as d:
            create_agent("Quinn", "QA, Testing & Release Lead", prompts_dir=d)
            doc = PromptLibrary(d).load()[0]
            self.assertEqual(doc.name, "Quinn")
            self.assertEqual(doc.title, "QA, Testing & Release Lead")


if __name__ == "__main__":
    unittest.main()
