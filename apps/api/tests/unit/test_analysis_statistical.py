import json
from datetime import UTC, datetime, timedelta

import numpy as np
import pandas as pd
import pytest

from gdmas.services.analysis.pipeline import compute_patterns
from gdmas.services.analysis.preprocessing import aggregate, prepare_events
from gdmas.services.analysis.statistical import compute_statistics


def event(identifier, stamp, magnitude=3.0, **values):
    return {
        "id": identifier,
        "event_time": stamp,
        "magnitude": magnitude,
        "depth_km": 10,
        "latitude": 15,
        "longitude": 100,
        **values,
    }


def test_utc_boundaries_zero_days_and_count_conservation():
    events = [
        event(1, "2026-01-31T23:59:59Z", -1),
        event(2, "2026-02-01T07:00:00+07:00", 2),
        event(3, "2026-02-03T00:00:00Z", 3),
    ]
    data = prepare_events(events, computed_at=datetime(2026, 2, 4, tzinfo=UTC))
    metrics = compute_statistics(data)
    daily = metrics["line_chart"]
    assert [point["event_count"] for point in daily] == [1, 1, 0, 1]
    assert daily[2]["avg_magnitude"] is None
    assert metrics["scatter_plot"][1]["timestamp"] == "2026-02-01T00:00:00Z"
    for interval in metrics["by_interval"].values():
        assert sum(point["event_count"] for point in interval["line_chart"]) == 3
    assert sum(metrics["histogram"].values()) == 3
    assert sum(point["count"] for point in metrics["time_distribution"]) == 3


def test_week_includes_sunday_late_evening_but_not_monday():
    data = prepare_events(
        [
            event(1, "2026-02-01T23:59:59Z"),
            event(2, "2026-02-02T00:00:00Z"),
        ],
        computed_at=datetime(2026, 2, 10, tzinfo=UTC),
    )
    weekly = aggregate(data, "week")
    assert weekly["event_count"].tolist() == [1, 1, 0]
    assert [stamp.date().isoformat() for stamp in weekly["bucket_start"]] == [
        "2026-01-26",
        "2026-02-02",
        "2026-02-09",
    ]


def test_quiet_days_after_last_event_are_retained():
    data = prepare_events(
        [event(1, "2026-01-01T00:00:00Z")],
        computed_at=datetime(2026, 1, 5, tzinfo=UTC),
    )
    daily = compute_statistics(data)["line_chart"]
    assert [row["event_count"] for row in daily] == [1, 0, 0, 0]
    assert daily[-1]["energy_joules"] == 0
    assert daily[-1]["avg_magnitude"] is None


def test_long_lookback_does_not_invent_years_of_leading_history():
    data = prepare_events(
        [event(1, "2026-01-15T12:00:00Z")],
        computed_at=datetime(2026, 1, 16, tzinfo=UTC),
        lookback_days=1000,
    )
    metrics = compute_patterns(data)
    assert len(metrics["time_series"]["line_chart"]) == 1
    assert metrics["time_series"]["line_chart"][0]["partial"]
    assert metrics["seasonality"]["metadata"]["data_quality"] == "INSUFFICIENT_DATA"


def test_scatter_preserves_bigint_identifiers():
    identifier = 2**53 + 1
    data = prepare_events(
        [event(identifier, "2026-01-01T12:00:00Z")],
        computed_at=datetime(2026, 1, 2, tzinfo=UTC),
    )
    assert compute_statistics(data)["scatter_plot"][0]["id"] == identifier


@pytest.mark.parametrize("interval", ["day", "week", "month"])
def test_empty_aggregation_keeps_utc_index_and_boolean_partial(interval):
    result = aggregate(prepare_events([]), interval)
    assert result.empty
    assert isinstance(result.index, pd.DatetimeIndex)
    assert str(result.index.tz) == "UTC"
    assert result["partial"].dtype == bool
    assert result["event_count"].dtype == "int64"


@pytest.mark.parametrize(
    "magnitudes,expected",
    [
        ([-1, 1.999, 2, 2.999, 3, 3.999, 4, 4.999, 5, 9], [2, 2, 2, 2, 2]),
        ([np.nan, np.inf, 3], [0, 0, 1, 0, 0]),
    ],
)
def test_histogram_edges_and_invalid_measurements(magnitudes, expected):
    data = prepare_events(
        [
            event(index + 1, "2026-01-01T00:00:00Z", magnitude)
            for index, magnitude in enumerate(magnitudes)
        ],
        computed_at=datetime(2026, 1, 2, tzinfo=UTC),
    )
    result = compute_statistics(data)
    assert list(result["histogram"].values()) == expected
    assert result["total_events"] == len(magnitudes)
    assert len(result["scatter_plot"]) == sum(expected)
    json.dumps(result, allow_nan=False)


def test_normalization_filters_bad_dates_future_and_lookback():
    end = datetime(2026, 2, 1, tzinfo=UTC)
    rows = [
        event(1, "bad"),
        event(2, end + timedelta(days=1)),
        event(3, end - timedelta(days=31)),
        event(4, end - timedelta(days=30)),
        event(5, end, latitude=95, longitude=-185, depth_km=np.inf),
    ]
    data = prepare_events(rows, computed_at=end, lookback_days=30)
    assert data.frame["id"].tolist() == [4, 5]
    assert data.excluded_values["event_time"] == 1
    assert data.excluded_values["outside_window"] == 2
    assert data.excluded_values["latitude"] == 1
    assert data.frame.iloc[1]["longitude"] != data.frame.iloc[1]["longitude"]
    assert data.start == end - timedelta(days=30)


def test_empty_single_event_and_overflow_are_standard_json():
    end = datetime(2026, 2, 1, tzinfo=UTC)
    for rows in ([], [event(1, end)], [event(1, end, 1e308)]):
        metrics = compute_patterns(prepare_events(rows, computed_at=end))
        json.dumps(metrics, allow_nan=False)
        if not rows:
            assert metrics["time_series"]["metadata"]["data_quality"] == "EMPTY"


def test_invalid_boundaries_and_window_rejected():
    with pytest.raises(ValueError, match="timezone-aware"):
        prepare_events([], computed_at=datetime(2026, 1, 1))
    with pytest.raises(ValueError, match="positive"):
        prepare_events([], lookback_days=0)
