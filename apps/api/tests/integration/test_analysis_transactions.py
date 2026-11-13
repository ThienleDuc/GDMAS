"""Kiểm giao dịch AnalysisService/ORM thật trên SQLite tạm, không mạng hay PostgreSQL ngoài."""

import json
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import JSON, BigInteger, Integer, create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import sessionmaker

from gdmas.db.base import Base
from gdmas.models.analysis import AnalysisResult
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.service_run import ServiceRun
from gdmas.services.analysis import service as service_module
from gdmas.services.analysis.service import AnalysisService


@pytest.fixture
def sessions(monkeypatch):
    tables = [ServiceRun.__table__, EarthquakeEvent.__table__, AnalysisResult.__table__]
    for table in tables:
        for column in table.columns:
            if isinstance(column.type, BigInteger):
                monkeypatch.setattr(
                    column, "type", column.type.with_variant(Integer(), "sqlite")
                )
            elif isinstance(column.type, JSONB):
                monkeypatch.setattr(
                    column, "type", column.type.with_variant(JSON(), "sqlite")
                )
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine, tables=tables)
    yield sessionmaker(bind=engine)
    engine.dispose()


def add_events(sessions, count=3):
    now = datetime.now(UTC)
    with sessions() as db:
        for index in range(count):
            db.add(
                EarthquakeEvent(
                    source="USGS",
                    source_event_id=f"offline-{index}",
                    event_time=now - timedelta(days=index + 1),
                    latitude=10.0 + index,
                    longitude=100.0 + index,
                    depth_km=20.0 + index,
                    magnitude=3.0 + index,
                )
            )
        db.commit()


def add_previous_snapshot(sessions):
    now = datetime.now(UTC)
    with sessions() as db:
        db.add(
            AnalysisResult(
                analysis_type="time_series",
                time_interval="day",
                period_start=now - timedelta(days=1),
                period_end=now,
                metrics_data={"previous_snapshot": True},
            )
        )
        db.commit()


# TC-18
def test_cycles_replace_snapshot_and_preserve_raw_events(sessions):
    add_events(sessions)
    add_previous_snapshot(sessions)
    service = AnalysisService(session_factory=sessions)

    first = service.execute_cycle()
    second = service.execute_cycle()

    assert first["success"] and second["success"]
    assert second["events_analyzed"] == 3
    with sessions() as db:
        results = db.query(AnalysisResult).all()
        assert len(results) == 6
        assert db.query(EarthquakeEvent).count() == 3
        assert db.query(ServiceRun).count() == 2
        assert all(row.service_run_id == second["service_run_id"] for row in results)
        assert all(row.time_interval in {"day", "week", "month"} for row in results)
        assert all("previous_snapshot" not in row.metrics_data for row in results)
        for row in results:
            json.dumps(row.metrics_data, allow_nan=False)
        run = db.get(ServiceRun, second["service_run_id"])
        assert run.status == "SUCCESS" and run.records_processed == 3


def test_empty_database_then_refill_recovers_without_fake_rows(sessions):
    add_previous_snapshot(sessions)
    service = AnalysisService(session_factory=sessions)

    empty = service.execute_cycle()
    assert empty["success"] and empty["results_written"] == 0
    with sessions() as db:
        assert db.query(AnalysisResult).count() == 0
        assert db.query(EarthquakeEvent).count() == 0
        assert db.get(ServiceRun, empty["service_run_id"]).records_processed == 0

    add_events(sessions, count=1)
    recovered = service.execute_cycle()
    assert recovered["success"] and recovered["events_analyzed"] == 1
    assert recovered["results_written"] == 6
    with sessions() as db:
        assert db.query(AnalysisResult).count() == 6
        assert db.get(ServiceRun, recovered["service_run_id"]).status == "SUCCESS"


def test_failed_snapshot_insert_restores_previous_snapshot(sessions, monkeypatch):
    add_events(sessions)
    add_previous_snapshot(sessions)
    original = service_module.build_analysis_snapshot

    def broken_snapshot(events, **kwargs):
        snapshot = original(events, **kwargs)
        snapshot[0]["metrics_data"] = {"not_json_serializable": object()}
        return snapshot

    monkeypatch.setattr(service_module, "build_analysis_snapshot", broken_snapshot)

    result = AnalysisService(session_factory=sessions).execute_cycle()

    assert result["success"] is False
    with sessions() as db:
        rows = db.query(AnalysisResult).all()
        assert len(rows) == 1 and rows[0].metrics_data == {"previous_snapshot": True}
        assert db.query(EarthquakeEvent).count() == 3
        run = db.query(ServiceRun).one()
        assert run.status == "FAILED" and run.records_processed == 0
        assert len(run.error_message) <= 200
