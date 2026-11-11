"""Contract checks against independent counts, boundaries and corrupt payloads."""

import json
from copy import deepcopy
from datetime import UTC, date, datetime
from pathlib import Path
from types import SimpleNamespace

import pytest

from gdmas.schemas.analysis_alias_metrics import AliasAnalysisPatterns
from gdmas.schemas.analysis_metrics import AnalysisPatterns
from gdmas.services.analysis.alias_pipeline import (
    AliasCompatiblePipeline,
    AliasCompatibleRepository,
)
from gdmas.services.analysis.alias_worker import main
from gdmas.services.analysis.legacy_aliases import add_legacy_aliases
from gdmas.services.analysis.pipeline import AnalysisPipeline, compute_patterns
from gdmas.services.analysis.preprocessing import prepare_events
from gdmas.services.analysis.worker import run

from .test_analysis_decomposition import monthly_events
from .test_analysis_statistical import event

ROOT = Path(__file__).resolve().parents[4]


@pytest.fixture
def short_payload():
    return compute_patterns(
        prepare_events(
            [
                event(1, "2025-12-28T23:59:59Z", 2),
                event(2, "2025-12-29T07:00:00+07:00", 4),
                event(3, "2026-01-02T00:00:00Z", None),
            ],
            computed_at=datetime(2026, 1, 13, tzinfo=UTC),
        )
    )


def project_v1(payload):
    """What an existing canonical 1.0 consumer would see without added fields."""
    projected = deepcopy(payload)
    for point in projected["trend"]["trend_line"]:
        for key in ("start", "end", "event_count", "avg_magnitude", "trend_slope"):
            point.pop(key)
    for point in projected["seasonality"]["seasonal_components"]:
        point.pop("cycle")
        point.pop("typical_events")
    for kind in ("trend", "seasonality"):
        projected[kind]["metadata"]["schema_version"] = "1.0"
    return projected


def test_week_boundaries_real_counts_nulls_and_canonical_preservation(short_payload):
    before = deepcopy(short_payload)
    output = add_legacy_aliases(short_payload)
    assert short_payload == before
    assert project_v1(output) == before
    points = output["trend"]["trend_line"]
    assert [(p["start"], p["end"], p["event_count"]) for p in points] == [
        ("2025-12-22", "2025-12-29", 1),
        ("2025-12-29", "2026-01-05", 2),
        ("2026-01-05", "2026-01-12", 0),
        ("2026-01-12", "2026-01-19", 0),
    ]
    assert [p["avg_magnitude"] for p in points] == [2, 4, None, None]
    assert [p["partial"] for p in points] == [True, False, False, True]
    assert all(p["trend_slope"] == -2 for p in points)
    assert output["seasonality"]["seasonal_components"] == []
    assert output["seasonality"]["metadata"]["data_quality"] == "INSUFFICIENT_DATA"
    assert output["time_series"] == before["time_series"]
    assert output["correlation"] == before["correlation"]
    json.dumps(output, allow_nan=False)


def test_lookup_is_by_bucket_even_when_source_series_are_reordered(short_payload):
    expected = add_legacy_aliases(short_payload)["trend"]["trend_line"]
    weekly = short_payload["trend"]["by_interval"]["week"]
    weekly["count"]["series"].reverse()
    weekly["avg_magnitude"]["series"].reverse()
    short_payload["time_series"]["by_interval"]["week"]["line_chart"].reverse()
    assert add_legacy_aliases(short_payload)["trend"]["trend_line"] == expected


@pytest.mark.parametrize("mode", ["empty", "single", "constant"])
def test_empty_short_and_constant_data_preserve_zero_and_undefined_slope(mode):
    if mode == "constant":
        data = monthly_events([3] * 24)
    else:
        rows = [] if mode == "empty" else [event(1, "2026-01-01T00:00:00Z")]
        data = prepare_events(rows, computed_at=datetime(2026, 1, 2, tzinfo=UTC))
    original = compute_patterns(data)
    output = add_legacy_aliases(original)
    assert project_v1(output) == original
    if mode != "constant":
        assert all(
            point["trend_slope"] is None for point in output["trend"]["trend_line"]
        )
    else:
        assert output["seasonality"]["seasonality_strength"] is None
        assert all(
            p["typical_events"] == 3
            for p in output["seasonality"]["seasonal_components"]
        )


