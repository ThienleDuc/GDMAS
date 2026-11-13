"""Unit test offline cho gdmas.services.analysis.patterns (testcase 2026-11-12-analysis-four-patterns-son)."""

import json
from datetime import UTC

import numpy as np
import pandas as pd
import pytest

from gdmas.services.analysis.patterns import (
    CORRELATION_VARIABLES,
    MAGNITUDE_BINS,
    STATUS_COMPUTED,
    STATUS_INSUFFICIENT,
    build_analysis_snapshot,
    choose_trend_interval,
    complete_period_mask,
    compute_correlation,
    compute_seasonality,
    compute_temporal,
    compute_trend,
    format_utc,
    prepare_events,
    sanitize_for_json,
)

START = pd.Timestamp("2026-09-07", tz="UTC")  # Thứ 2


def make_events(daily_counts, start=START, seed=42, depth=None):
    """Tạo sự kiện theo số lượng mỗi ngày (giờ rải trong ngày), lat/lon trong WGS84."""
    rng = np.random.default_rng(seed)
    records = []
    next_id = 1
    for day_offset, count in enumerate(daily_counts):
        day = start + pd.Timedelta(days=day_offset)
        for k in range(int(count)):
            records.append(
                {
                    "id": next_id,
                    "event_time": day
                    + pd.Timedelta(minutes=int(1440 * (k + 0.5) / max(count, 1))),
                    "magnitude": float(rng.uniform(0.5, 6.5)),
                    "depth_km": float(
                        depth if depth is not None else rng.uniform(0, 300)
                    ),
                    "latitude": float(rng.uniform(-90, 90)),
                    "longitude": float(rng.uniform(-180, 180)),
                }
            )
            next_id += 1
    return prepare_events(records)


@pytest.fixture
def ten_weeks():
    rng = np.random.default_rng(7)
    return make_events(rng.integers(3, 12, size=70))


def assert_json_safe(payload):
    json.dumps(payload, allow_nan=False)


# TC-01
@pytest.mark.parametrize("interval", ["day", "week", "month"])
def test_temporal_line_chart_totals_and_labels(ten_weeks, interval):
    result = compute_temporal(ten_weeks, interval)

    assert result["status"] == STATUS_COMPUTED
    assert result["interval"] == interval
    assert sum(p["event_count"] for p in result["line_chart"]) == len(ten_weeks)
    for point in result["line_chart"]:
        if point["event_count"]:
            assert point["max_magnitude"] >= point["avg_magnitude"]
    labels = [p["date"] for p in result["line_chart"]]
    assert labels == sorted(labels)
    if interval == "day":
        assert len(labels) == 70
    elif interval == "week":
        assert len(labels) == 10
        assert all(pd.Timestamp(label).day_of_week == 0 for label in labels)
    else:
        assert labels == ["2026-09", "2026-10", "2026-11"]
    assert_json_safe(sanitize_for_json(result))


def test_temporal_rejects_unknown_interval(ten_weeks):
    with pytest.raises(ValueError):
        compute_temporal(ten_weeks, "hourly")


# TC-02
def test_temporal_scatter_and_histogram(ten_weeks):
    result = compute_temporal(ten_weeks, "day", scatter_limit=50)

    scatter = result["scatter_plot"]
    assert len(scatter) == 50
    assert all(p["timestamp"].endswith("Z") for p in scatter)
    assert scatter[-1]["id"] == int(ten_weeks["id"].iloc[-1])  # lấy sự kiện mới nhất
    assert {"id", "timestamp", "magnitude", "depth_km"} == set(scatter[0])

    bins = result["histogram"]["magnitude_bins"]
    assert [b["bin"] for b in bins] == [label for label, _, _ in MAGNITUDE_BINS]
    assert sum(b["count"] for b in bins) == len(ten_weeks)
    assert result["data_points"] == len(ten_weeks)
    assert result["avg_depth"] == pytest.approx(ten_weeks["depth_km"].mean(), abs=0.01)


