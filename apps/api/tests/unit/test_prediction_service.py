"""Test offline cho PredictionService (services/prediction/service.py).

Dùng session giả thay cho PostgreSQL: kiểm tra logic ghi prediction_results,
classification_results, cập nhật actual_value và ghi ServiceRun.
"""

from datetime import UTC, date, datetime

import numpy as np
import pandas as pd
import pytest
from statsmodels.tsa.arima.model import ARIMA

from gdmas.models.prediction import ClassificationResult, PredictionResult
from gdmas.models.service_run import ServiceRun
from gdmas.services.prediction import inference, service
from gdmas.services.prediction.service import PredictionService

NOW = datetime(2026, 11, 12, 10, 0, tzinfo=UTC)
TODAY = NOW.date()


# ---------- session giả ----------
class FakeQuery:
    def __init__(self, session, model):
        self.session = session
        self.model = model

    def filter(self, *_args, **_kwargs):
        return self

    def delete(self, **_kwargs):
        self.session.deleted.append(self.model)
        return 1

    def __iter__(self):
        return iter(self.session.rows.get(self.model, []))


class FakeSession:
    def __init__(self, first_ts=None, rows=None, group_rows=None):
        self.first_ts = first_ts
        self.group_rows = group_rows or []
        self.rows = rows or {}
        self.added: list = []
        self.deleted: list = []
        self.commits = 0
        self.rollbacks = 0

    def __enter__(self):
        return self

    def __exit__(self, *_exc):
        return False

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1

    def scalar(self, _stmt):
        return self.first_ts

    def execute(self, _stmt):
        return self

    def all(self):
        return self.group_rows

    def query(self, model):
        return FakeQuery(self, model)

    def of_type(self, cls):
        return [o for o in self.added if isinstance(o, cls)]


# ---------- artifact ARIMA nhỏ cho test end-to-end ----------
def _artifacts() -> dict:
    rng = np.random.default_rng(1)
    idx = pd.date_range("2026-01-01", periods=120, freq="D")
    base = pd.Series(100 + rng.normal(0, 10, 120), index=idx)
    params = ARIMA(base, order=(1, 0, 0), trend="c").fit().params.to_dict()
    thresholds = [90.0, 105.0, 120.0]
    dates = pd.date_range("2026-09-01", "2026-11-05", freq="D")
    return {
        "forecast": {
            "type": "arima",
            "order": [1, 0, 0],
            "log": False,
            "params": params,
            "q_lo": -20.0,
            "q_hi": 20.0,
        },
        "classifier": {
            "type": "forecast_distribution",
            "order": [1, 0, 0],
            "log": False,
            "params": params,
            "resid": rng.normal(0, 10, 300).tolist(),
            "thresholds": thresholds,
        },
        "history": {
            "dates": [d.strftime("%Y-%m-%d") for d in dates],
            "counts": [int(x) for x in 100 + rng.normal(0, 10, len(dates))],
        },
        "report": {
            "forecast_winner": "ARIMA(1, 0, 0)",
            "forecast": {
                "baseline_tb_7_ngay": {"MAE": 6.5, "RMSE": 8.0},
                "ARIMA(1, 0, 0)": {"MAE": 5.1, "RMSE": 6.8, "coverage_95": 0.95},
            },
            "classifier_winner": "PhanPhoiDuBao",
            "classifier": {
                "PhanPhoiDuBao": {
                    "accuracy": 0.5,
                    "f1_macro": 0.26,
                    "within_1_level": 0.86,
                }
            },
            "thresholds": thresholds,
            "n_test": 144,
        },
    }


@pytest.fixture
def real_inference(monkeypatch):
    data = _artifacts()
    monkeypatch.setattr(inference, "load_artifacts", lambda: data)
    return data


# ---------- _complete_day_counts ----------
def test_complete_day_counts_empty_db_returns_empty():
    db = FakeSession(first_ts=None)
    assert PredictionService._complete_day_counts(db, TODAY) == {}


