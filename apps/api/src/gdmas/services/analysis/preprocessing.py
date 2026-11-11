"""UTC normalization and calendar buckets shared by the four patterns."""

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import numpy as np
import pandas as pd

from gdmas.schemas.analysis_metrics import Metadata

FREQUENCIES = {"day": "1D", "week": "1W", "month": "1ME"}
PERIODS = {"day": "D", "week": "W-SUN", "month": "M"}
NUMERIC_COLUMNS = ("magnitude", "depth_km", "latitude", "longitude")


def finite(value: Any) -> float | None:
    return float(value) if pd.notna(value) and np.isfinite(value) else None


def utc_timestamp(value: datetime) -> pd.Timestamp:
    stamp = pd.Timestamp(value)
    if stamp.tzinfo is None:
        raise ValueError("Analysis boundaries must be timezone-aware")
    return stamp.tz_convert("UTC")


@dataclass(frozen=True)
class PreparedData:
    frame: pd.DataFrame
    start: datetime
    end: datetime
    input_events: int
    excluded_values: dict[str, int]

    def metadata(self, quality: str = "OK", reason: str | None = None) -> dict:
        if self.frame.empty:
            quality, reason = "EMPTY", "No valid events in the selected window"
        return Metadata(
            computed_at=self.end,
            period_start=self.start,
            period_end=self.end,
            input_events=self.input_events,
            valid_events=len(self.frame),
            excluded_values=self.excluded_values,
            data_quality=quality,
            reason=reason,
        ).model_dump(mode="json")


def prepare_events(
    events: Iterable[Mapping[str, Any]],
    *,
    computed_at: datetime | None = None,
    lookback_days: int | None = None,
) -> PreparedData:
    if lookback_days is not None and lookback_days <= 0:
        raise ValueError("lookback_days must be positive")
    end = utc_timestamp(computed_at or datetime.now(UTC))
    records = list(events)
    frame = pd.DataFrame(records, columns=["id", "event_time", *NUMERIC_COLUMNS])
    frame["event_time"] = pd.to_datetime(
        frame["event_time"], utc=True, errors="coerce", format="mixed"
    )
    excluded = {"event_time": int(frame["event_time"].isna().sum())}
    frame = frame.dropna(subset=["event_time"])
    start = end - timedelta(days=lookback_days) if lookback_days else None
    selected = frame["event_time"] <= end
    if start is not None:
        selected &= frame["event_time"] >= start
    excluded["outside_window"] = int((~selected).sum())
    frame = frame.loc[selected].copy()
    for name in NUMERIC_COLUMNS:
        values = pd.to_numeric(frame[name], errors="coerce").astype(float)
        values = values.where(np.isfinite(values))
        if name in ("latitude", "longitude"):
            limit = 90 if name == "latitude" else 180
            values = values.where(values.between(-limit, limit))
        excluded[name] = int(values.isna().sum())
        frame[name] = values
    with np.errstate(over="ignore", invalid="ignore"):
        energy = np.power(10.0, 4.8 + 1.5 * frame["magnitude"])
    frame["energy_joules"] = energy.where(np.isfinite(energy))
    excluded["energy_joules"] = int(frame["energy_joules"].isna().sum())
    frame = frame.set_index("event_time").sort_index()
    if start is None:
        start = frame.index.min() if not frame.empty else end
    return PreparedData(
        frame, start.to_pydatetime(), end.to_pydatetime(), len(records), excluded
    )


def aggregate(data: PreparedData, interval: str) -> pd.DataFrame:
    """Count events even if individual measurements are missing."""
    freq = FREQUENCIES[interval]
    if data.frame.empty:
        # Pandas 2.2 named aggregation of an empty resampler can produce a
        # MultiIndex. Keep a stable UTC index and column types on every version.
        index = pd.DatetimeIndex([], tz="UTC", name="event_time")
        dtypes = {
            "event_count": "int64",
            "avg_magnitude": "float64",
            "max_magnitude": "float64",
            "avg_depth": "float64",
            "energy_joules": "float64",
            "bucket_start": "datetime64[ns, UTC]",
            "bucket_end": "datetime64[ns, UTC]",
            "partial": "bool",
        }
        return pd.DataFrame(
            {
                name: pd.Series(index=index, dtype=dtype)
                for name, dtype in dtypes.items()
            },
            index=index,
        )
    closed = "left" if interval == "day" else "right"
    label = "left" if interval == "day" else "right"
    buckets = data.frame.resample(freq, closed=closed, label=label)
    result = buckets.agg(
        event_count=("id", "size"),
        avg_magnitude=("magnitude", "mean"),
        max_magnitude=("magnitude", "max"),
        avg_depth=("depth_km", "mean"),
    )
    result["energy_joules"] = buckets["energy_joules"].sum(min_count=1)
    observed_start = pd.Timestamp(data.start)
    if not data.frame.empty:
        # Include quiet buckets after the most recent event up to the selected
        # boundary. An event exactly at the end still belongs to its own bucket.
        last = max(
            pd.Timestamp(data.end) - pd.Timedelta(1, "ns"), data.frame.index.max()
        )
        # A long requested lookback is not evidence of observations before the
        # first event; never manufacture years of leading zero history.
        observed_start = max(observed_start, data.frame.index.min())
        first = observed_start.tz_localize(None).to_period(PERIODS[interval])
        final = last.tz_localize(None).to_period(PERIODS[interval])
        periods = pd.period_range(first, final, freq=PERIODS[interval])
        labels = (
            periods.start_time if interval == "day" else periods.end_time.normalize()
        ).tz_localize("UTC")
        result = result.reindex(labels)
        result["event_count"] = result["event_count"].fillna(0).astype(int)
        result.loc[result["event_count"] == 0, "energy_joules"] = 0.0
    calendar = result.index.tz_localize(None).to_period(PERIODS[interval])
    starts = calendar.start_time.tz_localize("UTC")
    ends = (calendar + 1).start_time.tz_localize("UTC")
    result["bucket_start"] = starts
    result["bucket_end"] = ends
    result["partial"] = pd.Series(
        (starts < observed_start) | (ends > pd.Timestamp(data.end)),
        index=result.index,
        dtype=bool,
    )
    return result
