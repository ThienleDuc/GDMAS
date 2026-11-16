"""Unit test offline cho AnalysisService (testcase 2026-11-12-analysis-four-patterns-son).

DB được giả lập bằng FakeSession; `_load_events` được thay bằng hàm trả DataFrame fixture — không cần PostgreSQL.
"""

import numpy as np
import pandas as pd
import pytest

from gdmas.models.analysis import AnalysisResult
from gdmas.models.service_run import ServiceRun
from gdmas.services.analysis import service as service_module
from gdmas.services.analysis.patterns import prepare_events
from gdmas.services.analysis.service import AnalysisService


class FakeQuery:
    def __init__(self, session, model):
        self.session = session
        self.model = model

    def delete(self, synchronize_session=None):
        self.session.deleted_models.append(self.model)
        return 0


class FakeSession:
    def __init__(self):
        self.added = []
        self.deleted_models = []
        self.commits = 0
        self.rollbacks = 0
        self.closed = False

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.closed = True
        return False

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.commits += 1

    def refresh(self, obj):
        obj.id = 99

    def rollback(self):
        self.rollbacks += 1

    def query(self, model):
        return FakeQuery(self, model)

    @property
    def run(self) -> ServiceRun:
        runs = [obj for obj in self.added if isinstance(obj, ServiceRun)]
        assert len(runs) == 1
        return runs[0]

    @property
    def results(self) -> list[AnalysisResult]:
        return [obj for obj in self.added if isinstance(obj, AnalysisResult)]


def fixture_events(days=70, seed=3):
    rng = np.random.default_rng(seed)
    start = pd.Timestamp("2026-09-07", tz="UTC")
    times = start + pd.to_timedelta(
        np.sort(rng.uniform(0, days * 86400, 400)), unit="s"
    )
    return prepare_events(
        {
            "id": i + 1,
            "event_time": ts,
            "magnitude": rng.uniform(1, 6),
            "depth_km": rng.uniform(0, 300),
            "latitude": rng.uniform(-60, 60),
            "longitude": rng.uniform(-180, 180),
        }
        for i, ts in enumerate(times)
    )


def build_service(monkeypatch, events=None, error=None):
    session = FakeSession()

    def fake_load(self, db, since):
        assert since.tzinfo is not None
        if error is not None:
            raise error
        return events if events is not None else prepare_events([])

    monkeypatch.setattr(AnalysisService, "_load_events", fake_load)
    return AnalysisService(session_factory=lambda: session), session


# TC-12
def test_empty_database_clears_snapshot_without_fake_rows(monkeypatch):
    service, session = build_service(monkeypatch)

    result = service.execute_cycle()

    assert result["success"] is True
    assert result["events_analyzed"] == 0
    assert result["results_written"] == 0
    assert session.deleted_models == [AnalysisResult]
    assert session.results == []
    assert session.run.service_name == "analysis"
    assert session.run.status == "SUCCESS"
    assert session.run.records_processed == 0
    assert session.closed


# TC-13
def test_cycle_writes_snapshot_with_run_link(monkeypatch):
    events = fixture_events()
    service, session = build_service(monkeypatch, events=events)

    result = service.execute_cycle()

    assert result["success"] is True
    assert result["events_analyzed"] == len(events)
    assert result["service_run_id"] == 99
    assert session.deleted_models == [AnalysisResult]
    keys = [(r.analysis_type, r.time_interval) for r in session.results]
    assert keys == [
        ("time_series", "day"),
        ("time_series", "week"),
        ("time_series", "month"),
        ("trend", "week"),
        ("seasonality", "day"),
        ("correlation", "day"),
    ]
    for record in session.results:
        assert record.service_run_id == 99
        assert record.calculated_at.tzinfo is not None
        assert record.period_start <= record.period_end
        assert isinstance(record.metrics_data, dict)
    assert session.run.status == "SUCCESS"
    assert session.run.records_processed == len(events)
    assert session.run.finished_at.tzinfo is not None
    # 1 commit tạo run RUNNING + 1 commit duy nhất cho xóa snapshot cũ, chèn mới và cập nhật run
    assert session.commits == 2


# TC-14
def test_failure_marks_run_failed_without_raising(monkeypatch):
    service, session = build_service(
        monkeypatch, error=RuntimeError("database   unavailable")
    )

    result = service.execute_cycle()

    assert result["success"] is False
    assert result["error"] == "RuntimeError: database unavailable"
    assert session.rollbacks >= 1
    assert session.run.status == "FAILED"
    assert session.run.error_message == "RuntimeError: database unavailable"
    assert session.results == []


def test_long_error_message_is_truncated(monkeypatch):
    service, session = build_service(monkeypatch, error=ValueError("x" * 1000))
    service.execute_cycle()
    assert len(session.run.error_message) <= 200


@pytest.mark.parametrize("window_days", [1, 365])
def test_window_is_passed_to_loader(monkeypatch, window_days):
    seen = {}
    session = FakeSession()

    def fake_load(self, db, since):
        seen["since"] = since
        return prepare_events([])

    monkeypatch.setattr(AnalysisService, "_load_events", fake_load)
    AnalysisService(
        session_factory=lambda: session, window_days=window_days
    ).execute_cycle()
    age_days = (session.run.started_at - seen["since"]).total_seconds() / 86400
    assert age_days == pytest.approx(window_days)


def test_cycle_passes_utc_start_time_to_snapshot(monkeypatch):
    service, session = build_service(monkeypatch, events=fixture_events())
    captured = {}
    original = service_module.build_analysis_snapshot

    def capture_snapshot(events, *, as_of=None):
        captured["as_of"] = as_of
        return original(events, as_of=as_of)

    monkeypatch.setattr(service_module, "build_analysis_snapshot", capture_snapshot)

    result = service.execute_cycle()

    assert result["success"] is True
    assert captured["as_of"] == session.run.started_at
    assert captured["as_of"].utcoffset().total_seconds() == 0
