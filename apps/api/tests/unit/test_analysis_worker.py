from types import SimpleNamespace

import pytest

from gdmas.services.analysis.pipeline import AnalysisPipeline
from gdmas.services.analysis.worker import main, run


@pytest.mark.parametrize("success,exit_code", [(True, 0), (False, 1)])
def test_once_returns_process_status(success, exit_code):
    pipeline = SimpleNamespace(execute_cycle=lambda: {"success": success})
    assert (
        run(pipeline, once=True, sleep=lambda _: pytest.fail("must not sleep"))
        == exit_code
    )


@pytest.mark.parametrize("interval", [0, -1, float("nan"), float("inf")])
def test_invalid_interval(interval):
    with pytest.raises(ValueError, match="positive"):
        run(SimpleNamespace(), interval=interval)


def test_deadlines_skip_missed_ticks_and_recover_from_failure():
    now = [0.0]
    starts = []
    delays = []

    def execute():
        starts.append(now[0])
        if len(starts) == 1:
            now[0] += 650
            raise RuntimeError("simulated failure")
        return {"success": True}

    def sleep(delay):
        delays.append(delay)
        now[0] += delay
        if len(delays) == 2:
            raise KeyboardInterrupt

    assert (
        run(SimpleNamespace(execute_cycle=execute), clock=lambda: now[0], sleep=sleep)
        == 0
    )
    assert starts == [0, 900]
    assert delays == [250, 300]


def test_keyboard_interrupt_during_cycle():
    def execute():
        raise KeyboardInterrupt

    assert run(SimpleNamespace(execute_cycle=execute)) == 0


def test_cli_help_and_invalid_window_do_not_connect_to_database(monkeypatch, capsys):
    monkeypatch.setattr("sys.argv", ["worker", "--help"])
    with pytest.raises(SystemExit) as error:
        main()
    assert error.value.code == 0
    assert "--once" in capsys.readouterr().out
    monkeypatch.setattr("sys.argv", ["worker", "--lookback-days", "0"])
    with pytest.raises(SystemExit) as error:
        main()
    assert error.value.code == 2


def test_pipeline_rejects_invalid_lookback():
    with pytest.raises(ValueError, match="positive"):
        AnalysisPipeline(session_factory=lambda: None, lookback_days=-1)
