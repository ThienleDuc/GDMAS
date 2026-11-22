"""Test offline: `/api/v1/patterns` P5/P6 trả field optional (GAP-07).

Testcase: .agents/notes/testcase/2026-11-22-patterns-optional-fields-thien.md
"""

from datetime import UTC, date, datetime
from pathlib import Path

from gdmas.models.prediction import ClassificationResult, PredictionResult

API = "/api/v1/patterns"
GENERATED_AT = datetime(2026, 11, 22, 11, 0, tzinfo=UTC)


def _seed_prediction(db):
    db.add(
        PredictionResult(
            target_date=date(2026, 11, 23),
            metric_name="daily_earthquake_count",
            predicted_value=46.2,
            lower_bound=38.0,
            upper_bound=54.4,
            model_name="Ridge-TimeSeries-Forecaster",
            model_version="v1.2.0",
            evaluation_metrics={"mae": 4.12, "rmse": 5.84, "baseline_mae": 6.2},
            generated_at=GENERATED_AT,
        )
    )
    db.add(
        ClassificationResult(
            target_date=date(2026, 11, 23),
            predicted_label="Moderate",
            probability_scores={"Low": 0.12, "Moderate": 0.55},
            model_name="RandomForest-Seismic-Classifier",
            model_version="v2.0.0",
            evaluation_metrics={"f1_macro": 0.78, "accuracy": 0.82},
            generated_at=GENERATED_AT,
        )
    )
    db.commit()


def _pattern(body, pattern_id):
    return next(p for p in body["patterns"] if p["id"] == pattern_id)


def test_pattern_5_and_6_expose_optional_fields(client, db):
    _seed_prediction(db)

    body = client.get(API).json()

    p5 = _pattern(body, "pattern_5")["metrics"]
    assert p5["metric_name"] == "daily_earthquake_count"
    assert p5["model_version"] == "v1.2.0"
    assert p5["evaluation_metrics"]["mae"] == 4.12
    assert p5["generated_at"] == "2026-11-22T11:00:00Z"

    p6 = _pattern(body, "pattern_6")["metrics"]
    assert p6["model_version"] == "v2.0.0"
    assert p6["evaluation_metrics"]["f1_macro"] == 0.78


def test_empty_patterns_keeps_documented_shape_without_data(client):
    body = client.get(API).json()

    assert body["success"] is False
    assert body["total_patterns"] == 0
    assert body["patterns"] == []
    assert "data" not in body
    assert body["message"]


def test_contract_notes_reflect_be_now_returns_fields():
    root = Path(__file__).resolve().parents[4]
    schema = (root / "contracts/schemas/patterns.json").read_text(encoding="utf-8")
    readme = (root / "contracts/README.md").read_text(encoding="utf-8")

    assert "BE hiện chưa trả" not in schema
    assert "BE có thể bổ sung sau" not in readme
    assert "đã trả từ 2026-11-22" in schema
