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
from gdmas.services.analysis.filtered import compute_filtered_metrics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["Analysis"])


def _parse_window(raw: str | None) -> datetime | None:
    """Parse ISO 8601 UTC (có/không hậu tố Z); sai → None (không làm crash route)."""
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError:
        return None
    return parsed if parsed.tzinfo is not None else parsed.replace(tzinfo=UTC)


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
    country: str | None = Query(None, description="Lọc theo quốc gia"),
    region: str | None = Query(None, description="Lọc theo khu vực"),
    timezone: str | None = Query(
        None, pattern="^(UTC|UTC\\+7)$", description="Múi giờ hiển thị bucket ngày"
    ),
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
        data = {
            "interval": interval,
            "line_chart": m.get("line_chart", []),
            "scatter_plot": m.get("scatter_plot", []),
            "histogram": {"magnitude_bins": bins},
        }
        # Pass-through field optional đã có trong analysis.json / T3
        # (services/analysis/patterns.py:244-252). Không nội suy khi nguồn không có.
        if m.get("status") is not None:
            data["status"] = m["status"]
        stats = {
            key: m[key]
            for key in ("data_points", "avg_magnitude", "max_magnitude", "avg_depth")
            if key in m
        }
        if stats:
            data["stats"] = stats
        return data

    # Có cửa sổ (FE luôn gửi) hoặc filter → tính on-the-fly: 3 biểu đồ cùng lấy dữ liệu
    # trong khoảng Ngày/Tuần/Tháng. Snapshot chỉ dùng khi không có cả hai (I2).
    if (
        country
        or region
        or start is not None
        or end is not None
        or timezone is not None
    ):
        metrics = compute_filtered_metrics(
            db,
            "temporal",
            country,
            region,
            interval=interval,
            start=start,
            end=end,
            timezone=timezone,
        )
        return {"success": True, "data": build(metrics)}
    return _respond(db, "temporal", build, interval=interval)


@router.get("/trend")
def get_trend(
    resample_freq: str = Query("M", pattern="^(D|W|M)$"),
    metric: str = Query("count", pattern="^(count|avg_magnitude|max_magnitude)$"),
    country: str | None = Query(None, description="Lọc theo quốc gia"),
    region: str | None = Query(None, description="Lọc theo khu vực"),
    start_time: str | None = Query(None, description="ISO 8601 UTC"),
    end_time: str | None = Query(None, description="ISO 8601 UTC"),
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
        # T3 đã tính các hệ số này (services/analysis/patterns.py:366-373) nhưng
        # route trước đây bỏ qua → FE Pattern 2 / Chart A Overview hiện "—".
        for field in ("intercept", "r_squared", "p_value"):
            if source.get(field) is not None:
                data[field] = source[field]
        sample_size = source.get("sample_size")
        if sample_size is None:
            sample_size = source.get("complete_periods", source.get("data_points"))
        if sample_size is not None:
            data["sample_size"] = sample_size
        data["status"] = source.get("status") or "computed"
        return data

    start, end = _utc(start_time), _utc(end_time)
    if country or region or start or end:
        metrics = compute_filtered_metrics(
            db,
            "trend",
            country,
            region,
            interval=resample_freq,
            metric=metric,
            start=start,
            end=end,
        )
        return {"success": True, "data": build(metrics)}
    # Chỉ nhận bản đúng tần suất yêu cầu; không có thì Empty State thay vì trả tần suất khác
    return _respond(db, "trend", build, interval=resample_freq, strict_interval=True)


@router.get("/seasonality")
def get_seasonality(
    country: str | None = Query(None, description="Lọc theo quốc gia"),
    region: str | None = Query(None, description="Lọc theo khu vực"),
    interval: str | None = Query(
        None,
        pattern="^(week|month)$",
        description="Ép chu kỳ tuần (7 ngày) hoặc tháng (12 tháng)",
    ),
    start_time: str | None = Query(None, description="Từ thời điểm ISO 8601 UTC"),
    end_time: str | None = Query(None, description="Đến thời điểm ISO 8601 UTC"),
    db: Session = Depends(get_db),
):
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
        data = {
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
        # Field optional đã có trong analysis.json; nguồn T3 tại
        # services/analysis/patterns.py:470,473,482.
        for field in ("status", "period", "data_points"):
            if m.get(field) is not None:
                data[field] = m[field]
        return data

    if country or region or interval:
        metrics = compute_filtered_metrics(
            db,
            "seasonality",
            country,
            region,
            interval=interval,
            start=_parse_window(start_time),
            end=_parse_window(end_time),
        )
        return {"success": True, "data": build(metrics)}
    return _respond(db, "seasonality", build)


@router.get("/correlation")
def get_correlation(
    country: str | None = Query(None, description="Lọc theo quốc gia"),
    region: str | None = Query(None, description="Lọc theo khu vực"),
    db: Session = Depends(get_db),
):
    """Pattern 4: ma trận tương quan."""

    def build(m: dict[str, Any]) -> dict[str, Any]:
        data = {
            "variables": m.get("variables", []),
            "matrix": m.get("matrix", []),
            "method": m.get("method", "pearson"),
        }
        # status/sample_size/note đã có trong analysis.json và được T3 tính tại
        # services/analysis/patterns.py:572,577,579. Không thêm spearman_matrix/
        # undefined_pairs/corr_mag_depth — analysis.json có additionalProperties:false.
        for field in ("status", "sample_size", "note"):
            if m.get(field) is not None:
                data[field] = m[field]
        return data

    if country or region:
        metrics = compute_filtered_metrics(db, "correlation", country, region)
        return {"success": True, "data": build(metrics)}
    return _respond(db, "correlation", build)
