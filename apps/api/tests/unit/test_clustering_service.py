"""Unit test offline cho DBSCAN T4 (testcase 2026-11-23-dbscan-clustering-thien).

Không gọi USGS; DB SQLite in-memory qua fixture `db` của conftest.
"""

from datetime import UTC, datetime

from gdmas.models.clustering import ClusteringEventMapping, ClusteringResult
from gdmas.models.service_run import ServiceRun
from gdmas.services.clustering.service import (
    DEFAULT_EPS_KM,
    DEFAULT_MIN_SAMPLES,
    compute_dbscan,
    haversine_km,
    run_cycle,
)


def make_event(event_id: int, lat: float, lon: float, country: str, region: str):
    return {
        "id": event_id,
        "latitude": lat,
        "longitude": lon,
        "magnitude": 4.0 + (event_id % 5) / 10,
        "place": f"{region}, {country}",
        "country": country,
        "region": region,
    }


def test_haversine_km():
    # (~111 km per degree latitude)
    assert 110 < haversine_km(0.0, 0.0, 1.0, 0.0) < 112
    assert haversine_km(10.0, 20.0, 10.0, 20.0) == 0.0


def test_compute_dbscan_two_clusters_and_noise():
    japan = [
        make_event(i, 35.0 + i / 100, 139.0 + i / 100, "Japan", "Honshu")
        for i in range(8)
    ]
    california = [
        make_event(100 + i, 37.0 + i / 100, -122.0 + i / 100, "USA", "California")
        for i in range(8)
    ]
    noise = [make_event(999, -40.0, 170.0, "Tonga", "Tonga")]
    result = compute_dbscan(japan + california + noise)

    assert result["parameters"] == {
        "eps_km": DEFAULT_EPS_KM,
        "min_samples": DEFAULT_MIN_SAMPLES,
        "metric": "haversine",
    }
    assert result["total_clusters"] == 2
    assert result["noise_count"] == 1
    assert {row["dominant_place"] for row in result["summary_clusters"]} == {
        "Honshu, Japan",
        "California, USA",
    }
    assert all(
        row["radius_km"] is not None and row["event_count"] >= 5
        for row in result["summary_clusters"]
    )
    assert sum(1 for row in result["mappings"] if row["cluster_label"] == -1) == 1


def test_empty_and_insufficient_return_no_fake_clusters():
    empty = compute_dbscan([])
    assert empty["total_clusters"] == 0 and empty["summary_clusters"] == []
    small = compute_dbscan(
        [make_event(i, 35.0, 139.0, "Japan", "Honshu") for i in range(3)]
    )
    assert small["total_clusters"] == 0 and small["mappings"] == []


def test_run_cycle_writes_results_and_service_run(db):
    from .conftest import add_event

    now = datetime.now(UTC)
    for i in range(6):
        add_event(
            db,
            i + 1,
            event_time=now,
            latitude=35.0 + i / 100,
            longitude=139.0 + i / 100,
            magnitude=4.5,
            place=f"Honshu, Japan {i}",
            country="Japan",
            region="Honshu",
        )

    result = run_cycle(db, now=now, window_days=1)
    assert result["total_clusters"] >= 1
    assert result["events_processed"] == 6

    assert db.query(ClusteringResult).count() == 1
    assert db.query(ClusteringEventMapping).count() == 6
    run = db.query(ServiceRun).filter(ServiceRun.service_name == "clustering").first()
    assert run is not None and run.status == "SUCCESS" and run.records_processed == 6