def test_histogram_bin_edges():
    df = prepare_events(
        [
            {
                "id": i,
                "event_time": START,
                "magnitude": m,
                "depth_km": 1,
                "latitude": 0,
                "longitude": 0,
            }
            for i, m in enumerate([1.99, 2.0, 2.99, 3.0, 4.999, 5.0, 7.1])
        ]
    )
    counts = [b["count"] for b in compute_temporal(df)["histogram"]["magnitude_bins"]]
    assert counts == [1, 2, 1, 1, 2]


# TC-03
@pytest.mark.parametrize(
    "days, expected", [(3, "day"), (20, "day"), (40, "week"), (200, "month")]
)
def test_choose_trend_interval(days, expected):
    assert choose_trend_interval(make_events([1] * days)) == expected


def test_complete_period_mask_excludes_partial_edges(ten_weeks):
    df = ten_weeks.iloc[5:-5]  # cắt bớt để ngày đầu/cuối không trọn tuần
    index = pd.date_range("2026-09-07", periods=10, freq="W-MON", tz="UTC")
    mask = complete_period_mask(
        index, "week", make_events([1] * 66, start=START + pd.Timedelta(days=2))
    )
    assert not mask[0] and not mask[-1]
    assert mask[1:-1].all()
    assert complete_period_mask(pd.DatetimeIndex([]), "day", df).size == 0


# TC-04
@pytest.mark.parametrize(
    "daily_counts, direction",
    [
        (list(range(1, 22)), "increasing"),
        (list(range(21, 0, -1)), "decreasing"),
        ([5] * 21, "stable"),
    ],
)
def test_trend_direction(daily_counts, direction):
    result = compute_trend(make_events(daily_counts))

    assert result["status"] == STATUS_COMPUTED
    assert result["interval"] == "day"
    assert result["resample_freq"] == "D"
    assert result["trend_direction"] == direction
    if direction == "increasing":
        assert result["slope"] > 0 and result["p_value"] < 0.05
    elif direction == "decreasing":
        assert result["slope"] < 0
    else:
        assert result["slope"] == 0.0
    assert len(result["series"]) == len(daily_counts)
    assert all(p["trend_value"] is not None for p in result["series"])
    assert_json_safe(sanitize_for_json(result))


def test_trend_weekly_resample_ignores_partial_last_week():
    counts = [10] * 63 + [1, 1]  # 9 tuần đầy đủ + 2 ngày của tuần hiện tại
    result = compute_trend(make_events(counts), interval="week")

    assert result["resample_freq"] == "W"
    assert result["series"][-1]["is_complete"] is False
    assert result["complete_periods"] == 9
    assert (
        result["trend_direction"] == "stable"
    )  # tuần dở dang không được kéo xu hướng xuống


# TC-05
def test_trend_insufficient_data():
    result = compute_trend(make_events([3, 4]))
    assert result["status"] == STATUS_INSUFFICIENT
    assert result["trend_direction"] == "stable"
    assert_json_safe(sanitize_for_json(result))


# TC-06
def test_weekly_seasonality_detected():
    weekly = [5, 5, 5, 5, 5, 20, 20]  # Thứ 2 → Chủ nhật; cuối tuần đông hơn
    result = compute_seasonality(make_events(weekly * 8))

    assert result["status"] == STATUS_COMPUTED
    assert result["interval"] == "day" and result["period"] == 7
    line = result["components"]["seasonal_line"]
    assert [p["cycle_index"] for p in line] == list(range(1, 8))
    assert line[5]["period_label"] == "Thứ 7"
    assert line[5]["seasonal_factor"] > 1 > line[0]["seasonal_factor"]
    strength = result["components"]["seasonality_strength"]
    assert 0.0 <= strength <= 1.0 and strength > 0.9
    assert "rõ rệt" in result["components"]["interpretation"]
    assert_json_safe(sanitize_for_json(result))


