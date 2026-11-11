"""Build legacy fields exclusively from the canonical, already computed metrics."""

from copy import deepcopy
from datetime import date, timedelta

from gdmas.schemas.analysis_alias_metrics import AliasAnalysisPatterns
from gdmas.schemas.analysis_metrics import AnalysisPatterns

TREND_FIELDS = ("start", "end", "event_count", "avg_magnitude", "trend_slope")
SEASONAL_FIELDS = ("cycle", "typical_events")


def _index(points: list[dict], key: str) -> dict:
    indexed = {point[key]: point for point in points}
    if len(indexed) != len(points):
        raise ValueError(f"Duplicate alias bucket: {key}")
    return indexed


def _trend_aliases(payload: dict) -> list[dict]:
    trend = payload["trend"]
    if trend["resampling"] != "1W" or trend["metric"] != "count":
        raise ValueError("Legacy trend aliases require weekly counts")
    weekly = trend["by_interval"]["week"]
    counts = _index(weekly["count"]["series"], "period")
    aliases = _index(trend["trend_line"], "period")
    averages = _index(weekly["avg_magnitude"]["series"], "period")
    temporal = _index(
        payload["time_series"]["by_interval"]["week"]["line_chart"], "date"
    )
    if (
        _index(trend["series"], "period") != counts
        or aliases != counts
        or set(averages) != set(counts)
        or set(temporal) != set(counts)
        or trend["slope"] != weekly["count"]["slope"]
    ):
        raise ValueError("Missing or inconsistent weekly alias buckets")
    result = []
    for point in trend["trend_line"]:
        period = point["period"]
        start = date.fromisoformat(period)
        count = point["actual_value"]
        observed = temporal[period]
        average = averages[period]
        if (
            start.isoformat() != period
            or start.weekday() != 0
            or count is None
            or count < 0
            or int(count) != count
            or count != observed["event_count"]
            or point["partial"] != observed["partial"]
            or point["partial"] != average["partial"]
            or average["actual_value"] != observed["avg_magnitude"]
        ):
            raise ValueError("Inconsistent weekly count, magnitude or UTC boundary")
        result.append(
            {
                **point,
                "start": period,
                "end": (start + timedelta(days=7)).isoformat(),
                "event_count": int(count),
                "avg_magnitude": average["actual_value"],
                "trend_slope": trend["slope"],
            }
        )
    return result


def _seasonal_aliases(payload: dict) -> list[dict]:
    seasonality = payload["seasonality"]
    monthly = seasonality["by_interval"]["month"]
    canonical = _index(seasonality["seasonal_line"], "cycle_index")
    if (
        _index(seasonality["seasonal_components"], "cycle_index") != canonical
        or _index(monthly["seasonal_line"], "cycle_index") != canonical
    ):
        raise ValueError("Inconsistent monthly seasonal aliases")
    if monthly["data_quality"] == "INSUFFICIENT_DATA":
        if canonical:
            raise ValueError("Insufficient history cannot have seasonal aliases")
        return []
    if set(canonical) != set(range(1, 13)):
        raise ValueError("Annual monthly aliases require twelve calendar months")
    timestamps, observed = monthly["timestamps"], monthly["observed"]
    if (
        len(timestamps) != len(observed)
        or len(timestamps) != monthly["complete_buckets"]
    ):
        raise ValueError("Monthly observations and timestamps must align")
    totals: dict[int, list[int]] = {}
    previous = None
    for stamp, count in zip(timestamps, observed, strict=True):
        start = date.fromisoformat(stamp)
        ordinal = start.year * 12 + start.month
        if (
            start.isoformat() != stamp
            or start.day != 1
            or (previous is not None and ordinal != previous + 1)
            or count < 0
            or int(count) != count
        ):
            raise ValueError("Expected consecutive complete UTC months and counts")
        previous = ordinal
        totals.setdefault(start.month, []).append(int(count))
    if len(timestamps) < 24 or set(totals) != set(canonical):
        raise ValueError("Monthly aliases require at least two complete annual cycles")
    return [
        {
            **point,
            "cycle": f"Tháng {point['cycle_index']}",
            # Integer arithmetic implements round-half-up without float rounding.
            "typical_events": (2 * sum(values) + len(values)) // (2 * len(values)),
        }
        for point in seasonality["seasonal_components"]
        for values in [totals[point["cycle_index"]]]
    ]


def add_legacy_aliases(metrics: dict) -> dict:
    """Return a validated copy; reject corrupted 1.1 data instead of repairing it."""
    payload = deepcopy(metrics)
    versions = tuple(
        payload[kind]["metadata"]["schema_version"] for kind in ("trend", "seasonality")
    )
    if versions not in (("1.0", "1.0"), ("1.1", "1.1")):
        raise ValueError("Unsupported or mixed analysis alias versions")
    upgraded = versions == ("1.1", "1.1")
    if upgraded:
        AliasAnalysisPatterns.model_validate(payload)
        for kind, alias, fields in (
            ("trend", "trend_line", TREND_FIELDS),
            ("seasonality", "seasonal_components", SEASONAL_FIELDS),
        ):
            payload[kind]["metadata"]["schema_version"] = "1.0"
            for point in payload[kind][alias]:
                for field in fields:
                    del point[field]
    # Validate structure and nonfinite numbers before deriving any legacy fields.
    AnalysisPatterns.model_validate(payload).json_metrics()
    trend = _trend_aliases(payload)
    seasonal = _seasonal_aliases(payload)
    if upgraded and (
        metrics["trend"]["trend_line"] != trend
        or metrics["seasonality"]["seasonal_components"] != seasonal
    ):
        raise ValueError("Existing legacy aliases disagree with canonical metrics")
    payload["trend"]["trend_line"] = trend
    payload["seasonality"]["seasonal_components"] = seasonal
    for kind in ("trend", "seasonality"):
        payload[kind]["metadata"]["schema_version"] = "1.1"
    AliasAnalysisPatterns.model_validate(payload).json_metrics()
    return payload
