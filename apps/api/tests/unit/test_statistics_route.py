"""Test route /api/v1/statistics/earthquakes: KPI thật, DB rỗng, DB lỗi."""

from datetime import UTC, datetime, timedelta

from .conftest import add_event

URL = "/api/v1/statistics/earthquakes"


def test_empty_db_returns_zeros_and_empty_series_not_mock(client):
    resp = client.get(URL)
    data = resp.json()["data"]
    assert resp.status_code == 200
    assert data["total_events"] == 0
    assert data["strong_events_count"] == 0
    assert data["recent_24h_count"] == 0
    assert data["avg_magnitude"] == 0
    assert data["latest_event_time"] is None
    assert data["time_series_preview"] == []
    assert "1248" not in resp.text


def test_db_error_returns_500_database_error_not_1248(broken_client):
    resp = broken_client.get(URL)
    body = resp.json()
    assert resp.status_code == 500
    assert body["success"] is False
    assert body["error"]["code"] == "DATABASE_ERROR"
    assert "1248" not in resp.text


def test_kpis_are_computed_from_database(client, db):
    now = datetime.now(UTC)
    add_event(db, 1, magnitude=2.0, event_time=now - timedelta(hours=2))
    add_event(db, 2, magnitude=4.4, event_time=now - timedelta(hours=3))
    add_event(db, 3, magnitude=5.0, event_time=now - timedelta(hours=4))
    add_event(db, 4, magnitude=6.4, event_time=now - timedelta(days=5))
    data = client.get(URL).json()["data"]
    assert data["total_events"] == 4
    assert data["strong_events_count"] == 2
    assert data["moderate_events_count"] == 1
    assert data["minor_events_count"] == 1
    assert data["recent_24h_count"] == 3
    assert data["max_magnitude"] == 6.4
    assert data["avg_magnitude"] == round((2.0 + 4.4 + 5.0 + 6.4) / 4, 2)


def test_time_series_has_eight_buckets_computed_from_events(client, db):
    now = datetime.now(UTC)
    add_event(db, 1, magnitude=3.0, event_time=now - timedelta(minutes=30))
    add_event(db, 2, magnitude=5.0, event_time=now - timedelta(minutes=40))
    series = client.get(URL).json()["data"]["time_series_preview"]
    assert len(series) == 8
    assert sum(p["count"] for p in series) == 2
    # Hai sự kiện mới nhất rơi vào khoảng 3 giờ cuối cùng
    assert series[-1]["count"] == 2
    assert series[-1]["avg_mag"] == 4.0
    assert all(p["count"] == 0 for p in series[:-1])


def test_time_series_is_not_a_fixed_hardcoded_list(client, db):
    add_event(db, 1, event_time=datetime.now(UTC) - timedelta(hours=1))
    first = client.get(URL).json()["data"]["time_series_preview"]
    add_event(db, 2, event_time=datetime.now(UTC) - timedelta(hours=1))
    second = client.get(URL).json()["data"]["time_series_preview"]
    assert sum(p["count"] for p in first) == 1
    assert sum(p["count"] for p in second) == 2


def test_events_older_than_24h_are_excluded_from_series(client, db):
    add_event(db, 1, event_time=datetime.now(UTC) - timedelta(days=3))
    data = client.get(URL).json()["data"]
    assert data["total_events"] == 1
    assert sum(p["count"] for p in data["time_series_preview"]) == 0
