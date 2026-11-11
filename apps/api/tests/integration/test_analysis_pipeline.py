"""PostgreSQL integration; never creates tables in a shared application schema."""

import asyncio
import json
import os
import signal
import socket
import subprocess
import sys
import time
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from time import perf_counter
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import create_engine, delete, func, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker
from sqlalchemy.schema import CreateSchema, DropSchema

from gdmas.db.base import Base
from gdmas.db.connection import get_db
from gdmas.main import app
from gdmas.models.analysis import AnalysisResult
from gdmas.models.clustering import ClusteringResult
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.prediction import ClassificationResult, PredictionResult
from gdmas.models.service_run import ServiceRun
from gdmas.services.analysis.pipeline import AnalysisPipeline
from gdmas.services.analysis.repository import ANALYSIS_LOCK_KEY, ANALYSIS_TYPES

END = datetime(2026, 11, 1, tzinfo=UTC)


@pytest.fixture
def database():
    raw_url = os.environ.get("GDMAS_TEST_DATABASE_URL")
    if not raw_url:
        pytest.skip(
            "Set GDMAS_TEST_DATABASE_URL to an isolated PostgreSQL *_test database"
        )
    url = make_url(raw_url)
    if url.get_backend_name() != "postgresql" or not (url.database or "").endswith(
        "_test"
    ):
        pytest.fail(
            "Refusing integration tests: database must be PostgreSQL and end in _test"
        )
    schema = f"feat03_test_{uuid4().hex}"
    admin = create_engine(url)
    with admin.begin() as connection:
        connection.execute(CreateSchema(schema))
    engine = create_engine(url, connect_args={"options": f"-csearch_path={schema}"})
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    try:
        Base.metadata.create_all(engine)
        yield engine, factory
    finally:
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()
        # This schema was generated above; no existing tables/schemas are dropped.
        with admin.begin() as connection:
            connection.execute(DropSchema(schema, cascade=True))
        admin.dispose()


def populate(factory, count=120, days=180):
    with factory.begin() as session:
        session.add_all(
            [
                EarthquakeEvent(
                    source="TEST",
                    source_event_id=f"feat03_{index}",
                    event_time=END
                    - timedelta(days=days)
                    + timedelta(days=days * index / count),
                    magnitude=1 + index % 7,
                    depth_km=5 + index % 50,
                    latitude=-30 + index % 60,
                    longitude=-120 + index % 240,
                )
                for index in range(count)
            ]
        )


def snapshots(factory):
    with factory() as session:
        return {
            record.analysis_type: record.metrics_data
            for record in session.scalars(
                select(AnalysisResult).where(
                    AnalysisResult.analysis_type.in_(ANALYSIS_TYPES)
                )
            )
        }


def api_response(factory):
    def override_db():
        with factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_db

    async def request():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            return await client.get("/api/v1/patterns")

    return asyncio.run(request())