def test_calendar_month_means_round_half_up_include_zero_and_keep_additive_values():
    first_year = [10, 0, *([2] * 10)]
    second_year = [11, 0, *([4] * 10)]
    original = compute_patterns(monthly_events(first_year + second_year))
    output = add_legacy_aliases(original)
    points = output["seasonality"]["seasonal_components"]
    assert [p["cycle"] for p in points] == [f"Tháng {month}" for month in range(1, 13)]
    assert [p["typical_events"] for p in points] == [11, 0, *([3] * 10)]
    assert [p["seasonal_factor"] for p in points] == [
        p["seasonal_factor"] for p in original["seasonality"]["seasonal_line"]
    ]
    assert any(p["seasonal_factor"] < 0 for p in points)
    assert project_v1(output) == original
    assert add_legacy_aliases(output) == output


@pytest.mark.parametrize(
    "damage",
    [
        "missing",
        "duplicate",
        "p1_count",
        "average",
        "slope",
        "partial",
        "boundary",
        "fractional",
    ],
)
def test_rejects_missing_duplicate_and_inconsistent_weekly_buckets(
    short_payload, damage
):
    trend = short_payload["trend"]
    weekly = trend["by_interval"]["week"]
    temporal = short_payload["time_series"]["by_interval"]["week"]["line_chart"]
    if damage == "missing":
        weekly["avg_magnitude"]["series"].pop()
    elif damage == "duplicate":
        temporal.append(deepcopy(temporal[0]))
    elif damage == "p1_count":
        temporal[0]["event_count"] += 1
    elif damage == "average":
        weekly["avg_magnitude"]["series"][0]["actual_value"] = 99
    elif damage == "slope":
        trend["slope"] = 12
    elif damage == "partial":
        temporal[0]["partial"] = False
    else:
        for series in (trend["series"], trend["trend_line"], weekly["count"]["series"]):
            series[0]["period" if damage == "boundary" else "actual_value"] = (
                "2025-12-23" if damage == "boundary" else 1.5
            )
        if damage == "boundary":
            temporal[0]["date"] = "2025-12-23"
            weekly["avg_magnitude"]["series"][0]["period"] = "2025-12-23"
    before = deepcopy(short_payload)
    with pytest.raises(ValueError):
        add_legacy_aliases(short_payload)
    assert short_payload == before


@pytest.mark.parametrize(
    "damage", ["timestamp", "duplicate", "length", "fractional", "cycles", "alias"]
)
def test_rejects_inconsistent_monthly_history(damage):
    payload = compute_patterns(monthly_events([3] * 24))
    monthly = payload["seasonality"]["by_interval"]["month"]
    if damage == "timestamp":
        monthly["timestamps"][1] = "2020-02-02"
    elif damage == "duplicate":
        monthly["timestamps"][1] = monthly["timestamps"][0]
    elif damage == "length":
        monthly["observed"].pop()
    elif damage == "fractional":
        monthly["observed"][0] = 1.5
    elif damage == "cycles":
        monthly["complete_buckets"] = 23
        for name in ("timestamps", "observed", "trend", "seasonal", "residual"):
            monthly[name].pop()
    else:
        payload["seasonality"]["seasonal_components"][0]["seasonal_factor"] += 1
    with pytest.raises(ValueError):
        add_legacy_aliases(payload)


@pytest.mark.parametrize(
    "damage", ["version", "mixed", "p1_version", "extra", "nan", "missing_kind"]
)
def test_rejects_unsupported_or_malformed_payloads(short_payload, damage):
    if damage == "version":
        short_payload["trend"]["metadata"]["schema_version"] = "2.0"
    elif damage == "mixed":
        short_payload["trend"]["metadata"]["schema_version"] = "1.1"
    elif damage == "p1_version":
        short_payload["time_series"]["metadata"]["schema_version"] = "1.1"
    elif damage == "extra":
        short_payload["trend"]["unknown"] = 1
    elif damage == "nan":
        short_payload["trend"]["slope"] = float("nan")
    else:
        del short_payload["correlation"]
    with pytest.raises(ValueError):
        add_legacy_aliases(short_payload)


