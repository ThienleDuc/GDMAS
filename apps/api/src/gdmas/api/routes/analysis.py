import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from gdmas.api.errors import error_response
from gdmas.api.routes.predictions import _empty
from gdmas.db.connection import get_db
from gdmas.models.analysis import AnalysisResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["Analysis"])

# Chấp nhận cả tên chuẩn của API.md lẫn tên đang được demo_seeder ghi
TYPE_ALIASES = {
    "temporal": ["temporal", "time_series"],
    "trend": ["trend"],
    "seasonality": ["seasonality"],
    "correlation": ["correlation"],
}
INTERVAL_ALIASES = {
    "day": ["day", "daily", "hourly"],
    "week": ["week", "weekly"],
    "month": ["month", "monthly"],
    "D": ["day", "daily"],
    "W": ["week", "weekly"],
    "M": ["month", "monthly"],
}


def _utc(raw: str | None) -> datetime | None:
    if raw is None:
        return None
    try:
        dt = datetime.fromisoformat(raw.strip())
    except ValueError:
        return None
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt.astimezone(UTC)


def _latest(
    db: Session,
    kind: str,
    interval: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    strict_interval: bool = False,
) -> AnalysisResult | None:
    """Bản ghi mới nhất của một pattern. Ưu tiên khớp interval, không có thì lấy mới nhất.

    `strict_interval=True`: chỉ nhận bản khớp interval (không lùi sang tần suất khác).
    """
    query = db.query(AnalysisResult).filter(
        AnalysisResult.analysis_type.in_(TYPE_ALIASES[kind])
    )
    if start is not None:
        query = query.filter(AnalysisResult.period_end >= start)
    if end is not None:
        query = query.filter(AnalysisResult.period_start <= end)
    ordered = query.order_by(desc(AnalysisResult.period_end), desc(AnalysisResult.id))
    if interval is not None:
        matched = ordered.filter(
            AnalysisResult.time_interval.in_(INTERVAL_ALIASES[interval])
        ).first()
        if matched is not None or strict_interval:
            return matched
    return ordered.first()


def _respond(db: Session, kind: str, build, **filters):
    try:
        row = _latest(db, kind, **filters)
    except SQLAlchemyError as exc:
        logger.error("Lỗi CSDL khi đọc analysis_results: %s", exc)
        return error_response(
            "DATABASE_ERROR",
            "Không thể truy vấn cơ sở dữ liệu.",
            500,
            type(exc).__name__,
        )
    if row is None:
        return _empty(
            f"Chưa có kết quả Pattern '{kind}'. Hãy chạy Terminal 3 (analysis)."
        )
    return {
        "success": True,
        "data": build(row.metrics_data or {}),
    }


@router.get("/temporal")
def get_temporal(
    interval: str = Query("day", pattern="^(day|week|month)$"),
    start_time: str | None = Query(None, description="ISO 8601 UTC"),
    end_time: str | None = Query(None, description="ISO 8601 UTC"),
    db: Session = Depends(get_db),
):
    """Pattern 1: line chart, scatter plot và histogram."""
    start, end = _utc(start_time), _utc(end_time)
    for name, raw, parsed in (
        ("start_time", start_time, start),
        ("end_time", end_time, end),
    ):
        if raw is not None and parsed is None:
            return error_response(
                "VALIDATION_ERROR",
                f"{name} phải là ISO 8601 hợp lệ",
                400,
                {"field": name, "value": raw},
            )
    if start and end and start > end:
        return error_response(
            "VALIDATION_ERROR",
            "start_time không được lớn hơn end_time",
            400,
            {"field": "start_time", "value": start_time},
        )

    def build(m: dict[str, Any]) -> dict[str, Any]:
        hist = m.get("histogram", [])
        if isinstance(hist, dict) and "magnitude_bins" in hist:
            bins = hist["magnitude_bins"]
        elif isinstance(hist, dict):
            bins = [{"bin": k, "count": v} for k, v in hist.items()]
        else:
            bins = hist
        return {
            "interval": interval,
            "line_chart": m.get("line_chart", []),
            "scatter_plot": m.get("scatter_plot", []),
            "histogram": {"magnitude_bins": bins},
        }

    return _respond(db, "temporal", build, interval=interval, start=start, end=end)


@router.get("/trend")
def get_trend(
    resample_freq: str = Query("M", pattern="^(D|W|M)$"),
    metric: str = Query("count", pattern="^(count|avg_magnitude|max_magnitude)$"),
    db: Session = Depends(get_db),
):
    """Pattern 2: xu hướng sau re-sampling."""
    source_key = {
        "count": "event_count",
        "avg_magnitude": "avg_magnitude",
        "max_magnitude": "max_magnitude",
    }[metric]

    def build(m: dict[str, Any]) -> dict[str, Any]:
        per_metric = m.get("metrics")
        if isinstance(per_metric, dict) and isinstance(per_metric.get(metric), dict):
            # Định dạng T3: kết quả riêng cho từng metric
            source = per_metric[metric]
            series = source.get("series", [])
        elif "series" in m:
            # Chuỗi đã lưu chỉ đúng cho metric của chính nó; khác metric thì không gắn nhãn sai
            source = m
            if m.get("metric", "count") == metric:
                series = m["series"]
            else:
                series = []
                source = {"status": "insufficient_data"}
        else:
            # Định dạng cũ của demo_seeder (`trend_line`)
            source = m
            series = [
                {
                    "period": p.get("period"),
                    "actual_value": p.get(source_key, p.get("actual_value")),
                    "trend_value": p.get("trend_value"),
                }
                for p in m.get("trend_line", [])
            ]
        data = {
            "resample_freq": resample_freq,
            "metric": metric,
            "series": series,
            "slope": source.get("slope"),
            "trend_direction": source.get("trend_direction"),
        }
        if source.get("status") is not None:
            data["status"] = source["status"]
        return data

    # Chỉ nhận bản đúng tần suất yêu cầu; không có thì Empty State thay vì trả tần suất khác
    return _respond(db, "trend", build, interval=resample_freq, strict_interval=True)


@router.get("/seasonality")
def get_seasonality(db: Session = Depends(get_db)):
    """Pattern 3: tính chu kỳ / mùa vụ."""

    def build(m: dict[str, Any]) -> dict[str, Any]:
        comp = m.get("components", {})
        line = comp.get("seasonal_line")
        if line is None:
            line = [
                {
                    "cycle_index": i + 1,
                    "period_label": c.get("period_label", c.get("cycle")),
                    "seasonal_factor": c.get("seasonal_factor"),
                }
                for i, c in enumerate(m.get("seasonal_components", []))
            ]
        return {
            "resample_freq": m.get("resample_freq", "M"),
            "components": {
                "seasonal_line": line,
                "residual_variance": comp.get(
                    "residual_variance", m.get("residual_variance")
                ),
                "seasonality_strength": comp.get(
                    "seasonality_strength", m.get("seasonality_strength")
                ),
                "interpretation": comp.get("interpretation", m.get("interpretation")),
            },
        }

    return _respond(db, "seasonality", build)


@router.get("/correlation")
def get_correlation(db: Session = Depends(get_db)):
    """Pattern 4: ma trận tương quan."""

    def build(m: dict[str, Any]) -> dict[str, Any]:
        return {
            "variables": m.get("variables", []),
            "matrix": m.get("matrix", []),
            "method": m.get("method", "pearson"),
        }

    return _respond(db, "correlation", build)
