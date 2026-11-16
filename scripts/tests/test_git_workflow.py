#!/usr/bin/env python3
"""Offline integration tests for scripts/git-ship.sh and .githooks/* using temp repos."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


class GitWorkflowTests(unittest.TestCase):
    def _run(
        self,
        cmd: list[str],
        cwd: Path,
        *,
        check: bool = True,
        env_extra: dict[str, str] | None = None,
    ) -> subprocess.CompletedProcess[str]:
        env = os.environ.copy()
        if env_extra:
            env.update(env_extra)
        return subprocess.run(
            cmd,
            cwd=cwd,
            env=env,
            text=True,
            capture_output=True,
            check=check,
        )

    def _init_temp_repo(self, tmp: Path) -> Path:
        remote = tmp / "remote.git"
        work = tmp / "repo"
        self._run(["git", "init", "--bare", str(remote)], cwd=tmp)
        self._run(["git", "clone", str(remote), str(work)], cwd=tmp)
        self._run(["git", "config", "user.name", "Son Le"], cwd=work)
        self._run(["git", "config", "user.email", "son@example.com"], cwd=work)
        self._run(["git", "checkout", "-b", "develop"], cwd=work)

        for rel in (
            ".agents/notes/proposed",
            ".agents/notes/implemented",
            ".agents/notes/testcase",
            ".agents/notes/bugs",
            ".githooks",
            "scripts",
        ):
            (work / rel).mkdir(parents=True, exist_ok=True)

        for file_rel in (
            ".agents/team.md",
            ".gitignore",
            "scripts/git-ship.sh",
            "scripts/git-setup.sh",
            "scripts/notes_index.py",
            ".githooks/pre-commit",
            ".githooks/commit-msg",
            ".githooks/pre-push",
        ):
            dst = work / file_rel
            shutil.copy2(REPO_ROOT / file_rel, dst)
            if dst.suffix == ".sh" or dst.parent.name == ".githooks":
                dst.chmod(0o755)

        self._run(["git", "add", "."], cwd=work)
        self._run(["git", "commit", "-m", "chore(agents): khởi tạo hạ tầng workflow"], cwd=work)
        self._run(["git", "push", "-u", "origin", "develop"], cwd=work)
        self._run(["bash", "scripts/git-setup.sh"], cwd=work)
        return work

    def test_hooks_block_develop_secrets_conflicts_and_bad_commit(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            work = self._init_temp_repo(Path(td))

            me_res = self._run(["./scripts/git-ship.sh", "me", "son"], cwd=work)
            self.assertIn("son", me_res.stdout)

            # Commit directly on develop must fail
            (work / "sample.py").write_text("x = 1\n", encoding="utf-8")
            self._run(["git", "add", "sample.py"], cwd=work)
            bad_branch_commit = self._run(
                ["git", "commit", "-m", "feat(api): test tren develop"],
                cwd=work,
                check=False,
            )
            self.assertNotEqual(bad_branch_commit.returncode, 0)
            self.assertIn("develop", bad_branch_commit.stderr)

            # Start feature branch carries uncommitted staged/unstaged changes
            self._run(["./scripts/git-ship.sh", "start", "feat/2026-11-11-demo-son"], cwd=work)
            cur = self._run(["git", "branch", "--show-current"], cwd=work).stdout.strip()
            self.assertEqual(cur, "feat/2026-11-11-demo-son")

            # Bad commit message rejected
            bad_msg = self._run(["git", "commit", "-m", "wip"], cwd=work, check=False)
            self.assertNotEqual(bad_msg.returncode, 0)

            # Fake secret in staged diff rejected (built dynamically so this test file does not trip the scanner)
            fake_prefix = "sk" + "-"
            (work / "leak.py").write_text(f"KEY='{fake_prefix}1234567890abcdefghijklmnop'\n", encoding="utf-8")
            self._run(["git", "add", "leak.py"], cwd=work)
            leak_commit = self._run(["git", "commit", "-m", "feat(api): thêm khóa"], cwd=work, check=False)
            self.assertNotEqual(leak_commit.returncode, 0)
            self._run(["git", "restore", "--staged", "leak.py"], cwd=work)
            (work / "leak.py").unlink()

            # Markdown trailing two-space allowed; conflict markers blocked
            (work / ".agents/notes/testcase/tc-demo.md").write_text("Line 1  \nLine 2\n", encoding="utf-8")
            self._run(["git", "add", ".agents/notes/testcase/tc-demo.md"], cwd=work)
            self._run(
                ["git", "commit", "-m", "test(testing): thêm tài liệu test hợp lệ (2026-11-11-demo-son)"],
                cwd=work,
            )

            (work / ".agents/notes/testcase/conflict.md").write_text(
                "<<<<<<< HEAD\na\n=======\nb\n>>>>>>> feat\n",
                encoding="utf-8",
            )
            self._run(["git", "add", ".agents/notes/testcase/conflict.md"], cwd=work)
            conflict_commit = self._run(["git", "commit", "-m", "docs(core): conflict"], cwd=work, check=False)
            self.assertNotEqual(conflict_commit.returncode, 0)

    def test_scope_check_push_and_conflict_free_merge(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            work = self._init_temp_repo(Path(td))
            pid = "2026-11-11-scope-son"

            self._run(["./scripts/git-ship.sh", "start", f"feat/{pid}"], cwd=work)
            (work / ".agents/notes/proposed" / f"{pid}.md").write_text(
                f"# Proposal: Scope\n\n## Metadata\n- ID: {pid}\n- Type: feature\n- Status: approved\n- Area: app.py\n\n"
                "## 9. Human Review\nDecision: Approved\nReviewer: son\nReview Date: 2026-11-11\n",
                encoding="utf-8",
            )
            impl_dir = work / ".agents/notes/implemented" / pid
            impl_dir.mkdir(parents=True)
            (impl_dir / "plan.md").write_text(
                "# Implementation Plan: Scope\n\n## 2. Phạm vi\n### In Scope\n- `app.py`, `test_app.py`\n### Out of Scope\n- `other.py`\n",
                encoding="utf-8",
            )
            (impl_dir / "status.md").write_text(
                f"# Implementation Status: Scope\n\n## Metadata\n- ID: {pid}\n- Status: validation\n",
                encoding="utf-8",
            )
            (work / ".agents/notes/testcase" / f"{pid}.md").write_text(
                f"# Testcase: Scope\n\n- ID: {pid}\n- Mode: proposal-paired\n"
                f"- Proposal: .agents/notes/proposed/{pid}.md\n- Target: app.py\n"
                f"- Test File: test_app.py\n- Status: passed\n- Related Bugs: none\n",
                encoding="utf-8",
            )
            (work / "app.py").write_text("print('ok')\n", encoding="utf-8")
            (work / "test_app.py").write_text("assert True\n", encoding="utf-8")

            ok_scope = self._run(["./scripts/git-ship.sh", "scope"], cwd=work)
            self.assertIn("Scope OK", ok_scope.stdout)

            (work / "other.py").write_text("x = 2\n", encoding="utf-8")
            bad_scope = self._run(["./scripts/git-ship.sh", "scope"], cwd=work, check=False)
            self.assertNotEqual(bad_scope.returncode, 0)
            self.assertIn("SCOPE MISMATCH", bad_scope.stdout)
            (work / "other.py").unlink()

            self._run(
                [
                    "git",
                    "add",
                    "app.py",
                    "test_app.py",
                    f".agents/notes/proposed/{pid}.md",
                    f".agents/notes/implemented/{pid}/",
                    f".agents/notes/testcase/{pid}.md",
                ],
                cwd=work,
            )
            self._run(["git", "commit", "-m", f"feat(api): hoàn thiện tính năng ({pid})"], cwd=work)

            # Direct push to develop blocked by pre-push hook
            bad_push = self._run(["git", "push", "origin", "HEAD:develop"], cwd=work, check=False)
            self.assertNotEqual(bad_push.returncode, 0)

            # Feature branch push via git-ship succeeds
            push_res = self._run(["./scripts/git-ship.sh", "push", "--no-pr"], cwd=work)
            self.assertEqual(push_res.returncode, 0)

            # Conflict-free merge works for any team member (not restricted to ThienleDuc)
            dry_res = self._run(["./scripts/git-ship.sh", "merge", "--dry-run", "--local"], cwd=work)
            self.assertIn("MERGE READY", dry_res.stdout)

            merge_res = self._run(["./scripts/git-ship.sh", "merge", "--local"], cwd=work)
            self.assertEqual(merge_res.returncode, 0)
            self.assertEqual(self._run(["git", "branch", "--show-current"], cwd=work).stdout.strip(), "develop")
            self.assertTrue((work / "app.py").exists())

    def test_merge_blocks_when_conflict_detected(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            work = self._init_temp_repo(Path(td))
            self._run(["./scripts/git-ship.sh", "me", "son"], cwd=work)

            # Branch 1 modifies shared.txt and merges cleanly into develop
            self._run(["./scripts/git-ship.sh", "start", "feat/2026-11-11-base-change-son"], cwd=work)
            (work / "shared.txt").write_text("line1-from-base\n", encoding="utf-8")
            self._run(["git", "add", "shared.txt"], cwd=work)
            self._run(["git", "commit", "-m", "feat(core): thêm thay đổi gốc"], cwd=work)
            self._run(["./scripts/git-ship.sh", "merge", "--local"], cwd=work)

            # Reset another conflicting branch from the commit BEFORE base-change
            self._run(["git", "branch", "feat/2026-11-11-conflict-son", "HEAD~1"], cwd=work)
            self._run(["git", "switch", "feat/2026-11-11-conflict-son"], cwd=work)
            (work / "shared.txt").write_text("line1-conflicting\n", encoding="utf-8")
            self._run(["git", "add", "shared.txt"], cwd=work)
            self._run(["git", "commit", "-m", "feat(core): thêm thay đổi gây xung đột"], cwd=work)

            # Dry-run & merge MUST block when conflict exists
            bad_dry = self._run(["./scripts/git-ship.sh", "merge", "--dry-run", "--local"], cwd=work, check=False)
            self.assertNotEqual(bad_dry.returncode, 0)
            self.assertIn("CONFLICT", bad_dry.stderr)

            bad_merge = self._run(["./scripts/git-ship.sh", "merge", "--local"], cwd=work, check=False)
            self.assertNotEqual(bad_merge.returncode, 0)
            self.assertIn("CONFLICT", bad_merge.stderr)
            self.assertEqual(
                self._run(["git", "branch", "--show-current"], cwd=work).stdout.strip(),
                "feat/2026-11-11-conflict-son",
            )

    def test_single_file_test_branch_allowed(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            work = self._init_temp_repo(Path(td))
            self._run(["./scripts/git-ship.sh", "me", "van"], cwd=work)
            tid = "2026-11-11-test-runner-van"
            self._run(["./scripts/git-ship.sh", "start", f"test/{tid}"], cwd=work)
            cur = self._run(["git", "branch", "--show-current"], cwd=work).stdout.strip()
            self.assertEqual(cur, f"test/{tid}")
            scope_res = self._run(["./scripts/git-ship.sh", "scope"], cwd=work)
            self.assertIn("single-file-test", scope_res.stdout)


if __name__ == "__main__":
    unittest.main()
