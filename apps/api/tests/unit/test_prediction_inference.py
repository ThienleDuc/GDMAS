"""Test offline cho suy luận Pattern 5 và 6 (services/prediction/inference.py).

Không cần mô hình thật: fixture tự huấn luyện ARIMA nhỏ trên chuỗi giả lập.
"""

from datetime import date

import numpy as np
import pandas as pd
import pytest
from statsmodels.tsa.arima.model import ARIMA

from gdmas.services.prediction import inference

THRESHOLDS = [90.0, 105.0, 120.0]


def _daily_series(n: int = 40, seed: int = 0) -> pd.Series:
    rng = np.random.default_rng(seed)
    idx = pd.date_range("2026-01-01", periods=n, freq="D")
    return pd.Series(100 + rng.normal(0, 10, n), index=idx)


def _arima_params(series: pd.Series) -> dict:
    return ARIMA(series, order=(1, 0, 0), trend="c").fit().params.to_dict()


def _artifacts(log: bool = False, q_lo: float = -20.0, q_hi: float = 20.0) -> dict:
    base = _daily_series(120, seed=1)
    train = np.log1p(base) if log else base
    params = _arima_params(train)
    rng = np.random.default_rng(2)
    resid = (rng.normal(0, 0.1, 300) if log else rng.normal(0, 10, 300)).tolist()
    return {
        "forecast": {
            "type": "arima",
            "order": [1, 0, 0],
            "log": log,
            "params": params,
            "q_lo": q_lo,
            "q_hi": q_hi,
        },
        "classifier": {
            "type": "forecast_distribution",
            "order": [1, 0, 0],
            "log": log,
            "params": params,
            "resid": resid,
            "thresholds": THRESHOLDS,
            "labels": inference.LABELS,
        },
        "history": {"dates": [], "counts": []},
        "report": {
            "forecast_winner": "ARIMA(1, 0, 0)",
            "forecast": {
                "baseline_hom_qua": {"MAE": 8.0, "RMSE": 10.0},
                "baseline_tb_7_ngay": {"MAE": 6.5, "RMSE": 8.0},
                "ARIMA(1, 0, 0)": {
                    "MAE": 5.123,
                    "RMSE": 6.789,
                    "coverage_95": 0.9567,
                },
            },
            "classifier_winner": "PhanPhoiDuBao",
            "classifier": {
                "PhanPhoiDuBao": {
                    "accuracy": 0.51234,
                    "f1_macro": 0.26412,
                    "within_1_level": 0.8612,
                }
            },
            "thresholds": THRESHOLDS,
            "n_test": 144,
        },
    }


@pytest.fixture
def arts(monkeypatch):
    data = _artifacts()
    monkeypatch.setattr(inference, "load_artifacts", lambda: data)
    return data


@pytest.fixture
def arts_log(monkeypatch):
    data = _artifacts(log=True, q_lo=-0.2, q_hi=0.2)
    monkeypatch.setattr(inference, "load_artifacts", lambda: data)
    return data


# ---------- build_series ----------
def test_build_series_db_overrides_history():
    history = {
        "dates": ["2026-03-01", "2026-03-02", "2026-03-03"],
        "counts": [10, 20, 30],
    }
    series = inference.build_series(history, {date(2026, 3, 2): 99}, date(2026, 3, 3))
    assert series.tolist() == [10.0, 99.0, 30.0]
    assert series.index[0] == pd.Timestamp("2026-03-01")


def test_build_series_extends_to_last_day_with_nan_for_missing_days():
    history = {"dates": ["2026-03-01", "2026-03-02"], "counts": [10, 20]}
    series = inference.build_series(history, {date(2026, 3, 4): 7}, date(2026, 3, 5))
    assert len(series) == 5
    assert np.isnan(series.loc["2026-03-03"])
    assert series.loc["2026-03-04"] == 7.0
    assert np.isnan(series.loc["2026-03-05"])


def test_build_series_ignores_db_days_outside_range():
    history = {"dates": ["2026-03-02", "2026-03-03"], "counts": [10, 20]}
    db_counts = {date(2026, 3, 1): 5, date(2026, 3, 9): 6}
    series = inference.build_series(history, db_counts, date(2026, 3, 3))
    assert series.tolist() == [10.0, 20.0]


def test_build_series_empty_db_keeps_history():
    history = {"dates": ["2026-03-01", "2026-03-02"], "counts": [10, 20]}
    series = inference.build_series(history, {}, date(2026, 3, 2))
    assert series.tolist() == [10.0, 20.0]


# ---------- forecast_next (Pattern 5) ----------
@pytest.mark.parametrize("fixture_name", ["arts", "arts_log"])
def test_forecast_bounds_are_ordered_and_non_negative(request, fixture_name):
    request.getfixturevalue(fixture_name)
    result = inference.forecast_next(_daily_series(40))
    assert 0.0 <= result["lower"] <= result["predicted"] <= result["upper"]


