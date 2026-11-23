"""Tính metrics phân tích/dự báo on-the-fly cho phạm vi quốc gia/khu vực.

Tái dùng hoàn toàn hàm thuần của T3/T5 (`patterns.py`, `inference.py`) — KHÔNG ghi DB,
KHÔNG tạo `service_runs`, KHÔNG đổi snapshot toàn cục (I1/I2/I4). Khi không truyền
filter, route vẫn đi đường cũ đọc bảng tổng hợp.

Nếu dữ liệu phạm vi quá ít (`MIN_OBSERVED`) thì ném `InsufficientDataError` để route
trả Empty State — không bịa số (I5).
"""

import logging
from datetime import UTC, datetime, time, timedelta
from typing import Any

import pandas as pd
from sqlalchemy.orm import Query, Session

from gdmas.core.config import settings
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.services.analysis.patterns import (
    compute_correlation,
    compute_seasonality,
    compute_temporal,
    compute_trend_bundle,
    prepare_events,
)
from gdmas.services.prediction import inference

logger = logging.getLogger("gdmas.services.analysis.filtered")

FREQ_TO_INTERVAL = {"D": "day", "W": "week", "M": "month"}


class InsufficientDataError(RuntimeError):
    """Phạm vi được lọc không đủ dữ liệu để tính chỉ số/dự báo."""


def scope(query: Query, country: str | None, region: str | None) -> Query:
    """Áp bộ lọc country/region vào một query bất kỳ trên `earthquake_events`."""
    if country:
        query = query.filter(EarthquakeEvent.country == country)
    if region:
        query = query.filter(EarthquakeEvent.region == region)
    return query


def load_filtered_events_df(
    db: Session,
    country: str | None,
    region: str | None,
    *,
    as_of: datetime | None = None,
    window_days: int | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
) -> pd.DataFrame:
    """Nạp 6 cột `EVENT_COLUMNS` của T3 cho phạm vi đã lọc → DataFrame đã chuẩn hoá."""
    as_of = as_of or datetime.now(UTC)
    days = window_days or settings.ANALYSIS_WINDOW_DAYS
    since = as_of - timedelta(days=days)
    query = scope(
        db.query(
            EarthquakeEvent.id,
            EarthquakeEvent.event_time,
            EarthquakeEvent.magnitude,
            EarthquakeEvent.depth_km,
            EarthquakeEvent.latitude,
            EarthquakeEvent.longitude,
        ),
        country,
        region,
    ).filter(EarthquakeEvent.event_time >= since)
    if start is not None:
        query = query.filter(EarthquakeEvent.event_time >= start)
    if end is not None:
        query = query.filter(EarthquakeEvent.event_time <= end)
    rows = query.order_by(EarthquakeEvent.event_time).all()
    return prepare_events(row._asdict() for row in rows)


def compute_filtered_metrics(
    db: Session,
    kind: str,
    country: str | None,
    region: str | None,
    *,
    as_of: datetime | None = None,
    interval: str | None = None,
    metric: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
) -> dict[str, Any]:
    """Trả metrics theo đúng shape mà `build()` của từng route analysis.py mong đợi."""
    df = load_filtered_events_df(db, country, region, as_of=as_of, start=start, end=end)
    if kind == "temporal":
        return compute_temporal(df, interval or "day")
    if kind == "trend":
        mapped = FREQ_TO_INTERVAL.get(interval or "M", "month")
        bundle = compute_trend_bundle(df, mapped, as_of=as_of)
        # build() của /analysis/trend đọc m["metrics"][metric]; đảm bảo có dù df rỗng.
        bundle.setdefault("metrics", {})
        for key in ("count", "avg_magnitude", "max_magnitude"):
            bundle["metrics"].setdefault(
                key, {"series": [], "status": "insufficient_data"}
            )
        return bundle
    if kind == "seasonality":
        return compute_seasonality(df, as_of=as_of, interval=interval)
    if kind == "correlation":
        return compute_correlation(df)
    raise ValueError(f"Kind không hợp lệ: {kind}")


def filtered_day_counts(
    db: Session, country: str | None, region: str | None, today: Any
) -> dict[Any, int]:
    """Số trận/ngày UTC cho các ngày đã đủ dữ liệu — phiên bản có filter.

    Tính bằng pandas thay vì `func.timezone()` của PostgreSQL để chạy được cả trên
    SQLite trong test offline; vẫn dùng chung câu query 6 cột với T3.
    """
    now = datetime.combine(today, time.min, tzinfo=UTC)
    df = load_filtered_events_df(db, country, region, as_of=now)
    if df.empty:
        return {}
    first_complete = df["event_time"].min().date() + timedelta(days=1)
    if first_complete >= today:
        return {}
    start_ts = pd.Timestamp(first_complete, tz="UTC")
    end_ts = pd.Timestamp(today, tz="UTC")
    in_range = df[(df["event_time"] >= start_ts) & (df["event_time"] < end_ts)]
    counts = in_range.groupby(in_range["event_time"].dt.date).size()
    return {day: int(count) for day, count in counts.items()}


def build_filtered_forecast(
    db: Session, country: str | None, region: str | None, now: datetime
) -> dict[str, Any]:
    """Tính P5/P6 on-the-fly. Artifact vẫn là bản toàn cầu — ghi rõ trong UI."""
    art = inference.load_artifacts()
    today = now.date()
    counts = filtered_day_counts(db, country, region, today)
    if not counts:
        raise InsufficientDataError("Phạm vi này chưa có đủ ngày dữ liệu để dự báo.")
    series = inference.build_series(art["history"], counts, today - timedelta(days=1))
    try:
        forecast = inference.forecast_next(series)
        classification = inference.classify_next(series)
    except ValueError as exc:
        raise InsufficientDataError(str(exc)) from exc

    forecast_name, forecast_eval = inference.forecast_model_info()
    classifier_name, classifier_eval = inference.classifier_model_info()
    target_date = (today + timedelta(days=1)).isoformat()
    generated_at = now.isoformat().replace("+00:00", "Z")

    return {
        "prediction": {
            "target_date": target_date,
            "forecasted_metric": "event_count",
            "predicted_value": forecast["predicted"],
            "confidence_interval": {
                "lower": forecast["lower"],
                "upper": forecast["upper"],
            },
            "model_name": forecast_name,
            "model_version": None,
            "evaluation_metrics": forecast_eval,
            "generated_at": generated_at,
            "confidence_level": forecast_eval.get("confidence_level"),
        },
        "classification": {
            "target_date": target_date,
            "predicted_label": classification["label"],
            "probabilities": classification["probabilities"],
            "probability_scores": classification["probabilities"],
            "model_name": classifier_name,
            "model_version": None,
            "evaluation_metrics": classifier_eval,
            "generated_at": generated_at,
        },
    }
