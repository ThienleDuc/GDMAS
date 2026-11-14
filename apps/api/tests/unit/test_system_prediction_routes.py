"""Test gọn cho /health, /system/status, /predictions, /classifications,
/analysis/* và /clusters: có dữ liệu, bảng rỗng, DB lỗi."""

from datetime import UTC, date, datetime, timedelta

import pytest

from gdmas.models.analysis import AnalysisResult
from gdmas.models.clustering import ClusteringResult
from gdmas.models.prediction import ClassificationResult, PredictionResult
from gdmas.models.service_run import ServiceRun

from .conftest import add_event

API = "/api/v1"
NOW = datetime.now(UTC)


def _add(db, row):
    db.add(row)
    db.commit()
    return row


# ---------- /health ----------
def test_health_ok(client):
    resp = client.get(f"{API}/health")
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "healthy"
    assert resp.json()["data"]["database"] == "connected"


def test_health_db_down_returns_500(broken_client):
    resp = broken_client.get(f"{API}/health")
    assert resp.status_code == 500
    assert resp.json()["error"]["code"] == "DATABASE_ERROR"


# ---------- /system/status ----------
def _status(client):
    return client.get(f"{API}/system/status").json()["data"]


def test_status_with_no_runs_reports_no_data(client):
    data = _status(client)
    assert data["services"]["data_ingestion"]["status"] == "no_data"
    assert data["services"]["prediction"]["status"] == "no_data"
    assert data["data_feed"]["total_events"] == 0
    assert data["data_feed"]["latest_event_time"] is None


@pytest.mark.parametrize(
    ("age", "run_status", "expected"),
    [
        (timedelta(minutes=2), "SUCCESS", "active"),
        (timedelta(days=3), "SUCCESS", "inactive"),
        (timedelta(minutes=2), "FAILED", "failed"),
    ],
)
def test_status_of_worker_from_latest_service_run(
    client, db, age, run_status, expected
):
    _add(
        db,
        ServiceRun(
            service_name="ingestion",
            status=run_status,
            started_at=NOW - age,
            finished_at=NOW - age,
        ),
    )
    assert _status(client)["services"]["data_ingestion"]["status"] == expected


def test_status_reports_event_totals(client, db):
    add_event(db, 1)
    add_event(db, 2)
    data = _status(client)
    assert data["data_feed"]["total_events"] == 2
    assert data["data_feed"]["latest_event_time"] is not None


def test_status_db_down_returns_500(broken_client):
    resp = broken_client.get(f"{API}/system/status")
    assert resp.status_code == 500
    assert resp.json()["error"]["code"] == "DATABASE_ERROR"


# ---------- /predictions và /classifications ----------
def _prediction(day: date, **kw):
    data = {
        "target_date": day,
        "metric_name": "daily_earthquake_count",
        "predicted_value": 120.0,
        "lower_bound": 100.0,
        "upper_bound": 150.0,
        "model_name": "ARIMA",
        "model_version": "1.0.0",
        "evaluation_metrics": {"mae": 5.0},
    }
    data.update(kw)
    return PredictionResult(**data)


def test_predictions_empty_table_returns_empty_state(client):
    body = client.get(f"{API}/predictions").json()
    assert body["success"] is False
    assert body["data"] is None
    assert body["message"]


def test_predictions_returns_latest_target_date(client, db):
    _add(db, _prediction(date(2026, 11, 10), predicted_value=1.0, lower_bound=0.0))
    _add(db, _prediction(date(2026, 11, 12)))
    data = client.get(f"{API}/predictions").json()["data"]
    assert data["target_date"] == "2026-11-12"
    low = data["confidence_interval"]["lower"]
    up = data["confidence_interval"]["upper"]
    assert 0 <= low <= data["predicted_value"] <= up


def test_predictions_db_down_returns_500(broken_client):
    resp = broken_client.get(f"{API}/predictions")
    assert resp.status_code == 500
    assert resp.json()["error"]["code"] == "DATABASE_ERROR"


def test_classifications_empty_table_returns_empty_state(client):
    body = client.get(f"{API}/classifications").json()
    assert body["success"] is False
    assert body["data"] is None


def test_classifications_returns_label_and_probabilities(client, db):
    probs = {"Low": 0.7, "Moderate": 0.2, "High": 0.05, "Critical": 0.05}
    _add(
        db,
        ClassificationResult(
            target_date=date(2026, 11, 12),
            predicted_label="Low",
            probability_scores=probs,
            model_name="RF",
            model_version="1.0.0",
            evaluation_metrics={"accuracy": 0.5},
        ),
    )
    data = client.get(f"{API}/classifications").json()["data"]
    assert data["predicted_label"] == "Low"
    assert sum(data["probabilities"].values()) == pytest.approx(1.0)


