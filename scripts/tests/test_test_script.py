#!/usr/bin/env python3
"""Offline tests: scripts/test.sh không được rỗng và phản ánh đúng 3 bước smoke test."""

from __future__ import annotations

import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TEST_SCRIPT = (REPO_ROOT / "scripts/test.sh").read_text(encoding="utf-8")
SETUP_DOC = (REPO_ROOT / "docs/setup.md").read_text(encoding="utf-8")


class TestScriptTests(unittest.TestCase):
    def test_01_script_not_empty(self) -> None:
        self.assertGreater(len(TEST_SCRIPT), 100)

    def test_02_fail_loud(self) -> None:
        self.assertIn("set -euo pipefail", TEST_SCRIPT)

    def test_03_three_steps_present(self) -> None:
        for token in ("notes_index.py --check", "uv run pytest -q", "pnpm test"):
            with self.subTest(token=token):
                self.assertIn(token, TEST_SCRIPT)

    def test_04_docs_match_script(self) -> None:
        self.assertIn("bash scripts/test.sh", SETUP_DOC)
        self.assertNotIn("70\\%", SETUP_DOC)

    def test_05_no_network_in_script(self) -> None:
        self.assertNotIn("curl ", TEST_SCRIPT)
        self.assertNotIn("docker compose", TEST_SCRIPT)


if __name__ == "__main__":
    unittest.main()
