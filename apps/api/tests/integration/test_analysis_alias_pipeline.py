"""Opt-in alias worker against a private PostgreSQL schema and a real HTTP API."""

import json
import signal
import socket
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from time import perf_counter

import httpx
import pytest
from sqlalchemy import delete, func, select, text

from gdmas.models.analysis import AnalysisResult
from gdmas.models.clustering import ClusteringResult
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.prediction import ClassificationResult, PredictionResult
from gdmas.models.service_run import ServiceRun
from gdmas.services.analysis.alias_pipeline import AliasCompatiblePipeline
from gdmas.services.analysis.pipeline import AnalysisPipeline
from gdmas.services.analysis.repository import AnalysisRepository

from .test_analysis_pipeline import (
    END,
    api_response,
    database,
    populate,
    runtime_process,
    snapshots,
)

__all__ = ["database"]

ROOT = Path(__file__).resolve().parents[4]


def test_compatible_snapshot_api_and_other_services_are_preserved(database):
    _, factory = database
    populate(factory)
    with factory.begin() as session:
        session.add_all(
            [
                ClusteringResult(
                    algorithm="TEST",
                    parameters={},
                    total_clusters=1,
                    summary_clusters={"retained": True},
                ),
                PredictionResult(
                    target_date=END.date(),
                    metric_name="count",
                    predicted_value=42,
                    lower_bound=30,
                    upper_bound=50,
                    model_name="test",
                ),
                ClassificationResult(
                    target_date=END.date(),
                    predicted_label="Low",
                    model_name="test",
                    probability_scores={"Low": 1},
                ),
                AnalysisResult(
                    analysis_type="other_analysis",
                    time_interval="day",
                    period_start=END,
                    period_end=END,
                    metrics_data={"retained": True},
                ),
            ]
        )
    assert AnalysisPipeline(factory).execute_cycle(computed_at=END)["success"]
    original = snapshots(factory)
    for _ in range(2):
        assert AliasCompatiblePipeline(factory).execute_cycle(computed_at=END)[
            "success"
        ]
    current = snapshots(factory)
    for kind in ("time_series", "correlation"):
        assert current[kind] == original[kind]
    for kind in ("trend", "seasonality"):
        assert current[kind]["metadata"]["schema_version"] == "1.1"
        assert current[kind]["by_interval"] == original[kind]["by_interval"]
    jsonschema = pytest.importorskip("jsonschema")
    schema = json.loads(
        (ROOT / "contracts/schemas/analysis-patterns-aliases-v1.1.json").read_text()
    )
    response = api_response(factory)
    assert response.status_code == 200
    payload = response.json()
    jsonschema.Draft202012Validator(
        schema, format_checker=jsonschema.FormatChecker()
    ).validate(
        {pattern["type"]: pattern["metrics"] for pattern in payload["patterns"][:4]}
    )
    assert payload["patterns"][4]["metrics"]["predicted_value"] == 42
    assert payload["patterns"][5]["metrics"]["predicted_label"] == "Low"
    assert payload["clustering_summary"] == {"retained": True}
    with factory() as session:
        assert session.scalar(select(func.count()).select_from(AnalysisResult)) == 5
        assert session.scalar(select(func.count()).select_from(ServiceRun)) == 3


def test_adapter_failure_preserves_old_snapshot_and_recovers(database, monkeypatch):
    import gdmas.services.analysis.alias_pipeline as module

    _, factory = database
    populate(factory)
    assert AnalysisPipeline(factory).execute_cycle(computed_at=END)["success"]
    before = snapshots(factory)
    original = module.add_legacy_aliases

    def reject(_metrics):
        assert snapshots(factory) == before
        raise ValueError("injected alias validation failure")

    monkeypatch.setattr(module, "add_legacy_aliases", reject)
    result = AliasCompatiblePipeline(factory).execute_cycle(computed_at=END)
    assert result["success"] is False
    assert result["error"] == "ValueError"
    assert snapshots(factory) == before
    with factory() as session:
        assert list(
            session.scalars(select(ServiceRun.status).order_by(ServiceRun.id))
        ) == ["SUCCESS", "FAILED"]
    monkeypatch.setattr(module, "add_legacy_aliases", original)
    assert AliasCompatiblePipeline(factory).execute_cycle(computed_at=END)["success"]
    assert snapshots(factory)["trend"]["metadata"]["schema_version"] == "1.1"


@pytest.mark.parametrize("fault", ["exception", "interrupt", "disconnect"])
def test_atomic_publish_rolls_back_and_releases_lock(database, monkeypatch, fault):
    engine, factory = database
    populate(factory)
    pipeline = AliasCompatiblePipeline(factory)
    assert pipeline.execute_cycle(computed_at=END)["success"]
    before = snapshots(factory)
    original = AnalysisRepository.replace_snapshot

    def fail_after_write(session, metrics, **kwargs):
        original(session, metrics, **kwargs)
        session.flush()
        assert snapshots(factory) == before
        if fault == "disconnect":
            pid = session.scalar(text("SELECT pg_backend_pid()"))
            with engine.begin() as control:
                assert control.scalar(
                    text("SELECT pg_terminate_backend(:pid)"), {"pid": pid}
                )
        elif fault == "interrupt":
            raise KeyboardInterrupt
        else:
            raise RuntimeError("injected write failure")

    monkeypatch.setattr(
        AnalysisRepository, "replace_snapshot", staticmethod(fail_after_write)
    )
    if fault == "interrupt":
        with pytest.raises(KeyboardInterrupt):
            pipeline.execute_cycle(computed_at=END)
    else:
        assert pipeline.execute_cycle(computed_at=END)["success"] is False
    assert snapshots(factory) == before
    monkeypatch.setattr(AnalysisRepository, "replace_snapshot", staticmethod(original))
    assert pipeline.execute_cycle(computed_at=END)["success"]


