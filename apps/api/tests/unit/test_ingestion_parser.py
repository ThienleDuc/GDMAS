"""Unit test offline cho gdmas.services.ingestion.parser (testcase 2026-11-12-ingestion-upsert-validation-son)."""

import copy
from datetime import UTC

import pytest

from gdmas.services.ingestion.parser import (
    SOURCE_EVENT_ID_MAX_LEN,
    epoch_ms_to_utc,
    parse_feature,
    parse_features,
    to_finite_float,
)

EVENT_TIME_MS = 1794355200000  # 2026-11-11T00:00:00Z
UPDATED_MS = 1794358800000  # 2026-11-11T01:00:00Z


def make_feature(**overrides):
    feat = {
        "type": "Feature",
        "id": "us7000test",
        "properties": {
            "mag": 5.8,
            "magType": "mww",
            "place": "Near East Coast of Honshu, Japan",
            "time": EVENT_TIME_MS,
            "updated": UPDATED_MS,
            "url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000test",
        },
        "geometry": {"type": "Point", "coordinates": [142.38, 38.29, 24.5]},
    }
    feat = copy.deepcopy(feat)
    for key, value in overrides.items():
        if key in ("mag", "time", "updated", "code"):
            feat["properties"][key] = value
        elif key == "coordinates":
            feat["geometry"]["coordinates"] = value
        else:
            feat[key] = value
    return feat


# TC-01
def test_parse_valid_feature_maps_columns_in_utc():
    row = parse_feature(make_feature())

    assert row is not None
    assert row["source"] == "USGS"
    assert row["source_event_id"] == "us7000test"
    assert row["longitude"] == pytest.approx(142.38)
    assert row["latitude"] == pytest.approx(38.29)
    assert row["depth_km"] == pytest.approx(24.5)
    assert row["magnitude"] == pytest.approx(5.8)
    assert row["magnitude_type"] == "mww"
    assert row["event_time"].tzinfo == UTC
    assert row["event_time"].isoformat() == "2026-11-11T00:00:00+00:00"
    assert row["source_updated_at"].tzinfo == UTC
    assert row["source_updated_at"] > row["event_time"]
    assert row["raw_data"]["id"] == "us7000test"


def test_missing_updated_gives_none_source_updated_at():
    feat = make_feature()
    del feat["properties"]["updated"]
    row = parse_feature(feat)
    assert row is not None
    assert row["source_updated_at"] is None


# TC-02
@pytest.mark.parametrize(
    "coordinates",
    [
        None,
        [],
        [142.0],
        ["a", 38.0],
        [142.0, None],
        [float("nan"), 38.0],
        [142.0, float("inf")],
    ],
)
def test_invalid_or_missing_coordinates_are_rejected(coordinates):
    assert parse_feature(make_feature(coordinates=coordinates)) is None


def test_missing_geometry_is_rejected():
    feat = make_feature()
    feat["geometry"] = None
    assert parse_feature(feat) is None


# TC-03
@pytest.mark.parametrize("lon, lat", [(180.0, 90.0), (-180.0, -90.0), (0.0, 0.0)])
def test_wgs84_boundaries_are_kept(lon, lat):
    row = parse_feature(make_feature(coordinates=[lon, lat, 10.0]))
    assert row is not None
    assert (row["longitude"], row["latitude"]) == (lon, lat)


@pytest.mark.parametrize(
    "lon, lat", [(142.0, 90.1), (142.0, -90.5), (180.5, 10.0), (-180.5, 10.0)]
)
def test_out_of_range_coordinates_are_rejected(lon, lat):
    assert parse_feature(make_feature(coordinates=[lon, lat, 10.0])) is None


# TC-04
@pytest.mark.parametrize("mag", [None, float("nan"), float("inf"), "abc", True])
def test_invalid_magnitude_is_rejected(mag):
    assert parse_feature(make_feature(mag=mag)) is None


def test_numeric_string_magnitude_is_accepted():
    row = parse_feature(make_feature(mag="4.2"))
    assert row is not None and row["magnitude"] == pytest.approx(4.2)


