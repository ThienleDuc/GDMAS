#!/usr/bin/env python3
"""Offline tests: 2 workflow checkpoints + resume trigger are present in all agent definitions."""

from __future__ import annotations

import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

WORKFLOW_FILES = (
    ".agents/skills/build-implementation/SKILL.md",
    ".agents/skills/review-pr/SKILL.md",
    ".agents/skills/write-testcase/SKILL.md",
    "AGENTS.md",
    "CLAUDE.md",
    ".claude/notes/README.md",
    "docs/agent-workflow.md",
    "docs/git-workflow.md",
)

TRIGGER = "tiếp tục workflow"


def read(path: str) -> str:
    return (REPO_ROOT / path).read_text(encoding="utf-8")


class WorkflowCheckpointTests(unittest.TestCase):
    def test_tc01_checkpoint1_in_all_definitions(self) -> None:
        for path in WORKFLOW_FILES:
            with self.subTest(file=path):
                self.assertIn("CHECKPOINT 1", read(path))

    def test_tc02_checkpoint2_in_all_definitions(self) -> None:
        for path in WORKFLOW_FILES:
            with self.subTest(file=path):
                self.assertIn("CHECKPOINT 2", read(path))

    def test_tc03_resume_trigger_in_all_definitions(self) -> None:
        for path in WORKFLOW_FILES:
            with self.subTest(file=path):
                self.assertIn(TRIGGER, read(path))

    def test_tc04_build_implementation_no_longer_auto_transfers(self) -> None:
        text = read(".agents/skills/build-implementation/SKILL.md")
        self.assertNotIn("TỰ ĐỘNG chuyển giao", text)
        self.assertIn("CHECKPOINT 1", text)
        self.assertIn(TRIGGER, text)

    def test_tc05_review_pr_has_b1_b2_split(self) -> None:
        text = read(".agents/skills/review-pr/SKILL.md")
        self.assertIn("CHECKPOINT 2", text)
        self.assertIn("B1", text)
        self.assertIn("B2", text)
        self.assertIn("merge --dry-run", text)
        self.assertIn("Không", text)  # "Không gọi merge khi chưa có xác nhận"

    def test_tc06_docs_diagrams_have_checkpoint_nodes(self) -> None:
        for path in ("docs/agent-workflow.md", "docs/git-workflow.md"):
            with self.subTest(file=path):
                text = read(path)
                self.assertIn("CHECKPOINT 1", text)
                self.assertIn("CHECKPOINT 2", text)
                self.assertIn(TRIGGER, text)

    def test_tc07_safety_gates_preserved(self) -> None:
        agents = read("AGENTS.md")
        self.assertIn("0 conflicts", agents)
        self.assertIn("CHECKPOINT 1", agents)
        self.assertIn("CHECKPOINT 2", agents)
        self.assertIn(TRIGGER, agents)
        proposal = read(".agents/notes/proposed/2026-11-18-workflow-checkpoints-thien.md")
        self.assertIn("Decision: Approved", proposal)
        self.assertIn("Reviewer: thien", proposal)


if __name__ == "__main__":
    unittest.main()