def test_forecast_is_close_to_series_level(arts):
    result = inference.forecast_next(_daily_series(40))
    assert 60 < result["predicted"] < 140


def test_forecast_lower_bound_is_clipped_at_zero(monkeypatch):
    data = _artifacts(q_lo=-1000.0, q_hi=20.0)
    monkeypatch.setattr(inference, "load_artifacts", lambda: data)
    result = inference.forecast_next(_daily_series(40))
    assert result["lower"] == 0.0
    assert result["predicted"] >= 0.0


def test_forecast_tolerates_missing_days(arts):
    series = _daily_series(40)
    series.iloc[[5, 6, 20]] = np.nan
    result = inference.forecast_next(series)
    assert 0.0 <= result["lower"] <= result["predicted"] <= result["upper"]


def test_forecast_raises_when_history_too_short(arts):
    series = _daily_series(40)
    series.iloc[: 40 - (inference.MIN_OBSERVED - 1)] = np.nan
    with pytest.raises(ValueError):
        inference.forecast_next(series)


def test_forecast_raises_on_empty_series(arts):
    with pytest.raises(ValueError):
        inference.forecast_next(pd.Series(dtype=float))


def test_forecast_rejects_unsupported_model_type(arts):
    arts["forecast"]["type"] = "ridge"
    with pytest.raises(NotImplementedError):
        inference.forecast_next(_daily_series(40))


# ---------- classify_next (Pattern 6) ----------
@pytest.mark.parametrize("fixture_name", ["arts", "arts_log"])
def test_classify_probabilities_valid(request, fixture_name):
    request.getfixturevalue(fixture_name)
    result = inference.classify_next(_daily_series(40))
    probs = result["probabilities"]
    assert list(probs) == inference.LABELS
    assert all(p >= 0.0 for p in probs.values())
    assert sum(probs.values()) == pytest.approx(1.0, abs=1e-3)


def test_classify_label_is_most_probable(arts):
    result = inference.classify_next(_daily_series(40))
    probs = result["probabilities"]
    assert result["label"] in inference.LABELS
    assert probs[result["label"]] == max(probs.values())


def test_classify_high_level_series_gives_higher_label(arts):
    # Mô hình nhớ mạnh (AR 0.9) nên mức hôm qua quyết định mức dự báo ngày mai
    arts["classifier"]["params"] = {"const": 0.0, "ar.L1": 0.9, "sigma2": 1.0}
    low = inference.classify_next(_daily_series(40) * 0.3)
    high = inference.classify_next(_daily_series(40) * 1.5)
    rank = {label: i for i, label in enumerate(inference.LABELS)}
    assert low["label"] == "Low"
    assert rank[high["label"]] > rank[low["label"]]


def test_classify_rejects_unsupported_classifier_type(arts):
    arts["classifier"]["type"] = "sklearn"
    with pytest.raises(NotImplementedError):
        inference.classify_next(_daily_series(40))


# ---------- label_of_count ----------
@pytest.mark.parametrize(
    ("count", "expected"),
    [
        (0, "Low"),
        (89.9, "Low"),
        (90, "Moderate"),
        (104.9, "Moderate"),
        (105, "High"),
        (119.9, "High"),
        (120, "Critical"),
        (5000, "Critical"),
    ],
)
def test_label_of_count_boundaries(arts, count, expected):
    assert inference.label_of_count(count) == expected


# ---------- thông tin mô hình ----------
def test_forecast_model_info_uses_best_baseline(arts):
    name, info = inference.forecast_model_info()
    assert name == "ARIMA(1, 0, 0)"
    assert info["baseline_mae"] == 6.5
    assert info["mae"] == 5.12
    assert info["rmse"] == 6.79
    assert info["confidence_level"] == 0.95
    assert info["n_test"] == 144


def test_classifier_model_info_has_readable_name_and_metrics(arts):
    name, info = inference.classifier_model_info()
    assert name == "Forecast-Distribution Risk Classifier"
    assert info["accuracy"] == 0.512
    assert info["f1_macro"] == 0.264
    assert info["classes"] == inference.LABELS
    assert info["thresholds"] == THRESHOLDS


# ---------- load_artifacts ----------
def test_load_artifacts_reports_missing_files(tmp_path, monkeypatch):
    monkeypatch.setattr(inference, "MODEL_DIR", tmp_path)
    inference.load_artifacts.cache_clear()
    try:
        with pytest.raises(FileNotFoundError, match="train_models.py"):
            inference.load_artifacts()
    finally:
        inference.load_artifacts.cache_clear()
