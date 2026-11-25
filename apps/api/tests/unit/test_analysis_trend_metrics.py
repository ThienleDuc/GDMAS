"""Unit test offline cho Pattern 2 đa tần suất × đa metric của T3.

Testcase: .agents/notes/testcase/2026-11-20-trend-resample-metric-son.md (BUG-son-008).
"""

import json

import pandas as pd
import pytest

from gdmas.services.analysis.patterns import (
    STATUS_COMPUTED,
    STATUS_INSUFFICIENT,
    TREND_INTERVALS,
    TREND_METRICS,
    build_analysis_snapshot,
    compute_trend,
    compute_trend_bundle,
    prepare_events,
)

START = pd.Timestamp("2026-09-07", tz="UTC")  # Thứ 2


def events_from_days(days):
    """`days`: danh sách (độ lệch ngày, [độ lớn...]) — mỗi độ lớn là 1 sự kiện lúc 06:00 + k giờ UTC."""
    records = []
    next_id = 1
    for offset, magnitudes in days:
        day = START + pd.Timedelta(days=offset)
        for k, mag in enumerate(magnitudes):
            records.append(
                {
                    "id": next_id,
                    "event_time": day + pd.Timedelta(hours=6 + k),
                    "magnitude": mag,
                    "depth_km": 10.0,
                    "latitude": 35.0,
                    "longitude": 139.0,
                }
            )
            next_id += 1
    return prepare_events(records)


def trend_rows(snapshot):
    return [item for item in snapshot if item["analysis_type"] == "trend"]


# TC-01
def test_snapshot_writes_trend_for_every_interval_primary_first():
    df = events_from_days([(d, [2.0 + (d % 3)]) for d in range(70)])  # 70 ngày → tuần

    rows = trend_rows(build_analysis_snapshot(df))

    assert [row["time_interval"] for row in rows] == ["week", "day", "month"]
    for row in rows:
        metrics = row["metrics_data"]
        assert metrics["interval"] == row["time_interval"]
        assert set(metrics["metrics"]) == set(TREND_METRICS)
        for metric in TREND_METRICS:
            assert metrics["metrics"][metric]["metric"] == metric
            assert metrics["metrics"][metric]["interval"] == row["time_interval"]
        json.dumps(metrics, allow_nan=False)


# TC-02
def test_bundle_top_level_keeps_count_format():
    df = events_from_days([(d, [3.0] * (1 + d % 2)) for d in range(21)])

    bundle = compute_trend_bundle(df, "day")

    assert bundle["metric"] == "count"
    assert bundle["series"] == bundle["metrics"]["count"]["series"]
    assert bundle["slope"] == bundle["metrics"]["count"]["slope"]
    assert sum(p["actual_value"] for p in bundle["series"]) == len(df)


# TC-03
def test_magnitude_metrics_use_period_mean_and_max():
    df = events_from_days([(0, [2.0, 4.0]), (1, [5.0]), (2, [1.0, 2.0, 3.0])])

    avg = compute_trend(df, "day", metric="avg_magnitude")["series"]
    mx = compute_trend(df, "day", metric="max_magnitude")["series"]
    count = compute_trend(df, "day", metric="count")["series"]

    assert [p["actual_value"] for p in avg] == [3.0, 5.0, 2.0]
    assert [p["actual_value"] for p in mx] == [4.0, 5.0, 3.0]
    assert [p["actual_value"] for p in count] == [2, 1, 3]


# TC-04
def test_magnitude_metrics_skip_empty_periods_instead_of_zero():
    df = events_from_days([(0, [3.0]), (2, [4.0]), (3, [5.0])])  # ngày 1 trống

    count = compute_trend(df, "day", metric="count")["series"]
    avg = compute_trend(df, "day", metric="avg_magnitude")["series"]

    assert [p["period"] for p in count] == [
        "2026-09-07",
        "2026-09-08",
        "2026-09-09",
        "2026-09-10",
    ]
    assert count[1]["actual_value"] == 0
    assert [p["period"] for p in avg] == ["2026-09-07", "2026-09-09", "2026-09-10"]
    assert all(p["actual_value"] > 0 for p in avg)


# TC-05
def test_magnitude_trend_regression_uses_real_period_spacing():
    # Độ lớn tăng đều theo ngày, có ngày trống xen giữa: vẫn phải nhận ra xu hướng tăng
    days = [(d, [1.0 + 0.1 * d]) for d in range(30) if d % 5 != 2]
    df = events_from_days(days)

    result = compute_trend(df, "day", metric="avg_magnitude")

    assert result["status"] == STATUS_COMPUTED
    assert result["trend_direction"] == "increasing"
    assert result["slope"] == pytest.approx(0.1, abs=1e-6)


# TC-06
def test_count_metric_behaviour_unchanged_by_default():
    df = events_from_days([(d, [2.0] * (d + 1)) for d in range(10)])

    default = compute_trend(df, "day")
    explicit = compute_trend(df, "day", metric="count")

    assert default == explicit
    assert default["metric"] == "count"
    assert default["trend_direction"] == "increasing"


# TC-07
@pytest.mark.parametrize("metric", TREND_METRICS)
def test_short_data_reports_insufficient_for_month(metric):
    df = events_from_days([(d, [3.0]) for d in range(10)])

    result = compute_trend(df, "month", metric=metric)

    assert result["status"] == STATUS_INSUFFICIENT
    assert result["trend_direction"] == "stable"


# TC-08
def test_single_event_and_empty_frame_do_not_crash():
    one = events_from_days([(0, [4.2])])
    for interval in TREND_INTERVALS:
        bundle = compute_trend_bundle(one, interval)
        for metric in TREND_METRICS:
            assert bundle["metrics"][metric]["status"] == STATUS_INSUFFICIENT
        json.dumps(bundle, allow_nan=False)

    assert build_analysis_snapshot(prepare_events([])) == []


# TC-09
def test_unknown_metric_is_rejected():
    df = events_from_days([(0, [3.0])])

    with pytest.raises(ValueError):
        compute_trend(df, "day", metric="median_magnitude")


def test_trend_respects_timezone_for_daily_buckets():
    """20:00 UTC hôm trước phải rơi vào ngày hôm sau khi bucket theo UTC+7."""
    records = [
        {
            "id": n,
            "event_time": pd.Timestamp(ts, tz="UTC"),
            "magnitude": mag,
            "depth_km": 10.0,
            "latitude": 35.0,
            "longitude": 139.0,
        }
        for n, (ts, mag) in enumerate(
            [
                ("2026-11-23T20:00:00Z", 5.0),
                ("2026-11-23T21:00:00Z", 4.0),
                ("2026-11-24T01:00:00Z", 3.0),
            ],
            start=1,
        )
    ]
    df = prepare_events(records)

    utc = compute_trend(df, "day", metric="count")
    local = compute_trend(df, "day", metric="count", tz="Asia/Ho_Chi_Minh")

    assert {p["period"] for p in utc["series"]} == {"2026-11-23", "2026-11-24"}
    assert {p["period"] for p in local["series"]} == {"2026-11-24"}
    assert local["series"][0]["actual_value"] == 3
