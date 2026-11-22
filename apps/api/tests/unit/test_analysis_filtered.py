"""Test offline cho lọc quốc gia/khu vực trên route analysis/statistics/predictions.

Dùng fixture `client`/`db` của tests/unit/conftest.py (SQLite in-memory), không gọi USGS.
"""

from datetime import UTC, datetime, timedelta

from .conftest import add_event

ANALYSIS = "/api/v1/analysis"
STATISTICS = "/api/v1/statistics/earthquakes"


def test_temporal_filtered_by_country(client, db):
    add_event(
        db, 1, country="Japan", region="Honshu", place="Tokyo, Japan", magnitude=5.0
    )
    add_event(
        db, 2, country="Japan", region="Osaka", place="Osaka, Japan", magnitude=4.0
    )
    add_event(
        db, 3, country="USA", region="CA", place="San Francisco, CA", magnitude=6.0
    )

    resp = client.get(
        f"{ANALYSIS}/temporal", params={"country": "Japan", "interval": "day"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["stats"]["data_points"] == 2
    assert "localhost:8000" not in resp.text


def test_seasonality_and_correlation_accept_filters(client, db):
    for i in range(12):
        add_event(
            db,
            i + 1,
            country="Japan",
            region="Honshu",
            place=f"Honshu, Japan {i}",
            event_time=datetime.now(UTC) - timedelta(days=30 - i),
        )
    for path in ("seasonality", "correlation"):
        resp = client.get(
            f"{ANALYSIS}/{path}", params={"country": "Japan", "region": "Honshu"}
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True


def test_statistics_kpi_filtered_by_country(client, db):
    add_event(db, 1, country="Japan", region="Honshu", magnitude=5.2)
    add_event(db, 2, country="Japan", region="Honshu", magnitude=4.2)
    add_event(db, 3, country="USA", region="CA", magnitude=6.6)

    all_body = client.get(STATISTICS).json()["data"]
    japan = client.get(STATISTICS, params={"country": "Japan"}).json()["data"]
    assert all_body["total_events"] == 3
    assert japan["total_events"] == 2
    assert japan["max_magnitude"] == 5.2
    assert japan["recent_24h_count"] == 2


def test_forecast_insufficient_data_returns_empty_not_fabricated(client, db):
    add_event(db, 1, country="Japan", region="Honshu", place="Tokyo, Japan")
    resp = client.get("/api/v1/predictions", params={"country": "Japan"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is False
    assert body["data"] is None
    assert "dữ liệu" in body["message"]


def test_forecast_filtered_by_country(client, db):
    base = datetime.now(UTC) - timedelta(days=40)
    for i in range(30):
        add_event(
            db,
            i + 1,
            country="Japan",
            region="Honshu",
            place=f"Honshu, Japan {i}",
            event_time=base + timedelta(days=i),
            magnitude=4.0 + (i % 5),
        )
    for path in ("predictions", "classifications"):
        resp = client.get(
            f"/api/v1/{path}", params={"country": "Japan", "region": "Honshu"}
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True