# TC-07
def test_seasonality_insufficient_cycles():
    result = compute_seasonality(make_events([5] * 5))
    assert result["status"] == STATUS_INSUFFICIENT
    assert result["components"]["seasonal_line"] == []
    assert result["components"]["seasonality_strength"] is None
    assert "chưa xác định mùa vụ rõ" in result["components"]["interpretation"]


# TC-08
def test_correlation_matrix_properties(ten_weeks):
    result = compute_correlation(ten_weeks)

    matrix = np.array(result["matrix"], dtype=float)
    assert result["variables"] == list(CORRELATION_VARIABLES)
    assert matrix.shape == (5, 5)
    assert np.allclose(matrix, matrix.T)
    assert np.allclose(np.diag(matrix), 1.0)
    assert ((matrix >= -1.0) & (matrix <= 1.0)).all()
    assert result["method"] == "pearson"
    assert np.array(result["spearman_matrix"], dtype=float).shape == (5, 5)
    assert "nhân quả" in result["note"]
    assert result["undefined_pairs"] == []
    assert result["corr_mag_depth"] == result["matrix"][0][1]
    assert_json_safe(sanitize_for_json(result))


def test_daily_event_count_correlates_with_itself_by_day():
    df = make_events([1, 1, 10, 10, 1])
    expected = (
        df["event_time"]
        .dt.floor("D")
        .map(df["event_time"].dt.floor("D").value_counts())
    )
    result = compute_correlation(df)
    assert result["sample_size"] == len(df) == int(expected.size)


# TC-09
def test_correlation_zero_variance_column_is_null(ten_weeks):
    result = compute_correlation(make_events([5] * 10, depth=10.0))

    depth_idx = CORRELATION_VARIABLES.index("depth_km")
    assert all(value is None for value in result["matrix"][depth_idx])
    assert all(row[depth_idx] is None for row in result["matrix"])
    assert ["magnitude", "depth_km"] in result["undefined_pairs"]
    assert result["correlation_strength"] == "Không xác định"
    assert_json_safe(sanitize_for_json(result))


# TC-10
@pytest.mark.parametrize("size", [0, 1])
def test_empty_and_single_event_do_not_crash(size):
    df = make_events([size])
    for payload in (
        compute_temporal(df, "day"),
        compute_trend(df),
        compute_seasonality(df),
        compute_correlation(df),
    ):
        assert_json_safe(sanitize_for_json(payload))
    snapshot = build_analysis_snapshot(df)
    assert (snapshot == []) is (size == 0)
    for item in snapshot:
        assert_json_safe(item["metrics_data"])


def test_sanitize_for_json_and_format_utc():
    payload = sanitize_for_json(
        {
            "a": float("nan"),
            "b": np.float64(1.5),
            "c": [np.int64(2), float("inf")],
            "d": START,
        }
    )
    assert payload == {"a": None, "b": 1.5, "c": [2, None], "d": "2026-09-07T00:00:00Z"}
    assert (
        format_utc(pd.Timestamp("2026-09-07 07:00", tz="Asia/Ho_Chi_Minh"))
        == "2026-09-07T00:00:00Z"
    )
    assert format_utc(None) is None


def test_prepare_events_drops_invalid_and_converts_to_utc():
    df = prepare_events(
        [
            {
                "id": 1,
                "event_time": "2026-09-07T07:00:00+07:00",
                "magnitude": "4.5",
                "depth_km": None,
                "latitude": 1,
                "longitude": 2,
            },
            {
                "id": 2,
                "event_time": "not a date",
                "magnitude": 3,
                "depth_km": 1,
                "latitude": 1,
                "longitude": 2,
            },
            {
                "id": 3,
                "event_time": "2026-09-08T00:00:00Z",
                "magnitude": float("nan"),
                "depth_km": 1,
                "latitude": 1,
                "longitude": 2,
            },
        ]
    )
    assert df["id"].tolist() == [1]
    assert str(df["event_time"].dt.tz) == "UTC"
    assert df["event_time"].iloc[0] == pd.Timestamp("2026-09-07T00:00:00Z")
    assert df["depth_km"].iloc[0] == 0.0