# TC-05
def test_missing_time_is_rejected_instead_of_using_now():
    assert parse_feature(make_feature(time=None)) is None


def test_missing_id_and_code_is_rejected():
    feat = make_feature(id=None)
    assert parse_feature(feat) is None


def test_code_is_used_when_id_missing():
    row = parse_feature(make_feature(id=None, code="abc123"))
    assert row is not None and row["source_event_id"] == "abc123"


# TC-17 — BUG-son-001
def test_id_at_database_length_limit_is_preserved():
    event_id = "x" * SOURCE_EVENT_ID_MAX_LEN
    row = parse_feature(make_feature(id=event_id))
    assert row is not None and row["source_event_id"] == event_id


@pytest.mark.parametrize("use_code", [False, True])
def test_overlong_ids_are_rejected_instead_of_truncated(use_code):
    event_id = "x" * (SOURCE_EVENT_ID_MAX_LEN + 1)
    feat = (
        make_feature(id=None, code=event_id) if use_code else make_feature(id=event_id)
    )
    assert parse_feature(feat) is None


def test_shared_id_prefix_does_not_merge_distinct_events():
    prefix = "x" * SOURCE_EVENT_ID_MAX_LEN
    rows, skipped = parse_features(
        [
            make_feature(id=prefix),
            make_feature(id=prefix + "a"),
            make_feature(id=prefix + "b", updated=UPDATED_MS + 1),
        ]
    )
    assert [row["raw_data"]["id"] for row in rows] == [prefix]
    assert skipped == 2


@pytest.mark.parametrize(
    "feat", [None, "string", 42, {"properties": "bad", "geometry": {}}]
)
def test_non_object_feature_is_rejected(feat):
    assert parse_feature(feat) is None


# TC-06
def test_missing_depth_defaults_to_zero():
    row = parse_feature(make_feature(coordinates=[142.0, 38.0]))
    assert row is not None and row["depth_km"] == 0.0


# TC-18 — BUG-son-002
@pytest.mark.parametrize(
    "depth", ["bad", True, False, None, float("nan"), float("inf"), -float("inf")]
)
def test_invalid_supplied_depth_is_rejected(depth):
    assert parse_feature(make_feature(coordinates=[142.0, 38.0, depth])) is None


@pytest.mark.parametrize("depth", [0, -1.5, "24.5"])
def test_finite_supplied_depth_is_preserved(depth):
    row = parse_feature(make_feature(coordinates=[142.0, 38.0, depth]))
    assert row is not None and row["depth_km"] == float(depth)


# TC-19 — BUG-son-003
@pytest.mark.parametrize("field", ["mag", "time", "longitude", "latitude", "depth"])
def test_oversized_numbers_skip_only_the_invalid_feature(field):
    oversized = 10**400
    if field in ("mag", "time"):
        invalid = make_feature(id="bad", **{field: oversized})
    else:
        coordinates = [142.0, 38.0, 24.5]
        coordinates[{"longitude": 0, "latitude": 1, "depth": 2}[field]] = oversized
        invalid = make_feature(id="bad", coordinates=coordinates)

    rows, skipped = parse_features(
        [make_feature(id="before"), invalid, make_feature(id="after")]
    )

    assert [row["source_event_id"] for row in rows] == ["before", "after"]
    assert skipped == 1


def test_oversized_optional_updated_timestamp_is_missing():
    row = parse_feature(make_feature(updated=10**400))
    assert row is not None and row["source_updated_at"] is None


def test_parse_features_counts_skipped():
    rows, skipped = parse_features(
        [
            make_feature(),
            make_feature(id="b", coordinates=[999, 0]),
            make_feature(id="c", mag=None),
        ]
    )
    assert [r["source_event_id"] for r in rows] == ["us7000test"]
    assert skipped == 2


def test_parse_features_handles_none():
    assert parse_features(None) == ([], 0)


def test_helpers():
    assert to_finite_float("1.5") == 1.5
    assert to_finite_float(False) is None
    assert epoch_ms_to_utc(None) is None
    assert epoch_ms_to_utc(1e30) is None
    assert epoch_ms_to_utc(0).tzinfo == UTC