@pytest.mark.parametrize(
    "holder_type,contender_type",
    [
        (AnalysisPipeline, AliasCompatiblePipeline),
        (AliasCompatiblePipeline, AnalysisPipeline),
    ],
)
def test_old_and_new_workers_share_the_same_lock(database, holder_type, contender_type):
    engine, factory = database
    populate(factory)
    with engine.connect() as connection, connection.begin():
        assert holder_type(factory).repository.try_lock(connection)
        assert contender_type(factory).execute_cycle(computed_at=END)["skipped"]
        assert snapshots(factory) == {}
    assert contender_type(factory).execute_cycle(computed_at=END)["success"]


def test_empty_source_and_repopulation_keep_other_results(database):
    _, factory = database
    populate(factory)
    pipeline = AliasCompatiblePipeline(factory)
    assert pipeline.execute_cycle(computed_at=END)["success"]
    with factory.begin() as session:
        session.execute(delete(EarthquakeEvent))
        session.add(
            PredictionResult(
                target_date=END.date(),
                metric_name="count",
                predicted_value=12,
                lower_bound=10,
                upper_bound=20,
                model_name="test",
            )
        )
    assert pipeline.execute_cycle(computed_at=END)["analysis_records"] == 0
    assert snapshots(factory) == {}
    payload = api_response(factory).json()
    assert all(pattern["status"] == "PENDING" for pattern in payload["patterns"][:4])
    assert payload["patterns"][4]["metrics"]["predicted_value"] == 12
    populate(factory, count=10)
    assert pipeline.execute_cycle(computed_at=END)["analysis_records"] == 4


def test_real_cli_lookback_schedule_sigint_and_rollback_entrypoint(database):
    _, factory = database
    now = datetime.now(UTC)
    with factory.begin() as session:
        session.add_all(
            [
                EarthquakeEvent(
                    source="TEST",
                    source_event_id=f"alias_{days}",
                    event_time=now - timedelta(days=days),
                    magnitude=3,
                    depth_km=10,
                    latitude=15,
                    longitude=100,
                )
                for days in (1, 5, 40)
            ]
        )
    with runtime_process(
        database,
        [
            "-m",
            "gdmas.services.analysis.alias_worker",
            "--once",
            "--lookback-days",
            "30",
        ],
    ) as process:
        assert process.wait(timeout=25) == 0
    assert snapshots(factory)["time_series"]["total_events"] == 2
    assert snapshots(factory)["trend"]["metadata"]["schema_version"] == "1.1"
    with runtime_process(
        database,
        ["-m", "gdmas.services.analysis.alias_worker", "--lookback-days", "30"],
        ANALYSIS_INTERVAL_SECONDS="1",
    ) as process:
        deadline = time.monotonic() + 25
        while True:
            assert process.poll() is None
            with factory() as session:
                completed = session.scalar(select(func.count()).select_from(ServiceRun))
            if completed >= 4:
                break
            assert time.monotonic() < deadline
            time.sleep(0.05)
        process.send_signal(signal.SIGINT)
        assert process.wait(timeout=10) == 0
    # Roll back with the original, unchanged entrypoint using the same window.
    with runtime_process(
        database,
        ["-m", "gdmas.services.analysis.worker", "--once", "--lookback-days", "30"],
    ) as process:
        assert process.wait(timeout=25) == 0
    assert snapshots(factory)["trend"]["metadata"]["schema_version"] == "1.0"
    assert snapshots(factory)["time_series"]["total_events"] == 2


@pytest.mark.parametrize("count,days", [(100, 180), (10000, 730)])
def test_before_after_real_http_performance_and_fidelity(database, count, days):
    _, factory = database
    populate(factory, count=count, days=days)
    with socket.socket() as reservation:
        reservation.bind(("127.0.0.1", 0))
        port = reservation.getsockname()[1]
    with (
        runtime_process(
            database,
            [
                "-m",
                "uvicorn",
                "gdmas.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
                "--log-level",
                "error",
            ],
        ) as process,
        httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=15) as client,
    ):
        deadline = time.monotonic() + 25
        while True:
            assert process.poll() is None
            try:
                if client.get("/health").status_code == 200:
                    break
            except httpx.ConnectError:
                pass
            assert time.monotonic() < deadline
            time.sleep(0.05)
        measurements = {}
        originals = None
        for label, pipeline_type in (
            ("before", AnalysisPipeline),
            ("after", AliasCompatiblePipeline),
        ):
            begin = perf_counter()
            assert pipeline_type(factory).execute_cycle(computed_at=END)["success"]
            elapsed = perf_counter() - begin
            records = snapshots(factory)
            if originals is None:
                originals = records
            else:
                assert records["time_series"] == originals["time_series"]
                assert records["correlation"] == originals["correlation"]
                for kind in ("trend", "seasonality"):
                    assert (
                        records[kind]["by_interval"] == originals[kind]["by_interval"]
                    )
            client.get("/api/v1/patterns").raise_for_status()
            latencies = []
            for _ in range(10):
                begin = perf_counter()
                response = client.get("/api/v1/patterns")
                latencies.append(perf_counter() - begin)
                response.raise_for_status()
                temporal = response.json()["patterns"][0]["metrics"]
                assert temporal["total_events"] == count
                assert len(temporal["scatter_plot"]) == count
            measurements[label] = {
                "pipeline_s": round(elapsed, 4),
                "http_p95_s": round(max(latencies), 4),
                "bytes": len(response.content),
            }
        print(
            f"\nALIAS_COMPARISON count={count} days={days} {json.dumps(measurements)}"
        )