def test_complete_day_counts_first_event_today_returns_empty():
    # Ngày có sự kiện đầu tiên chưa đủ 24 giờ nên không có ngày hoàn chỉnh nào
    db = FakeSession(first_ts=datetime(2026, 11, 12, 1, 0, tzinfo=UTC))
    assert PredictionService._complete_day_counts(db, TODAY) == {}


def test_complete_day_counts_first_event_yesterday_returns_empty():
    db = FakeSession(first_ts=datetime(2026, 11, 11, 23, 0, tzinfo=UTC))
    assert PredictionService._complete_day_counts(db, TODAY) == {}


def test_complete_day_counts_maps_rows_to_dates():
    db = FakeSession(
        first_ts=datetime(2026, 11, 8, 3, 0, tzinfo=UTC),
        group_rows=[(date(2026, 11, 9), 40), (date(2026, 11, 10), 55)],
    )
    assert PredictionService._complete_day_counts(db, TODAY) == {
        date(2026, 11, 9): 40,
        date(2026, 11, 10): 55,
    }


# ---------- _fill_actuals ----------
def test_fill_actuals_sets_value_and_label_for_known_days(real_inference):
    pred = PredictionResult(target_date=date(2026, 11, 10), actual_value=None)
    cls = ClassificationResult(target_date=date(2026, 11, 10), actual_label=None)
    db = FakeSession(rows={PredictionResult: [pred], ClassificationResult: [cls]})
    PredictionService._fill_actuals(db, {date(2026, 11, 10): 130}, TODAY)
    assert pred.actual_value == 130.0
    assert cls.actual_label == "Critical"


def test_fill_actuals_keeps_none_when_day_missing_in_db(real_inference):
    pred = PredictionResult(target_date=date(2026, 11, 9), actual_value=None)
    cls = ClassificationResult(target_date=date(2026, 11, 9), actual_label=None)
    db = FakeSession(rows={PredictionResult: [pred], ClassificationResult: [cls]})
    PredictionService._fill_actuals(db, {date(2026, 11, 10): 130}, TODAY)
    assert pred.actual_value is None
    assert cls.actual_label is None


def test_fill_actuals_with_empty_db_does_nothing(real_inference):
    pred = PredictionResult(target_date=date(2026, 11, 10), actual_value=None)
    db = FakeSession(rows={PredictionResult: [pred]})
    PredictionService._fill_actuals(db, {}, TODAY)
    assert pred.actual_value is None


# ---------- _predict (end-to-end với suy luận thật) ----------
def test_predict_writes_valid_prediction_and_classification(real_inference):
    db = FakeSession(first_ts=None)  # DB rỗng: chỉ dùng lịch sử huấn luyện
    result = PredictionService()._predict(db, NOW)

    (pred,) = db.of_type(PredictionResult)
    (cls,) = db.of_type(ClassificationResult)

    assert result["success"] is True
    assert result["target_date"] == "2026-11-12"
    assert pred.target_date == TODAY
    assert pred.metric_name == service.METRIC_NAME
    assert 0.0 <= pred.lower_bound <= pred.predicted_value <= pred.upper_bound
    assert pred.model_version == service.MODEL_VERSION
    assert pred.evaluation_metrics["history_days_observed"] > 0
    assert pred.evaluation_metrics["baseline_mae"] == 6.5

    assert cls.target_date == TODAY
    assert cls.predicted_label in inference.LABELS
    probs = cls.probability_scores
    assert all(p >= 0.0 for p in probs.values())
    assert sum(probs.values()) == pytest.approx(1.0, abs=1e-3)
    assert probs[cls.predicted_label] == max(probs.values())
    assert db.commits == 1


def test_predict_replaces_existing_rows_of_target_date(real_inference):
    db = FakeSession(first_ts=None)
    PredictionService()._predict(db, NOW)
    assert PredictionResult in db.deleted
    assert ClassificationResult in db.deleted


