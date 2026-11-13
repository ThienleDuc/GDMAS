"""Kiểm retry, ngắt sạch và thông báo lỗi an toàn ở worker, hoàn toàn offline."""

import logging

import pytest

from gdmas.services.clustering import runner as clustering_runner
from gdmas.services.ingestion import runner
from gdmas.services.prediction import runner as prediction_runner


def test_worker_retries_without_exposing_credentials(monkeypatch, caplog, capsys):
    calls, waits = [], []

    class FakeService:
        def execute_cycle(self):
            calls.append(1)
            if len(calls) == 1:
                raise RuntimeError(
                    "postgresql://unit_user:unit_password@db.invalid/test?api_key=unit_token"
                )
            return {
                "success": True,
                "new_records": 1,
                "total_in_db": 1,
                "duration_seconds": 0.01,
            }

    def wait(seconds):
        waits.append(seconds)
        if len(waits) == 2:
            raise KeyboardInterrupt

    monkeypatch.setattr(runner, "IngestionService", FakeService)
    monkeypatch.setattr(runner.time, "sleep", wait)
    with caplog.at_level(logging.ERROR):
        runner.run()
    assert len(calls) == 2 and len(waits) == 2
    assert waits[0] == waits[1] == runner.settings.INGESTION_INTERVAL_SECONDS
    assert "RuntimeError" in caplog.text
    output = capsys.readouterr().out + caplog.text
    assert all(
        secret not in output for secret in ("unit_user", "unit_password", "unit_token")
    )


# BUG-son-006
@pytest.mark.parametrize("stop", [KeyboardInterrupt, SystemExit])
def test_retry_wait_handles_interrupt_cleanly(monkeypatch, capsys, stop):
    class BrokenService:
        def execute_cycle(self):
            raise RuntimeError("temporary failure")

    def interrupt(_seconds):
        raise stop

    monkeypatch.setattr(runner, "IngestionService", BrokenService)
    monkeypatch.setattr(runner.time, "sleep", interrupt)
    try:
        runner.run()
    except (KeyboardInterrupt, SystemExit):
        pytest.fail("Ngắt lúc chờ retry phải được xử lý sạch tại biên worker")
    assert "dừng an toàn" in capsys.readouterr().out


@pytest.mark.parametrize("module", [clustering_runner, prediction_runner])
def test_other_workers_still_stop_cleanly(monkeypatch, module):
    waits = []

    def interrupt(seconds):
        waits.append(seconds)
        raise KeyboardInterrupt

    monkeypatch.setattr(module.time, "sleep", interrupt)
    assert module.run() is None
    assert len(waits) == 1