def test_snapshot_is_bounded_api_compatible_and_preserves_other_services(database):
    _, factory = database
    populate(factory)
    with factory.begin() as session:
        session.add_all(
            [
                ClusteringResult(
                    algorithm="DBSCAN",
                    parameters={},
                    total_clusters=1,
                    summary_clusters={"clusters": [{"id": "retained"}]},
                ),
                PredictionResult(
                    target_date=END.date(),
                    metric_name="count",
                    predicted_value=42,
                    lower_bound=30,
                    upper_bound=50,
                    model_name="test-model",
                ),
                ClassificationResult(
                    target_date=END.date(),
                    predicted_label="Low",
                    probability_scores={"Low": 1},
                    model_name="test-model",
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
    pipeline = AnalysisPipeline(factory)
    for _ in range(2):
        result = pipeline.execute_cycle(computed_at=END)
        assert result["success"]
        assert result["analysis_records"] == 4
    with factory() as session:
        assert session.scalar(select(func.count()).select_from(AnalysisResult)) == 5
        runs = list(session.scalars(select(ServiceRun)))
        assert len(runs) == 2
        assert all(
            run.status == "SUCCESS" and run.records_processed == 120 for run in runs
        )
    response = api_response(factory)
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_patterns"] == 6
    assert all(pattern["status"] == "COMPUTED" for pattern in payload["patterns"])
    assert payload["patterns"][0]["metrics"]["total_events"] == 120
    assert payload["patterns"][4]["metrics"]["predicted_value"] == 42
    assert payload["patterns"][5]["metrics"]["predicted_label"] == "Low"
    assert payload["clustering_summary"]["clusters"][0]["id"] == "retained"


def test_rollback_preserves_snapshot_and_readers_cannot_see_partial_publish(
    database, monkeypatch
):
    _, factory = database
    populate(factory)
    pipeline = AnalysisPipeline(factory)
    assert pipeline.execute_cycle(computed_at=END)["success"]
    before = snapshots(factory)
    original = pipeline.repository.replace_snapshot

    def fail_after_write(session, metrics, **kwargs):
        original(session, metrics, **kwargs)
        session.flush()
        # A separate reader still sees the last committed snapshot.
        assert snapshots(factory) == before
        raise RuntimeError("injected transaction failure")

    monkeypatch.setattr(pipeline.repository, "replace_snapshot", fail_after_write)
    result = pipeline.execute_cycle(computed_at=END + timedelta(hours=1))
    assert not result["success"]
    assert snapshots(factory) == before
    with factory() as session:
        runs = list(session.scalars(select(ServiceRun).order_by(ServiceRun.id)))
        assert [run.status for run in runs] == ["SUCCESS", "FAILED"]
        assert runs[-1].error_message == "RuntimeError"
    monkeypatch.setattr(pipeline.repository, "replace_snapshot", original)
    assert pipeline.execute_cycle(computed_at=END)["success"]


def test_advisory_lock_skips_competing_worker_and_releases(database):
    engine, factory = database
    populate(factory)
    with engine.connect() as holder, holder.begin():
        holder.execute(
            text("SELECT pg_advisory_xact_lock(:key)"), {"key": ANALYSIS_LOCK_KEY}
        )
        result = AnalysisPipeline(factory).execute_cycle(computed_at=END)
        assert result["skipped"]
        assert snapshots(factory) == {}
    assert (
        AnalysisPipeline(factory).execute_cycle(computed_at=END)["analysis_records"]
        == 4
    )


def test_postgres_connection_loss_rolls_back_and_recovers(database, monkeypatch):
    engine, factory = database
    populate(factory)
    pipeline = AnalysisPipeline(factory)
    assert pipeline.execute_cycle(computed_at=END)["success"]
    before = snapshots(factory)
    publish = pipeline.repository.replace_snapshot

    def disconnect_during_publish(session, metrics, **kwargs):
        publish(session, metrics, **kwargs)
        session.flush()
        backend_pid = session.scalar(text("SELECT pg_backend_pid()"))
        # Terminate only the connection opened by this isolated test pipeline.
        with engine.begin() as control:
            assert control.scalar(
                text("SELECT pg_terminate_backend(:pid)"), {"pid": backend_pid}
            )

    monkeypatch.setattr(
        pipeline.repository, "replace_snapshot", disconnect_during_publish
    )
    assert not pipeline.execute_cycle(computed_at=END)["success"]
    assert snapshots(factory) == before
    with factory() as session:
        assert list(
            session.scalars(select(ServiceRun.status).order_by(ServiceRun.id))
        ) == ["SUCCESS", "FAILED"]
    monkeypatch.setattr(pipeline.repository, "replace_snapshot", publish)
    assert pipeline.execute_cycle(computed_at=END)["success"]


def test_interrupt_during_publication_releases_lock_and_preserves_snapshot(
    database, monkeypatch
):
    _, factory = database
    populate(factory)
    pipeline = AnalysisPipeline(factory)
    assert pipeline.execute_cycle(computed_at=END)["success"]
    before = snapshots(factory)
    publish = pipeline.repository.replace_snapshot

    def interrupt(session, metrics, **kwargs):
        publish(session, metrics, **kwargs)
        session.flush()
        raise KeyboardInterrupt

    monkeypatch.setattr(pipeline.repository, "replace_snapshot", interrupt)
    with pytest.raises(KeyboardInterrupt):
        pipeline.execute_cycle(computed_at=END)
    assert snapshots(factory) == before
    monkeypatch.setattr(pipeline.repository, "replace_snapshot", publish)
    assert pipeline.execute_cycle(computed_at=END)["success"]


def test_empty_and_repopulated_source_recovers_without_touching_t5(database):
    _, factory = database
    populate(factory)
    pipeline = AnalysisPipeline(factory)
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
    result = pipeline.execute_cycle(computed_at=END)
    assert result["analysis_records"] == 0
    assert snapshots(factory) == {}
    response = api_response(factory).json()
    assert response["success"]
    assert all(
        pattern["status"] == "PENDING" and pattern["metrics"] == {}
        for pattern in response["patterns"][:4]
    )
    populate(factory, count=10)
    assert pipeline.execute_cycle(computed_at=END)["analysis_records"] == 4
    # Clearing results alone must also be recoverable from the source.
    with factory.begin() as session:
        session.execute(delete(AnalysisResult))
    assert pipeline.execute_cycle(computed_at=END)["analysis_records"] == 4


def test_lookback_window_is_persisted_without_duplicate_snapshots(database):
    _, factory = database
    populate(factory, count=180, days=180)
    assert AnalysisPipeline(factory, lookback_days=30).execute_cycle(computed_at=END)[
        "success"
    ]
    records = snapshots(factory)
    assert records["time_series"]["total_events"] == 30
    assert records["time_series"]["metadata"]["period_start"].startswith("2026-10-02")


def test_cli_once_publishes_a_real_cycle(database, monkeypatch):
    from gdmas.services.analysis import worker

    _, factory = database
    populate(factory)
    monkeypatch.setattr("sys.argv", ["worker", "--once", "--lookback-days", "30"])

    def create_pipeline(**kwargs):
        pipeline = AnalysisPipeline(factory, **kwargs)
        execute = pipeline.execute_cycle
        monkeypatch.setattr(pipeline, "execute_cycle", lambda: execute(computed_at=END))
        return pipeline

    monkeypatch.setattr(worker, "AnalysisPipeline", create_pipeline)
    assert worker.main() == 0
    assert len(snapshots(factory)) == 4


@pytest.mark.parametrize("count,days", [(100, 180), (10000, 730)])
def test_contract_and_measured_performance(database, count, days):
    jsonschema = pytest.importorskip("jsonschema")
    _, factory = database
    populate(factory, count=count, days=days)
    begin = perf_counter()
    result = AnalysisPipeline(factory).execute_cycle(computed_at=END)
    elapsed = perf_counter() - begin
    assert result["success"]
    payload = snapshots(factory)
    root = Path(__file__).resolve().parents[4]
    schema = json.loads((root / "contracts/schemas/analysis-patterns.json").read_text())
    jsonschema.validate(payload, schema)
    begin = perf_counter()
    response = api_response(factory)
    latency = perf_counter() - begin
    assert response.status_code == 200
    print(
        f"\nFEAT03 events={count} days={days} pipeline={elapsed:.3f}s "
        f"api={latency:.3f}s bytes={len(response.content)}"
    )
    # Wall-clock benchmarks are reported separately from correctness assertions;
    # heavily loaded local machines must not make functional tests flaky.


@contextmanager
def runtime_process(database, arguments, **extra_environment):
    engine, _ = database
    with engine.connect() as connection:
        schema = connection.scalar(text("SELECT current_schema()"))
    scoped_url = engine.url.update_query_dict({"options": f"-csearch_path={schema}"})
    environment = {
        **os.environ,
        "DATABASE_URL": scoped_url.render_as_string(hide_password=False),
        **extra_environment,
    }
    process = subprocess.Popen(
        [sys.executable, *arguments],
        env=environment,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        yield process
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)


def test_real_worker_runs_multiple_cycles_and_stops_cleanly(database):
    _, factory = database
    populate(factory)
    with runtime_process(
        database,
        ["-m", "gdmas.services.analysis.worker"],
        ANALYSIS_INTERVAL_SECONDS="1",
    ) as process:
        deadline = time.monotonic() + 25
        completed = 0
        while time.monotonic() < deadline:
            assert process.poll() is None, (
                "Worker exited before completing scheduled cycles"
            )
            with factory() as session:
                completed = session.scalar(select(func.count()).select_from(ServiceRun))
            if completed >= 3:
                break
            time.sleep(0.05)
        assert completed >= 3, "Worker did not execute three real scheduled cycles"
        process.send_signal(signal.SIGINT)
        assert process.wait(timeout=10) == 0
    assert len(snapshots(factory)) == 4
    with factory() as session:
        assert all(
            run.status == "SUCCESS" for run in session.scalars(select(ServiceRun))
        )


@pytest.mark.parametrize("count,days", [(100, 180), (10000, 730)])
def test_real_http_api_preserves_all_scatter_points(database, count, days):
    _, factory = database
    populate(factory, count=count, days=days)
    assert AnalysisPipeline(factory).execute_cycle(computed_at=END)["success"]
    with socket.socket() as port_reservation:
        port_reservation.bind(("127.0.0.1", 0))
        port = port_reservation.getsockname()[1]
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
        httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=10) as client,
    ):
        deadline = time.monotonic() + 25
        while True:
            assert process.poll() is None, "API exited before becoming ready"
            try:
                if client.get("/health").status_code == 200:
                    break
            except httpx.ConnectError:
                pass
            assert time.monotonic() < deadline, "API did not become ready"
            time.sleep(0.05)
        client.get("/api/v1/patterns").raise_for_status()
        latencies = []
        for _ in range(10):
            begin = perf_counter()
            response = client.get("/api/v1/patterns")
            latencies.append(perf_counter() - begin)
            assert response.status_code == 200
            temporal = response.json()["patterns"][0]["metrics"]
            assert temporal["total_events"] == count
            assert len(temporal["scatter_plot"]) == count
        ordered = sorted(latencies)
        print(
            f"\nFEAT03 real-http events={count} requests=10 "
            f"p50={ordered[4]:.4f}s p95={ordered[-1]:.4f}s "
            f"bytes={len(response.content)}"
        )
