"""Patterns 2 and 3: resampled trends and annual seasonal decomposition."""

import numpy as np
import pandas as pd
from scipy.stats import linregress
from statsmodels.tsa.seasonal import seasonal_decompose

from gdmas.services.analysis.preprocessing import (
    FREQUENCIES,
    PreparedData,
    aggregate,
    finite,
)

METRICS = {
    "count": "event_count",
    "avg_magnitude": "avg_magnitude",
    "max_magnitude": "max_magnitude",
    "energy_joules": "energy_joules",
}


def compute_trend(data: PreparedData, window: int = 3) -> dict:
    if window < 1:
        raise ValueError("Moving average window must be positive")
    by_interval = {}
    for interval in FREQUENCIES:
        buckets = aggregate(data, interval)
        results = {}
        for metric, column in METRICS.items():
            values = buckets[column].astype(float)
            smooth = values.rolling(window, min_periods=1).mean()
            # Partial buckets can create artificial drops at either edge.
            eligible = np.isfinite(values) & ~buckets["partial"]
            slope = None
            tolerance = max(1.0, finite(values.abs().max()) or 0) * 1e-9
            if eligible.sum() >= 2:
                slope = finite(
                    linregress(np.flatnonzero(eligible), values[eligible]).slope
                )
            direction = "insufficient_data"
            if slope is not None:
                direction = (
                    "stable"
                    if abs(slope) <= tolerance
                    else ("increasing" if slope > 0 else "decreasing")
                )
            results[metric] = {
                "series": [
                    {
                        "period": row.bucket_start.date().isoformat(),
                        "actual_value": finite(values.iloc[index]),
                        "trend_value": finite(smooth.iloc[index]),
                        "partial": bool(row.partial),
                    }
                    for index, row in enumerate(buckets.itertuples())
                ],
                "slope": slope,
                "trend_direction": direction,
                "slope_unit": f"{metric}/{interval}",
                "moving_average_window": window,
                "slope_tolerance": tolerance,
            }
        by_interval[interval] = results
    default = by_interval["week"]["count"]
    return {
        "metadata": data.metadata(),
        "by_interval": by_interval,
        "series": default["series"],
        "trend_line": default["series"],
        "slope": default["slope"],
        "trend_direction": default["trend_direction"],
        "direction": default["trend_direction"],
        "resampling": "1W",
        "metric": "count",
    }


def _seasonal_series(data: PreparedData, interval: str, period: int) -> dict:
    buckets = aggregate(data, interval)
    complete = buckets.loc[~buckets["partial"]]
    observed = complete["event_count"].astype(float)
    output = {
        "data_quality": "INSUFFICIENT_DATA",
        "reason": f"Annual {interval} seasonality requires {2 * period} complete buckets",
        "period": period,
        "complete_buckets": len(complete),
        "seasonal_line": [],
        "timestamps": [stamp.date().isoformat() for stamp in complete["bucket_start"]],
        "observed": observed.tolist(),
        "trend": [None] * len(complete),
        "seasonal": [None] * len(complete),
        "residual": [None] * len(complete),
        "seasonality_strength": None,
        "residual_variance": None,
    }
    if len(observed) < 2 * period:
        return output
    decomposition = seasonal_decompose(observed, model="additive", period=period)
    seasonal = decomposition.seasonal
    residual = decomposition.resid
    usable = residual.notna()
    residual_variance = float(residual[usable].var(ddof=0))
    combined_variance = float((residual[usable] + seasonal[usable]).var(ddof=0))
    strength = (
        float(np.clip(1 - residual_variance / combined_variance, 0, 1))
        if combined_variance > np.finfo(float).eps
        else None
    )
    # Monthly labels follow the calendar. Weekly phase is explicitly a fixed
    # 52-bucket cycle, not an assertion about ISO week 53 or calendar years.
    phases = (
        pd.Index(complete["bucket_start"]).month
        if interval == "month"
        else np.arange(len(complete)) % period + 1
    )
    phase_values = pd.Series(seasonal.to_numpy(), index=phases).groupby(level=0).mean()
    output.update(
        data_quality="OK",
        reason=None,
        trend=[finite(value) for value in decomposition.trend],
        seasonal=[finite(value) for value in seasonal],
        residual=[finite(value) for value in residual],
        seasonality_strength=strength,
        residual_variance=finite(residual_variance),
        seasonal_line=[
            {
                "cycle_index": int(phase),
                "period_label": f"Month {phase}"
                if interval == "month"
                else f"Phase {phase}",
                "seasonal_factor": float(value),
            }
            for phase, value in phase_values.items()
        ],
    )
    return output


def compute_seasonality(data: PreparedData) -> dict:
    intervals = {
        "week": _seasonal_series(data, "week", 52),
        "month": _seasonal_series(data, "month", 12),
    }
    default = intervals["month"]
    line = default["seasonal_line"]
    peak = max(line, key=lambda point: point["seasonal_factor"]) if line else None
    return {
        "metadata": data.metadata(default["data_quality"], default["reason"]),
        "by_interval": intervals,
        "seasonal_line": line,
        "seasonal_components": line,
        "seasonality_strength": default["seasonality_strength"],
        "periodicity": "monthly",
        "peak_season": peak["period_label"] if peak else None,
    }
