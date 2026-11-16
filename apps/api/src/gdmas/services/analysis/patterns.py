"""Tính toán 4 Patterns chuỗi thời gian (Terminal 3 — Analysis) từ sự kiện địa chấn thật.

Mọi hàm ở đây là hàm thuần trên pandas.DataFrame (không I/O) để kiểm thử offline.
DataFrame đầu vào gồm các cột: id, event_time (UTC), magnitude, depth_km, latitude, longitude.

Quy ước re-sampling: gom theo kỳ lịch và gán nhãn theo ngày bắt đầu kỳ
(`D`, `W-MON` đóng trái, `MS`) — cùng cách gom như `1D`/`1W`/`1ME` của pandas, chỉ khác nhãn.
"""

from __future__ import annotations

import math
from collections.abc import Iterable, Mapping
from datetime import UTC, datetime
from typing import Any

import numpy as np
import pandas as pd
from scipy import stats

EVENT_COLUMNS = ("id", "event_time", "magnitude", "depth_km", "latitude", "longitude")
CORRELATION_VARIABLES = (
    "magnitude",
    "depth_km",
    "latitude",
    "longitude",
    "daily_event_count",
)
TEMPORAL_INTERVALS = ("day", "week", "month")
SCATTER_LIMIT = 2000
TREND_MIN_PERIODS = 3
TREND_SIGNIFICANCE = 0.05
MOVING_AVERAGE_WINDOW = 3
MIN_CORRELATION_SAMPLES = 3

STATUS_COMPUTED = "computed"
STATUS_INSUFFICIENT = "insufficient_data"

# (nhãn bin, cận dưới bao gồm, cận trên không bao gồm)
MAGNITUDE_BINS: tuple[tuple[str, float, float], ...] = (
    ("< 2.0", -math.inf, 2.0),
    ("2.0 - 3.0", 2.0, 3.0),
    ("3.0 - 4.0", 3.0, 4.0),
    ("4.0 - 5.0", 4.0, 5.0),
    (">= 5.0", 5.0, math.inf),
)

_RESAMPLE_RULES: dict[str, dict[str, Any]] = {
    "day": {"rule": "D"},
    "week": {"rule": "W-MON", "closed": "left", "label": "left"},
    "month": {"rule": "MS"},
}
_INTERVAL_TO_FREQ_CODE = {"day": "D", "week": "W", "month": "M"}

_WEEKDAY_LABELS = ("Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật")
# (interval, chu kỳ, số kỳ tối thiểu, nhãn chu kỳ, mô tả cho FE)
_SEASONAL_CANDIDATES: tuple[tuple[str, int, int, str, str], ...] = (
    ("month", 12, 24, "năm (12 tháng)", "8760 giờ (chu kỳ năm)"),
    ("day", 7, 14, "tuần (7 ngày)", "168 giờ (chu kỳ tuần)"),
)
SEASONALITY_INSUFFICIENT_TEXT = (
    "Chu kỳ yếu / chưa xác định mùa vụ rõ — chưa đủ dữ liệu "
    "(cần ≥ 14 ngày cho chu kỳ tuần hoặc ≥ 24 tháng cho chu kỳ năm)."
)
CORRELATION_NOTE = (
    "Tương quan chỉ đo mức liên hệ tuyến tính/thứ hạng, không hàm ý quan hệ nhân quả."
)


# ---------------------------------------------------------------------------
# Tiện ích chung
# ---------------------------------------------------------------------------


def format_utc(ts: Any) -> str | None:
    """Định dạng thời điểm sang ISO 8601 UTC kết thúc bằng `Z`."""
    if ts is None or (isinstance(ts, float) and math.isnan(ts)) or ts is pd.NaT:
        return None
    stamp = pd.Timestamp(ts)
    stamp = (
        stamp.tz_localize("UTC") if stamp.tzinfo is None else stamp.tz_convert("UTC")
    )
    return stamp.strftime("%Y-%m-%dT%H:%M:%SZ")


def _round(value: Any, ndigits: int = 4) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return round(number, ndigits) if math.isfinite(number) else None


