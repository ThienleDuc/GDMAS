#!/usr/bin/env python3
"""Offline tests: docs/setup.md hướng dẫn đúng cấu hình Docker/FE thật."""

from __future__ import annotations

import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SETUP_DOC = (REPO_ROOT / "docs/setup.md").read_text(encoding="utf-8")
WEB_ENV_EXAMPLE = (REPO_ROOT / "apps/web/.env.example").read_text(encoding="utf-8")


class SetupDocsTests(unittest.TestCase):
    def test_01_fe_env_var_names_correct(self) -> None:
        for token in ("VITE_API_BASE_URL", "VITE_SSE_ENDPOINT"):
            with self.subTest(token=token):
                self.assertIn(token, SETUP_DOC)

    def test_02_legacy_fe_env_names_removed(self) -> None:
        for token in ("VITE_API_URL", "VITE_SSE_URL", "USGS_API_BASE_URL"):
            with self.subTest(token=token):
                self.assertNotIn(token, SETUP_DOC)

    def test_03_base_url_has_no_api_prefix(self) -> None:
        self.assertIn("VITE_API_BASE_URL=http://localhost:8000", SETUP_DOC)
        self.assertNotIn("VITE_API_BASE_URL=http://localhost:8000/api/v1", SETUP_DOC)

    def test_04_env_file_created_with_printf(self) -> None:
        self.assertIn("printf '%s\\n'", SETUP_DOC)
        self.assertNotIn('echo "VITE_API_BASE_URL=', SETUP_DOC)

    def test_05_mock_mode_removed(self) -> None:
        self.assertNotIn("VITE_API_MOCKING", SETUP_DOC)
        self.assertNotIn("VITE_API_MOCKING", WEB_ENV_EXAMPLE)

    def test_06_health_response_uses_envelope(self) -> None:
        self.assertIn('"success": true', SETUP_DOC)
        self.assertIn('"uptime_seconds"', SETUP_DOC)

    def test_07_real_table_names(self) -> None:
        for table in ("earthquake_events", "analysis_results", "service_runs"):
            with self.subTest(table=table):
                self.assertIn(table, SETUP_DOC)
        self.assertNotIn("`daily_aggregates`", SETUP_DOC)

    def test_08_no_false_coverage_claim(self) -> None:
        self.assertNotIn("70\\%", SETUP_DOC)
        self.assertIn("notes_index.py --check", SETUP_DOC)


if __name__ == "__main__":
    unittest.main()
