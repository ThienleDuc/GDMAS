from datetime import UTC, datetime

import numpy as np
import pandas as pd
import pytest

from gdmas.services.analysis.decomposition import compute_seasonality, compute_trend
from gdmas.services.analysis.preprocessing import prepare_events


def monthly_events(counts):
    events = []
    for index, count in enumerate(counts):
        stamp = pd.Timestamp("2020-01-01T00:00:00Z") + pd.DateOffset(months=index)
        for _ in range(count):
            events.append(
                {
                    "id": len(events) + 1,
                    "event_time": stamp,
                    "magnitude": 3,
                    "depth_km": 10,
                    "latitude": 15,
                    "longitude": 100,
                }
            )
    end = pd.Timestamp("2020-01-01T00:00:00Z") + pd.DateOffset(months=len(counts))
    return prepare_events(events, computed_at=end.to_pydatetime())


@pytest.mark.parametrize(
    "counts,direction,slope",
    [
        ([1, 2, 3, 4, 5, 6], "increasing", 1),
        ([6, 5, 4, 3, 2, 1], "decreasing", -1),
        ([3] * 6, "stable", 0),
    ],
)
def test_monthly_slope_matches_known_counts(counts, direction, slope):
    output = compute_trend(monthly_events(counts))
    trend = output["by_interval"]["month"]["count"]
    assert trend["trend_direction"] == direction
    assert trend["slope"] == pytest.approx(slope)
    assert trend["series"][2]["trend_value"] == pytest.approx(sum(counts[:3]) / 3)


def test_partial_final_bucket_does_not_create_false_downtrend():
    data = monthly_events([4] * 6 + [1])
    partial_end = datetime(2020, 7, 2, tzinfo=UTC)
    rows = data.frame.reset_index().to_dict("records")
    output = compute_trend(prepare_events(rows, computed_at=partial_end))
    trend = output["by_interval"]["month"]["count"]
    assert trend["series"][-1]["partial"]
    assert trend["slope"] == pytest.approx(0)


def test_short_history_does_not_fabricate_seasonality():
    output = compute_seasonality(monthly_events([3] * 6))
    assert output["metadata"]["data_quality"] == "INSUFFICIENT_DATA"
    assert output["seasonal_line"] == []
    for series in output["by_interval"].values():
        assert series["seasonality_strength"] is None
        assert all(value is None for value in series["seasonal"])


def test_monthly_annual_cycle_is_recovered_from_three_years():
    counts = [20 + round(10 * np.sin(index * 2 * np.pi / 12)) for index in range(36)]
    output = compute_seasonality(monthly_events(counts))
    monthly = output["by_interval"]["month"]
    assert monthly["data_quality"] == "OK"
    assert monthly["period"] == 12
    assert monthly["complete_buckets"] == 36
    assert len(monthly["seasonal_line"]) == 12
    assert monthly["seasonality_strength"] > 0.99
    assert (
        max(monthly["seasonal_line"], key=lambda item: item["seasonal_factor"])[
            "cycle_index"
        ]
        == 4
    )
    for index, residual in enumerate(monthly["residual"]):
        if residual is not None:
            assert (
                monthly["trend"][index] + monthly["seasonal"][index] + residual
            ) == pytest.approx(monthly["observed"][index])


def test_weekly_cycle_and_constant_series():
    rows = []
    base = pd.Timestamp("2020-01-06T00:00:00Z")
    for index in range(156):
        count = 3 + round(2 * np.sin(index * 2 * np.pi / 52))
        for _ in range(count):
            rows.append(
                {
                    "id": len(rows) + 1,
                    "event_time": base + pd.Timedelta(weeks=index),
                    "magnitude": 3,
                    "depth_km": 10,
                    "latitude": 15,
                    "longitude": 100,
                }
            )
    output = compute_seasonality(
        prepare_events(
            rows, computed_at=(base + pd.Timedelta(weeks=156)).to_pydatetime()
        )
    )
    assert output["by_interval"]["week"]["seasonality_strength"] > 0.99
    constant = compute_seasonality(monthly_events([3] * 24))
    assert constant["seasonality_strength"] is None


def test_trend_window_must_be_positive():
    with pytest.raises(ValueError, match="positive"):
        compute_trend(monthly_events([1]), window=0)