def test_predict_uses_db_counts_over_history(real_inference):
    # Mô hình nhớ mạnh (AR 0.9): dự báo bám theo mức của các ngày gần nhất
    strong = {"const": 0.0, "ar.L1": 0.9, "sigma2": 1.0}
    real_inference["forecast"]["params"] = strong
    real_inference["classifier"]["params"] = strong

    baseline = PredictionService()._predict(FakeSession(first_ts=None), NOW)

    first = datetime(2026, 11, 1, 5, 0, tzinfo=UTC)
    rows = [(date(2026, 11, d), 300) for d in range(2, 12)]
    db = FakeSession(first_ts=first, group_rows=rows)
    result = PredictionService()._predict(db, NOW)

    # DB ghi đè lịch sử huấn luyện: ngày cuối ~300 nên dự báo ~270, cao hơn hẳn
    assert result["predicted"] > baseline["predicted"] + 100
    assert result["predicted"] == pytest.approx(270, abs=5)


def test_predict_truncates_long_model_names(real_inference, monkeypatch):
    monkeypatch.setattr(
        inference, "forecast_model_info", lambda: ("X" * 200, {"mae": 1.0})
    )
    db = FakeSession(first_ts=None)
    PredictionService()._predict(db, NOW)
    (pred,) = db.of_type(PredictionResult)
    assert len(pred.model_name) == 64


def test_predict_fails_cleanly_when_history_too_short(real_inference):
    real_inference["history"] = {"dates": ["2026-11-05"], "counts": [100]}
    db = FakeSession(first_ts=None)
    with pytest.raises(ValueError):
        PredictionService()._predict(db, NOW)
    assert db.of_type(PredictionResult) == []
    assert db.of_type(ClassificationResult) == []


# ---------- execute_cycle ----------
def test_execute_cycle_records_success_service_run(real_inference, monkeypatch):
    db = FakeSession(first_ts=None)
    monkeypatch.setattr(service, "SessionLocal", lambda: db)
    result = PredictionService().execute_cycle()

    assert result["success"] is True
    (run,) = db.of_type(ServiceRun)
    assert run.service_name == "prediction"
    assert run.status == "SUCCESS"
    assert run.records_processed == 2
    assert run.finished_at is not None
    assert run.error_message is None


def test_execute_cycle_records_failure_without_raising(real_inference, monkeypatch):
    real_inference["history"] = {"dates": ["2026-11-05"], "counts": [100]}
    db = FakeSession(first_ts=None)
    monkeypatch.setattr(service, "SessionLocal", lambda: db)

    result = PredictionService().execute_cycle()  # không được ném ngoại lệ

    assert result["success"] is False
    assert "error" in result
    (run,) = db.of_type(ServiceRun)
    assert run.status == "FAILED"
    assert run.error_message
    assert run.finished_at is not None
    assert db.rollbacks == 1


def test_execute_cycle_truncates_error_message(monkeypatch):
    def boom(*_args, **_kwargs):
        raise RuntimeError("x" * 5000)

    db = FakeSession(first_ts=None)
    monkeypatch.setattr(service, "SessionLocal", lambda: db)
    monkeypatch.setattr(PredictionService, "_predict", boom)

    result = PredictionService().execute_cycle()

    assert result["success"] is False
    (run,) = db.of_type(ServiceRun)
    assert len(run.error_message) == 1000


def test_execute_cycle_fails_when_model_files_missing(monkeypatch, tmp_path):
    monkeypatch.setattr(inference, "MODEL_DIR", tmp_path)
    inference.load_artifacts.cache_clear()
    db = FakeSession(first_ts=None)
    monkeypatch.setattr(service, "SessionLocal", lambda: db)
    try:
        result = PredictionService().execute_cycle()
    finally:
        inference.load_artifacts.cache_clear()
    assert result["success"] is False
    (run,) = db.of_type(ServiceRun)
    assert run.status == "FAILED"