def test_classifications_db_down_returns_500(broken_client):
    assert broken_client.get(f"{API}/classifications").status_code == 500


# ---------- /analysis/* ----------
def _analysis(db, kind, interval, metrics):
    return _add(
        db,
        AnalysisResult(
            analysis_type=kind,
            time_interval=interval,
            period_start=NOW - timedelta(days=30),
            period_end=NOW,
            metrics_data=metrics,
        ),
    )


@pytest.mark.parametrize(
    "path",
    ["temporal", "trend", "seasonality", "correlation"],
)
def test_analysis_empty_table_returns_empty_state(client, path):
    resp = client.get(f"{API}/analysis/{path}")
    assert resp.status_code == 200
    assert resp.json()["success"] is False
    assert resp.json()["data"] is None


@pytest.mark.parametrize(
    "path",
    ["temporal", "trend", "seasonality", "correlation"],
)
def test_analysis_db_down_returns_500(broken_client, path):
    resp = broken_client.get(f"{API}/analysis/{path}")
    assert resp.status_code == 500
    assert resp.json()["error"]["code"] == "DATABASE_ERROR"


def test_correlation_returns_matrix(client, db):
    _analysis(
        db,
        "correlation",
        "daily",
        {"variables": ["a", "b"], "matrix": [[1, 0], [0, 1]]},
    )
    data = client.get(f"{API}/analysis/correlation").json()["data"]
    assert data["variables"] == ["a", "b"]
    assert data["method"] == "pearson"


def test_temporal_accepts_seeder_name_and_returns_histogram(client, db):
    _analysis(db, "time_series", "hourly", {"histogram": {"<2.0": 3, ">=5.0": 1}})
    data = client.get(f"{API}/analysis/temporal").json()["data"]
    assert {"bin": "<2.0", "count": 3} in data["histogram"]["magnitude_bins"]


def test_trend_maps_metric_to_series(client, db):
    _analysis(
        db,
        "trend",
        "weekly",
        {"trend_line": [{"period": "W1", "event_count": 7, "avg_magnitude": 2.5}]},
    )
    params = {"resample_freq": "W", "metric": "avg_magnitude"}
    data = client.get(f"{API}/analysis/trend", params=params).json()["data"]
    assert data["series"][0]["actual_value"] == 2.5


def test_seasonality_maps_components(client, db):
    _analysis(
        db,
        "seasonality",
        "monthly",
        {"seasonal_components": [{"cycle": "T9", "seasonal_factor": 1.2}]},
    )
    line = client.get(f"{API}/analysis/seasonality").json()["data"]["components"][
        "seasonal_line"
    ]
    assert line[0]["seasonal_factor"] == 1.2


@pytest.mark.parametrize(
    "params",
    [
        {"interval": "year"},
        {"start_time": "không phải ngày"},
        {"start_time": "2026-11-10T00:00:00Z", "end_time": "2026-11-01T00:00:00Z"},
    ],
)
def test_temporal_invalid_params_rejected(client, params):
    assert client.get(f"{API}/analysis/temporal", params=params).status_code in (
        400,
        422,
    )


def test_trend_invalid_metric_rejected(client):
    assert (
        client.get(f"{API}/analysis/trend", params={"metric": "x"}).status_code == 422
    )


# ---------- /clusters ----------
def test_clusters_empty_table_returns_empty_state(client):
    body = client.get(f"{API}/clusters").json()
    assert body["success"] is False
    assert body["data"] is None


def test_clusters_returns_latest_result_with_normalized_fields(client, db):
    _add(
        db,
        ClusteringResult(
            algorithm="DBSCAN",
            parameters={"eps": 2.5},
            total_clusters=1,
            noise_count=4,
            summary_clusters={
                "clusters": [
                    {
                        "id": 0,
                        "lat": 38.3,
                        "lon": 142.4,
                        "events_count": 32,
                        "avg_mag": 5.4,
                    }
                ]
            },
        ),
    )
    data = client.get(f"{API}/clusters").json()["data"]
    assert data["algorithm"] == "DBSCAN"
    assert data["clusters_count"] == 1
    assert data["noise_count"] == 4
    cluster = data["clusters"][0]
    assert cluster["cluster_id"] == 0
    assert cluster["center_latitude"] == 38.3
    assert cluster["event_count"] == 32


def test_clusters_db_down_returns_500(broken_client):
    assert broken_client.get(f"{API}/clusters").status_code == 500
