"""Test offline: 4 route `/api/v1/analysis/*` pass-through field optional (GAP-02/03/04).

Testcase: .agents/notes/testcase/2026-11-22-analysis-contract-fields-thien.md
"""

from datetime import UTC, datetime, timedelta

from gdmas.models.analysis import AnalysisResult

API = "/api/v1/analysis"
AS_OF = datetime(2026, 11, 22, tzinfo=UTC)


def _seed(db, analysis_type, metrics, interval="day"):
    db.add(
        AnalysisResult(
            analysis_type=analysis_type,
            time_interval=interval,
            period_start=AS_OF - timedelta(days=30),
            period_end=AS_OF,
            metrics_data=metrics,
        )
    )
    db.commit()


def test_temporal_exposes_status_and_stats(client, db):
    _seed(
        db,
        "temporal",
        {
            "status": "computed",
            "line_chart": [],
            "scatter_plot": [],
            "histogram": {"magnitude_bins": []},
            "data_points": 1234,
            "avg_magnitude": 3.21,
            "max_magnitude": 6.4,
            "avg_depth": 18.75,
        },
    )

    data = client.get(f"{API}/temporal", params={"interval": "day"}).json()["data"]

    assert data["status"] == "computed"
    assert data["stats"] == {
        "data_points": 1234,
        "avg_magnitude": 3.21,
        "max_magnitude": 6.4,
        "avg_depth": 18.75,
    }


def test_temporal_stats_omitted_when_source_has_none(client, db):
    _seed(
        db,
        "temporal",
        {"line_chart": [], "scatter_plot": [], "histogram": {"magnitude_bins": []}},
    )

    data = client.get(f"{API}/temporal", params={"interval": "day"}).json()["data"]

    assert "stats" not in data
    assert "status" not in data


def test_seasonality_exposes_status_period_and_data_points(client, db):
    _seed(
        db,
        "seasonality",
        {
            "status": "computed",
            "resample_freq": "M",
            "period": 12,
            "data_points": 24,
            "components": {
                "seasonal_line": [
                    {
                        "cycle_index": 1,
                        "period_label": "Tháng 1",
                        "seasonal_factor": 1.05,
                    }
                ],
                "seasonality_strength": 0.35,
                "interpretation": "Dữ liệu thể hiện tính chu kỳ yếu.",
            },
        },
    )

    data = client.get(f"{API}/seasonality").json()["data"]

    assert data["status"] == "computed"
    assert data["period"] == 12
    assert data["data_points"] == 24


def test_correlation_exposes_status_sample_size_and_note(client, db):
    _seed(
        db,
        "correlation",
        {
            "status": "computed",
            "variables": ["magnitude", "depth_km"],
            "matrix": [[1.0, -0.15], [-0.15, 1.0]],
            "method": "pearson",
            "sample_size": 24,
            "note": "Ma trận tương quan — không suy diễn nhân quả.",
            "spearman_matrix": [[1.0, 0.0], [0.0, 1.0]],
        },
    )

    data = client.get(f"{API}/correlation").json()["data"]

    assert data["status"] == "computed"
    assert data["sample_size"] == 24
    assert data["note"].startswith("Ma trận tương quan")
    assert "spearman_matrix" not in data


def test_correlation_insufficient_data_keeps_note(client, db):
    _seed(
        db,
        "correlation",
        {
            "status": "insufficient_data",
            "variables": ["magnitude", "depth_km"],
            "matrix": [[None, None], [None, None]],
            "method": "pearson",
            "sample_size": 2,
            "note": "Chưa đủ mẫu để tính tương quan.",
        },
    )

    data = client.get(f"{API}/correlation").json()["data"]
    assert data["status"] == "insufficient_data"
    assert data["note"] == "Chưa đủ mẫu để tính tương quan."


def test_empty_table_still_empty_envelope(client):
    for path in ("temporal", "seasonality", "correlation"):
        body = client.get(f"{API}/{path}").json()
        assert body["success"] is False
        assert body["data"] is None