@pytest.mark.parametrize(
    "field", ["event_count", "end", "avg_magnitude", "trend_slope"]
)
def test_existing_1_1_is_validated_and_never_silently_repaired(short_payload, field):
    output = add_legacy_aliases(short_payload)
    output["trend"]["trend_line"][0][field] = "wrong" if field == "end" else 999
    with pytest.raises(ValueError):
        add_legacy_aliases(output)


def test_bad_1_1_seasonal_statistics_are_rejected():
    output = add_legacy_aliases(compute_patterns(monthly_events([3] * 24)))
    output["seasonality"]["seasonal_components"][0]["typical_events"] = 999
    with pytest.raises(ValueError, match="disagree"):
        add_legacy_aliases(output)


def test_repeated_conversion_is_equal_and_independent(short_payload):
    output = add_legacy_aliases(short_payload)
    again = add_legacy_aliases(output)
    assert output == again
    again["time_series"]["histogram"]["<2.0"] = 99
    assert again != output


def test_failure_precedes_any_database_mutation(short_payload):
    class NoMutation:
        def execute(self, *_args, **_kwargs):
            pytest.fail("Invalid aliases must not mutate the database")

    short_payload["trend"]["by_interval"]["week"]["avg_magnitude"]["series"].pop()
    with pytest.raises(ValueError):
        AliasCompatibleRepository.replace_snapshot(
            NoMutation(),
            short_payload,
            start=datetime.now(UTC),
            end=datetime.now(UTC),
            run_id=1,
        )


def test_inherited_cycle_and_worker_scheduling_are_reused():
    factory = lambda: None
    pipeline = AliasCompatiblePipeline(factory, lookback_days=30)
    assert pipeline.repository.session_factory is factory
    assert pipeline.lookback_days == 30
    assert AliasCompatiblePipeline.execute_cycle is AnalysisPipeline.execute_cycle
    assert run(SimpleNamespace(execute_cycle=lambda: {"success": True}), once=True) == 0


def test_cli_help_and_invalid_window_do_not_connect(monkeypatch, capsys):
    for arguments, code in (
        (["alias_worker", "--help"], 0),
        (["alias_worker", "--lookback-days", "0"], 2),
    ):
        monkeypatch.setattr("sys.argv", arguments)
        with pytest.raises(SystemExit) as result:
            main()
        assert result.value.code == code
    assert "--lookback-days" in capsys.readouterr().out


def test_json_schema_export_examples_and_strict_1_0_limit(short_payload):
    jsonschema = pytest.importorskip("jsonschema")
    schema = json.loads(
        (ROOT / "contracts/schemas/analysis-patterns-aliases-v1.1.json").read_text(
            encoding="utf-8"
        )
    )
    assert schema == AliasAnalysisPatterns.model_json_schema()
    validator = jsonschema.Draft202012Validator(
        schema, format_checker=jsonschema.FormatChecker()
    )
    output = add_legacy_aliases(short_payload)
    validator.validate(output)
    example = json.loads(
        (ROOT / "contracts/examples/analysis_patterns_aliases_sample.json").read_text(
            encoding="utf-8"
        )
    )
    for case in example["cases"]:
        validator.validate(case["metrics"])
        assert add_legacy_aliases(case["metrics"]) == case["metrics"]
    with pytest.raises(ValueError):
        AnalysisPatterns.model_validate(output)
    AnalysisPatterns.model_validate(short_payload)
    bad_date = deepcopy(output)
    bad_date["trend"]["metadata"]["computed_at"] = "not-a-date"
    with pytest.raises(jsonschema.ValidationError):
        validator.validate(bad_date)
    assert date.fromisoformat(output["trend"]["trend_line"][0]["start"]).weekday() == 0
