"""Suy luận Pattern 5 và 6 từ mô hình đã huấn luyện offline (không train lại khi chạy).

Hỗ trợ: dự báo = ARIMA (thang log hoặc gốc); phân loại = phân phối dự báo.
Nếu train_models.py chọn mô hình khác (Ridge, Random Forest, Logistic) thì cần mở rộng file này.
"""

import json
from datetime import date
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA

MODEL_DIR = Path(__file__).parent / "models"
LABELS = ["Low", "Moderate", "High", "Critical"]
MIN_OBSERVED = 10  # số ngày có dữ liệu tối thiểu để dự báo


@lru_cache(maxsize=1)
def load_artifacts() -> dict:
    files = {"forecast": "forecast_model.joblib", "classifier": "risk_classifier.joblib",
             "history": "recent_history.json", "report": "training_report.json"}
    missing = [f for f in files.values() if not (MODEL_DIR / f).exists()]
    if missing:
        raise FileNotFoundError(
            f"Thiếu {missing} trong {MODEL_DIR}. Hãy chạy scripts/train_models.py trước.")
    return {
        "forecast": joblib.load(MODEL_DIR / files["forecast"]),
        "classifier": joblib.load(MODEL_DIR / files["classifier"]),
        "history": json.loads((MODEL_DIR / files["history"]).read_text(encoding="utf-8")),
        "report": json.loads((MODEL_DIR / files["report"]).read_text(encoding="utf-8")),
    }


def build_series(history: dict, db_counts: dict[date, int], last_day: date) -> pd.Series:
    """Chuỗi số trận mỗi ngày đến hết last_day: nền là lịch sử huấn luyện, DB ghi đè, ngày thiếu = NaN."""
    hist = pd.Series(history["counts"], index=pd.to_datetime(history["dates"]), dtype=float)
    idx = pd.date_range(hist.index[0], pd.Timestamp(last_day), freq="D")
    series = hist.reindex(idx)
    for day, n in db_counts.items():
        ts = pd.Timestamp(day)
        if ts in series.index:
            series.loc[ts] = float(n)
    return series


def _next_mean(series: pd.Series, art: dict) -> float:
    """Dự báo 1 bước (trong không gian mô hình) với tham số đã huấn luyện; NaN được xử lý tự động."""
    y = np.log1p(series) if art["log"] else series
    model = ARIMA(y, order=tuple(art["order"]), trend="c")
    params = pd.Series(art["params"])[model.param_names].values
    res = model.smooth(params)
    return float(res.get_forecast(steps=1).predicted_mean.iloc[0])


def _inv(art: dict):
    return np.expm1 if art["log"] else (lambda x: x)


def forecast_next(series: pd.Series) -> dict:
    art = load_artifacts()["forecast"]
    if art["type"] != "arima":
        raise NotImplementedError(f"Chưa hỗ trợ mô hình dự báo '{art['type']}' trong inference.py")
    if series.notna().sum() < MIN_OBSERVED:
        raise ValueError("Không đủ dữ liệu lịch sử để dự báo")
    m, inv = _next_mean(series, art), _inv(art)
    return {"predicted": max(0.0, float(inv(m))),
            "lower": max(0.0, float(inv(m + art["q_lo"]))),
            "upper": max(0.0, float(inv(m + art["q_hi"])))}


def classify_next(series: pd.Series) -> dict:
    art = load_artifacts()["classifier"]
    if art["type"] != "forecast_distribution":
        raise NotImplementedError(f"Chưa hỗ trợ bộ phân loại '{art['type']}' trong inference.py")
    m = _next_mean(series, art)
    counts = _inv(art)(m + np.asarray(art["resid"]))
    bins = np.digitize(counts, art["thresholds"])
    proba = np.array([(bins == k).mean() for k in range(len(LABELS))])
    return {"label": LABELS[int(proba.argmax())],
            "probabilities": {lab: round(float(p), 4) for lab, p in zip(LABELS, proba)}}


def label_of_count(count: float) -> str:
    cuts = load_artifacts()["classifier"]["thresholds"]
    return LABELS[int(np.digitize([count], cuts)[0])]


def forecast_model_info() -> tuple[str, dict]:
    rep = load_artifacts()["report"]
    name = rep["forecast_winner"]
    m = rep["forecast"][name]
    base = min(v["MAE"] for k, v in rep["forecast"].items() if k.startswith("baseline"))
    return name, {"mae": round(m["MAE"], 2), "rmse": round(m["RMSE"], 2),
                  "coverage_95": round(m.get("coverage_95", 0.0), 3), "baseline_mae": round(base, 2),
                  "confidence_level": 0.95, "n_test": rep["n_test"]}


def classifier_model_info() -> tuple[str, dict]:
    rep = load_artifacts()["report"]
    pretty = {"PhanPhoiDuBao": "Forecast-Distribution Risk Classifier",
              "RandomForest": "Random Forest Risk Classifier",
              "LogisticRegression": "Logistic Regression Risk Classifier"}
    win = rep["classifier_winner"]
    m = rep["classifier"][win]
    return pretty.get(win, win), {**{k: round(v, 3) for k, v in m.items()},
                                  "classes": LABELS, "thresholds": rep["thresholds"], "n_test": rep["n_test"]}