# TC-11
def test_snapshot_types_and_periods(ten_weeks):
    snapshot = build_analysis_snapshot(ten_weeks)

    keys = [(item["analysis_type"], item["time_interval"]) for item in snapshot]
    assert keys == [
        ("time_series", "day"),
        ("time_series", "week"),
        ("time_series", "month"),
        ("trend", "week"),
        ("seasonality", "day"),
        ("correlation", "day"),
    ]
    for item in snapshot:
        assert item["period_start"] <= item["period_end"]
        assert item["period_start"].tzinfo == UTC
        assert_json_safe(item["metrics_data"])


# TC-16 — BUG-son-004
def test_trend_excludes_current_partial_day_from_regression():
    df = make_events([10] * 20 + [1])
    as_of = START + pd.Timedelta(days=20, hours=12)

    result = compute_trend(df, interval="day", as_of=as_of)

    assert result["series"][-1]["actual_value"] == 1
    assert result["series"][-1]["is_complete"] is False
    assert result["complete_periods"] == 20
    assert result["slope"] == 0.0
    assert result["trend_direction"] == "stable"


def test_seasonality_requires_two_complete_cycles_at_as_of():
    df = make_events([5, 5, 5, 5, 5, 20, 20] * 2)
    as_of = START + pd.Timedelta(days=13, hours=23)

    result = compute_seasonality(df, as_of=as_of)

    assert result["status"] == STATUS_INSUFFICIENT
    assert result["components"]["seasonal_line"] == []
    assert result["components"]["seasonality_strength"] is None


@pytest.mark.parametrize("as_of", ["2026-09-28T00:00:00Z", "2026-09-28T07:00:00+07:00"])
def test_day_completes_exactly_at_next_utc_midnight(as_of):
    df = make_events([10] * 20 + [1])
    result = compute_trend(df, interval="day", as_of=pd.Timestamp(as_of))
    assert result["series"][-1]["is_complete"] is True
    assert result["complete_periods"] == 21


# TC-17 — BUG-son-005
def test_insufficient_seasonality_snapshot_uses_supported_interval():
    snapshot = build_analysis_snapshot(make_events([1]))
    seasonal = next(item for item in snapshot if item["analysis_type"] == "seasonality")
    assert seasonal["time_interval"] == "day"
    assert seasonal["metrics_data"]["status"] == STATUS_INSUFFICIENT
    assert seasonal["metrics_data"]["interval"] is None
    assert all(item["time_interval"] in {"day", "week", "month"} for item in snapshot)


def test_monthly_trend_aggregates_real_calendar_months():
    start = pd.Timestamp("2026-01-01", tz="UTC")
    counts = [(start + pd.Timedelta(days=day)).month for day in range(250)]
    result = compute_trend(make_events(counts, start=start), interval="month")
    assert result["resample_freq"] == "M"
    assert [point["actual_value"] for point in result["series"][:3]] == [31, 56, 93]
    assert result["complete_periods"] == 8
    assert result["series"][-1]["is_complete"] is False
    assert result["trend_direction"] == "increasing"


def test_correlation_matches_known_positive_and_negative_relations():
    df = make_events([1, 2, 3, 4])
    df["magnitude"] = df["event_time"].dt.day.astype(float)
    df["depth_km"] = 2 * df["magnitude"] + 1
    df["latitude"] = -df["magnitude"]

    result = compute_correlation(df)

    assert result["matrix"][0][1] == 1.0
    assert result["matrix"][0][2] == -1.0
    assert result["matrix"][0][4] == 1.0
    assert result["spearman_matrix"][0][1] == 1.0
    assert result["spearman_matrix"][0][2] == -1.0
