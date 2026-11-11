#!/usr/bin/env python3
"""Unit tests for scripts/notes_index.py (offline, temp directory only)."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import notes_index  # noqa: E402


PROPOSAL_TEMPLATE = """# Proposal: {title}

## Metadata
- ID: {pid}
- Author: agent | {author}
- Created: 2026-11-11
- Type: feature
- Status: {status}
- Priority: medium
- Area: {area}
- Architecture Impact: none
- Related Docs:
  - docs/README.md
- Related Proposals:
{related_proposals}
- Related Bugs: none

## 9. Human Review
Decision: {decision}
Reviewer: {reviewer}
Review Date: {review_date}
Comments: {comments}
Scope of Rejection: {scope_of_rejection}
"""


class NotesIndexTests(unittest.TestCase):
    def _setup_notes_tree(self, tmp: Path) -> Path:
        for sub in ("proposed", "implemented", "testcase", "bugs"):
            (tmp / ".agents" / "notes" / sub).mkdir(parents=True, exist_ok=True)
        (tmp / ".agents" / "notes" / "proposed" / "_TEMPLATE.md").write_text("template", encoding="utf-8")
        (tmp / ".agents" / "notes" / "testcase" / "_TEMPLATE.md").write_text("template", encoding="utf-8")
        (tmp / ".agents" / "notes" / "bugs" / "README.md").write_text("readme", encoding="utf-8")
        return tmp

    def test_empty_notes_check_passes(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = self._setup_notes_tree(Path(td))
            errors, warnings = notes_index.check_notes(root)
            self.assertEqual(errors, [])
            self.assertEqual(warnings, [])
            self.assertIn("Chưa có proposal nào", notes_index.format_proposals_table([]))
            self.assertIn("Chưa có testcase nào", notes_index.format_testcases_table([]))
            self.assertIn("Chưa có bug nào", notes_index.format_bugs_table([]))

    def test_valid_approved_proposal_and_implementation(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = self._setup_notes_tree(Path(td))
            pid = "2026-11-11-trend-calc-son"
            (root / ".agents" / "notes" / "proposed" / f"{pid}.md").write_text(
                PROPOSAL_TEMPLATE.format(
                    title="Trend Analysis Runner",
                    pid=pid,
                    author="son",
                    status="approved",
                    area="apps/api/src/gdmas/services/analysis/",
                    related_proposals="  - none",
                    decision="Approved",
                    reviewer="son",
                    review_date="2026-11-11",
                    comments="Tự duyệt theo quy trình",
                    scope_of_rejection="-",
                ),
                encoding="utf-8",
            )
            impl = root / ".agents" / "notes" / "implemented" / pid
            impl.mkdir()
            (impl / "plan.md").write_text("# Implementation Plan: Trend\n", encoding="utf-8")
            (impl / "status.md").write_text(
                f"# Implementation Status: Trend\n\n## Metadata\n- ID: {pid}\n- Status: validation\n",
                encoding="utf-8",
            )
            (root / ".agents" / "notes" / "testcase" / f"{pid}.md").write_text(
                f"# Testcase: Trend Analysis Runner\n\n"
                f"## Metadata\n"
                f"- ID: {pid}\n"
                f"- Mode: proposal-paired\n"
                f"- Proposal: .agents/notes/proposed/{pid}.md\n"
                f"- Target: apps/api/src/gdmas/services/analysis/runner.py\n"
                f"- Test File: apps/api/tests/unit/test_trend.py\n"
                f"- Status: passed\n"
                f"- Related Bugs: none\n",
                encoding="utf-8",
            )

            errors, warnings = notes_index.check_notes(root)
            self.assertEqual(errors, [])
            self.assertEqual(warnings, [])

            proposals, _, _ = notes_index.load_notes(root)
            table = notes_index.format_proposals_table(proposals)
            self.assertIn(pid, table)
            self.assertIn("Approved", table)
            self.assertIn("validation", table)
            self.assertIn("passed", table)

            tc_table = notes_index.format_testcases_table(notes_index.load_testcases(root))
            self.assertIn(pid, tc_table)
            self.assertIn("proposal-paired", tc_table)

    def test_overrides_marks_superseded(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = self._setup_notes_tree(Path(td))
            old_id = "2026-11-10-old-plan-son"
            new_id = "2026-11-11-new-plan-son"
            (root / ".agents" / "notes" / "proposed" / f"{old_id}.md").write_text(
                PROPOSAL_TEMPLATE.format(
                    title="Old Plan",
                    pid=old_id,
                    author="son",
                    status="rejected",
                    area="apps/api/",
                    related_proposals="  - none",
                    decision="Rejected",
                    reviewer="son",
                    review_date="2026-11-10",
                    comments="",
                    scope_of_rejection="Rejected for: synchronous polling, not a ban on async httpx",
                ),
                encoding="utf-8",
            )
            (root / ".agents" / "notes" / "proposed" / f"{new_id}.md").write_text(
                PROPOSAL_TEMPLATE.format(
                    title="New Plan",
                    pid=new_id,
                    author="son",
                    status="proposed",
                    area="apps/api/",
                    related_proposals=f"  - Overrides: {old_id}",
                    decision="Pending",
                    reviewer="-",
                    review_date="-",
                    comments="",
                    scope_of_rejection="-",
                ),
                encoding="utf-8",
            )
            errors, _ = notes_index.check_notes(root)
            self.assertEqual(errors, [])
            proposals, _, _ = notes_index.load_notes(root)
            table = notes_index.format_proposals_table(proposals)
            self.assertIn(f"superseded by {new_id}", table)

    def test_rejects_mismatched_id_status_and_unapproved_impl(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = self._setup_notes_tree(Path(td))
            pid = "2026-11-11-bad-proposal-van"
            (root / ".agents" / "notes" / "proposed" / f"{pid}.md").write_text(
                PROPOSAL_TEMPLATE.format(
                    title="Bad",
                    pid="wrong-id",
                    author="van",
                    status="approved",
                    area="apps/api/",
                    related_proposals="  - Overrides: missing-id",
                    decision="Pending",
                    reviewer="-",
                    review_date="-",
                    comments="",
                    scope_of_rejection="-",
                ),
                encoding="utf-8",
            )
            impl = root / ".agents" / "notes" / "implemented" / pid
            impl.mkdir()
            (impl / "status.md").write_text("- ID: wrong\n- Status: bad_state\n", encoding="utf-8")

            errors, _ = notes_index.check_notes(root)
            joined = "\n".join(errors)
            self.assertIn("không khớp tên file", joined)
            self.assertIn("lệch với §9", joined)
            self.assertIn("không tồn tại", joined)
            self.assertIn("chưa `Approved`", joined)
            self.assertIn("thiếu `plan.md`", joined)
            self.assertIn("không hợp lệ", joined)

    def test_bug_table_and_validation(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = self._setup_notes_tree(Path(td))
            (root / ".agents" / "notes" / "bugs" / "BUG-tai-001-nan-prediction.md").write_text(
                "# BUG-tai-001: Forecast returns NaN on sparse week\n\n"
                "- **Status:** open\n"
                "- **Severity:** high\n"
                "- **Area:** apps/api/src/gdmas/services/prediction/\n"
                "- **Reported:** 2026-11-11 — tai\n"
                "- **Fixed:** -\n",
                encoding="utf-8",
            )
            errors, _ = notes_index.check_notes(root)
            self.assertEqual(errors, [])
            _, _, bugs = notes_index.load_notes(root)
            table = notes_index.format_bugs_table(bugs)
            self.assertIn("BUG-tai-001", table)
            self.assertIn("high", table)

    def test_single_file_testcase_and_validation_checks(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = self._setup_notes_tree(Path(td))
            (root / ".agents" / "notes" / "bugs" / "BUG-tai-001-nan-prediction.md").write_text(
                "# BUG-tai-001: Forecast returns NaN on sparse week\n\n"
                "- **Status:** open\n"
                "- **Severity:** high\n"
                "- **Area:** apps/api/src/gdmas/services/prediction/\n"
                "- **Reported:** 2026-11-11 — tai\n"
                "- **Fixed:** -\n",
                encoding="utf-8",
            )
            tc_ok = "2026-11-11-test-runner-son"
            (root / ".agents" / "notes" / "testcase" / f"{tc_ok}.md").write_text(
                f"# Testcase: Prediction Runner\n\n"
                f"- ID: {tc_ok}\n"
                f"- Mode: single-file-test\n"
                f"- Proposal: none\n"
                f"- Target: apps/api/src/gdmas/services/prediction/runner.py\n"
                f"- Test File: apps/api/tests/unit/test_prediction_runner.py\n"
                f"- Status: failed_with_bugs\n"
                f"- Related Bugs: BUG-tai-001\n",
                encoding="utf-8",
            )
            errors, warnings = notes_index.check_notes(root)
            self.assertEqual(errors, [])
            self.assertEqual(warnings, [])

            tc_bad = "2026-11-11-bad-tc-van"
            (root / ".agents" / "notes" / "testcase" / f"{tc_bad}.md").write_text(
                "# Testcase: Bad\n\n"
                "- ID: wrong-id\n"
                "- Mode: unknown-mode\n"
                "- Status: broken\n"
                "- Related Bugs: BUG-van-999\n",
                encoding="utf-8",
            )
            errors2, _ = notes_index.check_notes(root)
            joined = "\n".join(errors2)
            self.assertIn("không khớp tên file", joined)
            self.assertIn("Mode: unknown-mode", joined)
            self.assertIn("Status: broken", joined)
            self.assertIn("thiếu Metadata `- Target:`", joined)
            self.assertIn("thiếu Metadata `- Test File:`", joined)
            self.assertIn("BUG-van-999", joined)

    def test_warns_when_approved_proposal_lacks_testcase(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = self._setup_notes_tree(Path(td))
            pid = "2026-11-11-no-tc-son"
            (root / ".agents" / "notes" / "proposed" / f"{pid}.md").write_text(
                PROPOSAL_TEMPLATE.format(
                    title="Missing TC",
                    pid=pid,
                    author="son",
                    status="approved",
                    area="apps/api/",
                    related_proposals="  - none",
                    decision="Approved",
                    reviewer="son",
                    review_date="2026-11-11",
                    comments="ok",
                    scope_of_rejection="-",
                ),
                encoding="utf-8",
            )
            impl = root / ".agents" / "notes" / "implemented" / pid
            impl.mkdir()
            (impl / "plan.md").write_text("# Plan\n", encoding="utf-8")
            (impl / "status.md").write_text(
                f"# Status\n\n- ID: {pid}\n- Status: planned\n",
                encoding="utf-8",
            )
            errors, warnings = notes_index.check_notes(root)
            self.assertEqual(errors, [])
            self.assertTrue(any("testcase/" in w for w in warnings), warnings)


if __name__ == "__main__":
    unittest.main()
