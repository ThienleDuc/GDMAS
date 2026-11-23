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


def test_statistics_kpi_respects_time_window(client, db):
    add_event(
        db,
        1,
        country="Japan",
        event_time=datetime(2026, 1, 10, tzinfo=UTC),
        magnitude=5.2,
    )
    add_event(
        db,
        2,
        country="Japan",
        event_time=datetime(2026, 11, 10, tzinfo=UTC),
        magnitude=4.2,
    )

    all_data = client.get("/api/v1/statistics/earthquakes").json()["data"]
    january = client.get(
        "/api/v1/statistics/earthquakes",
        params={
            "start_time": "2026-01-01T00:00:00Z",
            "end_time": "2026-02-01T00:00:00Z",
        },
    ).json()["data"]
    assert all_data["total_events"] == 2
    assert january["total_events"] == 1
    assert january["max_magnitude"] == 5.2


def test_trend_respects_time_window(client, db):
    for i in range(6):
        add_event(
            db,
            i + 1,
            country="Japan",
            event_time=datetime(2026, 1, i + 1, tzinfo=UTC),
            magnitude=4.0 + i / 10,
        )
    resp = client.get(
        f"{ANALYSIS}/trend",
        params={
            "resample_freq": "D",
            "start_time": "2026-01-01T00:00:00Z",
            "end_time": "2026-01-31T00:00:00Z",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True


def test_monthly_peaks_counts_real_events(client, db):
    add_event(
        db,
        1,
        country="Japan",
        region="Honshu",
        event_time=datetime(2026, 1, 10, tzinfo=UTC),
    )
    add_event(
        db,
        2,
        country="Japan",
        region="Honshu",
        event_time=datetime(2026, 1, 20, tzinfo=UTC),
    )
    add_event(
        db, 3, country="USA", region="CA", event_time=datetime(2026, 2, 10, tzinfo=UTC)
    )

    all_data = client.get("/api/v1/statistics/monthly-peaks").json()["data"]
    assert len(all_data) == 12
    assert {row["month"]: row["count"] for row in all_data if row["count"]} == {
        1: 2,
        2: 1,
    }

    japan = client.get(
        "/api/v1/statistics/monthly-peaks", params={"country": "Japan"}
    ).json()["data"]
    assert {row["month"]: row["count"] for row in japan if row["count"]} == {1: 2}


def test_seasonality_interval_month_is_honest_when_insufficient(client, db):
    for i in range(15):
        add_event(
            db,
            i + 1,
            country="Japan",
            region="Honshu",
            event_time=datetime(2026, 1, i + 1, tzinfo=UTC),
        )
    resp = client.get("/api/v1/analysis/seasonality", params={"interval": "month"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["status"] == "insufficient_data"
    # Vẫn trả đủ 12 cột, hệ số 0 (không bịa mùa vụ, không bỏ cột so sánh).
    line = body["data"]["components"]["seasonal_line"]
    assert len(line) == 12
    assert all(point["seasonal_factor"] == 0 for point in line)


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
