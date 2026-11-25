"""Offline checks for the demo orchestration; no database or network required."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "demo_scripts" / "run_demo.sh"


class DemoScriptTests(unittest.TestCase):
    def run_demo(self, fail_at=""):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            log = path / "calls"
            for name in ("uv", "docker", "curl"):
                stub = path / name
                stub.write_text(
                    '#!/usr/bin/env bash\nprintf "%s %s\\n" "${0##*/}" "$*" >> "$CALL_LOG"\n'
                    'case "${0##*/} $*" in *"$FAIL_AT"*) [ -z "$FAIL_AT" ] || exit 7;; esac\n',
                    encoding="utf-8",
                )
                stub.chmod(0o755)
            env = dict(os.environ, PATH=f"{path}{os.pathsep}{os.environ['PATH']}",
                       CALL_LOG=str(log), FAIL_AT=fail_at)
            result = subprocess.run(["bash", str(SCRIPT)], env=env, text=True,
                                    capture_output=True, timeout=45)
            return result, log.read_text(encoding="utf-8").splitlines()

    def test_success_order_and_clustering_callable(self):
        result, calls = self.run_demo()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(calls), 9)
        for call, expected in zip(calls, ("up -d --wait postgres", "alembic upgrade head",
                "IngestionService", "SELECT count(*)", "analysis.runner --once", "run_once",
                "prediction.runner --once", "up -d api", "/health")):
            self.assertIn(expected, call)
        self.assertIn('r.get("success") is False', calls[5])

    def test_failure_stops_pipeline(self):
        for index, marker in enumerate(("up -d --wait postgres", "alembic upgrade head",
                "IngestionService", "SELECT count(*)", "analysis.runner", "run_once",
                "prediction.runner", "up -d api"), 1):
            with self.subTest(marker=marker):
                result, calls = self.run_demo(marker)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(len(calls), index)
                self.assertNotIn("Hoàn tất", result.stdout)

    def test_bash_syntax(self):
        subprocess.run(["bash", "-n", str(SCRIPT)], check=True)


if __name__ == "__main__":
    unittest.main()
