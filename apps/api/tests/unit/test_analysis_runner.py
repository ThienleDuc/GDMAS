"""Unit test offline cho gdmas.services.analysis.runner (testcase 2026-11-12-analysis-four-patterns-son)."""

import pytest

from gdmas.services.analysis import runner


class FakeService:
    calls = 0
    success = True

    def execute_cycle(self):
        FakeService.calls += 1
        if FakeService.success:
            return {
                "success": True,
                "events_analyzed": 3,
                "results_written": 6,
                "duration_seconds": 0.1,
            }
        return {"success": False, "error": "RuntimeError: boom"}


@pytest.fixture(autouse=True)
def fake_service(monkeypatch):
    FakeService.calls = 0
    FakeService.success = True
    monkeypatch.setattr(runner, "AnalysisService", FakeService)

    def no_sleep(_seconds):
        raise AssertionError("--once không được gọi time.sleep")

    monkeypatch.setattr(runner.time, "sleep", no_sleep)


# TC-15
def test_once_runs_single_cycle_and_exits_zero(capsys):
    assert runner.main(["--once"]) == 0
    assert FakeService.calls == 1
    assert "6 bản ghi analysis_results" in capsys.readouterr().out


def test_once_returns_one_on_failure(capsys):
    FakeService.success = False
    assert runner.main(["--once"]) == 1
    assert FakeService.calls == 1
    assert "thất bại" in capsys.readouterr().out


def test_loop_mode_stops_on_keyboard_interrupt(monkeypatch):
    def interrupt(_seconds):
        raise KeyboardInterrupt

    monkeypatch.setattr(runner.time, "sleep", interrupt)
    assert runner.main([]) == 0
    assert FakeService.calls == 1


def test_help_mentions_once(capsys):
    with pytest.raises(SystemExit) as exc:
        runner.main(["--help"])
    assert exc.value.code == 0
    assert "--once" in capsys.readouterr().out
