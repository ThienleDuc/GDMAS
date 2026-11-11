"""Generated input combinations and operational failure boundaries for T3."""

import json
from datetime import UTC, datetime, timedelta

import pytest

from gdmas.services.analysis.pipeline import AnalysisPipeline, compute_patterns
from gdmas.services.analysis.preprocessing import prepare_events
from gdmas.services.analysis.repository import AnalysisRepository


def test_database_failure_is_reported_without_leaking_connection_details(caplog):
    def unavailable():
        raise ConnectionError(
            "postgresql://private-user:private-password@host/database"
        )

    result = AnalysisPipeline(unavailable).execute_cycle()
    assert result["success"] is False
    assert result["error"] == "ConnectionError"
    assert "private-password" not in json.dumps(result)
    assert "private-password" not in caplog.text
    assert "Cannot persist analysis failure" in caplog.text


def test_invalid_publication_is_rejected_before_any_database_mutation():
    class NoMutation:
        def execute(self, *_args, **_kwargs):
            pytest.fail("Invalid snapshot must not delete data")

    with pytest.raises(ValueError, match="all four"):
        AnalysisRepository.replace_snapshot(
            NoMutation(),
            {"trend": {}},
            start=datetime.now(UTC),
            end=datetime.now(UTC),
            run_id=1,
        )


def test_pipeline_rejects_naive_boundary_before_opening_a_session():
    def no_session():
        pytest.fail("Naive timestamps must be rejected before accessing the DB")

    with pytest.raises(ValueError, match="timezone-aware"):
        AnalysisPipeline(no_session).execute_cycle(computed_at=datetime(2026, 1, 1))


def test_generated_inputs_conserve_events_and_produce_finite_symmetric_json():
    hypothesis = pytest.importorskip("hypothesis")
    from hypothesis import strategies as st

    measurement = st.one_of(
        st.none(),
        st.sampled_from([float("nan"), float("inf"), -float("inf")]),
        st.floats(min_value=-2, max_value=9.9, allow_nan=False, allow_infinity=False),
    )
    rows = st.lists(
        st.tuples(
            st.integers(min_value=-40, max_value=1),
            st.integers(min_value=0, max_value=86399),
            measurement,
            measurement,
        ),
        min_size=0,
        max_size=40,
    )
    end = datetime(2026, 2, 1, tzinfo=UTC)

    @hypothesis.settings(
        max_examples=150, deadline=None, database=None, derandomize=True
    )
    @hypothesis.given(rows)
    def check(samples):
        events = [
            {
                "id": index + 1,
                "event_time": end + timedelta(days=days, seconds=seconds),
                "magnitude": magnitude,
                "depth_km": depth,
                "latitude": 15 + index % 20,
                "longitude": 100 - index % 20,
            }
            for index, (days, seconds, magnitude, depth) in enumerate(samples)
        ]
        data = prepare_events(events, computed_at=end, lookback_days=30)
        result = compute_patterns(data)
        json.dumps(result, allow_nan=False)
        temporal = result["time_series"]
        assert temporal["total_events"] == len(data.frame)
        assert sum(temporal["histogram"].values()) == len(temporal["scatter_plot"])
        for interval in temporal["by_interval"].values():
            assert sum(point["event_count"] for point in interval["line_chart"]) == len(
                data.frame
            )
        correlation = result["correlation"]["matrix"]
        for left, row in enumerate(correlation):
            for right, value in enumerate(row):
                other = correlation[right][left]
                if value is None:
                    assert other is None
                else:
                    assert value == pytest.approx(other, abs=1e-12)
                    assert -1 <= value <= 1

    check()