def sanitize_for_json(obj: Any) -> Any:
    """Đệ quy chuyển NaN/±inf → None, numpy/pandas scalar → kiểu Python, Timestamp → ISO `Z`."""
    if isinstance(obj, Mapping):
        return {str(key): sanitize_for_json(value) for key, value in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [sanitize_for_json(value) for value in obj]
    if isinstance(obj, np.ndarray):
        return [sanitize_for_json(value) for value in obj.tolist()]
    if isinstance(obj, (pd.Timestamp, datetime)):
        return format_utc(obj)
    if isinstance(obj, np.generic):
        obj = obj.item()
    if isinstance(obj, float):
        return obj if math.isfinite(obj) else None
    return obj


def prepare_events(records: Iterable[Mapping[str, Any]] | pd.DataFrame) -> pd.DataFrame:
    """Chuẩn hóa sự kiện thành DataFrame: event_time UTC, cột số dạng float, bỏ dòng thiếu, sắp theo thời gian."""
    df = (
        records.copy()
        if isinstance(records, pd.DataFrame)
        else pd.DataFrame(list(records))
    )
    if df.empty:
        return pd.DataFrame(
            {
                "id": pd.Series(dtype="int64"),
                "event_time": pd.Series(dtype="datetime64[ns, UTC]"),
                **{col: pd.Series(dtype="float64") for col in EVENT_COLUMNS[2:]},
            }
        )
    df = df.loc[:, [col for col in EVENT_COLUMNS if col in df.columns]]
    df["event_time"] = pd.to_datetime(df["event_time"], utc=True, errors="coerce")
    for col in EVENT_COLUMNS[2:]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.replace([np.inf, -np.inf], np.nan).dropna(
        subset=["event_time", "magnitude"]
    )
    df["depth_km"] = df["depth_km"].fillna(0.0)
    return df.sort_values("event_time", kind="stable").reset_index(drop=True)


def _resample(df: pd.DataFrame, interval: str) -> pd.core.resample.Resampler:
    rule = dict(_RESAMPLE_RULES[interval])
    return df.set_index("event_time").resample(rule.pop("rule"), **rule)


def _period_label(ts: pd.Timestamp, interval: str) -> str:
    return ts.strftime("%Y-%m") if interval == "month" else ts.strftime("%Y-%m-%d")


def _span_days(df: pd.DataFrame) -> float:
    if df.empty:
        return 0.0
    return (df["event_time"].max() - df["event_time"].min()).total_seconds() / 86400.0


def _period_end(ts: pd.Timestamp, interval: str) -> pd.Timestamp:
    if interval == "month":
        return ts + pd.offsets.MonthBegin(1)
    return ts + pd.Timedelta(days=7 if interval == "week" else 1)


def complete_period_mask(
    index: pd.DatetimeIndex,
    interval: str,
    df: pd.DataFrame,
    *,
    as_of: datetime | None = None,
) -> np.ndarray:
    """Đánh dấu kỳ nằm trọn trong cửa sổ dữ liệu (từ đầu ngày UTC đầu tiên tới hết ngày UTC cuối cùng).

    Kỳ ở hai đầu chỉ được phủ một phần (vd. tháng hiện tại mới qua vài ngày) sẽ làm lệch xu hướng
    nên bị loại khỏi hồi quy và phân rã mùa vụ. Khi có `as_of`, chỉ nhận kỳ đã kết thúc
    trước hoặc đúng thời điểm đó; không coi ngày hiện tại còn dở dang là ngày đầy đủ.
    """
    if df.empty or len(index) == 0:
        return np.zeros(len(index), dtype=bool)
    window_start = df["event_time"].min().floor("D")
    window_end = df["event_time"].max().floor("D") + pd.Timedelta(days=1)
    if as_of is not None:
        observed_end = pd.Timestamp(as_of)
        observed_end = (
            observed_end.tz_localize("UTC")
            if observed_end.tzinfo is None
            else observed_end.tz_convert("UTC")
        )
        window_end = min(window_end, observed_end)
    return np.array(
        [
            ts >= window_start and _period_end(ts, interval) <= window_end
            for ts in index
        ],
        dtype=bool,
    )


def _to_utc_datetime(ts: pd.Timestamp) -> datetime:
    return ts.floor("us").to_pydatetime().astimezone(UTC)


# ---------------------------------------------------------------------------
# Pattern 1 — Biểu diễn theo thời gian (Line, Scatter, Histogram)
# ---------------------------------------------------------------------------


def magnitude_histogram(df: pd.DataFrame) -> list[dict[str, Any]]:
    mags = df["magnitude"].to_numpy(dtype=float) if not df.empty else np.array([])
    return [
        {"bin": label, "count": int(((mags >= low) & (mags < high)).sum())}
        for label, low, high in MAGNITUDE_BINS
    ]


def compute_temporal(
    df: pd.DataFrame, interval: str = "day", scatter_limit: int = SCATTER_LIMIT
) -> dict[str, Any]:
    if interval not in TEMPORAL_INTERVALS:
        raise ValueError(f"interval phải thuộc {TEMPORAL_INTERVALS}, nhận {interval!r}")

    line_chart: list[dict[str, Any]] = []
    scatter_plot: list[dict[str, Any]] = []
    if not df.empty:
        grouped = _resample(df, interval)["magnitude"].agg(["count", "max", "mean"])
        line_chart = [
            {
                "date": _period_label(ts, interval),
                "event_count": int(row["count"]),
                "max_magnitude": _round(row["max"], 2),
                "avg_magnitude": _round(row["mean"], 2),
            }
            for ts, row in grouped.iterrows()
        ]
        latest = df.tail(scatter_limit)
        scatter_plot = [
            {
                "id": int(row.id),
                "timestamp": format_utc(row.event_time),
                "magnitude": _round(row.magnitude, 2),
                "depth_km": _round(row.depth_km, 2),
            }
            for row in latest.itertuples(index=False)
        ]

    return {
        "status": STATUS_COMPUTED,
        "interval": interval,
        "line_chart": line_chart,
        "scatter_plot": scatter_plot,
        "histogram": {"magnitude_bins": magnitude_histogram(df)},
        "data_points": len(df),
        "avg_magnitude": _round(df["magnitude"].mean(), 3) if not df.empty else None,
        "max_magnitude": _round(df["magnitude"].max(), 2) if not df.empty else None,
        "avg_depth": _round(df["depth_km"].mean(), 2) if not df.empty else None,
    }


# ---------------------------------------------------------------------------
# Pattern 2 — Trend Analysis sau Re-sampling
# ---------------------------------------------------------------------------


MONTHLY_MIN_SPAN_DAYS = 180
WEEKLY_MIN_SPAN_DAYS = 28


def choose_trend_interval(df: pd.DataFrame) -> str:
    """Chọn mức re-sampling sao cho có ≥ 3 kỳ đầy đủ để hồi quy.

    ≥ 180 ngày → tháng, ≥ 28 ngày → tuần, ngược lại → ngày
    (dữ liệu < 7 ngày luôn rơi về mức ngày — fallback của docs/workflow.md §7).
    """
    span = _span_days(df)
    if span >= MONTHLY_MIN_SPAN_DAYS:
        return "month"
    if span >= WEEKLY_MIN_SPAN_DAYS:
        return "week"
    return "day"


_DIRECTION_LABELS = {
    "increasing": "Tăng (Upward)",
    "decreasing": "Giảm (Downward)",
    "stable": "Ổn định (Stable)",
}


def compute_trend(
    df: pd.DataFrame,
    interval: str | None = None,
    *,
    as_of: datetime | None = None,
) -> dict[str, Any]:
    interval = interval or choose_trend_interval(df)
    counts = (
        _resample(df, interval)["magnitude"].count()
        if not df.empty
        else pd.Series(dtype=float)
    )
    actual = counts.astype(float)
    moving_avg = actual.rolling(
        MOVING_AVERAGE_WINDOW, center=True, min_periods=1
    ).mean()

    complete = complete_period_mask(actual.index, interval, df, as_of=as_of)

    series = [
        {
            "period": _period_label(ts, interval),
            "actual_value": int(actual.loc[ts]),
            "trend_value": _round(moving_avg.loc[ts], 3),
            "is_complete": bool(is_complete),
        }
        for ts, is_complete in zip(actual.index, complete, strict=True)
    ]

    slope = 0.0
    intercept: float | None = None
    p_value: float | None = None
    r_squared: float | None = None
    direction = "stable"
    # Hồi quy trên các kỳ đầy đủ; trục x là vị trí kỳ thật để giữ khoảng cách thời gian.
    x = np.flatnonzero(complete).astype(float)
    y = actual.to_numpy()[complete]
    status = STATUS_INSUFFICIENT if len(y) < TREND_MIN_PERIODS else STATUS_COMPUTED

    if status == STATUS_COMPUTED and float(np.ptp(y)) > 0:
        fit = stats.linregress(x, y)
        slope = float(fit.slope)
        intercept = float(fit.intercept)
        p_value = float(fit.pvalue)
        r_squared = float(fit.rvalue**2)
        if p_value < TREND_SIGNIFICANCE:
            direction = "increasing" if slope > 0 else "decreasing"

    mean_level = float(y.mean()) if len(y) else 0.0
    return {
        "status": status,
        "resample_freq": _INTERVAL_TO_FREQ_CODE[interval],
        "interval": interval,
        "metric": "count",
        "series": series,
        "moving_average_window": MOVING_AVERAGE_WINDOW,
        "slope": _round(slope, 6),
        "intercept": _round(intercept, 6),
        "relative_slope": _round(slope / mean_level, 6) if mean_level > 0 else None,
        "p_value": _round(p_value, 6),
        "r_squared": _round(r_squared, 6),
        "trend_direction": direction,
        "direction": _DIRECTION_LABELS[direction],
        "data_points": len(series),
        "complete_periods": len(y),
    }


# ---------------------------------------------------------------------------
# Pattern 3 — Seasonality sau Re-sampling
# ---------------------------------------------------------------------------


def _seasonal_labels(interval: str) -> list[tuple[int, str]]:
    if interval == "month":
        return [(m, f"Tháng {m}") for m in range(1, 13)]
    return [(i + 1, _WEEKDAY_LABELS[i]) for i in range(7)]


def _seasonal_position(index: pd.DatetimeIndex, interval: str) -> np.ndarray:
    return (
        index.month.to_numpy()
        if interval == "month"
        else index.day_of_week.to_numpy() + 1
    )


STRONG_SEASONALITY = 0.64
MODERATE_SEASONALITY = 0.4


def _interpret_strength(strength: float, cycle_label: str) -> str:
    if strength >= STRONG_SEASONALITY:
        return f"Dữ liệu thể hiện tính chu kỳ {cycle_label} rõ rệt (độ mạnh mùa vụ {strength:.2f})."
    if strength >= MODERATE_SEASONALITY:
        return f"Dữ liệu có tính chu kỳ {cycle_label} ở mức trung bình (độ mạnh mùa vụ {strength:.2f}); cần thêm dữ liệu để khẳng định."
    return f"Chu kỳ yếu, không có bằng chứng mùa vụ rõ rệt theo chu kỳ {cycle_label} (độ mạnh mùa vụ {strength:.2f})."


def compute_seasonality(
    df: pd.DataFrame, *, as_of: datetime | None = None
) -> dict[str, Any]:
    """Tách thành phần mùa vụ bằng seasonal_decompose khi đủ ≥ 2 chu kỳ; không mặc định có mùa vụ (P-03)."""
    from statsmodels.tsa.seasonal import seasonal_decompose

    for interval, period, min_points, cycle_label, cycle_hours in _SEASONAL_CANDIDATES:
        if df.empty:
            break
        counts = _resample(df, interval)["magnitude"].count().astype(float)
        counts = counts[complete_period_mask(counts.index, interval, df, as_of=as_of)]
        if len(counts) < min_points:
            continue

        decomposition = seasonal_decompose(counts, model="additive", period=period)
        seasonal = decomposition.seasonal
        resid = decomposition.resid.dropna()
        detrended = (seasonal + decomposition.resid).dropna()

        resid_var = float(np.var(resid.to_numpy())) if len(resid) else 0.0
        detrended_var = float(np.var(detrended.to_numpy())) if len(detrended) else 0.0
        strength = (
            max(0.0, 1.0 - resid_var / detrended_var) if detrended_var > 0 else 0.0
        )
        strength = min(strength, 1.0)

        positions = _seasonal_position(seasonal.index, interval)
        effect_by_position = pd.Series(seasonal.to_numpy()).groupby(positions).mean()
        mean_level = float(counts.mean())

        seasonal_line = []
        for position, label in _seasonal_labels(interval):
            effect = float(effect_by_position.get(position, 0.0))
            factor = 1.0 + effect / mean_level if mean_level > 0 else 1.0
            seasonal_line.append(
                {
                    "cycle_index": position,
                    "period_label": label,
                    "seasonal_factor": _round(factor, 4),
                    "seasonal_effect": _round(effect, 4),
                }
            )
        effects = [p["seasonal_effect"] or 0.0 for p in seasonal_line]
        return {
            "status": STATUS_COMPUTED,
            "resample_freq": _INTERVAL_TO_FREQ_CODE[interval],
            "interval": interval,
            "period": period,
            "components": {
                "seasonal_line": seasonal_line,
                "residual_variance": _round(resid_var, 6),
                "seasonality_strength": _round(strength, 4),
                "interpretation": _interpret_strength(strength, cycle_label),
            },
            "cycle_hours": cycle_hours,
            "amplitude": _round(max(effects) - min(effects), 4),
            "data_points": len(counts),
        }

    return {
        "status": STATUS_INSUFFICIENT,
        "resample_freq": None,
        "interval": None,
        "period": None,
        "components": {
            "seasonal_line": [],
            "residual_variance": None,
            "seasonality_strength": None,
            "interpretation": SEASONALITY_INSUFFICIENT_TEXT,
        },
        "cycle_hours": None,
        "amplitude": None,
        "data_points": len(df),
    }


# ---------------------------------------------------------------------------
# Pattern 4 — Correlation Matrix đa biến
# ---------------------------------------------------------------------------


def _clean_matrix(matrix: pd.DataFrame, valid: list[bool]) -> list[list[float | None]]:
    values = matrix.to_numpy(dtype=float)
    values = (values + values.T) / 2.0
    values = np.clip(values, -1.0, 1.0)
    size = len(valid)
    cleaned: list[list[float | None]] = []
    for i in range(size):
        row: list[float | None] = []
        for j in range(size):
            if not (valid[i] and valid[j]):
                row.append(None)
            elif i == j:
                row.append(1.0)
            else:
                row.append(_round(values[i, j], 4))
        cleaned.append(row)
    return cleaned


def _describe_correlation(r: float | None) -> str:
    if r is None:
        return "Không xác định"
    magnitude = abs(r)
    if magnitude < 0.1:
        return "Không đáng kể"
    sign = "thuận" if r > 0 else "nghịch"
    level = "yếu" if magnitude < 0.3 else "trung bình" if magnitude < 0.5 else "mạnh"
    return f"Tuyến tính {sign} {level}"


def compute_correlation(df: pd.DataFrame) -> dict[str, Any]:
    variables = list(CORRELATION_VARIABLES)
    frame = pd.DataFrame(columns=variables, dtype=float)
    if not df.empty:
        frame = df.loc[:, ["magnitude", "depth_km", "latitude", "longitude"]].astype(
            float
        )
        day = df["event_time"].dt.floor("D")
        frame["daily_event_count"] = (
            day.map(day.value_counts()).astype(float).to_numpy()
        )

    sample_size = len(frame)
    variances = frame.var(ddof=0) if sample_size else pd.Series(0.0, index=variables)
    valid = [
        sample_size >= MIN_CORRELATION_SAMPLES
        and float(variances.get(var, 0.0) or 0.0) > 0
        for var in variables
    ]

    if sample_size >= MIN_CORRELATION_SAMPLES:
        pearson = _clean_matrix(frame.corr(method="pearson"), valid)
        spearman = _clean_matrix(frame.corr(method="spearman"), valid)
    else:
        pearson = _clean_matrix(pd.DataFrame(np.eye(len(variables))), valid)
        spearman = [row[:] for row in pearson]

    undefined_pairs = [
        [variables[i], variables[j]]
        for i in range(len(variables))
        for j in range(i + 1, len(variables))
        if pearson[i][j] is None
    ]
    corr_mag_depth = pearson[0][1]
    return {
        "status": STATUS_COMPUTED if any(valid) else STATUS_INSUFFICIENT,
        "variables": variables,
        "matrix": pearson,
        "method": "pearson",
        "spearman_matrix": spearman,
        "sample_size": sample_size,
        "undefined_pairs": undefined_pairs,
        "note": CORRELATION_NOTE,
        "corr_mag_depth": corr_mag_depth,
        "correlation_strength": _describe_correlation(corr_mag_depth),
    }


# ---------------------------------------------------------------------------
# Snapshot ghi analysis_results
# ---------------------------------------------------------------------------


def build_analysis_snapshot(
    df: pd.DataFrame, *, as_of: datetime | None = None
) -> list[dict[str, Any]]:
    """Tạo danh sách bản ghi analysis_results (chưa gắn service_run_id) cho Pattern 1–4.

    Trả [] khi không có sự kiện nào — không sinh số liệu giả.
    """
    if df.empty:
        return []

    period_start = _to_utc_datetime(df["event_time"].min())
    period_end = _to_utc_datetime(df["event_time"].max())

    def item(
        analysis_type: str, time_interval: str, metrics: dict[str, Any]
    ) -> dict[str, Any]:
        return {
            "analysis_type": analysis_type,
            "time_interval": time_interval,
            "period_start": period_start,
            "period_end": period_end,
            "metrics_data": sanitize_for_json(metrics),
        }

    snapshot = [
        item("time_series", interval, compute_temporal(df, interval))
        for interval in TEMPORAL_INTERVALS
    ]
    trend = compute_trend(df, as_of=as_of)
    snapshot.append(item("trend", trend["interval"], trend))
    seasonality = compute_seasonality(df, as_of=as_of)
    snapshot.append(item("seasonality", seasonality["interval"] or "day", seasonality))
    snapshot.append(item("correlation", "day", compute_correlation(df)))
    return snapshot
