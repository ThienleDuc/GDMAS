import json
from datetime import UTC, datetime, timedelta

import numpy as np
import pytest

from gdmas.schemas.analysis_metrics import AnalysisPatterns
from gdmas.services.analysis.correlation import compute_correlation
from gdmas.services.analysis.pipeline import compute_patterns
from gdmas.services.analysis.preprocessing import prepare_events


def data_with_measurements(magnitudes, depths):
    base = datetime(2026, 1, 1, tzinfo=UTC)
    return prepare_events(
        [
            {
                "id": index + 1,
                "event_time": base + timedelta(hours=index * 12),
                "magnitude": mag,
                "depth_km": depth,
                "latitude": 15,
                "longitude": 100 + index,
            }
            for index, (mag, depth) in enumerate(zip(magnitudes, depths, strict=True))
        ],
        computed_at=base + timedelta(days=10),
    )


def test_pearson_known_linear_relation_symmetry_and_constant_variables():
    result = compute_correlation(data_with_measurements([1, 2, 3, 4], [8, 6, 4, 2]))
    assert result["corr_mag_depth"] == pytest.approx(-1)
    matrix = result["matrix"]
    for left, row in enumerate(matrix):
        for right, value in enumerate(row):
            assert value == matrix[right][left]
            if value is not None:
                assert -1 <= value <= 1
    assert matrix[0][0] == pytest.approx(1)
    latitude = result["variables"].index("latitude")
    frequency = result["variables"].index("daily_event_count")
    assert matrix[latitude][latitude] is None
    assert matrix[frequency][frequency] is None
    assert result["sample_counts"][0][1] == 4


def test_pairwise_missing_values_are_not_replaced_by_zero():
    result = compute_correlation(
        data_with_measurements([1, 2, 3, np.nan], [1, 4, 9, 16])
    )
    assert result["sample_counts"][0][1] == 3
    # Centered sums: Sxy=8, Sxx=2, Syy=98/3.
    assert result["corr_mag_depth"] == pytest.approx(8 / np.sqrt(2 * 98 / 3))
    json.dumps(result, allow_nan=False)


def test_single_event_has_no_defined_correlation():
    result = compute_correlation(data_with_measurements([3], [10]))
    assert all(value is None for row in result["matrix"] for value in row)
    assert result["metadata"]["data_quality"] == "INSUFFICIENT_DATA"


def test_schema_rejects_nonfinite_and_incorrect_dimensions():
    payload = compute_patterns(data_with_measurements([1, 2, 3], [1, 2, 3]))
    payload["correlation"]["matrix"][0][0] = float("nan")
    with pytest.raises(ValueError):
        AnalysisPatterns.model_validate(payload)
    payload["correlation"]["matrix"][0][0] = 1
    payload["correlation"]["matrix"].pop()
    with pytest.raises(ValueError, match="match the variables"):
        AnalysisPatterns.model_validate(payload)
