"""Test offline end-to-end T3 → T6 cho `GET /api/v1/analysis/trend` (BUG-son-008).

Snapshot thật của T3 (`build_analysis_snapshot`) ghi vào SQLite in-memory (fixture `client`/`db`
trong conftest.py), rồi gọi route T6 như FE gọi.
Testcase: .agents/notes/testcase/2026-11-20-trend-resample-metric-son.md.
"""

from datetime import UTC, datetime, timedelta

import pytest

from gdmas.models.analysis import AnalysisResult
from gdmas.services.analysis.patterns import build_analysis_snapshot, prepare_events

API = "/api/v1/analysis/trend"
AS_OF = datetime(2026, 11, 20, tzinfo=UTC)


def seed_t3_snapshot(db, days=200):
    """Ghi snapshot thật của T3: số trận/ngày = 1..4, độ lớn 2.0..4.0."""
    records = []
    next_id = 1
    for d in range(days):
        for k in range(1 + d % 4):
            records.append(
                {
                    "id": next_id,
                    "event_time": AS_OF - timedelta(days=days - d, hours=-k),
                    "magnitude": 2.0 + (k % 3),
                    "depth_km": 10.0 + k,
                    "latitude": 10.0,
                    "longitude": 100.0,
                }
            )
            next_id += 1
    snapshot = build_analysis_snapshot(prepare_events(records), as_of=AS_OF)
    for item in snapshot:
        db.add(AnalysisResult(**item))
    db.commit()
    return snapshot


def stored_trend(snapshot, interval):
    return next(
        item["metrics_data"]
        for item in snapshot
        if item["analysis_type"] == "trend" and item["time_interval"] == interval
    )


# TC-10 — tái hiện BUG-son-008: W phải là chuỗi tuần, không phải chuỗi tháng
@pytest.mark.parametrize(
    ("freq", "interval"), [("D", "day"), ("W", "week"), ("M", "month")]
)
def test_resample_freq_returns_matching_interval(client, db, freq, interval):
    snapshot = seed_t3_snapshot(db)

    resp = client.get(API, params={"resample_freq": freq, "metric": "count"})

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["resample_freq"] == freq
    assert data["series"] == stored_trend(snapshot, interval)["series"]
    if interval == "month":
        assert all(len(p["period"]) == 7 for p in data["series"])  # YYYY-MM
    else:
        assert all(len(p["period"]) == 10 for p in data["series"])  # YYYY-MM-DD


# TC-11 — tái hiện BUG-son-008: avg_magnitude không được trả số trận
@pytest.mark.parametrize("metric", ["count", "avg_magnitude", "max_magnitude"])
def test_metric_returns_matching_series(client, db, metric):
    snapshot = seed_t3_snapshot(db)

    data = client.get(API, params={"resample_freq": "W", "metric": metric}).json()[
        "data"
    ]

    expected = stored_trend(snapshot, "week")["metrics"][metric]
    assert data["metric"] == metric
    assert data["series"] == expected["series"]
    assert data["slope"] == expected["slope"]
    assert data["trend_direction"] == expected["trend_direction"]
    assert data["status"] == expected["status"]
    if metric != "count":
        assert all(2.0 <= p["actual_value"] <= 4.0 for p in data["series"])


# TC-12
def test_missing_interval_returns_empty_state_not_other_frequency(client, db):
    db.add(
        AnalysisResult(
            analysis_type="trend",
            time_interval="month",
            period_start=AS_OF - timedelta(days=200),
            period_end=AS_OF,
            metrics_data={"metric": "count", "series": [{"period": "2026-10"}]},
        )
    )
    db.commit()

    body = client.get(API, params={"resample_freq": "W"}).json()

    assert body["success"] is False
    assert body["data"] is None


# TC-13
def test_series_without_per_metric_data_is_not_relabelled(client, db):
    db.add(
        AnalysisResult(
            analysis_type="trend",
            time_interval="week",
            period_start=AS_OF - timedelta(days=70),
            period_end=AS_OF,
            metrics_data={
                "metric": "count",
                "series": [{"period": "2026-11-02", "actual_value": 77}],
                "slope": 1.5,
                "trend_direction": "increasing",
            },
        )
    )
    db.commit()

    params = {"resample_freq": "W", "metric": "avg_magnitude"}
    data = client.get(API, params=params).json()["data"]

    assert data["series"] == []
    assert data["status"] == "insufficient_data"
    assert data["slope"] is None


# TC-14
def test_empty_table_returns_empty_state(client):
    body = client.get(API, params={"resample_freq": "D"}).json()

    assert body["success"] is False
    assert body["data"] is None


# TC-15
@pytest.mark.parametrize("freq", ["Y", "w", ""])
def test_invalid_resample_freq_is_rejected(client, freq):
    resp = client.get(API, params={"resample_freq": freq})

    assert resp.status_code in (400, 422)
