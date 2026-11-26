from datetime import UTC, date, datetime
from unittest.mock import MagicMock

import pandas as pd
import pytest

from gdmas.models.prediction import ClassificationResult, PredictionResult
from gdmas.services.analysis.filtered import (
    InsufficientDataError,
    build_filtered_forecast,
)
from gdmas.services.prediction import inference
from gdmas.services.prediction.service import PredictionService


@pytest.fixture
def mocked_inference(monkeypatch):
    captured = []
    monkeypatch.setattr(inference, "load_artifacts", lambda: {"history": {}})

    def build(history, counts, last_day):
        captured.append((counts, last_day))
        return pd.Series([1.0])

    monkeypatch.setattr(inference, "build_series", build)
    monkeypatch.setattr(
        inference, "forecast_next", lambda _: {"predicted": 2, "lower": 1, "upper": 3}
    )
    monkeypatch.setattr(
        inference,
        "classify_next",
        lambda _: {"label": "Low", "probabilities": {"Low": 1}},
    )
    monkeypatch.setattr(inference, "forecast_model_info", lambda: ("forecast", {}))
    monkeypatch.setattr(inference, "classifier_model_info", lambda: ("classifier", {}))
    return captured


def test_global_uses_last_db_day_for_series_and_results(mocked_inference):
    db = MagicMock()
    db.scalar.return_value = datetime(2026, 1, 2, 23, 59, tzinfo=UTC)
    db.execute.return_value.all.return_value = [(date(2026, 1, 2), 4)]
    added = []
    db.add.side_effect = added.append
    result = PredictionService()._predict(db, datetime(2026, 3, 1, tzinfo=UTC))
    assert mocked_inference == [({date(2026, 1, 2): 4}, date(2026, 1, 2))]
    assert result["target_date"] == "2026-01-03"
    assert {
        x.target_date
        for x in added
        if isinstance(x, (PredictionResult, ClassificationResult))
    } == {date(2026, 1, 3)}


def test_global_empty_db_rejected(mocked_inference):
    db = MagicMock()
    db.scalar.return_value = None
    with pytest.raises(InsufficientDataError, match="dữ liệu DB"):
        PredictionService()._predict(db, datetime.now(UTC))
    db.add.assert_not_called()


def test_filtered_uses_scope_last_day(db, mocked_inference):
    from .conftest import add_event

    add_event(
        db, 1, country="Japan", event_time=datetime(2026, 1, 2, 23, 59, tzinfo=UTC)
    )
    add_event(db, 2, country="USA", event_time=datetime(2026, 2, 1, tzinfo=UTC))
    add_event(db, 3, country="Japan", event_time=datetime(2026, 1, 1, tzinfo=UTC))
    result = build_filtered_forecast(
        db, "Japan", None, datetime(2026, 3, 1, tzinfo=UTC)
    )
    assert mocked_inference[0][1] == date(2026, 1, 2)
    assert result["prediction"]["target_date"] == "2026-01-03"
    assert result["classification"]["target_date"] == "2026-01-03"


def test_filtered_empty_db_rejected(db, mocked_inference):
    with pytest.raises(InsufficientDataError):
        build_filtered_forecast(db, "Japan", None, datetime.now(UTC))
